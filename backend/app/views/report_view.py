"""Report View (The 'V' in MVC)

Formats raw aggregated issues into the final structured Report model.
Organizes issues across the full 11-category taxonomy and sorts by severity.
"""

from typing import Optional
from ..models.report_models import Issue, Report, ReportMetrics, RepoBriefing, DiffSummary, ALL_CATEGORIES

SEVERITY_ORDER = {"high": 0, "medium": 1, "low": 2}


def format_report(
    raw_issues: list[Issue],
    repo_url: str,
    default_branch: str = "main",
    commit_sha: str = "",
    scanned_at: str = "",
    is_first_scan: bool = True,
    diff_summary: Optional[DiffSummary] = None,
    briefing: Optional[RepoBriefing] = None,
    warnings: Optional[list[str]] = None,
    metrics: Optional[ReportMetrics] = None,
    fetch_list: Optional[list[Issue]] = None,
    contribution_friendliness: Optional[dict] = None,
) -> Report:
    """Take a flat list of issues and format them into the 11-category Report model.

    Args:
        raw_issues: All deduplicated issues across static tools and AI.
        repo_url: Normalized GitHub repository URL.
        default_branch: Cloned repository default branch name.
        commit_sha: Cloned commit SHA.
        scanned_at: Scan timestamp string.
        is_first_scan: True if this is the first scan recorded in SQLite.
        diff_summary: Changes compared to previous scan.
        briefing: Optional RepoBriefing summary and starting points.
        warnings: Optional list of non-fatal pipeline notices.
        metrics: Repository scan metrics.
        fetch_list: Curated starter issues list for newcomers.
        contribution_friendliness: Contribution difficulty score and explanation.

    Returns:
        Report: Validated Pydantic model ready to serialize as JSON.
    """
    categories: dict[str, list[Issue]] = {cat: [] for cat in ALL_CATEGORIES}

    # Extract owner/repo name for clean display (e.g. 'pallets/flask')
    repo_name = repo_url.split("github.com/")[-1] if "github.com/" in repo_url else repo_url

    for issue in raw_issues:
        cat = (issue.category or "").lower()

        # Map legacy or synonym categories into canonical 11-category taxonomy
        if cat in categories:
            target_cat = cat
        elif cat == "performance":
            target_cat = "backend" if "backend" in (issue.folder or "").lower() else "enhancement"
        elif cat == "security":
            target_cat = "backend"
        elif cat in {"readability", "style"}:
            target_cat = "lint"
        elif cat in {"todo", "technical_debt"}:
            target_cat = "enhancement"
        elif cat in {"test", "tests"}:
            target_cat = "test_coverage"
        else:
            target_cat = "bug"

        categories[target_cat].append(issue)

    # Sort each category: High severity first, then Medium, then Low
    for cat_name, issue_list in categories.items():
        issue_list.sort(
            key=lambda item: (
                SEVERITY_ORDER.get(item.severity.lower(), 99),
                (item.file or "").lower(),
                item.line_start or item.line or 0,
            )
        )

    total_issues = sum(len(items) for items in categories.values())
    report_metrics = metrics or ReportMetrics()

    default_contrib = {
        "score": 75,
        "explanation": "Active repository with recent commit history and standard workflow checks.",
    }

    return Report(
        repo_url=repo_url,
        repo_name=repo_name,
        default_branch=default_branch,
        commit_sha=commit_sha,
        scanned_at=scanned_at,
        is_first_scan=is_first_scan,
        diff_summary=diff_summary,
        briefing=briefing,
        total_issues=total_issues,
        warnings=warnings or [],
        fetch_list=fetch_list or [],
        contribution_friendliness=contribution_friendliness or default_contrib,
        issues_by_category=categories,
        metrics=report_metrics,
    )
