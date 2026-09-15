"""Draft GitHub Issue Service

Generates complete, technically accurate, actionable GitHub issue markdown
templates for individual code findings discovered by Tozo.
Complies with open-source maintainer specifications and standard GitHub issue structures.
"""

from typing import Optional
from pathlib import Path
from ..models.report_models import Issue


def _clean_title(issue: Issue, file_name: str, func_name: str) -> str:
    """Generate a concise, descriptive, and actionable issue title."""
    cat = (issue.category or "bug").lower()
    short_desc = (issue.description or "Potential issue detected").strip().split("\n")[0]
    
    # Strip common prefixes if already present
    for pfx in ["[bug]", "[typo]", "[lint]", "[backend]", "[frontend]", "[security]", "error:", "warning:"]:
        if short_desc.lower().startswith(pfx):
            short_desc = short_desc[len(pfx):].strip()

    target = f"`{func_name}()`" if func_name else f"`{file_name}`"

    if cat == "typo":
        return f"Fix typo in {target}"
    elif cat == "bug":
        return f"Fix defect in {target} where {short_desc.lower()}"
    elif cat == "error_handling":
        return f"Prevent unhandled exception and improve error handling in {target}"
    elif cat == "backend":
        return f"Harden request validation / handling in {target}"
    elif cat == "frontend":
        return f"Fix UI state or rendering issue in {target}"
    elif cat == "cicd":
        return f"Harden CI/CD workflow permissions and action versions in `{file_name}`"
    elif cat == "deployment":
        return f"Improve container configuration and security in `{file_name}`"
    elif cat == "documentation":
        return f"Update documentation and docstrings in {target}"
    elif cat == "lint":
        rule = f" ({issue.rule_id})" if issue.rule_id else ""
        return f"Resolve linting violation{rule} in {target}"
    elif cat == "test_coverage":
        return f"Add unit and regression test coverage for {target}"
    elif cat == "enhancement":
        return f"Optimize performance and algorithmic complexity in {target}"
    else:
        return f"Address {cat} in {target}: {short_desc}"


