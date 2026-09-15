"""Deployment Configuration Analysis Service

Audits Dockerfiles and Docker Compose files for security, reliability,
and production container best practices:
1. ':latest' or untagged base image tags.
2. Missing non-root USER instruction.
3. Missing HEALTHCHECK instruction.
4. Hardcoded credentials or secrets in ENV declarations.
5. Insecurely exposed database ports in Docker Compose.
"""

import re
from pathlib import Path
from typing import Optional
from ..models.report_models import Issue
from ..utils.file_helpers import to_relative_path


def check_dockerfile(dockerfile_path: Path, repo_root: Path) -> list[Issue]:
    """Audit Dockerfile instructions line by line."""
    issues: list[Issue] = []
    rel_path = to_relative_path(dockerfile_path, repo_root)

    try:
        content = dockerfile_path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return issues

    lines = content.splitlines()
    has_user = False
    has_healthcheck = False

    for idx, line in enumerate(lines):
        line_num = idx + 1
        stripped = line.strip()

        # Skip comments and blank lines
        if not stripped or stripped.startswith("#"):
            continue

        # 1. Base image checks
        if stripped.upper().startswith("FROM "):
            image_part = stripped.split()[1] if len(stripped.split()) > 1 else ""
            # Strip platform flags if present
            if image_part.startswith("--platform="):
                parts = stripped.split()
                image_part = parts[2] if len(parts) > 2 else ""

            if ":" not in image_part or image_part.endswith(":latest"):
                issues.append(
                    Issue(
                        category="deployment",
                        severity="medium",
                        file=dockerfile_path.name,
                        full_path=rel_path,
                        line_start=line_num,
                        line_end=line_num,
                        description=(
                            f"Base image '{image_part}' uses ':latest' or lacks an explicit version tag. "
                            "This causes non-reproducible builds when upstream images update."
                        ),
                        suggested_fix="Pin to a specific version or digest (e.g. `python:3.11-slim` or `node:20-alpine`).",
                        source="scanner",
                        rule_id="DOCKER_UNTAGGED_IMAGE",
                    )
                )

        # 2. Track USER instruction
        if stripped.upper().startswith("USER "):
            has_user = True

        # 3. Track HEALTHCHECK instruction
        if stripped.upper().startswith("HEALTHCHECK "):
            has_healthcheck = True

        # 4. Check hardcoded secrets in ENV
        if stripped.upper().startswith("ENV "):
            env_text = stripped[4:].strip()
            if re.search(r'(?:password|secret|api[_-]?key|token|auth)\s*[:=]\s*["\']?[A-Za-z0-9_\-]{6,}["\']?', env_text, re.IGNORECASE):
                issues.append(
                    Issue(
                        category="deployment",
                        severity="high",
                        file=dockerfile_path.name,
                        full_path=rel_path,
                        line_start=line_num,
                        line_end=line_num,
                        description=(
                            "Potential sensitive credential hardcoded in Dockerfile 'ENV' instruction. "
                            "Values in ENV instructions are baked into image metadata and visible via `docker inspect` or `docker history`."
                        ),
                        suggested_fix="Inject secrets dynamically at container runtime or use Docker secrets / build secrets.",
                        source="scanner",
                        rule_id="DOCKER_HARDCODED_ENV_SECRET",
                    )
                )

    # Missing USER check
    if not has_user and lines:
        issues.append(
            Issue(
                category="deployment",
                severity="medium",
                file=dockerfile_path.name,
                full_path=rel_path,
                line_start=len(lines),
                line_end=len(lines),
                description=(
                    f"Dockerfile '{dockerfile_path.name}' does not declare a non-root 'USER'. "
                    "Running as default root user significantly increases attack surface if a container breakout occurs."
                ),
                suggested_fix="Create an unprivileged user and switch to it (e.g. `USER appuser` or `USER 1001:1001`).",
                source="scanner",
                rule_id="DOCKER_RUNS_AS_ROOT",
            )
        )

    # Missing HEALTHCHECK check
    if not has_healthcheck and lines:
        issues.append(
            Issue(
                category="deployment",
                severity="low",
                file=dockerfile_path.name,
                full_path=rel_path,
                line_start=1,
                line_end=1,
                description=(
                    f"Dockerfile '{dockerfile_path.name}' does not include a 'HEALTHCHECK' instruction. "
                    "Container orchestrators cannot monitor container health status reliably."
                ),
                suggested_fix="Add a `HEALTHCHECK CMD curl -f http://localhost:PORT/health || exit 1` instruction.",
                source="scanner",
                rule_id="DOCKER_MISSING_HEALTHCHECK",
            )
        )

    return issues


def check_compose_file(compose_path: Path, repo_root: Path) -> list[Issue]:
    """Audit Docker Compose file for security and port exposure."""
    issues: list[Issue] = []
    rel_path = to_relative_path(compose_path, repo_root)

    try:
        content = compose_path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return issues

    lines = content.splitlines()

    for idx, line in enumerate(lines):
        line_num = idx + 1
        stripped = line.strip()

        # Check database port exposed to 0.0.0.0
        if re.search(r'-\s*["\']?(?:5432|3306|27017|6379):(5432|3306|27017|6379)["\']?', stripped):
            issues.append(
                Issue(
                    category="deployment",
                    severity="medium",
                    file=compose_path.name,
                    full_path=rel_path,
                    line_start=line_num,
                    line_end=line_num,
                    description=(
                        "Database port is bound directly to all interfaces (0.0.0.0). "
                        "If deployed publicly, this exposes the database port to the public internet."
                    ),
                    suggested_fix="Bind to localhost explicitly (e.g. `127.0.0.1:5432:5432`) or communicate via internal Docker network.",
                    source="scanner",
                    rule_id="COMPOSE_EXPOSED_DB_PORT",
                )
            )

        # Check plaintext password in environment
        if re.search(r'(?:POSTGRES_PASSWORD|MYSQL_ROOT_PASSWORD|MONGO_INITDB_ROOT_PASSWORD)\s*[:=]\s*["\']?[A-Za-z0-9_\-]+["\']?', stripped, re.IGNORECASE):
            if "${" not in stripped:
                issues.append(
                    Issue(
                        category="deployment",
                        severity="medium",
                        file=compose_path.name,
                        full_path=rel_path,
                        line_start=line_num,
                        line_end=line_num,
                        description="Plaintext database password configured directly in compose file.",
                        suggested_fix="Reference an environment variable from a git-ignored .env file (e.g. `${DB_PASSWORD}`).",
                        source="scanner",
                        rule_id="COMPOSE_PLAINTEXT_SECRET",
                    )
                )

    return issues


def check_deployment_files(
    dockerfile_path: Optional[Path | str],
    compose_path: Optional[Path | str],
    repo_root: Path | str,
) -> list[Issue]:
    """Analyze Dockerfile and Docker Compose configurations."""
    issues: list[Issue] = []
    root = Path(repo_root)

    if dockerfile_path:
        dp = Path(dockerfile_path)
        if dp.exists() and dp.is_file():
            issues.extend(check_dockerfile(dp, root))

    if compose_path:
        cp = Path(compose_path)
        if cp.exists() and cp.is_file():
            issues.extend(check_compose_file(cp, root))

    return issues
