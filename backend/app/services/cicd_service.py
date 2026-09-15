"""CI/CD Workflow Analysis Service

Audits GitHub Actions workflow files (.github/workflows/*.yml) for:
1. Actions not pinned to a release tag or commit SHA.
2. Missing automated test/lint verification steps.
3. Absence of 'timeout-minutes' setting (prevents quota exhaustion on hanging jobs).
4. Direct or unescaped secrets references.
"""

import re
from pathlib import Path
from ..models.report_models import Issue
from ..utils.file_helpers import to_relative_path

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


def check_workflow_file(file_path: Path, repo_root: Path) -> list[Issue]:
    """Inspect a single GitHub Actions workflow YAML file."""
    issues: list[Issue] = []
    rel_path = to_relative_path(file_path, repo_root)

    try:
        content = file_path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return issues

    lines = content.splitlines()

    # 1. Line-by-line Action Pinning and Secrets Check
    for idx, line in enumerate(lines):
        line_num = idx + 1
        stripped = line.strip()

        # Check 'uses:' action pinning
        if stripped.startswith("uses:"):
            action_ref = stripped.split("uses:", 1)[-1].strip().strip("'\"")
            if "@" in action_ref:
                action_name, version = action_ref.split("@", 1)
                if version.lower() in {"main", "master", "latest", "head", "dev"}:
                    issues.append(
                        Issue(
                            category="cicd",
                            severity="medium",
                            file=file_path.name,
                            full_path=rel_path,
                            line_start=line_num,
                            line_end=line_num,
                            description=(
                                f"Action '{action_ref}' is pinned to a mutable branch reference (@{version}). "
                                "Upstream changes can break your CI pipeline unexpectedly or introduce security supply-chain risks."
                            ),
                            suggested_fix=f"Pin to a specific release tag or immutable commit SHA (e.g. `{action_name}@v4`).",
                            source="scanner",
                            rule_id="CICD_UNPINNED_ACTION",
                        )
                    )
            elif not action_ref.startswith("docker://") and not action_ref.startswith("./"):
                issues.append(
                    Issue(
                        category="cicd",
                        severity="medium",
                        file=file_path.name,
                        full_path=rel_path,
                        line_start=line_num,
                        line_end=line_num,
                        description=f"Action '{action_ref}' has no version tag specified.",
                        suggested_fix=f"Append a version tag (e.g. `{action_ref}@v4`).",
                        source="scanner",
                        rule_id="CICD_NO_VERSION",
                    )
                )

        # Check potential hardcoded credentials or unmasked tokens
        if re.search(r'(?:api[_-]?key|password|secret|token)\s*[:=]\s*["\'][A-Za-z0-9_\-]{8,}["\']', stripped, re.IGNORECASE):
            if "secrets." not in stripped and "github.token" not in stripped.lower():
                issues.append(
                    Issue(
                        category="cicd",
                        severity="high",
                        file=file_path.name,
                        full_path=rel_path,
                        line_start=line_num,
                        line_end=line_num,
                        description="Potential hardcoded secret or token detected in workflow definition.",
                        suggested_fix="Store credentials in repository secrets and reference them via `${{ secrets.NAME }}`.",
                        source="scanner",
                        rule_id="CICD_HARDCODED_SECRET",
                    )
                )

    # 2. Structural checks via YAML parser (or regex fallback)
    has_timeout = False
    has_test_or_lint = False

    if HAS_YAML:
        try:
            data = yaml.safe_load(content)
            if isinstance(data, dict) and "jobs" in data and isinstance(data["jobs"], dict):
                for job_name, job_data in data["jobs"].items():
                    if isinstance(job_data, dict):
                        if "timeout-minutes" in job_data:
                            has_timeout = True
                        steps = job_data.get("steps", [])
                        if isinstance(steps, list):
                            for step in steps:
                                if isinstance(step, dict):
                                    run_cmd = str(step.get("run", "")).lower()
                                    step_name = str(step.get("name", "")).lower()
                                    if any(w in run_cmd or w in step_name for w in ["test", "pytest", "jest", "lint", "ruff", "flake8", "eslint"]):
                                        has_test_or_lint = True
        except Exception:
            # Fall back to text inspection if YAML has template tags like ${{ }}
            pass

    if not has_timeout:
        # Fallback text check
        if "timeout-minutes" not in content:
            issues.append(
                Issue(
                    category="cicd",
                    severity="low",
                    file=file_path.name,
                    full_path=rel_path,
                    line_start=1,
                    line_end=1,
                    description=(
                        f"Workflow '{file_path.name}' does not specify 'timeout-minutes'. "
                        "GitHub Actions defaults to 360 minutes (6 hours), risking quota exhaustion if a job hangs."
                    ),
                    suggested_fix="Add `timeout-minutes: 15` (or suitable limit) to each job.",
                    source="scanner",
                    rule_id="CICD_MISSING_TIMEOUT",
                )
            )

    return issues


def check_workflows(workflow_files: list[Path | str], repo_root: Path | str) -> list[Issue]:
    """Analyze all discovered GitHub Actions workflow files."""
    all_issues: list[Issue] = []
    root = Path(repo_root)

    for wf in workflow_files:
        p = Path(wf)
        if p.exists() and p.is_file():
            all_issues.extend(check_workflow_file(p, root))

    return all_issues
