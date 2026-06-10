# API Documentation - Intelligent Repository Reproducibility & Survivability Analyzer

The backend exposes a REST API to register repositories, query metrics, and fetch detailed reports.

---

## Base URL
* Local Dev: `http://localhost:8000/api`
* Swagger UI Docs: `http://localhost:8000/docs`
* ReDoc API Docs: `http://localhost:8000/redoc`

---

## Endpoints

### 1. Trigger Repository Acquisition and Analysis
Initiates the URL validation, fetches metadata from the GitHub API, clones the repository files locally in a background task, and schedules the LangGraph pipeline execution.

* **URL**: `/repositories/analyze`
* **Method**: `POST`
* **Headers**: `Content-Type: application/json`
* **Request Body**:
```json
{
  "clone_url": "https://github.com/fastapi/fastapi"
}
```

* **Response (202 Accepted)**:
```json
{
  "id": "6c8230b2-db7f-43b2-9214-e29f12d216f4",
  "name": "fastapi",
  "owner": "fastapi",
  "clone_url": "https://github.com/fastapi/fastapi",
  "description": null,
  "stars": 0,
  "forks": 0,
  "open_issues": 0,
  "contributors_count": 0,
  "last_commit_date": null,
  "local_path": null,
  "status": "cloning",
  "created_at": "2026-06-09T09:05:00.123456",
  "analyses": []
}
```

---

### 2. List All Repositories
Retrieves a list of all registered repositories including their latest status, stars, forks, and analysis histories.

* **URL**: `/repositories`
* **Method**: `GET`
* **Query Parameters**:
  * `skip` (int, default: 0) - Pagination offset
  * `limit` (int, default: 100) - Maximum records to return
* **Response (200 OK)**:
```json
[
  {
    "id": "6c8230b2-db7f-43b2-9214-e29f12d216f4",
    "name": "fastapi",
    "owner": "fastapi",
    "clone_url": "https://github.com/fastapi/fastapi",
    "description": "FastAPI framework, high performance, easy to learn, fast to code, ready for production",
    "stars": 69200,
    "forks": 5400,
    "open_issues": 350,
    "contributors_count": 100,
    "last_commit_date": "2026-06-08T15:30:00",
    "local_path": "/app/data/cloned_repos/fastapi/fastapi",
    "status": "cloned",
    "created_at": "2026-06-09T09:05:00.123456",
    "analyses": [
      {
        "id": "dcf348d2-432d-45fa-b648-28c1ea8129ff",
        "repository_id": "6c8230b2-db7f-43b2-9214-e29f12d216f4",
        "status": "completed",
        "reproducibility_score": 85.0,
        "survivability_score": 90.0,
        "summary": "This repository demonstrates high reproducibility standards...",
        "findings": {
          "reproducibility_factors": {
            "has_dockerfile": true,
            "has_readme": true,
            "environment_instructions_score": 8.5
          },
          "survivability_factors": {
            "active_maintenance": true,
            "license_permissive": true,
            "dependency_health": "good"
          }
        },
        "logs": [
          "State machine initialized.",
          "Node [clone_and_parse]: Inspecting local directories and files...",
          "Node [analyze_reproducibility]: Evaluating README structure, environment setups...",
          "Node [analyze_survivability]: Scanning dependencies...",
          "Node [generate_report]: Building final markdown dashboard summary..."
        ],
        "created_at": "2026-06-09T09:05:05.123456",
        "completed_at": "2026-06-09T09:05:07.123456"
      }
    ]
  }
]
```

---

### 3. Get Single Repository Details
Fetches detailed metadata and the complete analysis history for a specific repository.

* **URL**: `/repositories/{id}`
* **Method**: `GET`
* **Path Parameters**:
  * `id` (UUID, required) - Repository ID
* **Response (200 OK)**:
```json
{
  "id": "6c8230b2-db7f-43b2-9214-e29f12d216f4",
  "name": "fastapi",
  "owner": "fastapi",
  "clone_url": "https://github.com/fastapi/fastapi",
  "description": "FastAPI framework, high performance, easy to learn, fast to code, ready for production",
  "stars": 69200,
  "forks": 5400,
  "open_issues": 350,
  "contributors_count": 100,
  "last_commit_date": "2026-06-08T15:30:00",
  "local_path": "/app/data/cloned_repos/fastapi/fastapi",
  "status": "cloned",
  "created_at": "2026-06-09T09:05:00.123456",
  "analyses": [
    {
      "id": "dcf348d2-432d-45fa-b648-28c1ea8129ff",
      "repository_id": "6c8230b2-db7f-43b2-9214-e29f12d216f4",
      "status": "completed",
      "reproducibility_score": 85.0,
      "survivability_score": 90.0,
      "summary": "This repository demonstrates high reproducibility standards...",
      "findings": { ... },
      "logs": [ ... ],
      "created_at": "2026-06-09T09:05:05",
      "completed_at": "2026-06-09T09:05:07"
    }
  ]
}
```

---

