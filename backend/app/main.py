"""FastAPI Main Application Entrypoint

Initializes the API server, configures CORS, registers routes,
and attaches rate-limiting protection.
"""

import time
from collections import defaultdict
from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .config import CORS_ORIGINS, RATE_LIMIT_PER_MINUTE, is_ai_available
from .routes.analyze_routes import router as analyze_router
from .routes.auth_routes import router as auth_router

app = FastAPI(
    title="AI Repo Analyzer API",
    description=(
        "Full-stack code analysis engine combining shallow Git cloning, AST inspection, "
        "static linting, and concurrent AI reasoning."
    ),
    version="1.0.0",
)

# Enable CORS for frontend applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory IP-based rate limiter
ip_request_timestamps: dict[str, list[float]] = defaultdict(list)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Enforce per-IP rate limits to prevent API abuse and quota exhaustion."""
    # Exclude health checks, status polling, and static queries
    if (
        request.url.path in {"/health", "/docs", "/openapi.json", "/sample-repos"}
        or request.url.path.startswith("/status/")
        or request.url.path.startswith("/api/status/")
    ):
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    one_minute_ago = now - 60.0

    # Prune timestamps older than 1 minute
    timestamps = [t for t in ip_request_timestamps[client_ip] if t > one_minute_ago]
    ip_request_timestamps[client_ip] = timestamps

    if len(timestamps) >= RATE_LIMIT_PER_MINUTE:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "detail": (
                    f"Rate limit exceeded ({RATE_LIMIT_PER_MINUTE} requests/min). "
                    "Please wait a moment before initiating another scan."
                )
            },
        )

    ip_request_timestamps[client_ip].append(now)
    response: Response = await call_next(request)
    return response


# Register routes at both root and /api prefix for flexible frontend proxying
app.include_router(analyze_router)
app.include_router(analyze_router, prefix="/api")
app.include_router(auth_router)
app.include_router(auth_router, prefix="/api")


@app.get("/")
async def root():
    """API welcome endpoint."""
    return {
        "message": "AI Repo Analyzer API is running.",
        "docs_url": "/docs",
        "health_url": "/health",
        "ai_enabled": is_ai_available(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
