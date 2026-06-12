import os
import json
import re
import logging
import asyncio
import xml.etree.ElementTree as ET
from uuid import UUID
from typing import Dict, Any, List
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

class DependencyService:
    @classmethod
    async def analyze_dependencies(cls, db: AsyncSession, repo_id: UUID) -> Dict[str, Any]:
        """
        Scans a repository's local path and extracts package lists and configurations from:
        - requirements.txt
        - package.json
        - pom.xml
        - build.gradle
        Saves the resulting dictionary to the database under Repository.dependencies_profile.
        """
        repo = await repository_repo.get(db, repo_id)
        if not repo or not repo.local_path or not os.path.exists(repo.local_path):
            logger.warning(f"Repository {repo_id} path '{repo.local_path if repo else 'None'}' does not exist. Skipping dependency scan.")
            return {
                "dependencies": [],
                "report": {
                    "total_count": 0,
                    "duplicates": [],
                    "missing_versions": [],
                    "suspicious_declarations": [],
                    "summary": "Repository path not found."
                }
            }

        local_path = os.path.abspath(repo.local_path)
        dependencies: List[Dict[str, Any]] = []
        
        # Dictionary to track duplicate packages: (lowercase_name, source_file) -> list of versions
        seen_deps: Dict[tuple, List[str]] = {}

        # 1. Parse requirements.txt (Python)
        req_path = os.path.join(local_path, "requirements.txt")
        if os.path.exists(req_path):
            await asyncio.to_thread(cls._parse_requirements, req_path, dependencies, seen_deps)

        # 2. Parse package.json (Node.js)
        pkg_path = os.path.join(local_path, "package.json")
        if os.path.exists(pkg_path):
            await asyncio.to_thread(cls._parse_package_json, pkg_path, dependencies, seen_deps)

        # 3. Parse pom.xml (Java Maven)
        pom_path = os.path.join(local_path, "pom.xml")
        if os.path.exists(pom_path):
            await asyncio.to_thread(cls._parse_pom_xml, pom_path, dependencies, seen_deps)

        # 4. Parse build.gradle (Java Gradle)
        gradle_path = os.path.join(local_path, "build.gradle")
        if os.path.exists(gradle_path):
            await asyncio.to_thread(cls._parse_build_gradle, gradle_path, dependencies, seen_deps)

        # 5. Parse pyproject.toml (modern Python: Poetry, PEP 621, Hatch, PDM, uv, Flit)
        pyproject_path = os.path.join(local_path, "pyproject.toml")
        if os.path.exists(pyproject_path):
            await asyncio.to_thread(cls._parse_pyproject_toml, pyproject_path, dependencies, seen_deps)

        # Compile warnings:
        
        # A. Detect Duplicate Dependencies
        duplicates: List[Dict[str, Any]] = []
        for (name, source_file), versions in seen_deps.items():
            if len(versions) > 1:
                duplicates.append({
                    "name": name,
                    "source_file": source_file,
                    "versions": list(set(versions))
                })

        # B. Detect Missing Version Information
        missing_versions = [
            {"name": d["name"], "source_file": d["source_file"]}
            for d in dependencies
            if not d.get("version") or d.get("version") == "*" or d.get("version") == "unspecified"
        ]

        # C. Detect Suspicious Dependency Declarations
        suspicious_declarations = [
            {
                "name": d["name"],
                "version": d["version"],
                "source_file": d["source_file"],
                "reason": d.get("suspicious_reason", "Suspicious declaration format")
            }
            for d in dependencies
            if d.get("is_suspicious", False)
        ]

        # Remove internal verification flags from database payloads
        for d in dependencies:
            d.pop("is_suspicious", None)
            d.pop("suspicious_reason", None)

        report = {
            "total_count": len(dependencies),
            "duplicates": duplicates,
            "missing_versions": missing_versions,
            "suspicious_declarations": suspicious_declarations,
            "summary": (
                f"Scanned {len(dependencies)} packages. "
                f"Issues detected: {len(duplicates)} duplicates, "
                f"{len(missing_versions)} missing versions, "
                f"{len(suspicious_declarations)} suspicious references."
            )
        }

        profile = {
            "dependencies": dependencies,
            "report": report
        }

        # Update database model
        await repository_repo.update(db, db_obj=repo, obj_in={"dependencies_profile": profile})
        logger.info(f"Dependency scan complete for {repo_id}. Found {len(dependencies)} dependencies.")
        return profile

    @classmethod
    def _parse_requirements(cls, file_path: str, dependencies: List[Dict[str, Any]], seen_deps: Dict[tuple, List[str]]) -> None:
        source_file = "requirements.txt"
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    line = line.strip()
                    # Skip empty lines, comment lines, and index-url/recursive flags
                    if not line or line.startswith("#") or line.startswith("-r") or line.startswith("-i") or line.startswith("--"):
                        continue

                    is_suspicious = False
                    reason = ""
                    version = "unspecified"

                    # Identify direct git urls or local editable links
                    if line.startswith("-e") or "git+" in line or ":// " in line or "http://" in line or "https://" in line or "@" in line:
                        is_suspicious = True
                        reason = "Direct VCS reference or local editable path instead of version constraint."
                        # Try to resolve package egg name, otherwise use basename
                        egg_match = re.search(r"egg=([a-zA-Z0-9_\-\[\]]+)", line)
                        name = egg_match.group(1) if egg_match else line.split("/")[-1].split(".git")[0]
                        version = "git-reference"
                    else:
                        # Extract name and version constraint
                        # E.g. fastapi[all]>=0.110.0
                        match = re.match(r"^([a-zA-Z0-9_\-\[\]\.]+)(?:\s*(==|>=|<=|~=|!=|>|<)\s*([a-zA-Z0-9_\-\.\*]+))?", line)
                        if match:
                            name = match.group(1)
                            version = match.group(3) if match.group(3) else "unspecified"
                        else:
                            name = line

                    dep_obj = {
                        "name": name,
                        "version": version if version != "unspecified" else None,
                        "dependency_type": "direct",
                        "source_file": source_file,
                        "is_suspicious": is_suspicious
                    }
                    if is_suspicious:
                        dep_obj["suspicious_reason"] = reason

                    dependencies.append(dep_obj)
                    seen_deps.setdefault((name.lower(), source_file), []).append(version)
        except Exception as e:
            logger.error(f"Failed to parse requirements.txt: {e}")

    @classmethod
    def _parse_package_json(cls, file_path: str, dependencies: List[Dict[str, Any]], seen_deps: Dict[tuple, List[str]]) -> None:
        source_file = "package.json"
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                pkg = json.load(f)
                cls._extract_npm_deps(pkg.get("dependencies", {}), "production", source_file, dependencies, seen_deps)
                cls._extract_npm_deps(pkg.get("devDependencies", {}), "development", source_file, dependencies, seen_deps)
        except Exception as e:
            logger.error(f"Failed to parse package.json: {e}")

    @classmethod
    def _extract_npm_deps(
        cls, 
        deps_dict: dict, 
        dep_type: str, 
        source_file: str, 
        dependencies: List[Dict[str, Any]], 
        seen_deps: Dict[tuple, List[str]]
    ) -> None:
        for name, version in deps_dict.items():
            is_suspicious = False
            reason = ""
            
            # Identify file system links or direct git/http connections
            if version.startswith(("file:", "link:", "git:", "git+", "github:", "http:", "https:")):
                is_suspicious = True
                reason = "References local filesystem paths or remote git endpoint rather than npm registry."

            dep_obj = {
                "name": name,
                "version": version if version else None,
                "dependency_type": dep_type,
                "source_file": source_file,
                "is_suspicious": is_suspicious
            }
            if is_suspicious:
                dep_obj["suspicious_reason"] = reason

            dependencies.append(dep_obj)
            seen_deps.setdefault((name.lower(), source_file), []).append(version or "unspecified")

    @classmethod
    def _parse_pom_xml(cls, file_path: str, dependencies: List[Dict[str, Any]], seen_deps: Dict[tuple, List[str]]) -> None:
        source_file = "pom.xml"
        try:
            tree = ET.parse(file_path)
            root = tree.getroot()
            
            # Handle maven namespace namespaces if present
            ns = ""
            if root.tag.startswith("{"):
                ns = root.tag.split("}")[0] + "}"

            for dep in root.findall(f".//{ns}dependency"):
                group_node = dep.find(f"{ns}groupId")
                artifact_node = dep.find(f"{ns}artifactId")
                version_node = dep.find(f"{ns}version")
                scope_node = dep.find(f"{ns}scope")
                syspath_node = dep.find(f"{ns}systemPath")

                if group_node is not None and artifact_node is not None:
                    name = f"{group_node.text}:{artifact_node.text}"
                    version = version_node.text if version_node is not None else "unspecified"
                    scope = scope_node.text if scope_node is not None else "compile"
                    
                    is_suspicious = False
                    reason = ""
                    
                    if scope == "system" or syspath_node is not None:
                        is_suspicious = True
                        reason = "Uses system scope which points to hardcoded absolute local paths."

                    dep_obj = {
                        "name": name,
                        "version": version if version != "unspecified" else None,
                        "dependency_type": scope,
                        "source_file": source_file,
                        "is_suspicious": is_suspicious
                    }
                    if is_suspicious:
                        dep_obj["suspicious_reason"] = reason

                    dependencies.append(dep_obj)
                    seen_deps.setdefault((name.lower(), source_file), []).append(version)
        except Exception as e:
            logger.error(f"Failed to parse pom.xml: {e}")

    @classmethod
    def _parse_build_gradle(cls, file_path: str, dependencies: List[Dict[str, Any]], seen_deps: Dict[tuple, List[str]]) -> None:
        source_file = "build.gradle"
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("//") or line.startswith("/*"):
                        continue

                    # Match string-style gradle specs: configuration 'group:name:version'
                    match_str = re.search(
                        r"""\b(implementation|testImplementation|compileOnly|runtimeOnly|api|compile|testCompile)\s+['"]([^'"]+)['"]""", 
                        line
                    )
                    if match_str:
                        dep_type = match_str.group(1)
                        full_spec = match_str.group(2)
                        parts = full_spec.split(":")
                        
                        if len(parts) >= 2:
                            name = f"{parts[0]}:{parts[1]}"
                            version = parts[2] if len(parts) >= 3 else "unspecified"
                        else:
                            name = full_spec
                            version = "unspecified"

                        dep_obj = {
                            "name": name,
                            "version": version if version != "unspecified" else None,
                            "dependency_type": dep_type,
                            "source_file": source_file,
                            "is_suspicious": False
                        }
                        dependencies.append(dep_obj)
                        seen_deps.setdefault((name.lower(), source_file), []).append(version)
                        continue

                    # Match map-style gradle specs: configuration group: '...', name: '...', version: '...'
                    match_map = re.search(
                        r"""\b(implementation|testImplementation|compileOnly|runtimeOnly|api|compile|testCompile)\s+group:\s*['"]([^'"]+)['"]\s*,\s*name:\s*['"]([^'"]+)['"](?:\s*,\s*version:\s*['"]([^'"]+)['"])?""",
                        line
                    )
                    if match_map:
                        dep_type = match_map.group(1)
                        group = match_map.group(2)
                        artifact = match_map.group(3)
                        version = match_map.group(4) if match_map.group(4) else "unspecified"
                        
                        name = f"{group}:{artifact}"
                        dep_obj = {
                            "name": name,
                            "version": version if version != "unspecified" else None,
                            "dependency_type": dep_type,
                            "source_file": source_file,
                            "is_suspicious": False
                        }
                        dependencies.append(dep_obj)
                        seen_deps.setdefault((name.lower(), source_file), []).append(version)
        except Exception as e:
            logger.error(f"Failed to parse build.gradle: {e}")

    @classmethod
    def _parse_pyproject_toml(
        cls,
        file_path: str,
        dependencies: List[Dict[str, Any]],
        seen_deps: Dict[tuple, List[str]]
    ) -> None:
        """
        Parses pyproject.toml for Python dependencies across all common formats:
        - PEP 621 / Hatch / Flit: [project.dependencies] and [project.optional-dependencies]
        - PEP 517 build system:   [build-system.requires]
        - Poetry:                 [tool.poetry.dependencies] and [tool.poetry.group.*.dependencies]
        """
        source_file = "pyproject.toml"
        if tomllib is None:
            logger.warning("tomllib/tomli not available; skipping pyproject.toml parsing. Install 'tomli' for Python < 3.11.")
            return
        try:
            with open(file_path, "rb") as f:
                data = tomllib.load(f)
        except Exception as e:
            logger.error(f"Failed to read/parse pyproject.toml: {e}")
            return

        def _add_dep(name: str, version_spec: str, dep_type: str) -> None:
            """Normalises and records one dependency entry."""
            if not name or name.lower() == "python":
                return
            # Strip extras from name, e.g. "requests[security]" → "requests[security]"
            clean_name = name.strip()
            # Normalise version: keep constraint string, or 'unspecified'
            version = version_spec.strip() if version_spec and version_spec.strip() not in ("*", "") else None

            is_suspicious = False
            reason = ""
            if version_spec and ("git+" in version_spec or version_spec.startswith("http")):
                is_suspicious = True
                reason = "Direct VCS or HTTP reference instead of registry version."
                version = "vcs-reference"

            dep_obj: Dict[str, Any] = {
                "name": clean_name,
                "version": version,
                "dependency_type": dep_type,
                "source_file": source_file,
                "is_suspicious": is_suspicious,
            }
            if is_suspicious:
                dep_obj["suspicious_reason"] = reason

            dependencies.append(dep_obj)
            seen_deps.setdefault((clean_name.lower(), source_file), []).append(version or "unspecified")

        def _extract_version_from_spec(spec: Any) -> str:
            """Convert a TOML value into a human-readable version string."""
            if isinstance(spec, str):
                return spec
            if isinstance(spec, dict):
                # Poetry dict style: {version = "^1.0", optional = true}
                return spec.get("version", "*")
            return "*"

        # ── PEP 621 / Hatch / Flit: [project.dependencies] ─────────────────
        project = data.get("project", {})
        for dep_str in project.get("dependencies", []):
            if not isinstance(dep_str, str):
                continue
            # PEP 508 format: "requests>=2.28", "httpx[http2]>=0.23"
            m = re.match(r'^([A-Za-z0-9_\-\.\[\]]+)\s*(.*)', dep_str.strip())
            if m:
                _add_dep(m.group(1), m.group(2) or None, "direct")

        # ── PEP 621 optional extras: [project.optional-dependencies] ────────
        for group_name, deps in project.get("optional-dependencies", {}).items():
            for dep_str in (deps or []):
                if not isinstance(dep_str, str):
                    continue
                m = re.match(r'^([A-Za-z0-9_\-\.\[\]]+)\s*(.*)', dep_str.strip())
                if m:
                    _add_dep(m.group(1), m.group(2) or None, f"optional:{group_name}")

        # ── PEP 517 build system: [build-system.requires] ───────────────────
        build_system = data.get("build-system", {})
        for dep_str in build_system.get("requires", []):
            if not isinstance(dep_str, str):
                continue
            m = re.match(r'^([A-Za-z0-9_\-\.\[\]]+)\s*(.*)', dep_str.strip())
            if m:
                _add_dep(m.group(1), m.group(2) or None, "build")

        # ── Poetry: [tool.poetry.dependencies] ──────────────────────────────
        tool = data.get("tool", {})
        poetry = tool.get("poetry", {})

        for name, spec in poetry.get("dependencies", {}).items():
            _add_dep(name, _extract_version_from_spec(spec), "direct")

        # ── Poetry dev / group dependencies ──────────────────────────────────
        # Legacy: [tool.poetry.dev-dependencies]
        for name, spec in poetry.get("dev-dependencies", {}).items():
            _add_dep(name, _extract_version_from_spec(spec), "development")

        # Modern: [tool.poetry.group.<name>.dependencies]
        for group_name, group_data in poetry.get("group", {}).items():
            if isinstance(group_data, dict):
                for name, spec in group_data.get("dependencies", {}).items():
                    _add_dep(name, _extract_version_from_spec(spec), f"group:{group_name}")

        logger.info(f"pyproject.toml parsed: {len([d for d in dependencies if d['source_file'] == source_file])} dependencies found.")

dependency_service = DependencyService()
