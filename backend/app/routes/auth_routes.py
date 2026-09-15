"""Auth & User Workspace Routes

Provides endpoints for real GitHub OAuth 2.0 Web Flow, Device Authorization Flow,
profile retrieval, and personal repository tracking for "My Space".
"""

import httpx
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from ..config import get_github_client_id, get_github_client_secret

router = APIRouter(prefix="/auth", tags=["Auth & My Space"])


class OAuthCallbackRequest(BaseModel):
    code: str
    redirect_uri: Optional[str] = None


class DevicePollRequest(BaseModel):
    device_code: str


@router.get("/github/config")
async def get_github_auth_config():
    """Returns GitHub OAuth configuration status."""
    client_id = get_github_client_id()
    client_secret = get_github_client_secret()
    return {
        "oauth_enabled": bool(client_id and client_secret),
        "client_id": client_id or "",
    }


@router.post("/github/callback")
async def github_oauth_callback(payload: OAuthCallbackRequest):
    """Exchange OAuth authorization code for GitHub access token and fetch user data."""
    client_id = get_github_client_id()
    client_secret = get_github_client_secret()
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GitHub OAuth is not configured on the backend. Please add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to .env.",
        )

    token_url = "https://github.com/login/oauth/access_token"
    token_params = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": payload.code,
    }
    if payload.redirect_uri:
        token_params["redirect_uri"] = payload.redirect_uri

    headers = {
        "Accept": "application/json",
        "User-Agent": "Tozo-Code-Companion/1.0",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # 1. Exchange code for access token
            token_res = await client.post(token_url, json=token_params, headers=headers)
            if token_res.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to exchange authorization code with GitHub.",
                )

            token_data = token_res.json()
            if "error" in token_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=token_data.get("error_description") or token_data.get("error"),
                )

            access_token = token_data.get("access_token")
            if not access_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No access token received from GitHub.",
                )

            # 2. Fetch authenticated user profile
            auth_headers = {
                "Accept": "application/vnd.github.v3+json",
                "Authorization": f"Bearer {access_token}",
                "User-Agent": "Tozo-Code-Companion/1.0",
            }
            user_res = await client.get("https://api.github.com/user", headers=auth_headers)
            if user_res.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Failed to retrieve user profile from GitHub with access token.",
                )

            user_data = user_res.json()
            username = user_data.get("login")

            # 3. Fetch user repositories (public and private accessible to user)
            repos_res = await client.get(
                "https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator",
                headers=auth_headers
            )
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
                    "is_fork": r.get("fork", False),
                })

            return {
                "user": {
                    "username": username,
                    "name": user_data.get("name") or username,
                    "avatar_url": user_data.get("avatar_url"),
                    "html_url": user_data.get("html_url"),
                    "bio": user_data.get("bio", ""),
                    "public_repos": user_data.get("public_repos", 0),
                    "followers": user_data.get("followers", 0),
                    "auth_method": "github_oauth",
                },
                "repositories": formatted_repos,
                "token": access_token,
            }
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error communicating with GitHub: {str(exc)}",
        )


@router.post("/github/device/start")
async def start_github_device_flow():
    """Initiate GitHub Device Authorization Flow (prompts 2-digit verification on GitHub Mobile / Browser)."""
    client_id = get_github_client_id()
    if not client_id:
        # If client_id is not set, provide a clean error or instructions
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GITHUB_CLIENT_ID is not configured in backend/.env.",
        )

    url = "https://github.com/login/device/code"
    headers = {
        "Accept": "application/json",
        "User-Agent": "Tozo-Code-Companion/1.0",
    }
    payload = {
        "client_id": client_id,
        "scope": "read:user repo",
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            res = await client.post(url, json=payload, headers=headers)
            if res.status_code != 200:
                raise HTTPException(
                    status_code=res.status_code,
                    detail="Failed to initiate device authentication with GitHub.",
                )
            return res.json()
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Network error starting device flow: {str(exc)}",
        )


@router.post("/github/device/poll")
async def poll_github_device_flow(payload: DevicePollRequest):
    """Poll GitHub Device Code endpoint to check if user approved the sign-in on phone/browser."""
    client_id = get_github_client_id()
    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GITHUB_CLIENT_ID is not configured.",
        )

    url = "https://github.com/login/oauth/access_token"
    headers = {
        "Accept": "application/json",
        "User-Agent": "Tozo-Code-Companion/1.0",
    }
    body = {
        "client_id": client_id,
        "device_code": payload.device_code,
        "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            res = await client.post(url, json=body, headers=headers)
            if res.status_code != 200:
                return {"status": "error", "message": "Failed to poll GitHub"}

            data = res.json()
            error = data.get("error")
            if error == "authorization_pending":
                return {"status": "pending"}
            elif error == "slow_down":
                return {"status": "slow_down", "interval": data.get("interval", 10)}
            elif error == "expired_token":
                return {"status": "expired", "message": "The verification code expired. Please try again."}
            elif error:
                return {"status": "error", "message": data.get("error_description", error)}

            access_token = data.get("access_token")
            if not access_token:
                return {"status": "pending"}

            # Authorization approved! Fetch profile and repositories
            auth_headers = {
                "Accept": "application/vnd.github.v3+json",
                "Authorization": f"Bearer {access_token}",
                "User-Agent": "Tozo-Code-Companion/1.0",
            }
            user_res = await client.get("https://api.github.com/user", headers=auth_headers)
            if user_res.status_code != 200:
                raise HTTPException(status_code=401, detail="Failed to load user profile.")

            user_data = user_res.json()
            username = user_data.get("login")

            repos_res = await client.get(
                "https://api.github.com/user/repos?sort=updated&per_page=100",
                headers=auth_headers
            )
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
                "status": "success",
                "user": {
                    "username": username,
                    "name": user_data.get("name") or username,
                    "avatar_url": user_data.get("avatar_url"),
                    "html_url": user_data.get("html_url"),
                    "bio": user_data.get("bio", ""),
                    "public_repos": user_data.get("public_repos", 0),
                    "followers": user_data.get("followers", 0),
                    "auth_method": "github_device",
                },
                "repositories": formatted_repos,
                "token": access_token,
            }
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Network error during device poll: {str(exc)}",
        )


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
            user_res = await client.get("https://api.github.com/user", headers=headers)
            if user_res.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid GitHub Access Token or token expired.",
                )

            user_data = user_res.json()
            username = user_data.get("login")

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
