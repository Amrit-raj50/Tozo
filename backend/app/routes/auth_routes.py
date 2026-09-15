"""Auth & User Workspace Routes

Provides endpoints for GitHub user authentication, profile retrieval,
and personal repository tracking for "My Space".
"""

import httpx
from fastapi import APIRouter, HTTPException, status
from ..config import GITHUB_CLIENT_ID

router = APIRouter(prefix="/auth", tags=["Auth & My Space"])


@router.get("/github/config")
async def get_github_auth_config():
    """Returns GitHub OAuth configuration status."""
    return {
        "oauth_enabled": bool(GITHUB_CLIENT_ID),
        "client_id": GITHUB_CLIENT_ID or "",
    }


@router.get("/user-profile/{username}")
async def get_github_user_profile(username: str):
    """Fetch public GitHub profile information for a user."""
    url = f"https://api.github.com/users/{username}"
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Tozo-Code-Companion/1.0",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url, headers=headers)
            if res.status_code == 404:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"GitHub user '{username}' not found.",
                )
            if res.status_code != 200:
                raise HTTPException(
                    status_code=res.status_code,
                    detail="Failed to fetch GitHub profile.",
                )

            data = res.json()
            return {
                "username": data.get("login"),
                "name": data.get("name") or data.get("login"),
                "avatar_url": data.get("avatar_url"),
                "html_url": data.get("html_url"),
                "bio": data.get("bio", ""),
                "public_repos": data.get("public_repos", 0),
                "followers": data.get("followers", 0),
                "created_at": data.get("created_at"),
            }
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error connecting to GitHub API: {str(exc)}",
        )


@router.get("/user-repos/{username}")
async def get_github_user_repos(username: str):
    """Fetch public GitHub repositories belonging to a user."""
    url = f"https://api.github.com/users/{username}/repos?sort=updated&per_page=100"
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Tozo-Code-Companion/1.0",
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            res = await client.get(url, headers=headers)
            if res.status_code == 404:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"GitHub user '{username}' not found.",
                )
            if res.status_code != 200:
                raise HTTPException(
                    status_code=res.status_code,
                    detail="Failed to fetch user repositories from GitHub.",
                )

            repos = res.json()
            formatted_repos = []
            for r in repos:
                # Skip forks if preferred, or include all
                formatted_repos.append({
                    "id": r.get("id"),
                    "name": r.get("name"),
                    "full_name": r.get("full_name"),
                    "repo_url": r.get("html_url"),
                    "description": r.get("description") or "No description provided.",
                    "stars": r.get("stargazers_count", 0),
                    "open_issues": r.get("open_issues_count", 0),
                    "language": r.get("language") or "Code",
                    "default_branch": r.get("default_branch", "main"),
                    "pushed_at": r.get("pushed_at"),
                    "is_fork": r.get("fork", False),
                })

            return {
                "username": username,
                "total_count": len(formatted_repos),
                "repositories": formatted_repos,
            }
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error connecting to GitHub API: {str(exc)}",
        )


@router.post("/token-verify")
async def verify_github_token(payload: dict):
    """Verify a GitHub Personal Access Token and return user profile + repos."""
    token = payload.get("token", "").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub Access Token is required.",
        )

    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"Bearer {token}",
        "User-Agent": "Tozo-Code-Companion/1.0",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 1. Verify user profile
            user_res = await client.get("https://api.github.com/user", headers=headers)
            if user_res.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid GitHub Access Token or token expired.",
                )

            user_data = user_res.json()
            username = user_data.get("login")

            # 2. Fetch authenticated user repos
            repos_res = await client.get("https://api.github.com/user/repos?sort=updated&per_page=100", headers=headers)
            repos = repos_res.json() if repos_res.status_code == 200 else []

            formatted_repos = []
            for r in repos:
                formatted_repos.append({
                    "id": r.get("id"),
                    "name": r.get("name"),
                    "full_name": r.get("full_name"),
                    "repo_url": r.get("html_url"),
                    "description": r.get("description") or "No description provided.",
                    "stars": r.get("stargazers_count", 0),
                    "open_issues": r.get("open_issues_count", 0),
                    "language": r.get("language") or "Code",
                    "default_branch": r.get("default_branch", "main"),
                    "pushed_at": r.get("pushed_at"),
                    "is_private": r.get("private", False),
                })

            return {
                "user": {
                    "username": username,
                    "name": user_data.get("name") or username,
                    "avatar_url": user_data.get("avatar_url"),
                    "html_url": user_data.get("html_url"),
                    "bio": user_data.get("bio", ""),
                    "public_repos": user_data.get("public_repos", 0),
                },
                "repositories": formatted_repos,
            }
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error connecting to GitHub API: {str(exc)}",
        )
