"""Aggregator Service

Merges findings across static tools, AST, linters, specialized audit services,
and AI engine.
Deduplicates overlapping issues using file location and proximity matching (±2 lines).
Attaches deep GitHub source links to all finalized issues.
"""

import re
from pathlib import Path
from ..models.report_models import Issue
from ..utils.file_helpers import build_github_link
from .draft_service import format_draft_issue


def tokenize(text: str) -> set[str]:
    """Tokenize text into lowercase words of length >= 3 for similarity testing."""
    return {w.lower() for w in re.findall(r"[A-Za-z]{3,}", text)}


def are_issues_duplicate(issue_a: Issue, issue_b: Issue) -> bool:
    """Check if two issues refer to the same defect."""
    # Compare normalized paths
    path_a = (issue_a.full_path or issue_a.file).lower()
    path_b = (issue_b.full_path or issue_b.file).lower()

    if path_a != path_b:
        return False

    line_a = issue_a.line_start or issue_a.line or 0
    line_b = issue_b.line_start or issue_b.line or 0

    # Must be within ±2 lines of each other
    if abs(line_a - line_b) > 2:
        return False

    # If both share a matching rule_id, definitely duplicate
    if issue_a.rule_id and issue_b.rule_id and issue_a.rule_id == issue_b.rule_id:
        return True

    # Check word similarity in description
    tokens_a = tokenize(issue_a.description)
    tokens_b = tokenize(issue_b.description)

    if not tokens_a or not tokens_b:
        return abs(line_a - line_b) <= 1

    intersection = tokens_a.intersection(tokens_b)
    union = tokens_a.union(tokens_b)
    similarity = len(intersection) / len(union) if union else 0.0

    return similarity >= 0.35


def normalize_issue_locations(issue: Issue) -> Issue:
    """Ensure folder, file, and full_path are consistently populated."""
    full = (issue.full_path or issue.file or "").replace("\\", "/").lstrip("/")
    issue.full_path = full

    if full:
        p = Path(full)
        issue.file = p.name
        issue.folder = str(p.parent).replace("\\", "/") if str(p.parent) != "." else ""
    return issue


def aggregate_and_deduplicate(
    issue_lists: list[list[Issue]],
    repo_url: str = "",
    default_branch: str = "main",
    commit_sha: str = "",
) -> list[Issue]:
    """Merge issue lists from all pipeline stages, deduplicate, and attach GitHub links and draft issue text.

    Args:
        issue_lists: List of issue lists from all analyzers.
        repo_url: Repository URL for deep link creation.
        default_branch: Cloned repository branch name.
        commit_sha: Commit SHA of cloned repository.

    Returns:
        list[Issue]: Clean, deduplicated, enriched issues list.
    """
    merged: list[Issue] = []

    for issue_list in issue_lists:
        if not issue_list:
            continue

        for new_issue in issue_list:
            normalize_issue_locations(new_issue)

            # Check duplication against already accepted issues
            is_dup = False
            for idx, existing in enumerate(merged):
                if are_issues_duplicate(new_issue, existing):
                    is_dup = True
                    # If incoming issue is from AI and has a suggested fix, prioritize its fix
                    if new_issue.source == "ai" and new_issue.suggested_fix and not existing.suggested_fix:
                        existing.suggested_fix = new_issue.suggested_fix
                        existing.description = f"{existing.description} | AI Note: {new_issue.description}"
                    break

            if not is_dup:
                merged.append(new_issue)

    # Attach GitHub deep links and draft issue templates
    for issue in merged:
        if repo_url and issue.full_path:
            issue.github_link = build_github_link(
                repo_url=repo_url,
                default_branch=default_branch,
                full_path=issue.full_path,
                line_start=issue.line_start,
                line_end=issue.line_end,
            )
        
        # Populate draft issue text
        draft = format_draft_issue(
            issue=issue,
            repo_url=repo_url,
            commit_sha=commit_sha,
            default_branch=default_branch,
        )
        issue.draft_title = draft["title"]
        issue.draft_body = draft["body"]

    return merged
