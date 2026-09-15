"""Report and Issue Pydantic Models

Defines the structure of discovered code issues, metrics, repository briefings,
diff tracking between scans, and the finalized multi-category report.
"""

from typing import Literal, Optional
from pydantic import BaseModel, Field, model_validator

IssueCategory = Literal[
    "bug",
    "error_handling",
    "backend",
    "frontend",
    "lint",
    "typo",
    "cicd",
    "deployment",
    "documentation",
    "enhancement",
    "test_coverage",
]


class DiffSummary(BaseModel):
    """Summary of issue changes between repository scans across commits."""
    new_issues_count: int = 0
    resolved_issues_count: int = 0
    new_issue_ids: list[str] = Field(default_factory=list)
    resolved_issue_ids: list[str] = Field(default_factory=list)
    previous_scan_date: Optional[str] = None
    previous_commit_sha: Optional[str] = None


class Issue(BaseModel):
    """An individual code issue discovered across static tools, linters, or AI."""
    category: str = "bug"
    severity: Literal["high", "medium", "low"] = "medium"
    folder: str = ""
    file: str = ""
    full_path: str = ""
    line_start: Optional[int] = 1
    line_end: Optional[int] = 1
    line: Optional[int] = 1
    function_name: Optional[str] = None
    description: str = ""
    suggested_fix: Optional[str] = None
    source: str = "static_tool"
    github_link: Optional[str] = None
    rule_id: Optional[str] = None

    # Draft GitHub issue pre-formatted templates
    draft_title: Optional[str] = None
    draft_body: Optional[str] = None

    # Beginner friendliness
    beginner_friendly: bool = False
    beginner_reason: Optional[str] = None

    # Backward compatibility alias for 'type'
    @property
    def type(self) -> str:
        return self.category

    @model_validator(mode="before")
    @classmethod
    def sync_legacy_fields(cls, data: dict):
        if isinstance(data, dict):
            # If 'type' was passed instead of 'category', sync it
            if "type" in data and "category" not in data:
                data["category"] = data["type"]
            elif "category" in data and "type" not in data:
                data["type"] = data["category"]

            # Sync line numbers
            line = data.get("line") or data.get("line_start") or 1
            if "line_start" not in data or data["line_start"] is None:
                data["line_start"] = line
            if "line_end" not in data or data["line_end"] is None:
                data["line_end"] = data["line_start"]
            if "line" not in data or data["line"] is None:
                data["line"] = data["line_start"]

            # Derive file and folder from full_path if needed
            full = data.get("full_path") or data.get("file") or ""
            if full and not data.get("full_path"):
                data["full_path"] = full
            if full and not data.get("file"):
                data["file"] = full.split("/")[-1]
            if full and not data.get("folder"):
                parts = full.split("/")
                data["folder"] = "/".join(parts[:-1]) if len(parts) > 1 else ""

        return data


class RepoBriefing(BaseModel):
    """Executive repository overview separated into verified facts and AI narrative."""
    verified_facts: list[dict] = Field(default_factory=list)  # list of {"text": str, "github_link": Optional[str]}
    ai_analysis: str = ""  # Narrative "what this project does and how it fits together"
    summary: str = ""  # Legacy / fallback summary
    tech_stack: list[str] = Field(default_factory=list)
    architecture_explanation: str = ""
    suggested_starting_points: list[str] = Field(default_factory=list)
    has_ci: bool = False
    has_tests: bool = False
    has_docker: bool = False
    primary_languages: list[str] = Field(default_factory=list)


class ReportMetrics(BaseModel):
    """Summary metrics of the repository scan."""
    files_scanned: int = 0
    languages: dict[str, int] = Field(default_factory=dict)
    total_lines_scanned: int = 0
    ai_chunks_analyzed: int = 0
    duration_seconds: float = 0.0
    cached: bool = False
    ai_enabled: bool = False


ALL_CATEGORIES = [
    "bug",
    "error_handling",
    "backend",
    "frontend",
    "lint",
    "typo",
    "cicd",
    "deployment",
    "documentation",
    "enhancement",
    "test_coverage",
]


class Report(BaseModel):
    """Final structured report returned to the frontend."""
    repo_url: str
    repo_name: str
    default_branch: str = "main"
    commit_sha: str = ""
    scanned_at: str = ""
    is_first_scan: bool = True
    diff_summary: Optional[DiffSummary] = None
    briefing: Optional[RepoBriefing] = None
    total_issues: int = 0
    warnings: list[str] = Field(default_factory=list)
    fetch_list: list[Issue] = Field(default_factory=list)
    contribution_friendliness: dict = Field(
        default_factory=lambda: {
            "score": 75,
            "explanation": "Active repository with recent commit history and standard workflow checks.",
        }
    )
    issues_by_category: dict[str, list[Issue]] = Field(
        default_factory=lambda: {cat: [] for cat in ALL_CATEGORIES}
    )
    metrics: ReportMetrics = Field(default_factory=ReportMetrics)
