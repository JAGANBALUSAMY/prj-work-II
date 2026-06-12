# AI-Powered Intelligent Repository Reproducibility & Survivability Analyzer

This project is a scalable, modular full-stack application designed to inspect GitHub repositories, validate and clone them locally, and analyze their reproducibility (README layout, Dockerfiles, setup scripts) and survivability (commit activity, contributors, license types, dependency decay) using a LangGraph-orchestrated AI workflow.

---

## Tech Stack
* **Backend**: FastAPI, Python 3.12, SQLAlchemy (Async/asyncpg), PostgreSQL, GitPython, Alembic
* **Frontend**: React, Vite, Tailwind CSS v3, Lucide Icons
* **AI Stack**: LangGraph, LangChain, ChromaDB, Ollama integration

---

## Directory Structure
```
├── backend/
│   ├── app/
│   │   ├── api/                 # API routers and endpoints
│   │   ├── core/                # Core settings, database connectors, config
│   │   ├── models/              # DB Models (SQLAlchemy)
│   │   ├── schemas/             # Pydantic validation schemas
│   │   ├── repositories/        # Database CRUD Repository classes
│   │   ├── services/            # Business logic (git cloner, metadata scraper)
│   │   ├── ai/                  # AI stack (Ollama LLM wrapper, ChromaDB client, LangGraph workflow stubs)
│   │   └── main.py              # Application entry point
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/          # Dashboard panels, cards, Drawer
│   │   ├── services/            # Axios API client bindings
│   │   ├── App.jsx              # Main dashboard component
│   │   ├── index.css            # Tailwind directives and glassmorphic designs
│   │   └── main.jsx
│   ├── tailwind.config.js
│   └── Dockerfile
├── docker-compose.yml
├── api_documentation.md         # REST API structures
└── README.md
```

---

## Getting Started

### Method 1: Using Docker Compose (Recommended)
Make sure Docker Desktop is running on your system. From the root directory, execute:

```bash
docker-compose up --build
```

* **Frontend Dashboard**: Access at [http://localhost:3000](http://localhost:3000)
* **Backend Swagger API docs**: Access at [http://localhost:8000/docs](http://localhost:8000/docs)

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
