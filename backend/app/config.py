"""Application Configuration

Loads settings from environment variables with safe defaults.
Never hardcodes secrets directly in source code.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Locate and load .env file from project root or backend root
current_dir = Path(__file__).resolve().parent
backend_dir = current_dir.parent
env_paths = [backend_dir / ".env", current_dir / ".env", Path.cwd() / ".env"]

for env_path in env_paths:
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
        break
else:
    load_dotenv()

# AI API Configuration
API_KEY: str = (os.getenv("API_KEY") or os.getenv("AI_API_KEY") or os.getenv("DEEPSEEK_API_KEY") or "").strip()
AI_BASE_URL: str = (os.getenv("AI_BASE_URL") or os.getenv("DEEPSEEK_BASE_URL") or "https://api.groq.com/openai/v1").strip()
AI_MODEL: str = (os.getenv("AI_MODEL") or os.getenv("DEEPSEEK_MODEL") or "qwen/qwen3.8-27b").strip()

# Backward compatibility aliases
DEEPSEEK_API_KEY: str = API_KEY
DEEPSEEK_BASE_URL: str = AI_BASE_URL
DEEPSEEK_MODEL: str = AI_MODEL

# Guardrails & Operational Limits
MAX_REPO_SIZE_MB: int = int(os.getenv("MAX_REPO_SIZE_MB", "50"))
MAX_FILE_SIZE_KB: int = int(os.getenv("MAX_FILE_SIZE_KB", "500"))
MAX_AI_CHUNKS: int = int(os.getenv("MAX_AI_CHUNKS", "15"))
COMPLEXITY_THRESHOLD: int = int(os.getenv("COMPLEXITY_THRESHOLD", "5"))
AI_CONCURRENCY_LIMIT: int = int(os.getenv("AI_CONCURRENCY_LIMIT", "5"))

# GitHub API & OAuth Configuration
GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "").strip()
GITHUB_CLIENT_ID: str = os.getenv("GITHUB_CLIENT_ID", "").strip()
GITHUB_CLIENT_SECRET: str = os.getenv("GITHUB_CLIENT_SECRET", "").strip()

# SQLite Persistence Paths
DATA_DIR: Path = backend_dir / "app" / "data"
DB_PATH: Path = DATA_DIR / "tozo_cache.db"

# Server & Rate Limiting
PORT: int = int(os.getenv("PORT", "8000"))
RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "15"))
CACHE_TTL_SECONDS: int = int(os.getenv("CACHE_TTL_SECONDS", "3600"))

# Allowed CORS Origins
CORS_ORIGINS: list[str] = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*",
]


def get_api_key() -> str:
    """Retrieve configured API key dynamically, checking .env if needed."""
    key = (os.getenv("API_KEY") or os.getenv("AI_API_KEY") or os.getenv("DEEPSEEK_API_KEY") or "").strip()
    if not key or key == "your_api_key_here" or key == "your_deepseek_api_key_here":
        for path in env_paths:
            if path.exists():
                load_dotenv(dotenv_path=path, override=True)
                key = (os.getenv("API_KEY") or os.getenv("AI_API_KEY") or os.getenv("DEEPSEEK_API_KEY") or "").strip()
                break
    return key


def get_ai_base_url() -> str:
    """Retrieve configured AI base URL dynamically."""
    return (os.getenv("AI_BASE_URL") or os.getenv("DEEPSEEK_BASE_URL") or "https://api.groq.com/openai/v1").strip()


def get_ai_model() -> str:
    """Retrieve configured AI model dynamically, ensuring a valid working default."""
    model = (os.getenv("AI_MODEL") or os.getenv("DEEPSEEK_MODEL") or "qwen/qwen3.8-27b").strip()
    # Guard against invalid or unavailable llama models on this endpoint
    if not model or "llama" in model.lower():
        model = "qwen/qwen3.8-27b"
    return model


def get_github_client_id() -> str:
    """Retrieve configured GitHub Client ID dynamically."""
    cid = os.getenv("GITHUB_CLIENT_ID", "").strip()
    if not cid:
        for path in env_paths:
            if path.exists():
                load_dotenv(dotenv_path=path, override=True)
                cid = os.getenv("GITHUB_CLIENT_ID", "").strip()
                if cid:
                    break
    return cid


def get_github_client_secret() -> str:
    """Retrieve configured GitHub Client Secret dynamically."""
    sec = os.getenv("GITHUB_CLIENT_SECRET", "").strip()
    if not sec:
        for path in env_paths:
            if path.exists():
                load_dotenv(dotenv_path=path, override=True)
                sec = os.getenv("GITHUB_CLIENT_SECRET", "").strip()
                if sec:
                    break
    return sec


def is_ai_available() -> bool:
    """Check whether a valid API key has been configured."""
    key = get_api_key()
    return bool(
        key
        and key != "your_api_key_here"
        and key != "your_deepseek_api_key_here"
        and not key.startswith("<")
    )
