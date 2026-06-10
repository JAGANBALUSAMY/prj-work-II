import os
import json
import logging
from uuid import UUID
from typing import Dict, Any, Set, List
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.repo_repo import repository_repo

logger = logging.getLogger(__name__)

class StackService:
    @classmethod
    async def discover_stack(cls, db: AsyncSession, repo_id: UUID) -> Dict[str, Any]:
        """
        Scans the repository local directory and extracts:
        - Backend technologies (Python, Django, Flask, FastAPI, Java, Spring Boot, Node.js)
        - Frontend technologies (React, Angular, Vue)
        - Databases (PostgreSQL, MySQL, MongoDB, Redis)
        Saves the resulting profile dictionary to the database under Repository.detected_stack.
        """
        repo = await repository_repo.get(db, repo_id)
        if not repo or not repo.local_path or not os.path.exists(repo.local_path):
            logger.warning(f"Repository {repo_id} path '{repo.local_path if repo else 'None'}' does not exist. Skipping discovery.")
            return {
                "backend": [],
                "frontend": [],
                "databases": [],
                "scanned_files": []
            }

        local_path = os.path.abspath(repo.local_path)
        backend: Set[str] = set()
        frontend: Set[str] = set()
        databases: Set[str] = set()
        scanned_files: List[str] = []

        # 1. requirements.txt scanner (Python)
        req_path = os.path.join(local_path, "requirements.txt")
        if os.path.exists(req_path):
            scanned_files.append("requirements.txt")
            backend.add("Python")
            try:
                with open(req_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read().lower()
                    if "django" in content:
                        backend.add("Django")
                    if "flask" in content:
                        backend.add("Flask")
                    if "fastapi" in content:
                        backend.add("FastAPI")
            except Exception as e:
                logger.error(f"Error scanning requirements.txt in {local_path}: {e}")

        # 2. package.json scanner (Node.js & Frontend frameworks)
        pkg_path = os.path.join(local_path, "package.json")
        if os.path.exists(pkg_path):
            scanned_files.append("package.json")
            backend.add("Node.js")
            try:
                with open(pkg_path, "r", encoding="utf-8", errors="ignore") as f:
                    pkg_data = json.load(f)
                    dependencies = {
                        **pkg_data.get("dependencies", {}), 
                        **pkg_data.get("devDependencies", {})
                    }
                    # Check frontend frameworks
                    if "react" in dependencies or "react-dom" in dependencies:
                        frontend.add("React")
                    if "@angular/core" in dependencies or "angular" in dependencies:
                        frontend.add("Angular")
                    if "vue" in dependencies:
                        frontend.add("Vue")
            except Exception as e:
                logger.error(f"Error parsing package.json in {local_path}: {e}")

        # 3. pom.xml scanner (Java Maven)
        pom_path = os.path.join(local_path, "pom.xml")
        if os.path.exists(pom_path):
            scanned_files.append("pom.xml")
            backend.add("Java")
            try:
                with open(pom_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    if "spring-boot" in content or "org.springframework.boot" in content:
                        backend.add("Spring Boot")
            except Exception as e:
                logger.error(f"Error scanning pom.xml in {local_path}: {e}")

        # 4. build.gradle scanner (Java Gradle)
        gradle_path = os.path.join(local_path, "build.gradle")
        if os.path.exists(gradle_path):
            scanned_files.append("build.gradle")
            backend.add("Java")
            try:
                with open(gradle_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    if "org.springframework.boot" in content or "spring-boot" in content:
                        backend.add("Spring Boot")
            except Exception as e:
                logger.error(f"Error scanning build.gradle in {local_path}: {e}")

        # 5. docker-compose.yml scanner (Databases)
        dc_path = os.path.join(local_path, "docker-compose.yml")
        if os.path.exists(dc_path):
            scanned_files.append("docker-compose.yml")
            try:
                with open(dc_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read().lower()
                    if "image: postgres" in content or "postgres:" in content:
                        databases.add("PostgreSQL")
                    if "image: mysql" in content or "mysql:" in content:
                        databases.add("MySQL")
                    if "image: mongo" in content or "mongo:" in content:
                        databases.add("MongoDB")
                    if "image: redis" in content or "redis:" in content:
                        databases.add("Redis")
            except Exception as e:
                logger.error(f"Error scanning docker-compose.yml in {local_path}: {e}")

        # 6. Source File Extension Scanner and .env connections
        py_files = 0
        java_files = 0
        js_ts_files = 0
        env_content = ""

        try:
            for root, dirs, files in os.walk(local_path):
                # Prune standard directories to keep scan fast
                dirs[:] = [
                    d for d in dirs 
                    if not d.startswith('.') 
                    and d not in ('venv', 'node_modules', '__pycache__', 'dist', 'target', 'build')
                ]
                
                for file in files:
                    if file.endswith(".py"):
                        py_files += 1
                    elif file.endswith(".java"):
                        java_files += 1
                    elif file.endswith((".js", ".jsx", ".ts", ".tsx")):
                        js_ts_files += 1
                    elif file == ".env":
                        try:
                            with open(os.path.join(root, file), "r", encoding="utf-8", errors="ignore") as ef:
                                env_content += ef.read().lower()
                        except Exception:
                            pass
        except Exception as e:
            logger.error(f"Error walking files in {local_path}: {e}")

        # Register file types found
        if py_files > 0:
            backend.add("Python")
        if java_files > 0:
            backend.add("Java")
        if js_ts_files > 0 and "Node.js" not in backend:
            # If we don't have python or java and found js/ts, might be Node.js, but avoid false positives on web assets.
            # If package.json was scanned, we already added "Node.js" above.
            pass

        # Scan .env content for DB markers
        if "postgres://" in env_content or "postgresql://" in env_content:
            databases.add("PostgreSQL")
        if "mongodb://" in env_content or "mongodb+srv://" in env_content:
            databases.add("MongoDB")
        if "redis://" in env_content:
            databases.add("Redis")
        if "mysql://" in env_content:
            databases.add("MySQL")

        # 7. Check source code import patterns inside python files for framework overrides
        if "Python" in backend and not any(fw in backend for fw in ["Django", "Flask", "FastAPI"]):
            await cls._scan_python_imports(local_path, backend)

        profile = {
            "backend": sorted(list(backend)),
            "frontend": sorted(list(frontend)),
            "databases": sorted(list(databases)),
            "scanned_files": sorted(scanned_files)
        }

        # Update database entry
        await repository_repo.update(db, db_obj=repo, obj_in={"detected_stack": profile})
        logger.info(f"Completed stack discovery for repository {repo_id}: {profile}")
        return profile

    @classmethod
    async def _scan_python_imports(cls, local_path: str, backend: Set[str]) -> None:
        """Heuristic scan of python source files to check for frame-specific imports"""
        try:
            scanned_count = 0
            for root, dirs, files in os.walk(local_path):
                dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ('venv', 'node_modules', '__pycache__')]
                for file in files:
                    if file.endswith(".py"):
                        scanned_count += 1
                        if scanned_count > 30:  # Bound scanning time
                            return
                        with open(os.path.join(root, file), "r", encoding="utf-8", errors="ignore") as f:
                            code = f.read()
                            if "from fastapi" in code or "import fastapi" in code:
                                backend.add("FastAPI")
                            if "from flask" in code or "import flask" in code:
                                backend.add("Flask")
                            if "from django" in code or "import django" in code:
                                backend.add("Django")
        except Exception as e:
            logger.warning(f"Error scanning python imports in {local_path}: {e}")

stack_service = StackService()
