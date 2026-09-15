# AI Repo Analyzer

An intelligent, full-stack GitHub repository code analyzer powered by **FastAPI (MVC architecture)**, **built-in AST analysis**, **fast static linters**, and **AI Reasoning**.

The engine takes any public GitHub repository link, downloads a shallow clone, runs fast zero-token static analysis across all files, routes only high-complexity code blocks to AI concurrently, and displays an interactive analysis dashboard in a modern React frontend.

---

## Architecture & Workflow

```
Frontend (React + Vite + Tailwind CSS)
   │  POST /analyze { "repo_url": "https://github.com/..." }
   ├───────────────────────────────────────────────────────► Returns job_id immediately
   │  GET /status/{job_id} (polls every 1.5s)
   ▼
Backend Pipeline (FastAPI Background Tasks)
   1. Pre-Flight Guardrails ──► Checks repo size (<50MB) and public visibility via GitHub API
   2. Shallow Cloner        ──► git clone --depth 1 to temporary folder
   3. File Scanner          ──► Filters out .git, node_modules, binaries, assets, files >500KB
   4. Consolidated AST      ──► Single-pass AST parser extracts functions, measures complexity & finds defects
   5. Fast Static Linters   ──► Runs Ruff, Codespell, and AST checks (zero AI cost)
   6. AI Analysis           ──► Up to 5 parallel AI calls (asyncio.gather + Semaphore) on complex blocks
   7. Aggregator & View     ──► Proximity deduplication (±2 lines), groups into categories, sorts by severity
   8. Safe Cleanup          ──► Cleans temporary directory with Windows read-only attribute handling
   9. Result Caching        ──► In-memory cache returns identical repos instantly
```

---

## Backend MVC Structure

The backend is built following a clean **Model-View-Controller (MVC)** design pattern:

```
backend/
├── app/
│   ├── main.py                     # FastAPI application setup, CORS, rate limiter
│   ├── config.py                   # Environment settings & guardrails
│   │
│   ├── models/                     # THE "M" IN MVC (Pydantic Schemas)
│   │   ├── request_models.py       # RepoRequest with GitHub URL validation, JobStatusResponse
│   │   └── report_models.py        # Issue, Report, ReportMetrics
│   │
│   ├── views/                      # THE "V" IN MVC (JSON Shaping)
│   │   └── report_view.py          # Categorizes issues into bugs, performance, readability, security
│   │
│   ├── controllers/                # THE "C" IN MVC (Orchestration)
│   │   └── analyze_controller.py   # Multi-stage background worker pipeline
│   │
│   ├── routes/                     # HTTP Route Handlers
│   │   └── analyze_routes.py       # POST /analyze, GET /status/{job_id}, GET /health
│   │
│   ├── services/                   # Business Logic & Workers
│   │   ├── job_store.py            # Thread-safe in-memory job tracker and report cache
│   │   ├── github_service.py       # Pre-flight repo metadata & size checks
│   │   ├── cloner_service.py       # Shallow git cloner
│   │   ├── scanner_service.py      # File tree traversal & language classification
│   │   ├── ast_shared_service.py   # Consolidated Python AST parsing
│   │   ├── chunker_service.py      # Code segmentation (Python AST + JS/TS parsing)
│   │   ├── static_check_service.py # Ruff, Codespell, and AST linter integration
│   │   ├── ai_service.py           # Concurrent AI reasoning client with bounded semaphore
│   │   └── aggregator_service.py   # Proximity-based deduplication
│   │
│   └── utils/
│       └── file_helpers.py         # Windows-safe directory cleanup, ignore patterns, filters
│
├── requirements.txt
└── .env.example
```

---

## Production Guardrails & Features

1. **Non-Blocking Asynchronous Jobs**: `POST /analyze` returns a `job_id` immediately. The analysis runs in a background task while the frontend polls `GET /status/{job_id}`, giving real-time progress for each stage (`validating` ➔ `cloning` ➔ `scanning` ➔ `static_checking` ➔ `ai_analyzing` ➔ `completed`).
2. **Pre-Flight Size Guardrail**: Checks GitHub API to ensure repository is public and size does not exceed 50MB before cloning.
3. **AI Token & Cost Protection**: Hard cap of 15 code chunks sent to AI per run (`MAX_AI_CHUNKS`), targeting only high-complexity functions (`COMPLEXITY_THRESHOLD >= 5`).
4. **Concurrent AI Execution**: Runs up to 5 concurrent AI queries via `asyncio.Semaphore(5)` to drastically reduce analysis latency.
5. **Report Caching**: Analyzed repositories are cached in memory for 1 hour (`CACHE_TTL_SECONDS = 3600`). Re-analyzing the same repository returns immediately.
6. **Graceful Degradation**: If `API_KEY` is not provided or quota runs out, the system still completes and provides a full static report.
7. **Windows-Safe Directory Removal**: Custom `safe_rmtree` clears Windows read-only file attributes from `.git` objects before deleting temporary directories.
8. **Consolidated AST Engine**: Parses Python files once to simultaneously extract function boundaries, calculate cyclomatic complexity, and detect anti-patterns (mutable default arguments, bare excepts, long functions, typos).

---

## Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**
- **Git** installed and available in system PATH

---

### Step 1: Backend Setup

1. Open a terminal in the `backend/` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # On Windows (PowerShell):
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # On macOS/Linux:
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```bash
   # Copy example environment file
   cp .env.example .env
   ```
   Open `.env` and add your **API Key**:
   ```ini
   API_KEY=your_actual_api_key_here
   AI_BASE_URL=https://api.groq.com/openai/v1
   AI_MODEL=qwen/qwen3.8-27b
   ```
   *(Note: If you don't have a key yet, the analyzer will still run free static checks!)*

5. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   The backend will be running at `http://localhost:8000`. You can visit `http://localhost:8000/docs` to view the interactive Swagger API docs.

---

### Step 2: Frontend Setup

1. Open a new terminal in the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Open your browser to `http://localhost:5173`.

---

## Testing with Sample Repositories

You can test the analyzer by pasting any public GitHub repository link into the UI, or clicking any of the quick sample buttons:
- `https://github.com/pallets/flask` (Python)
- `https://github.com/encode/starlette` (Python ASGI)
- `https://github.com/expressjs/express` (JavaScript)
- `https://github.com/psf/requests` (Python)

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Check backend status and AI engine readiness |
| `GET` | `/sample-repos` | Returns curated public open-source repos for quick testing |
| `POST` | `/analyze` | Enqueue repository analysis (returns `{ "job_id": "..." }`) |
| `GET` | `/status/{job_id}` | Poll progress and retrieve finalized report |
| `GET` | `/docs` | Interactive Swagger API documentation |

---

## License
MIT License