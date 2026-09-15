"""GitHub Pre-Flight Verification Service

Queries the public GitHub API to verify repository existence, confirm public visibility,
and enforce repository size guardrails before cloning.
"""

import httpx
from ..config import MAX_REPO_SIZE_MB


async def verify_github_repository(owner: str, repo: str) -> dict:
    """Verify repository availability and size using GitHub's REST API.

    Args:
        owner: GitHub repository owner / organization.
        repo: GitHub repository name.

    Returns:
        dict: Repository metadata including size_kb, default_branch, and description.

    Raises:
        ValueError: If repository is private, doesn't exist, or exceeds size limits.
    """
    api_url = f"https://api.github.com/repos/{owner}/{repo}"
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "AI-Repo-Analyzer/1.0",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(api_url, headers=headers)

            if response.status_code == 404:
                raise ValueError(
                    f"Repository '{owner}/{repo}' not found or is private. "
                    "AI Repo Analyzer only supports public GitHub repositories."
                )

            if response.status_code == 403:
                # GitHub rate limit reached for anonymous API calls;
                # Log and allow clone to proceed rather than blocking the user
                return {
                    "full_name": f"{owner}/{repo}",
                    "size_kb": 0,
                    "default_branch": "main",
                    "description": "",
                    "rate_limited": True,
                }

            if response.status_code != 200:
                # Other status - allow clone to attempt
                return {
                    "full_name": f"{owner}/{repo}",
                    "size_kb": 0,
                    "default_branch": "main",
                    "description": "",
                }

            data = response.json()

            # Check if repository is private
            if data.get("private", False):
                raise ValueError(
                    f"Repository '{owner}/{repo}' is private. "
                    "Only public GitHub repositories can be analyzed."
                )

            # Check repository size (GitHub reports size in Kilobytes)
            size_kb = data.get("size", 0)
            max_kb = MAX_REPO_SIZE_MB * 1024
            if size_kb > max_kb:
                size_mb = size_kb / 1024
                raise ValueError(
                    f"Repository size ({size_mb:.1f} MB) exceeds maximum allowed limit of {MAX_REPO_SIZE_MB} MB. "
                    "Please choose a smaller repository."
                )

            return {
                "full_name": data.get("full_name", f"{owner}/{repo}"),
                "size_kb": size_kb,
                "default_branch": data.get("default_branch", "main"),
                "description": data.get("description", ""),
                "stars": data.get("stargazers_count", 0),
            }

    except httpx.RequestError:
        # Network connectivity glitch - proceed to git clone as fallback
        return {
            "full_name": f"{owner}/{repo}",
            "size_kb": 0,
            "default_branch": "main",
            "description": "",
        }
