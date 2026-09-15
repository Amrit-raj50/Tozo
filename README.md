# 🐾 Tozo — A Contributor's Code Companion

<p align="center">
  <img src="frontend/public/tozo_logo.svg" alt="Tozo Dog Mascot" width="160" />
</p>

<p align="center">
  <strong>An intelligent, full-stack open-source repository analyzer and contributor companion.</strong><br />
  Powered by <strong>FastAPI (MVC Architecture)</strong>, <strong>AST Analysis</strong>, <strong>Multi-Language Static Linters</strong>, and <strong>Concurrent AI Reasoning</strong>.
</p>

<p align="center">
  <a href="#-user-guide-how-to-use-tozo">User Guide</a> •
  <a href="#-key-features">Key Features</a> •
  <a href="#-architecture--12-stage-pipeline">Architecture</a> •
  <a href="#-tozos-fetch-list--issue-drafter">Fetch List & Issue Drafter</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-deployment-guide">Deployment</a>
</p>

---

## 🌟 Why Tozo?

Entering a new open-source codebase can feel overwhelming. **Tozo** acts as your loyal code-hunting companion: it shallow-clones any public GitHub repository, audits the code across **11 taxonomy domains**, generates an **Executive Repo Briefing**, curates beginner-friendly **starter tasks (Tozo's Fetch List)**, and drafts **14-point maintainer-grade GitHub issues** ready for **one-click pre-filled filing on GitHub**.

---

## 📖 User Guide: How to Use Tozo

### 1. Analyzing any Public GitHub Repository
1. Open Tozo in your browser.
2. Paste any public GitHub repository URL (e.g., `https://github.com/pallets/flask`) into the search bar, or click any of the curated trail chips.
3. Click **Sniff Out Issues**.
4. Watch Tozo's live 12-stage progress trail as it shallow clones the repository, runs single-pass AST parsing, performs static checks, and queries AI models concurrently.

### 2. Exploring "Tozo's Fetch List" (Beginner-Friendly Pickups)
1. At the top of your analysis report, view **Tozo's Fetch List**.
2. Browse curated low-risk starter tasks (typos, missing docstrings, quick linter cleanups).
3. Read Tozo's tip explaining *why* each task is ideal for your first merged pull request.

### 3. One-Click Pre-filled GitHub Issue Filing
Tozo streamlines contributing to open-source:
- **Instant Pre-filled Form**: Click **`File Issue on GitHub`** on any issue card or Fetch List treat. Tozo generates a URL (`https://github.com/owner/repo/issues/new?title=...&body=...`) that opens GitHub's issue editor with the **Title** and **14-Point Maintainer-Grade Description** ALREADY PRE-FILLED!
- **Draft Details & Markdown Copy**: Click **`Draft Details`** to toggle between **Formatted Preview** and **Raw Markdown**, or copy the title/markdown directly to your clipboard.

### 4. Sharing Public Scorecards
- Click **Share Scorecard** in the header of any completed report to copy a shareable permalink (`/scorecard/{owner}/{repo}`).
- Teammates or maintainers can open the link to instantly view the cached scorecard without re-cloning.

### 5. Tracking Code Drift (Re-Scanning)
- Click **Re-Scan Repository** to perform a forced fresh scan.
- Tozo compares the current commit SHA against historical SQLite scans (`tozo_history.db`) and highlights **New Issues Added**, **Issues Resolved**, and **Persistent Findings**.

---

## 🐾 Key Features

- 🐶 **Interactive Companion (Tozo Mascot)**: Reactive mascot with context-aware poses (`searching`, `walking`, `fetching`, `proud`, `confused`), animated wags, ears perking, and dynamic barks.
- 🦴 **Tozo's Fetch List**: Curated beginner-friendly pickups (low risk, high confidence) designed for your first merged pull request.
- 🚀 **One-Click Pre-filled GitHub Issue Filing**: Opens GitHub's issue form with title and 14-point markdown description pre-populated.
- 📝 **Maintainer-Grade Issue Drafter**: 14-point structured issue generator (Title, Description, File/Line, Technical Analysis, Reproduction, Suggested Fix, Code Diff, Impact, Verification Plan).
- 🏷️ **11-Domain Issue Taxonomy**: Categorized into `Bugs`, `Error Handling`, `Backend`, `Frontend`, `Lint & Style`, `Typos`, `CI/CD Workflows`, `Deployment`, `Documentation`, `Enhancements`, and `Test Coverage`.
- 📊 **Executive Repository Briefing**: Fact-based structural overview, architecture summary, primary languages, entry points, key directories, guidelines, and contribution friendliness score (0-100).
- 🔄 **Re-Scan Diffing & SQLite History**: Tracks added, resolved, and persistent issues across commits with SQLite historical scan persistence.
- ⚡ **Non-Blocking 12-Stage Pipeline**: Offloads heavy CPU/Git/AST operations to threadpools (`asyncio.to_thread`), ensuring 100% Uvicorn event loop responsiveness.

---

## 🏗️ Architecture & 12-Stage Pipeline

```
[ Frontend: React + Vite + Tailwind CSS ]
         │  POST /analyze { "repo_url": "https://github.com/owner/repo" }
         ├─────────────────────────────────────────────────────────────────► Returns job_id instantly
         │  GET /status/{job_id} (polls every 1.5s - non-blocking responses)
         ▼
[ Backend Engine: FastAPI + MVC Architecture ]
   ├── Stage 1:  Pre-Flight Verification ──► GitHub REST API size (<50MB) & public check
   ├── Stage 2:  Shallow Git Clone       ──► git clone --depth 1 into isolated temp folder
   ├── Stage 3:  File Scanner            ──► Ignores binaries, vendor files, files >500KB
   ├── Stage 4:  Executive Repo Briefing ──► Fact-based architecture overview & starter guide
   ├── Stage 5:  Code Chunking & AST     ──► Single-pass AST parser for functions & complexity
   ├── Stage 6:  Static Linters          ──► Ruff, Codespell & AST defect detection
   ├── Stage 7:  CI/CD Audit             ──► GitHub Actions & workflow permission checks
   ├── Stage 8:  Deployment Audit        ──► Dockerfile & docker-compose security rules
   ├── Stage 9:  Documentation Audit     ──► README, docstrings & CONTRIBUTING.md checks
   ├── Stage 10: Technical Debt Scanner  ──► Extract TODOs, FIXMEs, and HACK markers
   ├── Stage 11: Concurrent AI Analysis  ──► Parallel AI calls (asyncio.gather) on complex blocks
   └── Stage 12: Aggregator & View       ──► Deduplication (±2 lines), Fetch List & Scorecard
```

---

## 📂 Backend MVC Folder Structure

```
backend/
├── app/
│   ├── main.py                     # FastAPI entrypoint, CORS, rate limiter
│   ├── config.py                   # Dynamic AI config, model fallbacks, guardrails
│   │
│   ├── models/                     # [M] MODEL: Pydantic Data Schemas
│   │   ├── request_models.py       # RepoRequest, JobStatusResponse
│   │   └── report_models.py        # Issue, Report, RepoBriefing, ReportMetrics
│   │
│   ├── views/                      # [V] VIEW: Response Formatting & JSON Shaping
│   │   └── report_view.py          # Formats issues into 11 domain categories
│   │
│   ├── controllers/                # [C] CONTROLLER: Pipeline Worker
│   │   └── analyze_controller.py   # 12-stage non-blocking worker pipeline
│   │
│   ├── routes/                     # HTTP Route Handlers
│   │   └── analyze_routes.py       # POST /analyze, GET /status/{job_id}, GET /scorecard
│   │
│   ├── services/                   # Business Logic & Modular Audit Workers
│   │   ├── ai_service.py           # Bounded concurrent AI reasoning client
│   │   ├── ast_shared_service.py   # Consolidated Python AST parser
│   │   ├── cicd_service.py         # GitHub Actions workflow auditor
│   │   ├── cloner_service.py       # Fast shallow git cloner
│   │   ├── deploy_service.py       # Container & Docker audit engine
│   │   ├── diff_service.py         # Historical scan diff computer
│   │   ├── docs_service.py         # Docstrings & README auditor
│   │   ├── draft_service.py        # 14-point maintainer-grade issue generator
│   │   ├── github_meta_service.py  # Commit SHA & contribution signals retriever
│   │   ├── job_store.py            # Thread-safe in-memory job tracker
│   │   ├── repo_brief_service.py   # Executive summary generator
│   │   ├── starter_list_service.py # Tozo's Fetch List curator
│   │   └── static_check_service.py # Multi-language static linters
│   │
│   └── utils/
│       └── file_helpers.py         # Windows-safe safe_rmtree & file utilities
│
├── requirements.txt
└── .env.example
```

---

## 📜 Maintainer-Grade GitHub Issue Drafter (14-Point Schema)

When you click **`File Issue on GitHub`** or expand **`Draft Details`**, Tozo generates a complete 14-point maintainer-grade issue:

1. **Title**: Concise, actionable summary prefixed with category tag.
2. **Overview**: Clear problem summary and why it matters.
3. **Location**: Precise file path, start/end lines, function name, and GitHub permalink.
4. **Severity & Domain**: Classified severity level and taxonomy domain.
5. **Current Behavior**: Detailed description of current incorrect behavior.
6. **Expected Behavior**: What the code should correctly do.
7. **Technical Analysis**: Deep root-cause analysis.
8. **Reproduction Steps**: Step-by-step reproduction instructions.
9. **Suggested Fix**: Concrete fix recommendations.
10. **Proposed Code Change**: Markdown diff showing exact code changes.
11. **Impact**: Scope of impact on maintainability or runtime.
12. **Verification Plan**: Unit tests or manual checks to verify fix.
13. **Starter Task Flag**: Highlights beginner-friendliness if applicable.
14. **Draft Metadata**: Audit tool and version signature.

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**
- **Git** in system PATH

---

### Step 1: Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
```

Edit `backend/.env`:
```ini
API_KEY=your_groq_or_openai_api_key
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=qwen/qwen3.8-27b
```

Start the FastAPI server:
```bash
uvicorn app.main:app --reload --port 8000
```
*(Backend running at `http://localhost:8000` — API docs at `http://localhost:8000/docs`)*

---

### Step 2: Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
*(Frontend running at `http://localhost:5173`)*

---

## 🌐 API Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server status and AI engine availability |
| `GET` | `/sample-repos` | Returns curated sample open-source repositories |
| `POST` | `/analyze` | Enqueue repo analysis (returns `job_id`) |
| `GET` | `/status/{job_id}` | Poll progress percent, stage message, and final report |
| `GET` | `/scorecard/{owner}/{repo}` | Public shareable scorecard report from SQLite history |
| `GET` | `/docs` | Interactive OpenAPI Swagger documentation |

---

## 🚢 Deployment Summary

- **Frontend**: Deploy `frontend/` directory to **Vercel** or **Netlify** with build command `npm run build` and `VITE_API_URL` pointing to backend URL.
- **Backend**: Deploy `backend/` directory to **Render**, **Railway**, or **Fly.io** with start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT` and set `API_KEY` environment variable.

---

## 📄 License
[MIT License](LICENSE) — Built for open-source contributors and maintainers worldwide.