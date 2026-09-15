"""Repository Briefing Service (Two-Phase Architecture)

Generates an executive briefing of the codebase:
- Deterministic Ground-Truth Facts: Verifies dependencies, CI/CD, tests, containers,
  licenses, and CONTRIBUTING.md with clickable GitHub source links.
- AI Executive Narrative: AI analysis explaining architecture, design patterns,
  and contributing conventions.
- Phase 2 (Post-Aggregation): Enriches starting points by analyzing actual
  issue density across folders and files (zero extra AI cost).
"""

import json
from pathlib import Path
from typing import Optional
from openai import AsyncOpenAI
from ..config import (
    get_ai_base_url,
    get_ai_model,
    is_ai_available,
    get_api_key,
)
from ..models.report_models import RepoBriefing, Issue
from ..utils.file_helpers import build_github_link, to_relative_path

BRIEFING_PROMPT = """You are an expert software architect analyzing an open-source codebase.
Based on the provided repository metadata, dependency files, README excerpt, and community CONTRIBUTING guidelines, generate an executive briefing.

Return ONLY a JSON object in this exact shape:
{
  "summary": "<2-3 sentence overview of what this repository does and its primary purpose>",
  "ai_analysis": "<3-5 sentence narrative explaining how the codebase is structured, primary architectural boundaries, data/request flows, and key contributor conventions>",
  "tech_stack": ["<tech1>", "<tech2>", "<tech3>"],
  "architecture_explanation": "<2-4 sentences explaining component interaction>",
  "suggested_starting_points": [
    "<Key file or module to inspect first>",
    "<Second important entrypoint or config>",
    "<Third critical component>"
  ]
}
"""


