"""Starter List Service — "Tozo's Fetch List"

Selects and curates beginner-friendly starter tasks from discovered repository issues.
Ideal for new contributors looking for low-risk, high-confidence first pull requests.
"""

from ..models.report_models import Issue

# Categories prioritized for first-time contributors
STARTER_CATEGORIES = {
    "typo": "Isolated spelling or typo fix with zero runtime regression risk.",
    "documentation": "Documentation or docstring clarification that helps onboard new developers.",
    "lint": "Formatting or static lint cleanup with straightforward lint feedback.",
    "test_coverage": "Isolated test addition or missing test case to boost test coverage safely.",
    "enhancement": "Lightweight code enhancement or clean-up with localized impact.",
}


def build_fetch_list(issues: list[Issue], max_items: int = 8) -> list[Issue]:
    """Curate top starter issues suitable for newcomers to pick up.

    Modifies qualifying issues in-place to set beginner_friendly=True and
    assigns a friendly beginner_reason.

    Args:
        issues: Full list of aggregated and deduplicated issues.
        max_items: Maximum number of starter tasks to return (default 8).

    Returns:
        list[Issue]: Sorted subset of beginner-friendly issues.
    """
    candidates: list[Issue] = []

    for issue in issues:
        cat = (issue.category or "").lower()
        sev = (issue.severity or "medium").lower()

        # Beginners should avoid high-severity issues (risk of architectural breaking changes)
        if sev == "high":
            continue

        if cat in STARTER_CATEGORIES:
            issue.beginner_friendly = True
            
            # Specific reason tailoring
            if cat == "typo":
                issue.beginner_reason = "Typo correction: fast review, safe merge, great first PR."
            elif cat == "documentation":
                issue.beginner_reason = "Documentation improvement: clarifies developer expectations without code risk."
            elif cat == "lint":
                issue.beginner_reason = "Linting cleanup: clear automated validation rules guide your patch."
            elif cat == "test_coverage":
                issue.beginner_reason = "Test addition: strengthens coverage without altering existing logic."
            else:
                issue.beginner_reason = STARTER_CATEGORIES[cat]

            candidates.append(issue)

    # Sort candidates: low severity first (lowest barrier), then typos, docs, lint
    priority_order = {"typo": 0, "documentation": 1, "lint": 2, "test_coverage": 3, "enhancement": 4}
    candidates.sort(
        key=lambda i: (
            0 if i.severity == "low" else 1,
            priority_order.get(i.category, 5),
            i.file.lower() if i.file else "",
        )
    )

    return candidates[:max_items]
