"""Documentation Audit Service

Audits repository documentation quality:
1. Verifies existence and completeness of README.md.
2. Checks for presence of CONTRIBUTING.md guidelines.
3. Uses Python AST to flag public functions and classes missing docstrings.
"""

import ast
from pathlib import Path
from typing import Optional
from ..models.report_models import Issue
from ..utils.file_helpers import to_relative_path, detect_language


def check_documentation(
    readme_path: Optional[Path | str],
    contributing_path: Optional[Path | str],
    code_files: list[Path | str],
    repo_root: Path | str,
) -> list[Issue]:
    """Audit project documentation and code comments.

    Args:
        readme_path: Path to README file if found.
        contributing_path: Path to CONTRIBUTING file if found.
        code_files: List of all source code files in the repo.
        repo_root: Root directory of cloned repository.

    Returns:
        list[Issue]: Discovered documentation deficiencies.
    """
    issues: list[Issue] = []
    root = Path(repo_root)

    # 1. README Verification
    if not readme_path or not Path(readme_path).exists():
        issues.append(
            Issue(
                category="documentation",
                severity="medium",
                file="README.md",
                full_path="README.md",
                line_start=1,
                line_end=1,
                description="Repository is missing a README file to guide users and developers.",
                suggested_fix="Create a README.md detailing project goals, prerequisites, setup, and usage examples.",
                source="scanner",
                rule_id="DOCS_MISSING_README",
            )
        )
    else:
        readme_file = Path(readme_path)
        try:
            content = readme_file.read_text(encoding="utf-8", errors="ignore").strip()
            if len(content) < 100:
                issues.append(
                    Issue(
                        category="documentation",
                        severity="low",
                        file=readme_file.name,
                        full_path=to_relative_path(readme_file, root),
                        line_start=1,
                        line_end=1,
                        description=f"README file '{readme_file.name}' is very brief ({len(content)} characters).",
                        suggested_fix="Expand the README with installation instructions, architecture overview, and usage guides.",
                        source="scanner",
                        rule_id="DOCS_SHORT_README",
                    )
                )
        except Exception:
            pass

    # 2. CONTRIBUTING.md Verification
    if not contributing_path or not Path(contributing_path).exists():
        issues.append(
            Issue(
                category="documentation",
                severity="low",
                file="CONTRIBUTING.md",
                full_path="CONTRIBUTING.md",
                line_start=1,
                line_end=1,
                description="Repository lacks a CONTRIBUTING.md guide for open-source collaboration.",
                suggested_fix="Add CONTRIBUTING.md outlining PR standards, code style, and test requirements.",
                source="scanner",
                rule_id="DOCS_MISSING_CONTRIBUTING",
            )
        )

    # 3. Public Functions/Classes Missing Docstrings (Python AST)
    missing_docstring_count = 0
    max_docstring_issues = 12  # Cap to prevent noise on large codebases

    for fpath in code_files:
        p = Path(fpath)
        if detect_language(p) != "Python":
            continue

        rel_path = to_relative_path(p, root)

        try:
            source = p.read_text(encoding="utf-8", errors="ignore")
            tree = ast.parse(source, filename=str(p))
        except Exception:
            continue

        for node in tree.body:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                # Only check public functions and classes
                name = node.name
                if name.startswith("_") or name.lower().startswith("test"):
                    continue

                if not ast.get_docstring(node):
                    node_type = "Class" if isinstance(node, ast.ClassDef) else "Function"
                    issues.append(
                        Issue(
                            category="documentation",
                            severity="low",
                            file=p.name,
                            full_path=rel_path,
                            line_start=node.lineno,
                            line_end=getattr(node, "end_lineno", node.lineno),
                            function_name=name,
                            description=f"Public {node_type} '{name}' is missing a docstring.",
                            suggested_fix=f'Add a descriptive docstring explaining the purpose, parameters, and return value of `{name}`.',
                            source="scanner",
                            rule_id="DOCS_MISSING_DOCSTRING",
                        )
                    )
                    missing_docstring_count += 1
                    if missing_docstring_count >= max_docstring_issues:
                        break

        if missing_docstring_count >= max_docstring_issues:
            break

    return issues
