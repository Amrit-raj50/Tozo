"""Repository File Scanner Service

Discovers valid source code files, identifies special configuration files
(workflows, Dockerfiles, compose files, README, tests), and tags files as
'backend', 'frontend', or 'general' using folder and extension heuristics.
"""

import os
from pathlib import Path
from ..utils.file_helpers import (
    SKIPPED_DIRS,
    detect_language,
    should_skip_path,
    to_relative_path,
)

BACKEND_DIR_NAMES = {
    "api",
    "server",
    "backend",
    "services",
    "models",
    "controllers",
    "routes",
    "database",
    "db",
    "handlers",
    "microservices",
}

FRONTEND_DIR_NAMES = {
    "components",
    "pages",
    "views",
    "ui",
    "frontend",
    "client",
    "public",
    "styles",
    "assets",
}

FRONTEND_EXTENSIONS = {".jsx", ".tsx", ".vue", ".svelte", ".html", ".css", ".scss", ".less"}
BACKEND_EXTENSIONS = {".py", ".go", ".java", ".rs", ".php", ".rb", ".cs", ".scala", ".kt"}


def tag_file_domain(file_path: Path, repo_root: Path) -> str:
    """Classify a file into 'backend', 'frontend', or 'general' domain."""
    try:
        rel = file_path.relative_to(repo_root)
        parts = [p.lower() for p in rel.parts[:-1]]
    except ValueError:
        parts = []

    # Check directory names
    if any(p in BACKEND_DIR_NAMES for p in parts):
        return "backend"
    if any(p in FRONTEND_DIR_NAMES for p in parts):
        return "frontend"

    # Check extensions
    ext = file_path.suffix.lower()
    if ext in FRONTEND_EXTENSIONS:
        return "frontend"
    if ext in BACKEND_EXTENSIONS:
        return "backend"

    # In JS/TS code without distinct folders, check if src or imports look like frontend
    if ext in {".js", ".ts"}:
        if "src" in parts or "app" in parts:
            return "frontend"
        return "backend"

    return "general"


def scan_repository(repo_dir: Path | str) -> dict:
    """Walk repository files and collect source files, special files, and domain tags.

    Args:
        repo_dir: Root directory of the cloned repository.

    Returns:
        dict: Summary containing valid files, language distribution, special files, and tags.
    """
    root_path = Path(repo_dir).resolve()
    valid_files: list[Path] = []
    by_language: dict[str, list[Path]] = {}
    languages_count: dict[str, int] = {}
    file_tags: dict[str, str] = {}  # rel_path -> 'backend' | 'frontend' | 'general'
    total_lines = 0

    special_files: dict[str, list[Path] | Path | None] = {
        "workflow_files": [],
        "dockerfile": None,
        "docker_compose": None,
        "readme": None,
        "contributing": None,
        "tests_folder": None,
    }

    # Pre-check for GitHub workflows
    workflows_dir = root_path / ".github" / "workflows"
    if workflows_dir.exists() and workflows_dir.is_dir():
        for wf in workflows_dir.iterdir():
            if wf.is_file() and wf.suffix.lower() in {".yml", ".yaml"}:
                special_files["workflow_files"].append(wf)

    # Pre-check for tests folder
    for t_name in ["tests", "test", "__tests__"]:
        t_path = root_path / t_name
        if t_path.exists() and t_path.is_dir():
            special_files["tests_folder"] = t_path
            break

    for dirpath, dirnames, filenames in os.walk(root_path):
        # Prune ignored directories in-place to avoid traversing them
        dirnames[:] = [
            d for d in dirnames
            if d not in SKIPPED_DIRS and not d.startswith(".git")
        ]

        for filename in filenames:
            file_path = Path(dirpath) / filename
            fname_lower = filename.lower()

            # Special file checks
            if fname_lower.startswith("readme.") or fname_lower == "readme":
                if not special_files["readme"]:
                    special_files["readme"] = file_path

            if fname_lower.startswith("contributing.") or fname_lower == "contributing":
                if not special_files["contributing"]:
                    special_files["contributing"] = file_path

            if fname_lower == "dockerfile" or fname_lower.startswith("dockerfile."):
                if not special_files["dockerfile"]:
                    special_files["dockerfile"] = file_path

            if fname_lower in {"docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"}:
                if not special_files["docker_compose"]:
                    special_files["docker_compose"] = file_path

            if should_skip_path(file_path, root_path):
                continue

            lang = detect_language(file_path)
            if not lang:
                continue

            # Count lines in code file
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    lines = sum(1 for _ in f)
                    total_lines += lines
            except Exception:
                lines = 0

            valid_files.append(file_path)
            rel_str = to_relative_path(file_path, root_path)
            domain_tag = tag_file_domain(file_path, root_path)
            file_tags[rel_str] = domain_tag

            if lang not in by_language:
                by_language[lang] = []
            by_language[lang].append(file_path)
            languages_count[lang] = languages_count.get(lang, 0) + 1

    return {
        "files": valid_files,
        "by_language": by_language,
        "total_files": len(valid_files),
        "total_lines": total_lines,
        "languages_count": languages_count,
        "special_files": special_files,
        "file_tags": file_tags,
    }