### 4. Get Technology Stack Profile
Retrieves the detected technology stack details for a specific repository.

* **URL**: `/repositories/{id}/stack`
* **Method**: `GET`
* **Path Parameters**:
  * `id` (UUID, required) - Repository ID
* **Response (200 OK)**:
```json
{
  "repository_id": "6c8230b2-db7f-43b2-9214-e29f12d216f4",
  "backend": ["Python", "FastAPI"],
  "frontend": [],
  "databases": ["PostgreSQL"],
  "scanned_files": ["requirements.txt"]
}
```

---

### 5. Get Dependency Intelligence Profile
Retrieves the parsed package configurations and dependency health report for a specific repository.

* **URL**: `/repositories/{id}/dependencies`
* **Method**: `GET`
* **Path Parameters**:
  * `id` (UUID, required) - Repository ID
* **Response (200 OK)**:
```json
{
  "repository_id": "6c8230b2-db7f-43b2-9214-e29f12d216f4",
  "dependencies": [
    {
      "name": "numpy",
      "version": "1.26.0",
      "dependency_type": "direct",
      "source_file": "requirements.txt"
    },
    {
      "name": "pandas",
      "version": "2.1.0",
      "dependency_type": "direct",
      "source_file": "requirements.txt"
    }
  ],
  "report": {
    "total_count": 2,
    "duplicates": [],
    "missing_versions": [],
    "suspicious_declarations": [],
    "summary": "Scanned 2 packages. Issues detected: 0 duplicates, 0 missing versions, 0 suspicious references."
  }
}
```

---

### 6. Get Environment Variable Reconstruction Profile
Retrieves all unique environment variables referenced in codebase files or template files, along with an auto-generated sample configuration template.

* **URL**: `/repositories/{id}/environment`
* **Method**: `GET`
* **Path Parameters**:
  * `id` (UUID, required) - Repository ID
* **Response (200 OK)**:
```json
{
  "repository_id": "6c8230b2-db7f-43b2-9214-e29f12d216f4",
  "variables": [
    {
      "name": "DATABASE_URL",
      "sources": ["app/core/config.py"],
      "is_missing_from_template": true
    },
    {
      "name": "JWT_SECRET",
      "sources": [".env.example", "app/core/auth.py"],
      "is_missing_from_template": false
    }
  ],
  "template": "DATABASE_URL=\nJWT_SECRET=\n",
  "scanned_files_count": 5,
  "template_files_found": [".env.example"],
  "summary": "Detected 2 variables across 5 scanned files. Templates scanned: .env.example. Warnings: 1 variables missing from template files."
}
```

---

### 7. Get Documentation Intelligence Profile
Retrieves the rule-based or LLM-based documentation completeness evaluation score, checklist, and improvement suggestions based on the README file.

* **URL**: `/repositories/{id}/documentation`
* **Method**: `GET`
* **Path Parameters**:
  * `id` (UUID, required) - Repository ID
* **Response (200 OK)**:
```json
{
  "repository_id": "6c8230b2-db7f-43b2-9214-e29f12d216f4",
  "completeness_score": 85,
  "scanned_file": "README.md",
  "sections": [
    {
      "category": "Project Description",
      "score": 100,
      "found": true,
      "details": "Project description is documented under a dedicated section."
    },
    {
      "category": "Installation Instructions",
      "score": 100,
      "found": true,
      "details": "Dedicated installation section with package installation code blocks is present."
    },
    {
      "category": "Setup Instructions",
      "score": 50,
      "found": true,
      "details": "Configuration keywords found, but no dedicated Setup header is present."
    },
    {
      "category": "Environment Variables",
      "score": 100,
      "found": true,
      "details": "Dedicated environment variables section listing specific configuration keys is present."
    },
    {
      "category": "Usage Examples",
      "score": 100,
      "found": true,
      "details": "Dedicated usage section with execution examples/commands is present."
    },
    {
      "category": "API Documentation",
      "score": 60,
      "found": true,
      "details": "API header found, but lacks structured endpoints listing."
    }
  ],
  "suggestions": [
    "Document configuration setup steps, including config file placement or command-line boot steps.",
    "Document API endpoints, HTTP routes (GET/POST), request parameters, and response schemas."
  ],
  "summary": "Evaluated README.md. Overall completeness score is 85%. Detected 6 out of 6 key documentation sections.",
  "readme_preview": "# Mock Repo\n\n## Description\nThis is a mock project description for testing..."
}
```

---

## Life Cycle Status Definitions

### Repository Status
* `idle`: Default initialized state.
* `cloning`: Repository metadata is being retrieved and files are being pulled from remote GitHub servers.
* `cloned`: The repository is stored locally, is fully cataloged, and is ready for graph-based code analysis.
* `failed`: Git cloning or metadata lookup crashed.

### Analysis Status
* `pending`: Analysis has been queued.
* `running`: The LangGraph state workflow is actively traversing evaluation nodes.
* `completed`: Analysis completed and scores/findings compiled.
* `failed`: Analysis pipeline encountered an error.
