"""Diff Service for Re-Scan Change Tracking

Computes changes between repository scans across Git commits:
Identifies newly introduced issues and resolved issues using fuzzy file and line matching.
"""

import json
from typing import Optional
from ..models.report_models import Issue, DiffSummary


def _extract_issues_from_raw(raw_data: dict | str) -> list[dict]:
    """Normalize raw cached report JSON or dict into a flat list of issue dictionaries."""
    if isinstance(raw_data, str):
        try:
            data = json.loads(raw_data)
        except Exception:
            return []
    elif isinstance(raw_data, dict):
        data = raw_data
    else:
        return []

    issues_flat: list[dict] = []

    # Check issues_by_category
    cats = data.get("issues_by_category")
    if isinstance(cats, dict):
        for cat_name, items in cats.items():
            if isinstance(items, list):
                issues_flat.extend(items)
    elif "issues" in data and isinstance(data["issues"], list):
        issues_flat.extend(data["issues"])

    return issues_flat


def _match_issue(curr: Issue, prev_dict: dict) -> bool:
    """Check if a current Issue matches an issue in the previous scan."""
    curr_path = (curr.full_path or curr.file or "").strip().lower()
    prev_path = (prev_dict.get("full_path") or prev_dict.get("file") or "").strip().lower()

    if curr_path != prev_path:
        return False

    curr_cat = (curr.category or curr.type or "").strip().lower()
    prev_cat = (prev_dict.get("category") or prev_dict.get("type") or "").strip().lower()

    if curr_cat != prev_cat:
        return False

    curr_line = curr.line_start or curr.line or 0
    prev_line = prev_dict.get("line_start") or prev_dict.get("line") or 0

    # Match within line drift of ±2 lines
    if abs(curr_line - prev_line) <= 2:
        return True

    # Or match if identical rule_id
    curr_rule = curr.rule_id
    prev_rule = prev_dict.get("rule_id")
    if curr_rule and prev_rule and curr_rule == prev_rule:
        return True

    return False


def compute_diff(
    current_issues: list[Issue],
    previous_report_data: dict | str,
    previous_commit_sha: str = "",
    previous_scan_date: str = "",
) -> DiffSummary:
    """Compute newly emerged and resolved issues compared to previous scan."""
    prev_issues = _extract_issues_from_raw(previous_report_data)

    if not prev_issues:
        return DiffSummary(
            new_issues_count=len(current_issues),
            resolved_issues_count=0,
            previous_commit_sha=previous_commit_sha[:7] if previous_commit_sha else "",
            previous_scan_date=previous_scan_date,
        )

    # 1. Find new issues (present in current but not in previous)
    new_count = 0
    new_ids: list[str] = []
    matched_prev_indices: set[int] = set()

    for idx, curr in enumerate(current_issues):
        matched = False
        for p_idx, prev in enumerate(prev_issues):
            if _match_issue(curr, prev):
                matched = True
                matched_prev_indices.add(p_idx)
                break
        if not matched:
            new_count += 1
            new_ids.append(f"{curr.file}:{curr.line_start}")

    # 2. Find resolved issues (present in previous but absent in current)
    resolved_count = 0
    resolved_ids: list[str] = []

    for p_idx, prev in enumerate(prev_issues):
        if p_idx not in matched_prev_indices:
            resolved_count += 1
            prev_file = prev.get("file") or prev.get("full_path") or "file"
            prev_line = prev.get("line_start") or prev.get("line") or 1
            resolved_ids.append(f"{prev_file}:{prev_line}")

    return DiffSummary(
        new_issues_count=new_count,
        resolved_issues_count=resolved_count,
        new_issue_ids=new_ids[:20],
        resolved_issue_ids=resolved_ids[:20],
        previous_commit_sha=previous_commit_sha[:7] if previous_commit_sha else "",
        previous_scan_date=previous_scan_date,
    )
