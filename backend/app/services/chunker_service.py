"""Code Chunker Service

Segments source code into functions and classes.
For Python files, uses the single-pass AST service; for JavaScript/TypeScript
and other languages, applies structural block & regex parsing.
"""

import re
from pathlib import Path
from typing import Optional
from .ast_shared_service import analyze_python_ast, CodeChunk
from ..utils.file_helpers import to_relative_path, detect_language

# Patterns for JavaScript, TypeScript, Java, Go, C/C++ function/class declarations
JS_TS_FUNC_PATTERN = re.compile(
    r"^(?:export\s+)?(?:async\s+)?(?:function\*?\s+([A-Za-z0-9_$]+)|"
    r"(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>|"
    r"(?:class)\s+([A-Za-z0-9_$]+))",
    re.MULTILINE,
)


def estimate_block_complexity(lines: list[str]) -> int:
    """Estimate cyclomatic complexity for non-Python languages using keyword frequency."""
    complexity = 1
    for line in lines:
        cleaned = line.strip()
        if cleaned.startswith(("//", "/*", "*", "#")):
            continue
        words = re.findall(r"\b(?:if|for|while|switch|case|catch)\b|&&|\|\||\?", cleaned)
        complexity += len(words)
    return complexity


def chunk_js_ts_file(
    file_path: Path | str,
    repo_root: Path | str,
    language: str,
    folder_tag: str = "frontend",
) -> list[CodeChunk]:
    """Extract functions and classes from JavaScript/TypeScript code."""
    rel_path = to_relative_path(file_path, repo_root)
    chunks: list[CodeChunk] = []

    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
    except Exception:
        return chunks

    total_lines = len(lines)
    if total_lines == 0:
        return chunks

    # Simple brace-counting chunking for JS/TS
    i = 0
    while i < total_lines:
        line = lines[i]
        match = JS_TS_FUNC_PATTERN.search(line)
        if match:
            name = match.group(1) or match.group(2) or match.group(3) or f"block_L{i+1}"
            chunk_type = "class" if "class" in line else "function"
            start_line = i + 1

            # Track open/close braces
            brace_depth = line.count("{") - line.count("}")
            j = i + 1
            while j < total_lines and brace_depth > 0:
                brace_depth += lines[j].count("{") - lines[j].count("}")
                j += 1

            end_line = min(j, total_lines)
            code_snippet = "".join(lines[i:end_line])
            complexity = estimate_block_complexity(lines[i:end_line])

            chunks.append(
                CodeChunk(
                    name=name,
                    chunk_type=chunk_type,
                    start_line=start_line,
                    end_line=end_line,
                    code=code_snippet,
                    file_path=rel_path,
                    language=language,
                    complexity=complexity,
                    folder_tag=folder_tag,
                )
            )
            i = end_line
        else:
            i += 1

    # Fallback if no functions were matched (e.g. flat script)
    if not chunks and 0 < total_lines <= 200:
        chunks.append(
            CodeChunk(
                name=Path(file_path).stem,
                chunk_type="module",
                start_line=1,
                end_line=total_lines,
                code="".join(lines),
                file_path=rel_path,
                language=language,
                complexity=estimate_block_complexity(lines),
                folder_tag=folder_tag,
            )
        )

    return chunks


def chunk_code_file(
    file_path: Path | str,
    repo_root: Path | str,
    precomputed_ast: Optional[dict] = None,
    folder_tag: str = "general",
) -> list[CodeChunk]:
    """Chunk a code file into functions or classes.

    Args:
        file_path: Path to code file.
        repo_root: Root folder of cloned repository.
        precomputed_ast: Optional cached result from analyze_python_ast.
        folder_tag: Domain tag ('backend' | 'frontend' | 'general').

    Returns:
        list[CodeChunk]: Chunks extracted from the file.
    """
    lang = detect_language(file_path) or "Unknown"

    if lang == "Python":
        if precomputed_ast and "chunks" in precomputed_ast:
            return precomputed_ast["chunks"]
        res = analyze_python_ast(file_path, repo_root, folder_tag=folder_tag)
        return res["chunks"]

    if "JavaScript" in lang or "TypeScript" in lang:
        return chunk_js_ts_file(file_path, repo_root, lang, folder_tag=folder_tag)

    # Generic fallback: return whole file as single chunk if reasonable size
    rel_path = to_relative_path(file_path, repo_root)
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
        if lines and len(lines) <= 200:
            return [
                CodeChunk(
                    name=Path(file_path).name,
                    chunk_type="file",
                    start_line=1,
                    end_line=len(lines),
                    code="".join(lines),
                    file_path=rel_path,
                    language=lang,
                    complexity=estimate_block_complexity(lines),
                    folder_tag=folder_tag,
                )
            ]
    except Exception:
        pass

    return []
