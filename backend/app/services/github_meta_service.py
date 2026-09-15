"""GitHub Metadata & Contribution Signals Service

Fetches Git commit SHA from local clones and queries the GitHub REST API
for repository freshness, activity metrics, and contribution friendliness.
Supports optional GITHUB_TOKEN to raise rate limits from 60/hr to 5000/hr.
"""

import subprocess
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional
import httpx
from ..config import GITHUB_TOKEN


def get_commit_sha(local_path: Path | str) -> tuple[str, str]:
    """Run git rev-parse HEAD to extract short and full commit SHA.

    Returns:
        tuple[str, str]: (short_sha_7_chars, full_sha)
    """
    dest = Path(local_path).resolve()

    try:
        proc = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=str(dest),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=5,
        )
        full = proc.stdout.strip()
        if full and len(full) >= 7:
            return full[:7], full
    except Exception:
        pass

    # Fallback to .git reading
    try:
        git_dir = dest / ".git"
        head_file = git_dir / "HEAD"
        if head_file.exists():
            content = head_file.read_text(encoding="utf-8").strip()
            if content.startswith("ref: "):
                ref_path = git_dir / content[5:].strip()
                if ref_path.exists():
                    full = ref_path.read_text(encoding="utf-8").strip()
                    return full[:7], full
    except Exception:
        pass

    return "unknown", "unknown"


def _get_auth_headers() -> dict[str, str]:
    """Build GitHub REST API request headers."""
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Tozo-Code-Companion/1.0",
    }
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers


def parse_owner_repo(repo_url: str) -> tuple[str, str]:
    """Extract owner and repo from URL."""
    clean = repo_url.strip().rstrip("/")
    if clean.endswith(".git"):
        clean = clean[:-4]
    parts = clean.split("github.com/")[-1].split("/")
    return parts[0], parts[1]


async def get_repo_metadata(repo_url: str) -> dict:
    """Fetch repository metadata from GitHub API."""
    try:
        owner, repo = parse_owner_repo(repo_url)
    except Exception:
        return {}

    api_url = f"https://api.github.com/repos/{owner}/{repo}"
    headers = _get_auth_headers()

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(api_url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "default_branch": data.get("default_branch", "main"),
                    "stargazers_count": data.get("stargazers_count", 0),
                    "open_issues_count": data.get("open_issues_count", 0),
                    "pushed_at": data.get("pushed_at"),
                }
    except Exception:
        pass

    return {}


async def get_contribution_signals(repo_url: str) -> dict:
    """Calculate 0-100 Contribution Friendliness Score and summary explanation.

    Evaluates:
    - Recent commit frequency in the last 30 days.
    - Ratio of stale/unresponsive pull requests (>14 days).
    - Presence of 'good first issue' labels for newcomers.
    """
    try:
        owner, repo = parse_owner_repo(repo_url)
    except Exception:
        return {
            "score": 75,
            "explanation": "Standard open-source project structure.",
        }

    headers = _get_auth_headers()
    score = 55
    factors: list[str] = []

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 1. Check recent commits in last 30 days
            since_date = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
            commits_url = f"https://api.github.com/repos/{owner}/{repo}/commits?since={since_date}&per_page=15"
            commits_resp = await client.get(commits_url, headers=headers)

            recent_commits = len(commits_resp.json()) if commits_resp.status_code == 200 and isinstance(commits_resp.json(), list) else 0

            if recent_commits >= 10:
                score += 20
                factors.append(f"high commit velocity ({recent_commits}+ in last 30d)")
            elif recent_commits >= 3:
                score += 10
                factors.append("regular maintenance activity")
            else:
                score -= 10
                factors.append("infrequent recent commits")

            # 2. Check open Pull Requests for responsiveness
            pulls_url = f"https://api.github.com/repos/{owner}/{repo}/pulls?state=open&per_page=20"
            pulls_resp = await client.get(pulls_url, headers=headers)

            if pulls_resp.status_code == 200 and isinstance(pulls_resp.json(), list):
                pulls = pulls_resp.json()
                total_prs = len(pulls)
                two_weeks_ago = datetime.now(timezone.utc) - timedelta(days=14)

                stale_prs = 0
                for pr in pulls:
                    if isinstance(pr, dict) and "created_at" in pr:
                        try:
                            created = datetime.fromisoformat(pr["created_at"].replace("Z", "+00:00"))
                            if created < two_weeks_ago:
                                stale_prs += 1
                        except Exception:
                            pass

                if total_prs > 0:
                    stale_ratio = stale_prs / total_prs
                    if stale_ratio < 0.35:
                        score += 15
                        factors.append("prompt PR reviews")
                    elif stale_ratio > 0.70:
                        score -= 15
                        factors.append("backlog of older open PRs")

            # 3. Check for 'good first issue' label
            gfi_url = f"https://api.github.com/repos/{owner}/{repo}/issues?labels=good%20first%20issue&state=open&per_page=5"
            gfi_resp = await client.get(gfi_url, headers=headers)

            if gfi_resp.status_code == 200 and isinstance(gfi_resp.json(), list) and len(gfi_resp.json()) > 0:
                score += 15
                factors.append("curated 'good first issue' starter tasks available")

    except Exception:
        return {
            "score": 75,
            "explanation": "Active repository with standard contributor workflows.",
        }

    # Clamp to reasonable 10..95 range
    clamped_score = max(15, min(95, score))
    explanation = f"Scored {clamped_score}/100 based on {', '.join(factors)}." if factors else "Active codebase with standard contributor conventions."

    return {
        "score": clamped_score,
        "explanation": explanation,
    }
