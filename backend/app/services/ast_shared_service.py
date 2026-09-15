"""Consolidated Python AST Analysis Service

Parses Python source files once to extract:
1. Structural code chunks (functions & classes with start/end lines)
2. Cyclomatic complexity per chunk
3. Static code quality issues (mutable default arguments, bare excepts,
   excessive complexity, oversized functions, and common typos)
"""

import ast
import re
from pathlib import Path
from typing import Optional
from dataclasses import dataclass
from ..models.report_models import Issue
from ..utils.file_helpers import to_relative_path

# Common code typos dictionary: typo -> correction
COMMON_TYPOS = {
    "seperate": "separate",
    "seperator": "separator",
    "recieve": "receive",
    "recieved": "received",
    "occured": "occurred",
    "occurrance": "occurrence",
    "accomodate": "accommodate",
    "defualt": "default",
    "calback": "callback",
    "paramter": "parameter",
    "referrence": "reference",
    "deprecate": "deprecate",
    "existance": "existence",
    "unnecesary": "unnecessary",
    "responce": "response",
}


@dataclass
class CodeChunk:
    """A discrete block of code (function or class) suitable for AI inspection."""
    name: str
    chunk_type: str  # 'function', 'async_function', 'class'
    start_line: int
    end_line: int
    code: str
    file_path: str
    language: str
    complexity: int = 1
    folder_tag: str = "general"  # 'backend' | 'frontend' | 'general'


def calculate_node_complexity(node: ast.AST) -> int:
    """Calculate cyclomatic complexity of an AST node (branches + 1)."""
    complexity = 1
    branch_types = (
        ast.If,
        ast.For,
        ast.AsyncFor,
        ast.While,
        ast.Try,
        ast.ExceptHandler,
        ast.With,
        ast.AsyncWith,
        ast.IfExp,
        ast.Assert,
    )

    for child in ast.walk(node):
        if isinstance(child, branch_types):
            complexity += 1
        elif isinstance(child, ast.BoolOp):
            # Each 'and' / 'or' adds an execution branch
            complexity += len(child.values) - 1

    return complexity


def check_typos_in_text(text: str, rel_path: str, filename: str, line_offset: int = 1) -> list[Issue]:
    """Scan text for common typos."""
    issues: list[Issue] = []
    lines = text.splitlines()

    for idx, line in enumerate(lines):
        line_num = line_offset + idx
        words = re.findall(r"[A-Za-z]+", line)
        for word in words:
            lower = word.lower()
            if lower in COMMON_TYPOS and len(lower) > 4:
                correct = COMMON_TYPOS[lower]
                issues.append(
                    Issue(
                        category="typo",
                        severity="low",
                        file=filename,
                        full_path=rel_path,
                        line_start=line_num,
                        line_end=line_num,
                        description=f"Potential typo found: '{word}'. Did you mean '{correct}'?",
                        suggested_fix=f"Replace '{word}' with '{correct}'",
                        source="static_tool",
                        rule_id="TYPO001",
                    )
                )
    return issues


