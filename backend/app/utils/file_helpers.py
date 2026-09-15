"""File and Directory Helpers

Handles language detection, ignore pattern filtering, file size limits,
and robust Windows-compatible temporary directory cleanup.
"""

import os
import stat
import time
import shutil
from pathlib import Path
from typing import Optional
from ..config import MAX_FILE_SIZE_KB

# Directory names that should never be scanned
SKIPPED_DIRS = {
    ".git",
    ".github",
    ".svn",
    ".hg",
    "node_modules",
    "venv",
    ".venv",
    "env",
    ".env",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    "dist",
    "build",
    "out",
    ".next",
    ".nuxt",
    "vendor",
    ".idea",
    ".vscode",
    "target",
    "bin",
    "obj",
    "coverage",
    ".terraform",
}

# File extensions to ignore (binaries, media, fonts, archives, lockfiles)
IGNORED_EXTENSIONS = {
    # Media
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".bmp", ".tiff",
    ".mp3", ".mp4", ".wav", ".avi", ".mov", ".flv", ".webm",
    # Binaries & compiled artifacts
    ".exe", ".dll", ".so", ".dylib", ".bin", ".pyc", ".pyo", ".pyd", ".class", ".o", ".a",
    # Archives
    ".zip", ".tar", ".gz", ".7z", ".rar", ".bz2", ".xz",
    # Fonts
    ".woff", ".woff2", ".ttf", ".eot", ".otf",
    # Data / database files
    ".sqlite", ".sqlite3", ".db", ".parquet", ".arrow",
    # Lockfiles
    ".lock",
}

IGNORED_FILENAMES = {
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "poetry.lock",
    "gemfile.lock",
    "cargo.lock",
    "composer.lock",
}

# Extension to language name mapping
EXTENSION_LANGUAGE_MAP = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "JavaScript (React)",
    ".ts": "TypeScript",
    ".tsx": "TypeScript (React)",
    ".mjs": "JavaScript",
    ".cjs": "JavaScript",
    ".java": "Java",
    ".go": "Go",
    ".rs": "Rust",
    ".c": "C",
    ".cpp": "C++",
    ".cc": "C++",
    ".cxx": "C++",
    ".h": "C/C++ Header",
    ".hpp": "C++ Header",
    ".rb": "Ruby",
    ".php": "PHP",
    ".cs": "C#",
    ".swift": "Swift",
    ".kt": "Kotlin",
    ".kts": "Kotlin Script",
    ".scala": "Scala",
    ".sh": "Shell",
    ".bash": "Bash",
    ".sql": "SQL",
    ".html": "HTML",
    ".htm": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".json": "JSON",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".md": "Markdown",
}


def detect_language(filepath: Path | str) -> Optional[str]:
    """Detect language from file extension."""
    ext = Path(filepath).suffix.lower()
    return EXTENSION_LANGUAGE_MAP.get(ext)


def is_binary_or_asset(filepath: Path | str) -> bool:
    """Check if file has an ignored binary or asset extension."""
    p = Path(filepath)
    if p.name.lower() in IGNORED_FILENAMES:
        return True
    return p.suffix.lower() in IGNORED_EXTENSIONS


def get_file_size_kb(filepath: Path | str) -> float:
    """Get file size in Kilobytes."""
    try:
        return os.path.getsize(filepath) / 1024.0
    except OSError:
        return 0.0


def should_skip_path(filepath: Path | str, base_dir: Path | str) -> bool:
    """Determine whether a path should be skipped from analysis."""
    p = Path(filepath)
    base = Path(base_dir)

    try:
        rel_parts = p.relative_to(base).parts
    except ValueError:
        rel_parts = p.parts

    # Check if any parent folder is in SKIPPED_DIRS
    for part in rel_parts[:-1]:
        if part in SKIPPED_DIRS or part.startswith(".git"):
            return True

    # Check file name
    if p.name.lower() in IGNORED_FILENAMES:
        return True

    # Check if extension is binary/asset
    if is_binary_or_asset(p):
        return True

    # Check size threshold
    if p.is_file() and get_file_size_kb(p) > MAX_FILE_SIZE_KB:
        return True

    return False


def to_relative_path(abs_path: Path | str, base_dir: Path | str) -> str:
    """Convert an absolute path to a relative path with unified forward slashes."""
    try:
        rel = Path(abs_path).relative_to(Path(base_dir))
        return str(rel).replace("\\", "/")
    except ValueError:
        return str(abs_path).replace("\\", "/")


def safe_rmtree(target_dir: Path | str, max_retries: int = 3) -> None:
    """Safely and thoroughly remove a directory on Windows or Linux.

    Windows git repositories often have files marked with read-only attributes
    (e.g., .git/objects/pack/*). This handler unsets read-only bits and retries.
    """
    target = Path(target_dir)
    if not target.exists():
        return

    def _remove_readonly(func, path, exc_info):
        # Clear read-only attribute and re-attempt
        try:
            os.chmod(path, stat.S_IWRITE)
            func(path)
        except Exception:
            pass

    for attempt in range(max_retries):
        try:
            shutil.rmtree(target, onerror=_remove_readonly)
            if not target.exists():
                return
        except Exception:
            time.sleep(0.2)

    # Final attempt fallback if still exists
    if target.exists():
        try:
            shutil.rmtree(target, ignore_errors=True)
        except Exception:
            pass


def build_github_link(
    repo_url: str,
    default_branch: str,
    full_path: str,
    line_start: Optional[int] = 1,
    line_end: Optional[int] = None,
) -> str:
    """Build a direct, deep link to the source file line range on GitHub.

    Format: {repo_url}/blob/{default_branch}/{full_path}#L{line_start}-L{line_end}
    """
    clean_url = repo_url.strip().rstrip("/")
    clean_path = str(full_path).strip().replace("\\", "/").lstrip("/")
    branch = default_branch or "main"

    if not clean_path:
        return clean_url

    base_link = f"{clean_url}/blob/{branch}/{clean_path}"

    start = line_start if line_start and line_start > 0 else 1
    end = line_end if line_end and line_end > 0 else start

    if start == end:
        return f"{base_link}#L{start}"
    return f"{base_link}#L{start}-L{end}"
