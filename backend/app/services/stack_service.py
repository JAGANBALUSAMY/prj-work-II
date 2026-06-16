import os
import json
import asyncio
import logging
from uuid import UUID
from typing import Dict, Any, Set, List
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.repo_repo import repository_repo

# Use stdlib tomllib (Python 3.11+) or fall back to tomli package
try:
    import tomllib
except ImportError:
    try:
        import tomli as tomllib
    except ImportError:
        tomllib = None

logger = logging.getLogger(__name__)

class StackService:
    @classmethod
    async def discover_stack(cls, db: AsyncSession, repo_id: UUID) -> Dict[str, Any]:
        """
        Scans the repository local directory and extracts:
        - Backend technologies (Python, Django, Flask, FastAPI, Java, Spring Boot, Node.js, Express, Go, Rust, PHP, Ruby, C#)
        - Frontend technologies (React, Angular, Vue)
        - Databases (PostgreSQL, MySQL, MongoDB, Redis)
        Saves the resulting profile dictionary to the database under Repository.detected_stack.
        Also structures discoveries into nested Modules representing project subfolders.
        """
        repo = await repository_repo.get(db, repo_id)
        if not repo or not repo.local_path or not os.path.exists(repo.local_path):
            logger.warning(f"Repository {repo_id} path '{repo.local_path if repo else 'None'}' does not exist. Skipping discovery.")
            return {
                "backend": [],
                "frontend": [],
                "databases": [],
                "scanned_files": [],
                "modules": []
            }

        local_path = os.path.abspath(repo.local_path)
        backend: Set[str] = set()
        frontend: Set[str] = set()
        databases: Set[str] = set()
        scanned_files: List[str] = []

        def _scan_all_sync():
            found_scanned_files = []
            found_backend = set()
            found_frontend = set()
            found_databases = set()
            
            _py_files = 0
            _java_files = 0
            _js_ts_files = 0
            _go_files = 0
            _rs_files = 0
            _php_files = 0
            _rb_files = 0
            _cs_files = 0
            _cpp_files = 0
            _env_content = ""
            
            # 1. Walk directory tree to identify all files and identify manifest directories
            all_files = []
            manifest_dirs = set()
            
            for root, dirs, files in os.walk(local_path):
                dirs[:] = [
                    d for d in dirs
                    if not d.startswith('.')
                    and d not in ('venv', '.venv', 'node_modules', 'dist', 'target', 'build', '__pycache__')
                ]
                for file in files:
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, local_path).replace("\\", "/")
                    rel_dir = os.path.dirname(rel_path) or "root"
                    
                    all_files.append((rel_path, file, file_path, rel_dir))
                    
                    # Identify manifest files
                    is_manifest = (
                        file in (
                            "requirements.txt", "package.json", "pom.xml", "build.gradle",
                            "docker-compose.yml", "docker-compose.yaml", "pyproject.toml",
                            "Pipfile", "go.mod", "Cargo.toml", "composer.json", "Gemfile",
                            "CMakeLists.txt", "Makefile", "makefile"
                        )
                        or file.endswith((".csproj", ".sln"))
                    )
                    if is_manifest:
                        manifest_dirs.add(rel_dir)
            
            # Ensure "root" is in manifest_dirs if no other manifests are found
            if not manifest_dirs:
                manifest_dirs.add("root")
            
            # Helper to find closest parent module directory
            def get_closest_module_dir(p, dirs_set):
                parts = p.split("/")
                for i in range(len(parts) - 1, 0, -1):
                    ancestor = "/".join(parts[:i])
                    if ancestor in dirs_set:
                        return ancestor
                return "root"
                
            # Initialize modules map
            modules_map = {}
            for m_dir in manifest_dirs:
                modules_map[m_dir] = {
                    "backend": set(),
                    "frontend": set(),
                    "databases": set(),
                    "files": []
                }
                
            # 2. Process all collected files
            for rel_path, file, file_path, rel_dir in all_files:
                target_dir = rel_dir if rel_dir in manifest_dirs else get_closest_module_dir(rel_path, manifest_dirs)
                
                # Check for source file extensions
                if file.endswith(".py"):
                    _py_files += 1
                    modules_map[target_dir]["backend"].add("Python")
                elif file.endswith(".java"):
                    _java_files += 1
                    modules_map[target_dir]["backend"].add("Java")
                elif file.endswith((".js", ".jsx", ".ts", ".tsx")):
                    _js_ts_files += 1
                elif file.endswith(".go"):
                    _go_files += 1
                    modules_map[target_dir]["backend"].add("Go")
                elif file.endswith(".rs"):
                    _rs_files += 1
                    modules_map[target_dir]["backend"].add("Rust")
                elif file.endswith(".php"):
                    _php_files += 1
                    modules_map[target_dir]["backend"].add("PHP")
                elif file.endswith(".rb"):
                    _rb_files += 1
                    modules_map[target_dir]["backend"].add("Ruby")
                elif file.endswith(".cs"):
                    _cs_files += 1
                    modules_map[target_dir]["backend"].add("C#")
                elif file.endswith((".cpp", ".cc", ".c", ".h")):
                    _cpp_files += 1
                    modules_map[target_dir]["backend"].add("C++")
                elif file == ".env":
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as ef:
                            content = ef.read().lower()
                            _env_content += content
                            
                            # Database check in .env
                            if "postgres://" in content or "postgresql://" in content:
                                found_databases.add("PostgreSQL")
                                modules_map[target_dir]["databases"].add("PostgreSQL")
                            if "mongodb://" in content or "mongodb+srv://" in content:
                                found_databases.add("MongoDB")
                                modules_map[target_dir]["databases"].add("MongoDB")
                            if "redis://" in content:
                                found_databases.add("Redis")
                                modules_map[target_dir]["databases"].add("Redis")
                            if "mysql://" in content:
                                found_databases.add("MySQL")
                                modules_map[target_dir]["databases"].add("MySQL")
                    except Exception:
                        pass
                
                # 3. Parse manifest files
                # requirements.txt
                if file == "requirements.txt":
                    found_scanned_files.append(rel_path)
                    modules_map[target_dir]["files"].append(file)
                    modules_map[target_dir]["backend"].add("Python")
                    found_backend.add("Python")
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read().lower()
                            if "django" in content:
                                found_backend.add("Django")
                                modules_map[target_dir]["backend"].add("Django")
                            if "flask" in content:
                                found_backend.add("Flask")
                                modules_map[target_dir]["backend"].add("Flask")
                            if "fastapi" in content:
                                found_backend.add("FastAPI")
                                modules_map[target_dir]["backend"].add("FastAPI")
                    except Exception as e:
                        logger.error(f"Error scanning requirements.txt: {e}")
                        
                # package.json
                elif file == "package.json":
                    found_scanned_files.append(rel_path)
                    modules_map[target_dir]["files"].append(file)
                    modules_map[target_dir]["backend"].add("Node.js")
                    found_backend.add("Node.js")
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            pkg_data = json.load(f)
                            dependencies = {
                                **pkg_data.get("dependencies", {}), 
                                **pkg_data.get("devDependencies", {})
                            }
                            # Check frontend frameworks
                            if "react" in dependencies or "react-dom" in dependencies:
                                found_frontend.add("React")
                                modules_map[target_dir]["frontend"].add("React")
                            if "@angular/core" in dependencies or "angular" in dependencies:
                                found_frontend.add("Angular")
                                modules_map[target_dir]["frontend"].add("Angular")
                            if "vue" in dependencies:
                                found_frontend.add("Vue")
                                modules_map[target_dir]["frontend"].add("Vue")
                            # Database check
                            if "mongoose" in dependencies or "mongodb" in dependencies:
                                found_databases.add("MongoDB")
                                modules_map[target_dir]["databases"].add("MongoDB")
                            if "pg" in dependencies or "sequelize" in dependencies:
                                found_databases.add("PostgreSQL")
                                modules_map[target_dir]["databases"].add("PostgreSQL")
                            if "redis" in dependencies:
                                found_databases.add("Redis")
                                modules_map[target_dir]["databases"].add("Redis")
                            if "mysql" in dependencies or "mysql2" in dependencies:
                                found_databases.add("MySQL")
                                modules_map[target_dir]["databases"].add("MySQL")
                            # Node express framework check
                            if "express" in dependencies:
                                found_backend.add("Express")
                                modules_map[target_dir]["backend"].add("Express")
                    except Exception as e:
                        logger.error(f"Error parsing package.json: {e}")
                        
                # pom.xml
                elif file == "pom.xml":
                    found_scanned_files.append(rel_path)
                    modules_map[target_dir]["files"].append(file)
                    modules_map[target_dir]["backend"].add("Java")
                    found_backend.add("Java")
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                            if "spring-boot" in content or "org.springframework.boot" in content:
                                found_backend.add("Spring Boot")
                                modules_map[target_dir]["backend"].add("Spring Boot")
                    except Exception as e:
                        logger.error(f"Error scanning pom.xml: {e}")
                        
                # build.gradle
                elif file == "build.gradle":
                    found_scanned_files.append(rel_path)
                    modules_map[target_dir]["files"].append(file)
                    modules_map[target_dir]["backend"].add("Java")
                    found_backend.add("Java")
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                            if "org.springframework.boot" in content or "spring-boot" in content:
                                found_backend.add("Spring Boot")
                                modules_map[target_dir]["backend"].add("Spring Boot")
                    except Exception as e:
                        logger.error(f"Error scanning build.gradle: {e}")
                        
                # docker-compose
                elif file in ("docker-compose.yml", "docker-compose.yaml"):
                    found_scanned_files.append(rel_path)
                    modules_map[target_dir]["files"].append(file)
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read().lower()
                            if "image: postgres" in content or "postgres:" in content:
                                found_databases.add("PostgreSQL")
                                modules_map[target_dir]["databases"].add("PostgreSQL")
                            if "image: mysql" in content or "mysql:" in content:
                                found_databases.add("MySQL")
                                modules_map[target_dir]["databases"].add("MySQL")
                            if "image: mongo" in content or "mongo:" in content:
                                found_databases.add("MongoDB")
                                modules_map[target_dir]["databases"].add("MongoDB")
                            if "image: redis" in content or "redis:" in content:
                                found_databases.add("Redis")
                                modules_map[target_dir]["databases"].add("Redis")
                    except Exception as e:
                        logger.error(f"Error scanning docker-compose: {e}")
                        
                # pyproject.toml
                elif file == "pyproject.toml":
                    found_scanned_files.append(rel_path)
                    modules_map[target_dir]["files"].append(file)
                    modules_map[target_dir]["backend"].add("Python")
                    found_backend.add("Python")
                    if tomllib is not None:
                        try:
                            with open(file_path, "rb") as f:
                                pyproject_data = tomllib.load(f)
                            tool = pyproject_data.get("tool", {})
                            if "poetry" in tool:
                                poetry_deps = {
                                    k.lower(): v
                                    for k, v in tool["poetry"].get("dependencies", {}).items()
                                }
                                if "fastapi" in poetry_deps:
                                    found_backend.add("FastAPI")
                                    modules_map[target_dir]["backend"].add("FastAPI")
                                if "django" in poetry_deps:
                                    found_backend.add("Django")
                                    modules_map[target_dir]["backend"].add("Django")
                                if "flask" in poetry_deps:
                                    found_backend.add("Flask")
                                    modules_map[target_dir]["backend"].add("Flask")
                            project_deps = [
                                d.lower()
                                for d in pyproject_data.get("project", {}).get("dependencies", [])
                                if isinstance(d, str)
                            ]
                            for dep in project_deps:
                                if dep.startswith("fastapi"):
                                    found_backend.add("FastAPI")
                                    modules_map[target_dir]["backend"].add("FastAPI")
                                elif dep.startswith("django"):
                                    found_backend.add("Django")
                                    modules_map[target_dir]["backend"].add("Django")
                                elif dep.startswith("flask"):
                                    found_backend.add("Flask")
                                    modules_map[target_dir]["backend"].add("Flask")
                        except Exception as e:
                            logger.error(f"Error scanning pyproject.toml: {e}")
                            
                # Pipfile
                elif file == "Pipfile":
                    found_scanned_files.append(rel_path)
                    modules_map[target_dir]["files"].append(file)
                    modules_map[target_dir]["backend"].add("Python")
                    found_backend.add("Python")
                    
                # go.mod
                elif file == "go.mod":
                    found_scanned_files.append(rel_path)
                    modules_map[target_dir]["files"].append(file)
                    modules_map[target_dir]["backend"].add("Go")
                    found_backend.add("Go")
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                            if "github.com/gin-gonic/gin" in content:
                                found_backend.add("Gin")
                                modules_map[target_dir]["backend"].add("Gin")
                            if "github.com/gofiber/fiber" in content:
                                found_backend.add("Fiber")
                                modules_map[target_dir]["backend"].add("Fiber")
                            if "github.com/labstack/echo" in content:
                                found_backend.add("Echo")
                                modules_map[target_dir]["backend"].add("Echo")
                            if "github.com/astaxie/beego" in content:
                                found_backend.add("Beego")
                                modules_map[target_dir]["backend"].add("Beego")
                    except Exception as e:
                        logger.error(f"Error scanning go.mod: {e}")
                        
                # Cargo.toml
                elif file == "Cargo.toml":
                    found_scanned_files.append(rel_path)
                    modules_map[target_dir]["files"].append(file)
                    modules_map[target_dir]["backend"].add("Rust")
                    found_backend.add("Rust")
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                            if "actix-web" in content:
                                found_backend.add("Actix-web")
                                modules_map[target_dir]["backend"].add("Actix-web")
                            if "rocket" in content:
                                found_backend.add("Rocket")
                                modules_map[target_dir]["backend"].add("Rocket")
                            if "axum" in content:
                                found_backend.add("Axum")
                                modules_map[target_dir]["backend"].add("Axum")
                    except Exception as e:
                        logger.error(f"Error scanning Cargo.toml: {e}")
                        
                # composer.json
                elif file == "composer.json":
                    found_scanned_files.append(rel_path)
                    modules_map[target_dir]["files"].append(file)
                    modules_map[target_dir]["backend"].add("PHP")
                    found_backend.add("PHP")
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            pkg_data = json.load(f)
                            req = {**pkg_data.get("require", {}), **pkg_data.get("require-dev", {})}
                            if "laravel/framework" in req:
                                found_backend.add("Laravel")
                                modules_map[target_dir]["backend"].add("Laravel")
                            if "symfony/symfony" in req or "symfony/framework-bundle" in req:
                                found_backend.add("Symfony")
                                modules_map[target_dir]["backend"].add("Symfony")
                    except Exception as e:
                        logger.error(f"Error scanning composer.json: {e}")
                        
                # Gemfile
                elif file == "Gemfile":
                    found_scanned_files.append(rel_path)
                    modules_map[target_dir]["files"].append(file)
                    modules_map[target_dir]["backend"].add("Ruby")
                    found_backend.add("Ruby")
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                            if "rails" in content:
                                found_backend.add("Ruby on Rails")
                                modules_map[target_dir]["backend"].add("Ruby on Rails")
                            if "sinatra" in content:
                                found_backend.add("Sinatra")
                                modules_map[target_dir]["backend"].add("Sinatra")
                    except Exception as e:
                        logger.error(f"Error scanning Gemfile: {e}")
                        
                # csproj or sln
                elif file.endswith(".csproj") or file.endswith(".sln"):
                    found_scanned_files.append(rel_path)
                    modules_map[target_dir]["files"].append(file)
                    modules_map[target_dir]["backend"].add("C#")
                    found_backend.add("C#")
                    if file.endswith(".csproj"):
                        try:
                            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                                content = f.read()
                                if "Microsoft.AspNetCore" in content:
                                    found_backend.add("ASP.NET")
                                    modules_map[target_dir]["backend"].add("ASP.NET")
                        except Exception as e:
                            logger.error(f"Error scanning csproj: {e}")
                            
                # CMakeLists.txt / Makefile / makefile
                elif file in ("CMakeLists.txt", "Makefile", "makefile"):
                    found_scanned_files.append(rel_path)
                    modules_map[target_dir]["files"].append(file)
                    
            return (
                found_scanned_files, found_backend, found_frontend, found_databases,
                _py_files, _java_files, _js_ts_files, _go_files, _rs_files, _php_files, _rb_files, _cs_files, _cpp_files,
                _env_content, modules_map, manifest_dirs
            )

        (
            scanned_files, discovered_backend, discovered_frontend, discovered_databases,
            py_files, java_files, js_ts_files, go_files, rs_files, php_files, rb_files, cs_files, cpp_files,
            env_content, modules_map, manifest_dirs
        ) = await asyncio.to_thread(_scan_all_sync)

        backend.update(discovered_backend)
        frontend.update(discovered_frontend)
        databases.update(discovered_databases)

        # Register file types found globally
        if py_files > 0:
            backend.add("Python")
        if java_files > 0:
            backend.add("Java")
        if go_files > 0:
            backend.add("Go")
        if rs_files > 0:
            backend.add("Rust")
        if php_files > 0:
            backend.add("PHP")
        if rb_files > 0:
            backend.add("Ruby")
        if cs_files > 0:
            backend.add("C#")
        if cpp_files > 0:
            backend.add("C++")

        # Scan global env content for DB markers
        if "postgres://" in env_content or "postgresql://" in env_content:
            databases.add("PostgreSQL")
        if "mongodb://" in env_content or "mongodb+srv://" in env_content:
            databases.add("MongoDB")
        if "redis://" in env_content:
            databases.add("Redis")
        if "mysql://" in env_content:
            databases.add("MySQL")

        # Heuristic scan of python imports inside files for framework overrides
        if "Python" in backend and not any(fw in backend for fw in ["Django", "Flask", "FastAPI"]):
            await cls._scan_python_imports(local_path, backend, modules_map, manifest_dirs)

        # Build final modules list
        modules_list = []
        for m_dir, info in modules_map.items():
            # Filter out modules that have no scanned config files AND no discovered backend/frontend/databases
            if not info["files"] and not info["backend"] and not info["frontend"] and not info["databases"]:
                continue
                
            is_frontend = bool(info["frontend"])
            is_backend = bool(info["backend"])
            
            if is_frontend and is_backend:
                role = "Fullstack"
            elif is_frontend:
                role = "Frontend"
            elif is_backend:
                role = "Backend"
            else:
                role = "Utility/Config"
                
            # Combine backend, frontend, databases into a single sorted list
            stack_set = set()
            stack_set.update(info["backend"])
            stack_set.update(info["frontend"])
            stack_set.update(info["databases"])
            
            modules_list.append({
                "path": m_dir,
                "role": role,
                "stack": sorted(list(stack_set)),
                "scanned_files": sorted(info["files"])
            })

        profile = {
            "backend": sorted(list(backend)),
            "frontend": sorted(list(frontend)),
            "databases": sorted(list(databases)),
            "scanned_files": sorted(scanned_files),
            "modules": sorted(modules_list, key=lambda x: x["path"])
        }

        # Update database entry
        await repository_repo.update(db, db_obj=repo, obj_in={"detected_stack": profile})
        logger.info(f"Completed stack discovery for repository {repo_id}: {profile}")
        return profile

    @classmethod
    async def _scan_python_imports(cls, local_path: str, backend: Set[str], modules_map: Dict[str, Any], manifest_dirs: Set[str]) -> None:
        """Heuristic scan of python source files to check for framework-specific imports"""
        def _scan():
            found = set()
            try:
                scanned_count = 0
                for root, dirs, files in os.walk(local_path):
                    dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ('venv', 'node_modules', '__pycache__')]
                    for file in files:
                        if file.endswith(".py"):
                            scanned_count += 1
                            if scanned_count > 30:  # Bound scanning time
                                return found
                            file_path = os.path.join(root, file)
                            rel_path = os.path.relpath(file_path, local_path).replace("\\", "/")
                            rel_dir = os.path.dirname(rel_path) or "root"
                            
                            # Determine target directory
                            def get_closest_module_dir(p, dirs_set):
                                parts = p.split("/")
                                for i in range(len(parts) - 1, 0, -1):
                                    ancestor = "/".join(parts[:i])
                                    if ancestor in dirs_set:
                                        return ancestor
                                return "root"
                            target_dir = rel_dir if rel_dir in manifest_dirs else get_closest_module_dir(rel_path, manifest_dirs)
                            
                            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                                code = f.read()
                                fws = []
                                if "from fastapi" in code or "import fastapi" in code:
                                    fws.append("FastAPI")
                                if "from flask" in code or "import flask" in code:
                                    fws.append("Flask")
                                if "from django" in code or "import django" in code:
                                    fws.append("Django")
                                    
                                for fw in fws:
                                    found.add(fw)
                                    if target_dir in modules_map:
                                        modules_map[target_dir]["backend"].add(fw)
            except Exception as e:
                logger.warning(f"Error scanning python imports in {local_path}: {e}")
            return found

        found_frameworks = await asyncio.to_thread(_scan)
        backend.update(found_frameworks)

stack_service = StackService()
