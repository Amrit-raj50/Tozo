"""Repository Cloning Service

Executes fast shallow clones (depth=1) into isolated temporary directories.
Detects and returns the repository's default branch name for building deep links.
Ensures git never hangs waiting for user credentials on private repos.
"""

import os
import subprocess
from pathlib import Path


def detect_default_branch(repo_dir: Path | str) -> str:
    """Detect default branch name from cloned git repository."""
    dest = Path(repo_dir).resolve()

    # 1. Try git rev-parse --abbrev-ref HEAD
    try:
        proc = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=str(dest),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=5,
        )
        branch = proc.stdout.strip()
        if branch and branch != "HEAD":
            return branch
    except Exception:
        pass

    # 2. Inspect .git/HEAD file
    try:
        head_file = dest / ".git" / "HEAD"
        if head_file.exists():
            content = head_file.read_text(encoding="utf-8").strip()
            if content.startswith("ref: refs/heads/"):
                return content.split("ref: refs/heads/")[-1].strip()
    except Exception:
        pass

    return "main"


def clone_repo(repo_url: str, destination_dir: Path | str, timeout_seconds: int = 90) -> tuple[str, str]:
    """Clone a public repository shallowly to a local directory.

    Args:
        repo_url: GitHub repository URL (e.g. https://github.com/pallets/flask).
        destination_dir: Target temporary folder path.
        timeout_seconds: Maximum duration before clone times out.

    Returns:
        tuple[str, str]: (local_folder_path, default_branch_name)

    Raises:
        RuntimeError: If cloning fails or times out.
    """
    dest = str(Path(destination_dir).resolve())

    # Prevent git from hanging waiting for username/password prompt
    env = os.environ.copy()
    env["GIT_TERMINAL_PROMPT"] = "0"
    env["GIT_ASKPASS"] = "echo"

    cmd = [
        "git",
        "clone",
        "--depth",
        "1",
        "--single-branch",
        "--quiet",
        repo_url,
        dest,
    ]

    try:
        process = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=timeout_seconds,
            env=env,
        )

        if process.returncode != 0:
            err = process.stderr.strip()
            if "Authentication failed" in err or "could not read Username" in err:
                raise RuntimeError(
                    "Repository is private or authentication is required. "
                    "Only public repositories are supported."
                )
            if "Repository not found" in err:
                raise RuntimeError(f"Repository not found at '{repo_url}'.")
            raise RuntimeError(f"Failed to clone repository: {err or 'Unknown git error'}")

        default_branch = detect_default_branch(dest)
        return dest, default_branch

    except subprocess.TimeoutExpired:
        raise RuntimeError(
            f"Cloning timed out after {timeout_seconds} seconds. The repository may be too large or the network is slow."
        )
    except FileNotFoundError:
        # git command not installed in PATH
        raise RuntimeError(
            "Git is not installed or not found in system PATH. Please ensure git is installed."
        )