def gather_repo_context(root: Path, scanner_output: dict, repo_url: str = "", default_branch: str = "main") -> dict:
    """Collect non-AI structural metadata and build deterministic verified facts."""
    special = scanner_output.get("special_files", {})
    languages = scanner_output.get("languages_count", {})

    # Top-level directory names
    top_dirs = [
        d.name for d in root.iterdir()
        if d.is_dir() and not d.name.startswith(".") and d.name not in {"node_modules", "venv", "__pycache__"}
    ]

    # Primary languages sorted by frequency
    sorted_langs = sorted(languages.items(), key=lambda x: x[1], reverse=True)
    total_lang_files = sum(languages.values()) or 1
    primary_languages = [lang for lang, _ in sorted_langs[:4]]

    # Readme excerpt
    readme_excerpt = ""
    readme_path = special.get("readme")
    if readme_path and Path(readme_path).exists():
        try:
            content = Path(readme_path).read_text(encoding="utf-8", errors="ignore").strip()
            readme_excerpt = content[:2500]
        except Exception:
            pass

    # Contributing guidelines excerpt
    contributing_excerpt = ""
    contributing_path = special.get("contributing")
    if contributing_path and Path(contributing_path).exists():
        try:
            content = Path(contributing_path).read_text(encoding="utf-8", errors="ignore").strip()
            contributing_excerpt = content[:2000]
        except Exception:
            pass

    # Dependencies excerpt
    deps_text = ""
    detected_manifests = []
    for dep_name in ["requirements.txt", "package.json", "pyproject.toml", "Cargo.toml", "go.mod", "pom.xml", "build.gradle"]:
        dep_file = root / dep_name
        if dep_file.exists():
            detected_manifests.append(dep_name)
            try:
                snippet = dep_file.read_text(encoding="utf-8", errors="ignore")[:1000]
                deps_text += f"\n--- {dep_name} ---\n{snippet}\n"
            except Exception:
                pass

    # Build verified facts deterministically (Ground truth without AI)
    verified_facts: list[dict] = []

    # 1. Languages fact
    if sorted_langs:
        lang_parts = [f"{lang} ({round(count / total_lang_files * 100)}%)" for lang, count in sorted_langs[:3]]
        verified_facts.append({
            "text": f"Dominant codebase language composition: {', '.join(lang_parts)}.",
            "github_link": None,
            "category": "stack",
        })

    # 2. Dependency manifests
    for manifest in detected_manifests:
        link = build_github_link(repo_url, default_branch, manifest) if repo_url else None
        verified_facts.append({
            "text": f"Dependency manifest detected: `{manifest}` defines external project dependencies.",
            "github_link": link,
            "category": "stack",
        })

    # 3. CI/CD workflows
    workflow_files = special.get("workflow_files", [])
    if workflow_files:
        first_wf = to_relative_path(workflow_files[0], root)
        link = build_github_link(repo_url, default_branch, first_wf) if repo_url else None
        verified_facts.append({
            "text": f"GitHub Actions automated workflow pipeline configured ({len(workflow_files)} workflow file{'s' if len(workflow_files) > 1 else ''}).",
            "github_link": link,
            "category": "ci",
        })

    # 4. Containers / Docker
    dockerfile = special.get("dockerfile")
    if dockerfile:
        df_rel = to_relative_path(dockerfile, root)
        link = build_github_link(repo_url, default_branch, df_rel) if repo_url else None
        verified_facts.append({
            "text": f"Container deployment specification verified in `{df_rel}`.",
            "github_link": link,
            "category": "docker",
        })

    # 5. Tests
    test_folder = special.get("tests_folder")
    if test_folder:
        tf_rel = to_relative_path(test_folder, root)
        link = build_github_link(repo_url, default_branch, tf_rel) if repo_url else None
        verified_facts.append({
            "text": f"Automated test suite located in `{tf_rel}/` directory.",
            "github_link": link,
            "category": "testing",
        })

    # 6. Contributing guide
    if contributing_path:
        cb_rel = to_relative_path(contributing_path, root)
        link = build_github_link(repo_url, default_branch, cb_rel) if repo_url else None
        verified_facts.append({
            "text": f"Contributor onboarding guidelines documented in `{cb_rel}`.",
            "github_link": link,
            "category": "guidelines",
        })

    # 7. Documentation / README
    if readme_path:
        rm_rel = to_relative_path(readme_path, root)
        link = build_github_link(repo_url, default_branch, rm_rel) if repo_url else None
        verified_facts.append({
            "text": f"Project overview and documentation defined in `{rm_rel}`.",
            "github_link": link,
            "category": "docs",
        })

    return {
        "top_dirs": top_dirs,
        "primary_languages": primary_languages,
        "readme_excerpt": readme_excerpt,
        "contributing_excerpt": contributing_excerpt,
        "deps_text": deps_text,
        "verified_facts": verified_facts,
        "has_ci": bool(workflow_files),
        "has_tests": bool(test_folder),
        "has_docker": bool(dockerfile),
        "has_contributing": bool(contributing_path),
    }


