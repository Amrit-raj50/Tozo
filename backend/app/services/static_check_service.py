"""Static Code Analysis Service

Runs static analysis checks using:
1. Built-in Python AST analyzer findings.
2. Multi-language test coverage heuristic (Python, JS/TS, Go, Java).
3. Ruff linter (if installed in environment).
4. Codespell typo finder (if installed in environment).
"""

import json
import shutil
import subprocess
from pathlib import Path
from typing import Optional
from ..models.report_models import Issue
from ..utils.file_helpers import to_relative_path, detect_language


def check_test_coverage_heuristic(
    code_files: list[Path | str],
    repo_root: Path | str,
    max_test_issues: int = 15,
) -> list[Issue]:
    """Flag source code files that lack corresponding automated unit test files.

    Multi-language heuristics:
    - Python: user_service.py -> test_user_service.py / user_service_test.py
    - JS/TS: Button.jsx -> Button.test.jsx / Button.spec.js / __tests__/Button.test.tsx
    - Go: server.go -> server_test.go
    - Java: OrderService.java -> OrderServiceTest.java / TestOrderService.java
    """
    issues: list[Issue] = []
    root = Path(repo_root).resolve()

    # Collect all existing filenames across the repository for fast O(1) lookup
    all_repo_filenames = {Path(f).name.lower(): Path(f) for f in code_files}

    # Files to exclude from test requirements
    EXCLUDED_FILENAMES = {
        "__init__.py", "conftest.py", "setup.py", "manage.py",
        "wsgi.py", "asgi.py", "config.py", "settings.py",
        "vite.config.js", "vite.config.ts", "tailwind.config.js",
        "next.config.js", "webpack.config.js", "main.py", "main.jsx",
        "main.tsx", "app.jsx", "app.tsx", "index.js", "index.ts",
    }

    for fpath in code_files:
        p = Path(fpath)
        name_lower = p.name.lower()
        rel_path = to_relative_path(p, root)

        # Skip files already in a test folder or already a test file
        parts_lower = [part.lower() for part in p.parts]
        if any(t in parts_lower for t in ["tests", "test", "__tests__", "spec", "specs"]):
            continue
        if name_lower.startswith("test_") or name_lower.endswith("_test.py") or ".test." in name_lower or ".spec." in name_lower:
            continue
        if name_lower in EXCLUDED_FILENAMES:
            continue

        lang = detect_language(p)
        if not lang:
            continue

        stem = p.stem.lower()
        ext = p.suffix.lower()
        has_test = False

        # 1. Python
        if lang == "Python":
            possible = {f"test_{stem}.py", f"{stem}_test.py"}
            if any(name in all_repo_filenames for name in possible):
                has_test = True

        # 2. JavaScript / TypeScript
        elif "JavaScript" in lang or "TypeScript" in lang:
            possible = {
                f"{stem}.test.js", f"{stem}.test.jsx", f"{stem}.test.ts", f"{stem}.test.tsx",
                f"{stem}.spec.js", f"{stem}.spec.jsx", f"{stem}.spec.ts", f"{stem}.spec.tsx",
            }
            if any(name in all_repo_filenames for name in possible):
                has_test = True

        # 3. Go
        elif lang == "Go":
            if f"{stem}_test.go" in all_repo_filenames:
                has_test = True

        # 4. Java
        elif lang == "Java":
            possible = {f"{stem}test.java", f"test{stem}.java"}
            if any(name in all_repo_filenames for name in possible):
                has_test = True
        else:
            has_test = True  # Skip other languages

        if not has_test:
            sample_test_name = (
                f"test_{p.stem}.py" if lang == "Python"
                else f"{p.stem}.test{ext}" if "JavaScript" in lang or "TypeScript" in lang
                else f"{p.stem}_test.go" if lang == "Go"
                else f"{p.stem}Test.java"
            )

            issues.append(
                Issue(
                    category="test_coverage",
                    severity="low",
                    file=p.name,
                    full_path=rel_path,
                    line_start=1,
                    line_end=1,
                    description=f"No automated test file detected corresponding to source file '{p.name}'.",
                    suggested_fix=f"Add unit tests in a matching test file (e.g. `{sample_test_name}`).",
                    source="scanner",
                    rule_id="MISSING_UNIT_TEST",
                )
            )

            if len(issues) >= max_test_issues:
                break

    return issues


