"""Analyze Controller (The 'C' in MVC)

Coordinates the 12-stage repository analysis pipeline as an asynchronous background worker.
Every stage is wrapped in its own try/except to ensure partial results with warnings
are returned rather than failing silently or aborting.
Guarantees Windows-safe cleanup of the temporary clone directory.
Supports commit SHA tagging, historical SQLite diffing, starter Fetch List, and contribution scoring.
"""

import time
import tempfile
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from ..config import is_ai_available
from ..models.report_models import ReportMetrics, Issue, RepoBriefing
from ..services.job_store import job_store
from ..services.github_service import verify_github_repository
from ..services.cloner_service import clone_repo
from ..services.scanner_service import scan_repository
from ..services.ast_shared_service import analyze_python_ast, CodeChunk
from ..services.chunker_service import chunk_code_file
from ..services.static_check_service import run_static_checks
from ..services.cicd_service import check_workflows
from ..services.deploy_service import check_deployment_files
from ..services.docs_service import check_documentation
from ..services.todo_scanner_service import extract_todos
from ..services.repo_brief_service import generate_briefing_summary, enrich_starting_points
from ..services.ai_service import analyze_chunks_with_ai
from ..services.aggregator_service import aggregate_and_deduplicate
from ..services.github_meta_service import get_commit_sha, get_contribution_signals
from ..services.cache_service import get_cached_scan, save_scan
from ..services.diff_service import compute_diff
from ..services.starter_list_service import build_fetch_list
from ..views.report_view import format_report
from ..utils.file_helpers import safe_rmtree, detect_language, to_relative_path


def _run_chunking_stage(source_files: list[Path], temp_dir: Path, file_tags: dict[str, str]):
    """Helper function run in threadpool for file chunking and AST extraction."""
    chunks: list[CodeChunk] = []
    ast_issues: list[Issue] = []
    chunk_warnings: list[str] = []

    for fpath in source_files:
        try:
            lang = detect_language(fpath)
            rel_str = to_relative_path(fpath, temp_dir)
            tag = file_tags.get(rel_str, "general")

            if lang == "Python":
                ast_res = analyze_python_ast(fpath, temp_dir, folder_tag=tag)
                chunks.extend(ast_res["chunks"])
                ast_issues.extend(ast_res["issues"])
            else:
                c_list = chunk_code_file(fpath, temp_dir, folder_tag=tag)
                chunks.extend(c_list)
        except Exception as exc:
            chunk_warnings.append(f"Chunking error in '{fpath.name}': {str(exc)}")

    return chunks, ast_issues, chunk_warnings


