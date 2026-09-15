"""TODO & Technical Debt Scanner Service

Scans code files for TODO, FIXME, and HACK markers to capture
backlogged tasks and technical debt.
"""

import re
from pathlib import Path
from ..models.report_models import Issue
from ..utils.file_helpers import to_relative_path

TODO_PATTERN = re.compile(
    r'(?:#|//|/\*+|<!--|;)\s*(TODO|FIXME|HACK|XXX|BUG)\b[:\s\-]*(.*)',
    re.IGNORECASE,
)


def extract_todos(code_files: list[Path | str], repo_root: Path | str, max_todos: int = 30) -> list[Issue]:
    """Extract TODO, FIXME, and HACK comments across all code files.

    Args:
        code_files: List of all valid source code files.
        repo_root: Root directory of cloned repository.
        max_todos: Maximum number of items to record.

    Returns:
        list[Issue]: Discovered enhancement tasks and technical debt items.
    """
    issues: list[Issue] = []
    root = Path(repo_root)

    for fpath in code_files:
        p = Path(fpath)
        rel_path = to_relative_path(p, root)

        try:
            with open(p, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()
        except Exception:
            continue

        for idx, line in enumerate(lines):
            line_num = idx + 1
            match = TODO_PATTERN.search(line)
            if match:
                marker = match.group(1).upper()
                comment = match.group(2).strip()

                # Clean comment ending */ or -->
                comment = re.sub(r'(\*+/|-->)$', '', comment).strip()
                if not comment:
                    comment = "Unspecified technical debt or pending task."

                # Truncate long comments
                if len(comment) > 140:
                    comment = comment[:137] + "..."

                # Severity assignment
                severity = "medium" if marker in {"FIXME", "BUG", "HACK"} else "low"

                issues.append(
                    Issue(
                        category="enhancement",
                        severity=severity,
                        file=p.name,
                        full_path=rel_path,
                        line_start=line_num,
                        line_end=line_num,
                        description=f"[{marker}] {comment}",
                        suggested_fix=f"Review and resolve outstanding {marker} comment.",
                        source="scanner",
                        rule_id=f"DEBT_{marker}",
                    )
                )

                if len(issues) >= max_todos:
                    return issues

    return issues
