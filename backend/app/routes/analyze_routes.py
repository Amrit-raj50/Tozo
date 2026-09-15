"""Analysis Routes

Provides endpoints for launching repo scans, polling job progress, and health checks.
"""

import json
from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from ..config import is_ai_available
from ..models.request_models import RepoRequest, JobStatusResponse, StartAnalysisResponse
from ..models.report_models import Report
from ..services.job_store import job_store
from ..services.cache_service import get_cached_scan
from ..controllers.analyze_controller import run_repo_analysis_job

router = APIRouter(tags=["Analysis"])


@router.get("/health")
async def health_check():
    """Health check endpoint displaying server status and AI capability."""
    return {
        "status": "healthy",
        "service": "AI Repo Analyzer API",
        "ai_enabled": is_ai_available(),
        "engine": "FastAPI + AI + AST",
    }


@router.get("/sample-repos")
async def get_sample_repos():
    """Curated public repositories that users can analyze with one click."""
    return [
        {
            "name": "Full-Stack FastAPI (Docker + CI)",
            "url": "https://github.com/tiangolo/full-stack-fastapi-template",
            "desc": "FastAPI, PostgreSQL, Docker Compose, GitHub Actions, React",
        },
        {
            "name": "Flask (Pallets)",
            "url": "https://github.com/pallets/flask",
            "desc": "Lightweight WSGI Python web application framework",
        },
        {
            "name": "Starlette (Encode)",
            "url": "https://github.com/encode/starlette",
            "desc": "Little ASGI framework that shines",
        },
        {
            "name": "Express (ExpressJS)",
            "url": "https://github.com/expressjs/express",
            "desc": "Fast, unopinionated, minimalist web framework for Node.js",
        },
        {
            "name": "Requests (PSF)",
            "url": "https://github.com/psf/requests",
            "desc": "Python HTTP for Humans",
        },
    ]


@router.post("/analyze", response_model=StartAnalysisResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_repo_analysis(request: RepoRequest, background_tasks: BackgroundTasks):
    """Queue a repository analysis job.

    Returns a job_id immediately. The frontend polls `/status/{job_id}`
    to receive live progress through the multi-stage pipeline.
    """
    owner, repo_name = request.owner_repo

    # Check cache first for instant response (unless forced rescan requested)
    if not request.force_rescan:
        cached = job_store.get_cached_report(request.repo_url)
        if cached:
            job_id = job_store.create_job(request.repo_url)
            job_store.update_job(
                job_id=job_id,
                status="completed",
                stage_message="Report instantly served from cache.",
                progress_percent=100,
                report=cached,
            )
            return StartAnalysisResponse(
                job_id=job_id,
                status="completed",
                message="Analysis served from cache.",
            )

    # Create new background job
    job_id = job_store.create_job(request.repo_url)

    background_tasks.add_task(
        run_repo_analysis_job,
        job_id=job_id,
        repo_url=request.repo_url,
        owner=owner,
        repo_name=repo_name,
        force_rescan=request.force_rescan,
    )

    return StartAnalysisResponse(
        job_id=job_id,
        status="queued",
        message="Repository analysis has been queued.",
    )


@router.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Poll the status and progress of an active or completed analysis job."""
    job_data = job_store.get_job(job_id)
    if not job_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis job with ID '{job_id}' not found.",
        )

    return JobStatusResponse(
        job_id=job_data["job_id"],
        status=job_data["status"],
        stage_message=job_data["stage_message"],
        progress_percent=job_data["progress_percent"],
        report=job_data.get("report"),
        error=job_data.get("error"),
    )


@router.get("/scorecard/{owner}/{repo}", response_model=Report)
async def get_repo_scorecard(owner: str, repo: str):
    """Fetch public shareable scorecard report directly from cache history."""
    cached_entry = get_cached_scan(owner, repo)
    if not cached_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No cached scorecard found for '{owner}/{repo}'. Please run an analysis first.",
        )

    try:
        data = json.loads(cached_entry["report_json"])
        return Report.model_validate(data)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error loading cached scorecard: {str(exc)}",
        )