def format_draft_issue(
    issue: Issue,
    repo_url: str = "",
    commit_sha: str = "",
    default_branch: str = "main",
) -> dict[str, str]:
    """Create a complete, technically accurate, actionable GitHub issue.

    Args:
        issue: The issue finding to draft.
        repo_url: GitHub repository base URL.
        commit_sha: Cloned commit SHA (or empty string).
        default_branch: Default repository branch.

    Returns:
        dict[str, str]: {"title": str, "body": str}
    """
    file_display = issue.full_path or issue.file or "Unknown File"
    file_name = Path(file_display).name
    func_name = (issue.function_name or "").strip()
    line_start = issue.line_start or 1
    line_end = issue.line_end or line_start
    line_ref = f"L{line_start}" if line_start == line_end else f"L{line_start}-L{line_end}"
    cat = (issue.category or "bug").lower()
    cat_label = cat.replace("_", " ").title()
    rule_id = issue.rule_id or "AST_RULE"
    raw_desc = (issue.description or "Potential issue detected in codebase logic.").strip()

    # Generate title
    title = _clean_title(issue, file_name, func_name)

    # Permalinks
    target_ref = commit_sha[:7] if commit_sha else default_branch
    if repo_url and issue.full_path:
        base_clean = repo_url.rstrip("/")
        link_url = f"{base_clean}/blob/{target_ref}/{issue.full_path}#L{line_start}"
        code_ref_line = f"- [`{file_display}#L{line_start}`]({link_url})"
    else:
        code_ref_line = f"- `{file_display}:{line_start}`"

    # Execution flow ASCII diagram
    target_node = f"{func_name}()" if func_name else f"`{file_name}`"
    flow_diagram = f"""```text
Caller / Runtime invokes {target_node}
        |
        v
Execution proceeds to `{file_display}` ({line_ref})
        |
        v
Condition occurs: {raw_desc.split('.')[0]}
        |
        v
Potential failure / unexpected state is encountered
```"""

    # Minimal reproduction code snippet
    if issue.suggested_fix and "def " in issue.suggested_fix:
        minimal_snippet = issue.suggested_fix.strip()
    elif func_name:
        minimal_snippet = f"""# Call triggering the issue in {file_name}
from {file_display.replace('/', '.').replace('.py', '')} import {func_name}

# Invocation leading to defect
result = {func_name}(...)"""
    else:
        minimal_snippet = f"""# Inspect {file_display} around line {line_start}
# Observed rule / condition: {rule_id}"""

    # Proposed solution code block
    if issue.suggested_fix:
        fix_snippet = f"""```python
{issue.suggested_fix.strip()}
```"""
    else:
        fix_snippet = f"""Review `{file_display}` at line {line_start} and apply the recommended pattern for `{rule_id}` to prevent unhandled conditions."""

    # Impact assessment
    if cat in ("bug", "error_handling"):
        impact_text = (
            f"**Correctness and Reliability**: Causes unhandled exceptions or invalid state during execution. "
            f"Severity is classified as **{issue.severity.upper()}** because caller modules may crash unexpectedly if inputs match this condition."
        )
    elif cat == "backend":
        impact_text = (
            f"**Backend Robustness & Security**: May cause unhandled API errors, inefficient database querying, "
            f"or resource leaks under concurrent requests. Severity: **{issue.severity.upper()}**."
        )
    elif cat in ("cicd", "deployment"):
        impact_text = (
            f"**Build Integrity & Supply Chain Security**: Affects automated workflows or container security. "
            f"Severity: **{issue.severity.upper()}**."
        )
    elif cat in ("typo", "documentation"):
        impact_text = (
            f"**Maintainability & Developer Experience**: Clarifies naming or documentation conventions for contributors. "
            f"Severity: **LOW** (safe starter issue)."
        )
    else:
        impact_text = (
            f"**Codebase Quality & Maintainability**: Resolves stylistic inconsistency or minor defect. "
            f"Severity: **{issue.severity.upper()}**."
        )

    # Testing recommendations
    if func_name:
        testing_text = f"""Add a targeted unit test verifying that `{func_name}()` handles this condition cleanly:
1. Exercise `{func_name}()` with normal and boundary parameters.
2. Verify that `{raw_desc.split('.')[0]}` is handled without unexpected exceptions.
3. Confirm that all existing tests in the test suite continue to pass."""
    else:
        testing_text = f"""Verify the fix in `{file_display}`:
1. Run the existing test suite (e.g. `pytest` or `npm test`).
2. Verify that the linter/check for `{rule_id}` passes cleanly without warnings."""

    func_ref_line = f"- `{func_name}()`" if func_name else f"- `{file_name}`"

    # Build the full standardized issue body
    body = f"""## Description

In `{file_display}`, an issue was identified regarding: {raw_desc}

1. **Current behavior**: The codebase currently exhibits `{raw_desc.split('.')[0]}` at `{line_ref}`.
2. **Expected behavior**: The code should execute reliably, validate bounds/inputs, and adhere to repository conventions.
3. **Problem justification**: Leaving this unaddressed risks unexpected runtime crashes, degraded maintainability, or API contract violations.

---

## Current Behavior

When `{target_node}` executes under standard runtime conditions, the following behavior occurs:
- Location: `{file_display}` at line {line_start}.
- Condition: {raw_desc}

### Execution Flow
{flow_diagram}

---

## Expected Behavior

- Execution should complete deterministically without unhandled states or contract violations.
- When boundary inputs or edge cases occur, the component should handle them gracefully or raise an informative, typed error.
- All code should satisfy `{rule_id}` conventions.

---

## Technical Analysis

- **File Path**: `{file_display}`
- **Function/Component**: `{func_name or 'Module Level'}`
- **Line Range**: `{line_ref}`
- **Rule / Audit Identifier**: `{rule_id}`
- **Detection Source**: `{issue.source}`
- **Root Cause**: The implementation at line {line_start} lacks appropriate guards or formatting, causing: {raw_desc}

---

## Steps to Reproduce

1. Inspect `{file_display}` at `{line_ref}`.
2. Trace callers invoking `{target_node}`.
3. Observe that {raw_desc.split('.')[0]}.

---

## Minimal Reproduction

```python
{minimal_snippet}
```

---

## Actual Result

```text
{raw_desc}
```

---

## Expected Result

```text
Component handles condition cleanly and conforms to repository standards.
```

---

## Impact

{impact_text}

---

## Proposed Solution

{fix_snippet}

---

## Alternatives Considered

- **Ignoring the check**: Less suitable as it leaves dormant defects in the codebase.
- **Applying targeted fix in `{file_display}`**: Preferred approach as it preserves backwards compatibility, requires minimal diff footprint, and isolates changes.

---

## Scope

### In Scope
- Modify `{file_display}` at `{line_ref}` to resolve `{rule_id}`.
- Preserve all existing public contracts and behavior.
- Add regression coverage for the affected logic.

### Out of Scope
- Major architectural refactoring of unrelated modules.
- Introducing new external dependencies.

---

## Testing

{testing_text}

---

## Acceptance Criteria

- [ ] Defect at `{file_display}:{line_start}` is resolved.
- [ ] Conforms to rule `{rule_id}`.
- [ ] Existing project test suite passes without regressions.
- [ ] No unrelated files or behaviors are altered.

---

## Relevant Code References

Relevant files:
{code_ref_line}

Relevant functions:
{func_ref_line}

Detection Source:
- Engine: `{issue.source}`
- Rule: `{rule_id}`
""".strip()

    return {
        "title": title,
        "body": body,
    }