def analyze_python_ast(
    file_path: Path | str,
    repo_root: Path | str,
    folder_tag: str = "general",
) -> dict:
    """Analyze a single Python file using Python's built-in AST.

    Returns:
        dict: {
            'chunks': list[CodeChunk],
            'issues': list[Issue],
            'max_complexity': int
        }
    """
    rel_path = to_relative_path(file_path, repo_root)
    filename = Path(file_path).name
    chunks: list[CodeChunk] = []
    issues: list[Issue] = []
    max_complexity = 1

    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            source = f.read()
    except Exception:
        return {"chunks": [], "issues": [], "max_complexity": 1}

    source_lines = source.splitlines()

    try:
        tree = ast.parse(source, filename=str(file_path))
    except SyntaxError as err:
        # File has syntax error - capture as high severity bug
        line_no = err.lineno or 1
        issues.append(
            Issue(
                category="bug",
                severity="high",
                file=filename,
                full_path=rel_path,
                line_start=line_no,
                line_end=line_no,
                description=f"SyntaxError: {err.msg}",
                suggested_fix="Fix the invalid Python syntax near this line.",
                source="static_tool",
                rule_id="SYNTAX_ERR",
            )
        )
        return {"chunks": [], "issues": issues, "max_complexity": 1}

    # Extract comments/identifiers typos
    typo_issues = check_typos_in_text(source, rel_path, filename)
    issues.extend(typo_issues[:5])  # Cap typos per file to prevent noise

    # Walk AST nodes to extract chunks and static patterns
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            chunk_type = (
                "async_function" if isinstance(node, ast.AsyncFunctionDef)
                else "function" if isinstance(node, ast.FunctionDef)
                else "class"
            )

            start = node.lineno
            end = getattr(node, "end_lineno", node.lineno)
            code_snippet = "\n".join(source_lines[start - 1 : end])
            complexity = calculate_node_complexity(node)
            if complexity > max_complexity:
                max_complexity = complexity

            chunks.append(
                CodeChunk(
                    name=node.name,
                    chunk_type=chunk_type,
                    start_line=start,
                    end_line=end,
                    code=code_snippet,
                    file_path=rel_path,
                    language="Python",
                    complexity=complexity,
                    folder_tag=folder_tag,
                )
            )

            # Check function length
            line_count = end - start + 1
            if line_count > 60:
                issues.append(
                    Issue(
                        category="lint",
                        severity="low",
                        file=filename,
                        full_path=rel_path,
                        line_start=start,
                        line_end=end,
                        function_name=node.name,
                        description=(
                            f"{chunk_type.capitalize()} '{node.name}' is {line_count} lines long. "
                            "Consider splitting it into smaller, more modular functions."
                        ),
                        suggested_fix="Refactor into smaller single-responsibility helper functions.",
                        source="static_tool",
                        rule_id="FUNC_LEN_WARN",
                    )
                )

            # Check high complexity
            if complexity >= 10:
                issues.append(
                    Issue(
                        category="enhancement",
                        severity="medium",
                        file=filename,
                        full_path=rel_path,
                        line_start=start,
                        line_end=end,
                        function_name=node.name,
                        description=(
                            f"{chunk_type.capitalize()} '{node.name}' has high cyclomatic complexity ({complexity}). "
                            "Deep nesting and multiple branching pathways increase defect risk."
                        ),
                        suggested_fix="Simplify decision logic, use early returns, or extract sub-routines.",
                        source="static_tool",
                        rule_id="COMPLEXITY_HIGH",
                    )
                )

    # Walk all nodes inside the module for specific code anti-patterns
    for node in ast.walk(tree):
        # 1. Mutable default arguments in functions
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            for default in node.args.defaults + node.args.kw_defaults:
                if default and isinstance(default, (ast.List, ast.Dict, ast.Set)):
                    issues.append(
                        Issue(
                            category="bug",
                            severity="high",
                            file=filename,
                            full_path=rel_path,
                            line_start=node.lineno,
                            line_end=node.lineno,
                            function_name=node.name,
                            description=(
                                f"Mutable default argument detected in function '{node.name}'. "
                                "Python default arguments are evaluated once at definition time, "
                                "meaning mutations persist across all invocations."
                            ),
                            suggested_fix="Use None as default value and initialize inside the function (e.g. `items = items or []`).",
                            source="static_tool",
                            rule_id="MUTABLE_DEFAULT",
                        )
                    )

        # 2. Bare except clauses
        if isinstance(node, ast.ExceptHandler):
            if node.type is None:
                issues.append(
                    Issue(
                        category="error_handling",
                        severity="medium",
                        file=filename,
                        full_path=rel_path,
                        line_start=node.lineno,
                        line_end=node.lineno,
                        description=(
                            "Bare 'except:' clause caught. It intercepts KeyboardInterrupt, "
                            "SystemExit, and unexpected errors, making debugging difficult."
                        ),
                        suggested_fix="Catch specific exceptions or use `except Exception:` instead.",
                        source="static_tool",
                        rule_id="BARE_EXCEPT",
                    )
                )

    return {
        "chunks": chunks,
        "issues": issues,
        "max_complexity": max_complexity,
    }