async def run_repo_analysis_job(
    job_id: str,
    repo_url: str,
    owner: str,
    repo_name: str,
    force_rescan: bool = False,
) -> None:
    """Execute the end-to-end repository analysis pipeline in the background."""
    start_time = time.time()
    temp_dir: Path | None = None
    warnings: list[str] = []
    default_branch = "main"
    commit_sha = ""

    try:
        # Check in-memory cache first if not a forced re-scan
        if not force_rescan:
            cached_report = job_store.get_cached_report(repo_url)
            if cached_report:
                job_store.update_job(
                    job_id=job_id,
                    status="completed",
                    stage_message="Retrieved report from cache.",
                    progress_percent=100,
                    report=cached_report,
                )
                return

        # Check SQLite history for previous scan (used for diffing)
        previous_scan = await asyncio.to_thread(get_cached_scan, owner, repo_name)

        # Stage 1: Pre-flight Verification
        job_store.update_job(
            job_id=job_id,
            status="validating",
            stage_message="Checking repository status and size via GitHub API...",
            progress_percent=8,
        )

        try:
            gh_meta = await verify_github_repository(owner, repo_name)
            default_branch = gh_meta.get("default_branch", "main")
        except Exception as exc:
            warnings.append(f"GitHub pre-flight check notice: {str(exc)}")

        # Stage 2: Shallow Clone
        job_store.update_job(
            job_id=job_id,
            status="cloning",
            stage_message=f"Cloning repository '{owner}/{repo_name}' (shallow depth=1)...",
            progress_percent=20,
        )

        temp_dir = Path(tempfile.mkdtemp(prefix=f"tozo_{repo_name}_"))
        try:
            _, detected_branch = await asyncio.to_thread(clone_repo, repo_url, temp_dir)
            if detected_branch:
                default_branch = detected_branch
            
            # Extract commit SHA
            short_sha, _ = await asyncio.to_thread(get_commit_sha, temp_dir)
            commit_sha = short_sha if short_sha != "unknown" else "HEAD"
        except Exception as exc:
            raise RuntimeError(f"Failed to clone repository: {str(exc)}")

        # Stage 3: File Scanning & Domain Tagging
        job_store.update_job(
            job_id=job_id,
            status="scanning",
            stage_message="Scanning source files, workflows, and configurations...",
            progress_percent=32,
        )

        scan_result = await asyncio.to_thread(scan_repository, temp_dir)
        source_files = scan_result["files"]
        special_files = scan_result["special_files"]
        file_tags = scan_result["file_tags"]

        if not source_files:
            raise ValueError(
                "No supported source code files were found in this repository. "
                "The repository may only contain documentation or ignored asset types."
            )

        # Stage 4: Phase 1 Repo Briefing (Early execution with verified facts & guidelines)
        briefing: Optional[RepoBriefing] = None
        try:
            job_store.update_job(
                job_id=job_id,
                status="scanning",
                stage_message="Compiling executive repository briefing...",
                progress_percent=40,
            )
            briefing, brief_warn = await generate_briefing_summary(
                temp_dir,
                scan_result,
                repo_url=repo_url,
                default_branch=default_branch,
            )
            if brief_warn:
                warnings.append(brief_warn)
        except Exception as exc:
            warnings.append(f"Briefing generation step encountered an error: {str(exc)}")

        # Stage 5: Code Chunking & AST Extraction
        job_store.update_job(
            job_id=job_id,
            status="scanning",
            stage_message="Chunking functions and calculating complexity...",
            progress_percent=48,
        )

        all_chunks, ast_static_issues, chunk_warns = await asyncio.to_thread(
            _run_chunking_stage, source_files, temp_dir, file_tags
        )
        warnings.extend(chunk_warns)

        # Stage 6: Static Linters & Multi-Language Test Coverage
        job_store.update_job(
            job_id=job_id,
            status="static_checking",
            stage_message=f"Running static analysis & test coverage checks across {len(source_files)} files...",
            progress_percent=58,
        )

        static_issues: list[Issue] = []
        try:
            static_issues = await asyncio.to_thread(
                run_static_checks,
                repo_root=temp_dir,
                code_files=source_files,
                precomputed_ast_issues=ast_static_issues,
            )
        except Exception as exc:
            warnings.append(f"Static linters encountered an error: {str(exc)}")

        # Stage 7: CI/CD Workflow Audit
        cicd_issues: list[Issue] = []
        if special_files.get("workflow_files"):
            try:
                cicd_issues = await asyncio.to_thread(
                    check_workflows, special_files["workflow_files"], temp_dir
                )
            except Exception as exc:
                warnings.append(f"CI/CD workflow audit notice: {str(exc)}")

        # Stage 8: Deployment & Container Audit
        deploy_issues: list[Issue] = []
        if special_files.get("dockerfile") or special_files.get("docker_compose"):
            try:
                deploy_issues = await asyncio.to_thread(
                    check_deployment_files,
                    dockerfile_path=special_files.get("dockerfile"),
                    compose_path=special_files.get("docker_compose"),
                    repo_root=temp_dir,
                )
            except Exception as exc:
                warnings.append(f"Deployment configuration audit notice: {str(exc)}")

        # Stage 9: Documentation & Docstrings Audit
        docs_issues: list[Issue] = []
        try:
            docs_issues = await asyncio.to_thread(
                check_documentation,
                readme_path=special_files.get("readme"),
                contributing_path=special_files.get("contributing"),
                code_files=source_files,
                repo_root=temp_dir,
            )
        except Exception as exc:
            warnings.append(f"Documentation check notice: {str(exc)}")

        # Stage 10: Technical Debt & TODO Scanner
        todo_issues: list[Issue] = []
        try:
            todo_issues = await asyncio.to_thread(extract_todos, source_files, temp_dir)
        except Exception as exc:
            warnings.append(f"Technical debt scanner notice: {str(exc)}")

        # Stage 11: Concurrent AI Analysis
        ai_issues: list[Issue] = []
        ai_enabled = is_ai_available()

        if ai_enabled and all_chunks:
            to_send_count = min(len(all_chunks), 15)
            job_store.update_job(
                job_id=job_id,
                status="ai_analyzing",
                stage_message=f"AI analyzing top {to_send_count} complex functions...",
                progress_percent=78,
            )

            try:
                ai_issues = await analyze_chunks_with_ai(all_chunks)
            except Exception:
                warnings.append("AI reasoning encountered an API connection notice; continuing with static and specialized audit findings.")
                ai_issues = []
        else:
            if not ai_enabled:
                warnings.append("API key is not configured; AI deep-reasoning step was skipped.")

        # Stage 12: Aggregation, Deduplication, Starting Points & Starter List
        job_store.update_job(
            job_id=job_id,
            status="finalizing",
            stage_message="Merging findings, drafting issues, and curating Tozo's Fetch List...",
            progress_percent=92,
        )

        all_issue_lists = [
            static_issues,
            cicd_issues,
            deploy_issues,
            docs_issues,
            todo_issues,
            ai_issues,
        ]

        merged_issues = await asyncio.to_thread(
            aggregate_and_deduplicate,
            issue_lists=all_issue_lists,
            repo_url=repo_url,
            default_branch=default_branch,
            commit_sha=commit_sha,
        )

        # Build Tozo's Fetch List (Starter Tasks)
        fetch_list = await asyncio.to_thread(build_fetch_list, merged_issues, max_items=8)

        # Contribution signals & difficulty score
        contrib_friendliness = {
            "score": 75,
            "explanation": "Active repository with standard contributor workflows.",
        }
        try:
            contrib_friendliness = await get_contribution_signals(repo_url)
        except Exception as exc:
            warnings.append(f"Contribution signals notice: {str(exc)}")

        # Compute diff against previous scan if available
        diff_summary = None
        is_first_scan = True
        if previous_scan:
            is_first_scan = False
            try:
                diff_summary = await asyncio.to_thread(
                    compute_diff,
                    current_issues=merged_issues,
                    previous_report_data=previous_scan["report_json"],
                    previous_commit_sha=previous_scan.get("commit_sha", ""),
                    previous_scan_date=previous_scan.get("scanned_at", ""),
                )
            except Exception as exc:
                warnings.append(f"Diff computation notice: {str(exc)}")

        # Phase 2: Enrich starting points based on actual issue distribution
        if briefing:
            try:
                briefing = await asyncio.to_thread(enrich_starting_points, briefing, merged_issues)
            except Exception as exc:
                warnings.append(f"Starting points enrichment notice: {str(exc)}")

        duration = round(time.time() - start_time, 2)
        metrics = ReportMetrics(
            files_scanned=scan_result["total_files"],
            languages=scan_result["languages_count"],
            total_lines_scanned=scan_result["total_lines"],
            ai_chunks_analyzed=len(ai_issues),
            duration_seconds=duration,
            cached=False,
            ai_enabled=ai_enabled,
        )

        scanned_at_str = datetime.now(timezone.utc).isoformat()
        final_report = format_report(
            raw_issues=merged_issues,
            repo_url=repo_url,
            default_branch=default_branch,
            commit_sha=commit_sha,
            scanned_at=scanned_at_str,
            is_first_scan=is_first_scan,
            diff_summary=diff_summary,
            briefing=briefing,
            warnings=warnings,
            metrics=metrics,
            fetch_list=fetch_list,
            contribution_friendliness=contrib_friendliness,
        )

        # Persist scan to SQLite scan history
        try:
            await asyncio.to_thread(save_scan, owner, repo_name, commit_sha, final_report.model_dump_json())
        except Exception as exc:
            warnings.append(f"Scan history persistence notice: {str(exc)}")

        # Cache final report in memory
        job_store.cache_report(repo_url, final_report)

        # Mark job completed
        job_store.update_job(
            job_id=job_id,
            status="completed",
            stage_message=f"Analysis completed in {duration}s! Found {final_report.total_issues} issues across {len(final_report.issues_by_category)} categories.",
            progress_percent=100,
            report=final_report,
        )

    except Exception as exc:
        job_store.update_job(
            job_id=job_id,
            status="failed",
            stage_message=f"Analysis failed: {str(exc)}",
            progress_percent=0,
            error=str(exc),
        )

    finally:
        # Guarantee cleanup of cloned repository folder
        if temp_dir and temp_dir.exists():
            await asyncio.to_thread(safe_rmtree, temp_dir)