def run_ruff_check(repo_root: Path | str) -> list[Issue]:
    """Execute 'ruff check --output-format=json' if ruff binary exists."""
    issues: list[Issue] = []
    ruff_bin = shutil.which("ruff")
    if not ruff_bin:
        return issues

    root = Path(repo_root).resolve()
    cmd = [ruff_bin, "check", "--output-format=json", str(root)]

    try:
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=30,
        )
        if proc.stdout:
            data = json.loads(proc.stdout)
            for item in data:
                code = item.get("code", "")
                filename = item.get("filename", "")
                rel_file = to_relative_path(filename, root)
                message = item.get("message", "")
                row = item.get("location", {}).get("row", 1)

                severity = "medium"
                category = "lint"

                if code.startswith("E9") or code.startswith("F"):
                    severity = "high"
                    category = "bug"
                elif code.startswith("S"):
                    severity = "high"
                    category = "backend"
                elif code.startswith("B"):
                    severity = "medium"
                    category = "bug"
                elif code.startswith("C"):
                    severity = "medium"
                    category = "enhancement"

                issues.append(
                    Issue(
                        category=category,
                        severity=severity,
                        file=Path(filename).name,
                        full_path=rel_file,
                        line_start=row,
                        line_end=row,
                        description=f"[{code}] {message}",
                        suggested_fix=f"Resolve ruff rule violation {code}.",
                        source="static_tool",
                        rule_id=code,
                    )
                )
    except Exception:
        pass

    return issues


def run_codespell_check(repo_root: Path | str) -> list[Issue]:
    """Execute 'codespell' if available."""
    issues: list[Issue] = []
    codespell_bin = shutil.which("codespell")
    if not codespell_bin:
        return issues

    root = Path(repo_root).resolve()
    cmd = [codespell_bin, str(root)]

    try:
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=20,
        )
        lines = (proc.stdout or "").splitlines()
        for line in lines[:30]:
            parts = line.split(":", 2)
            if len(parts) >= 3:
                raw_file = parts[0].strip()
                rel_file = to_relative_path(raw_file, root)
                try:
                    line_no = int(parts[1].strip())
                except ValueError:
                    line_no = 1
                desc = parts[2].strip()
                issues.append(
                    Issue(
                        category="typo",
                        severity="low",
                        file=Path(raw_file).name,
                        full_path=rel_file,
                        line_start=line_no,
                        line_end=line_no,
                        description=f"Typo: {desc}",
                        suggested_fix="Correct spelling as suggested.",
                        source="static_tool",
                        rule_id="CODESPELL",
                    )
                )
    except Exception:
        pass

    return issues


def run_static_checks(
    repo_root: Path | str,
    code_files: Optional[list[Path | str]] = None,
    precomputed_ast_issues: Optional[list[Issue]] = None,
) -> list[Issue]:
    """Run all available static checks, test coverage heuristic, and merge findings.

    Args:
        repo_root: Root directory of cloned repository.
        code_files: All discovered source files for test coverage checking.
        precomputed_ast_issues: Pre-parsed AST issues from ast_shared_service.

    Returns:
        list[Issue]: Combined list of issues found by static linters and heuristics.
    """
    all_issues: list[Issue] = []

    # 1. Add precomputed AST issues
    if precomputed_ast_issues:
        all_issues.extend(precomputed_ast_issues)

    # 2. Add Test Coverage Heuristic
    if code_files:
        test_issues = check_test_coverage_heuristic(code_files, repo_root)
        all_issues.extend(test_issues)

    # 3. Add Ruff findings if installed
    ruff_issues = run_ruff_check(repo_root)
    all_issues.extend(ruff_issues)

    # 4. Add Codespell findings if installed
    codespell_issues = run_codespell_check(repo_root)
    all_issues.extend(codespell_issues)

    return all_issues
