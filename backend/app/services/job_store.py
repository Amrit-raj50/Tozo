"""Job Store and Report Cache

Thread-safe in-memory store tracking asynchronous analysis jobs and caching
completed reports to eliminate redundant processing and AI spend.
"""

import time
import uuid
import threading
from typing import Optional, Any
from ..config import CACHE_TTL_SECONDS
from ..models.report_models import Report


class JobStore:
    """Manages active job statuses and cached reports."""

    def __init__(self):
        self._lock = threading.Lock()
        self._jobs: dict[str, dict[str, Any]] = {}
        self._report_cache: dict[str, dict[str, Any]] = {}

    def create_job(self, repo_url: str) -> str:
        """Create a new job record and return its unique ID."""
        job_id = str(uuid.uuid4())
        with self._lock:
            self._jobs[job_id] = {
                "job_id": job_id,
                "repo_url": repo_url,
                "status": "queued",
                "stage_message": "Analysis request queued...",
                "progress_percent": 0,
                "report": None,
                "error": None,
                "created_at": time.time(),
                "updated_at": time.time(),
            }
        return job_id

    def update_job(
        self,
        job_id: str,
        status: str,
        stage_message: str,
        progress_percent: int,
        report: Optional[Report] = None,
        error: Optional[str] = None,
    ) -> None:
        """Update the state and progress of an active job."""
        with self._lock:
            if job_id in self._jobs:
                self._jobs[job_id].update(
                    {
                        "status": status,
                        "stage_message": stage_message,
                        "progress_percent": progress_percent,
                        "report": report,
                        "error": error,
                        "updated_at": time.time(),
                    }
                )

    def get_job(self, job_id: str) -> Optional[dict[str, Any]]:
        """Retrieve job data by ID."""
        with self._lock:
            job = self._jobs.get(job_id)
            return dict(job) if job else None

    def get_cached_report(self, repo_url: str) -> Optional[Report]:
        """Retrieve a cached Report if it exists and has not expired."""
        normalized = repo_url.strip().rstrip("/").lower()
        with self._lock:
            cached = self._report_cache.get(normalized)
            if cached:
                age = time.time() - cached["cached_at"]
                if age < CACHE_TTL_SECONDS:
                    report = cached["report"].model_copy(deep=True)
                    report.metrics.cached = True
                    return report
                # Expired
                del self._report_cache[normalized]
        return None

    def cache_report(self, repo_url: str, report: Report) -> None:
        """Save a completed report into the cache."""
        normalized = repo_url.strip().rstrip("/").lower()
        with self._lock:
            self._report_cache[normalized] = {
                "report": report,
                "cached_at": time.time(),
            }


# Singleton job store instance
job_store = JobStore()
