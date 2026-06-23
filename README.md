# AI-Powered Intelligent Repository Reproducibility & Survivability Analyzer

This project is a scalable, modular full-stack application designed to inspect GitHub repositories, validate and clone them locally, and comprehensively analyze their reproducibility and survivability. It employs a LangGraph-orchestrated AI workflow to provide deep insights into codebase health, security, and long-term viability.

---

## 🌟 Current Implementations & Key Features

### 1. Reproducibility Scoring Engine
Evaluates how easily a repository can be rebuilt and executed by another developer.
* **Build Validation**: Analyzes Dockerfiles, Makefiles, and build scripts. Uses a dual-executor strategy (Docker environment first, with a Host environment fallback).
* **Failure Diagnosis & Recovery**: Employs a semantic Vector Knowledge Base (ChromaDB) to map new build failures against historical failures, providing actionable remediation steps and similar failure context.
* **Dependency Health**: Checks for missing, conflicting, or severely outdated dependencies.
* **Environment Completeness**: Verifies if setup scripts and environment templates (e.g., `.env.example`) are present.
* **Documentation Quality**: Scans for comprehensive READMEs and explicit setup instructions.
* **Security Health**: Analyzes the dependency tree for known vulnerabilities using local or remote scanners.

### 2. Survivability Scoring Engine (7-Factor Model)
Predicts the long-term sustainability of an open-source project based on community and maintenance metrics. Uses a dynamic weighted formula based on the availability of metrics:
* **Commit Frequency**: Analyzes code churn and recent commits.
* **Contributor Activity**: Measures the breadth and health of the contributor base.
* **Release Frequency**: Tracks the consistency of versioning and tags.
* **Dependency Freshness**: Assesses how quickly upstream dependency updates are integrated.
* **Security Risk Index**: Evaluates known CVEs or security advisories.
* **Issue Resolution**: Tracks bug fix velocity and issue closure rates.
* **Repository Popularity**: Factors in stars, forks, and community engagement.

### 3. Repository Benchmarking Framework
* Benchmark and compare multiple repositories (configured for up to 15 repositories simultaneously).
* Generates comparative **Summary Statistics** across Technology, Dependencies, and Environments.
* Interactive **Benchmark Dashboard** for real-time data visualization.
* Exports detailed **Benchmark PDF Reports** for stakeholders.

### 4. Advanced Technical Stack & Architecture
* **LangGraph AI Orchestration**: A robust, state-machine-driven AI pipeline orchestrating LLMs. Nodes operate independently with localized database transactions to prevent cascading failures.
* **Vector Search**: Semantic codebase search, logs indexing, and failure retrieval using ChromaDB.
* **Dynamic Frontend Deployment**: A robust NGINX Docker setup that dynamically injects runtime variables (like `VITE_API_URL`) at startup, completely separating build-time compilation from runtime configuration.
* **Forensic Auditing Support**: Cleanly mapped APIs and fallback UI components for robust error handling and monitoring.
* **PDF Report Generation**: Automated compilation of intelligence summaries into shareable PDFs.

---

## 🛠️ Tech Stack
* **Backend**: FastAPI, Python 3.12, SQLAlchemy (Async/asyncpg), PostgreSQL, GitPython, Alembic
* **Frontend**: React, Vite, Tailwind CSS v3, Lucide Icons, Recharts
* **AI Stack**: LangGraph, LangChain, ChromaDB, Ollama integration

---

## 📂 Directory Structure
```text
├── backend/
│   ├── app/
│   │   ├── api/                 # API routers and endpoints
│   │   ├── core/                # Core settings, database connectors, config
│   │   ├── models/              # DB Models (SQLAlchemy)
│   │   ├── schemas/             # Pydantic validation schemas
│   │   ├── repositories/        # Database CRUD Repository classes
│   │   ├── services/            # Business logic (git cloner, analyzers, benchmarkers)
│   │   ├── ai/                  # AI stack (Ollama LLM wrapper, LangGraph workflows)
│   │   └── main.py              # Application entry point
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/          # Dashboard panels, intelligence charts, benchmarking UI
│   │   ├── services/            # Axios API client bindings
│   │   ├── App.jsx              # Main dashboard routing and layout
│   │   ├── index.css            # Tailwind directives and glassmorphic designs
│   │   └── main.jsx
│   ├── tailwind.config.js
│   └── Dockerfile               # NGINX setup with runtime config injection
├── docker-compose.yml           # Complete stack orchestration
├── api_documentation.md         # Detailed REST API structures
└── README.md
```

---

## 🚀 Getting Started

### Method 1: Using Docker Compose (Recommended)
Make sure Docker Desktop is running on your system. From the root directory, execute:

```bash
docker-compose up --build -d
```

* **Frontend Dashboard**: Access at [http://localhost:3000](http://localhost:3000)
* **Backend Swagger API docs**: Access at [http://localhost:8000/docs](http://localhost:8000/docs)
* *Note: The frontend Dockerfile natively resolves the backend URL dynamically at runtime.*

### Method 2: Running Locally
#### 1. Database Setup
Ensure you have a PostgreSQL server running locally, and create a database called `analyzer`.

#### 2. Backend Setup
1. Open a terminal in the `./backend` folder.
2. Initialize a virtual environment and activate it:
   ```bash
   python -m venv venv
   # On Windows:
   \venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables. Adjust variables inside `backend/.env` (especially `DATABASE_URL` to match your local credentials, e.g., `postgresql+asyncpg://postgres:password@localhost:5432/analyzer`).
5. Run the server:
   ```bash
   uvicorn app.main:app --reload
   ```

#### 3. Frontend Setup
1. Open a terminal in the `./frontend` folder.
2. Install npm packages:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the web dashboard at [http://localhost:3000](http://localhost:3000).

---

## 📄 API Documentation
For detailed information on the backend REST API endpoints, input schemas, and expected responses, please refer to the [API Documentation](api_documentation.md).
