"""Request and Response Pydantic Models

Validates incoming repository URLs and shapes the background job responses.
"""

import re
from typing import Optional
from pydantic import BaseModel, field_validator
from .report_models import Report


class RepoRequest(BaseModel):
    """Incoming request to analyze a public GitHub repository."""
    repo_url: str
    force_rescan: bool = False

    @field_validator("repo_url")
    @classmethod
    def validate_github_url(cls, v: str) -> str:
        if not v or not isinstance(v, str):
            raise ValueError("Repository URL cannot be empty.")

        cleaned = v.strip().rstrip("/")
        # Remove trailing .git if provided
        if cleaned.endswith(".git"):
            cleaned = cleaned[:-4]

        # Check if URL attempts to pass subpaths like /tree/main
        if "/tree/" in cleaned or "/blob/" in cleaned:
            raise ValueError(
                "Please provide the root repository URL (e.g. https://github.com/owner/repo), "
                "not a subfolder or branch path."
            )

        # Match github.com/owner/repo pattern
        pattern = r"^https?://github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)$"
        match = re.match(pattern, cleaned)
        if not match:
            raise ValueError(
                "Invalid GitHub URL. Must be in the format: https://github.com/owner/repo"
            )

        owner, repo = match.groups()
        if not owner or not repo:
            raise ValueError("Invalid GitHub repository owner or name.")

        return cleaned

    @property
    def owner_repo(self) -> tuple[str, str]:
        """Extract owner and repo name from the validated URL."""
        parts = self.repo_url.split("github.com/")[-1].split("/")
        return parts[0], parts[1]


class StartAnalysisResponse(BaseModel):
    """Response returned immediately when an analysis job is queued."""
    job_id: str
    status: str
    message: str


class JobStatusResponse(BaseModel):
    """Status update polled by the frontend."""
    job_id: str
    status: str  # queued, validating, cloning, scanning, static_checking, ai_analyzing, completed, failed
    stage_message: str
    progress_percent: int
    report: Optional[Report] = None
    error: Optional[str] = None