async def generate_briefing_summary(
    local_path: Path | str,
    scanner_output: dict,
    repo_url: str = "",
    default_branch: str = "main",
) -> tuple[RepoBriefing, Optional[str]]:
    """Phase 1: Generate repository executive summary and architecture explanation.

    Returns:
        tuple[RepoBriefing, Optional[str]]: (briefing_object, optional_warning_message)
    """
    root = Path(local_path).resolve()
    context = gather_repo_context(root, scanner_output, repo_url=repo_url, default_branch=default_branch)
    warning_msg: Optional[str] = None

    default_summary = (
        f"Repository structured across {len(context['top_dirs'])} primary modules "
        f"built predominantly with {', '.join(context['primary_languages']) or 'standard source code'}."
    )

    default_analysis = (
        f"This project uses a modular layout with {len(context['top_dirs'])} primary directories. "
        f"Source execution centers around {', '.join(context['primary_languages']) or 'standard code'}."
    )
    if context["has_ci"]:
        default_analysis += " Automated continuous integration workflows validate code changes."
    if context["has_docker"]:
        default_analysis += " Container configurations allow reproducible local builds and deployments."

    briefing = RepoBriefing(
        verified_facts=context["verified_facts"],
        ai_analysis=default_analysis,
        summary=default_summary,
        tech_stack=context["primary_languages"] + (["Docker"] if context["has_docker"] else []) + (["GitHub Actions"] if context["has_ci"] else []),
        architecture_explanation=f"Top-level directory structure includes: {', '.join(context['top_dirs']) or 'flat structure'}.",
        suggested_starting_points=[f"{d}/" for d in context["top_dirs"][:3]] or ["README.md"],
        has_ci=context["has_ci"],
        has_tests=context["has_tests"],
        has_docker=context["has_docker"],
        primary_languages=context["primary_languages"],
    )

    if not is_ai_available():
        return briefing, "API key not configured; repository briefing compiled via heuristic scan."

    user_prompt = (
        f"Repository Directory Overview: {', '.join(context['top_dirs'])}\n"
        f"Primary Languages: {', '.join(context['primary_languages'])}\n"
        f"Has CI Workflows: {context['has_ci']}\n"
        f"Has Tests Folder: {context['has_tests']}\n"
        f"Has Dockerfile: {context['has_docker']}\n"
        f"Has Contributing Guide: {context['has_contributing']}\n\n"
        f"README Excerpt:\n```\n{context['readme_excerpt']}\n```\n\n"
        f"Dependency Files:\n```\n{context['deps_text']}\n```\n"
    )

    if context["contributing_excerpt"]:
        user_prompt += f"\nCONTRIBUTING.md Excerpt:\n```\n{context['contributing_excerpt']}\n```\n"

    try:
        client = AsyncOpenAI(
            api_key=get_api_key(),
            base_url=get_ai_base_url(),
        )

        response = await client.chat.completions.create(
            model=get_ai_model(),
            messages=[
                {"role": "system", "content": BRIEFING_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
            max_tokens=850,
            timeout=25.0,
        )

        content = response.choices[0].message.content or ""
        cleaned = content.strip()
        if "```" in cleaned:
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]

        data = json.loads(cleaned)

        if isinstance(data, dict):
            briefing.summary = data.get("summary") or briefing.summary
            briefing.ai_analysis = data.get("ai_analysis") or data.get("summary") or briefing.ai_analysis
            if data.get("tech_stack"):
                briefing.tech_stack = list(dict.fromkeys(briefing.tech_stack + data["tech_stack"]))
            briefing.architecture_explanation = data.get("architecture_explanation") or briefing.architecture_explanation
            if data.get("suggested_starting_points"):
                briefing.suggested_starting_points = data["suggested_starting_points"]

    except Exception:
        warning_msg = "AI repo briefing encountered an API notice; using static structural summary."

    return briefing, warning_msg


def enrich_starting_points(briefing: RepoBriefing, aggregated_issues: list[Issue]) -> RepoBriefing:
    """Phase 2: Refine suggested starting points based on actual defect distribution across folders."""
    if not aggregated_issues:
        return briefing

    folder_counts: dict[str, int] = {}
    folder_files: dict[str, set[str]] = {}

    for issue in aggregated_issues:
        fld = issue.folder or "root"
        folder_counts[fld] = folder_counts.get(fld, 0) + 1
        if fld not in folder_files:
            folder_files[fld] = set()
        if issue.file:
            folder_files[fld].add(issue.file)

    sorted_folders = sorted(folder_counts.items(), key=lambda x: x[1], reverse=True)

    smart_points: list[str] = []
    for fld, count in sorted_folders[:3]:
        files_sample = list(folder_files.get(fld, []))[:2]
        files_str = f" (e.g. {', '.join(files_sample)})" if files_sample else ""
        smart_points.append(
            f"Inspect `{fld}/` — highest issue concentration ({count} items found){files_str}."
        )

    cicd_issues = [i for i in aggregated_issues if i.category == "cicd"]
    if cicd_issues and len(smart_points) < 4:
        smart_points.append(f"Review CI/CD workflow security in `.github/workflows/` ({len(cicd_issues)} warnings detected).")

    deploy_issues = [i for i in aggregated_issues if i.category == "deployment"]
    if deploy_issues and len(smart_points) < 4:
        smart_points.append(f"Harden container configuration in Dockerfile / Compose ({len(deploy_issues)} deployment notices).")

    if smart_points:
        briefing.suggested_starting_points = smart_points

    return briefing
