import os
import re
import asyncio
import logging
from uuid import UUID
from typing import Dict, Any, List, Set
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.repo_repo import repository_repo

logger = logging.getLogger(__name__)

class EnvironmentService:
    @classmethod
    async def reconstruct_environment(cls, db: AsyncSession, repo_id: UUID) -> Dict[str, Any]:
        """
        Scans repository local directories to extract environment variables from:
        - Env template files (.env.example, .env.template, .env.sample)
        - Source code (Python os.getenv, Node process.env, Java System.getenv)
        Compiles a list of unique environment variables, their references,
        and generates a clean configuration template string.
        """
        repo = await repository_repo.get(db, repo_id)
        if not repo or not repo.local_path or not os.path.exists(repo.local_path):
            logger.warning(f"Repository {repo_id} path '{repo.local_path if repo else 'None'}' does not exist. Skipping env scan.")
            return {
                "variables": [],
                "template": "",
                "scanned_files_count": 0,
                "summary": "Repository path not found."
            }

        local_path = os.path.abspath(repo.local_path)
        
        # Variable mapping: name -> set of source files referencing it
        var_sources: Dict[str, Set[str]] = {}
        template_vars: Set[str] = set()
        scanned_files_count = 0
        template_files_found = []

        # 1. Scan standard template/env files recursively
        for root, dirs, files in os.walk(local_path):
            dirs[:] = [
                d for d in dirs
                if not d.startswith('.')
                and d not in ('venv', '.venv', 'node_modules', 'dist', 'target', 'build', '__pycache__')
            ]
            for file in files:
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, local_path)
                
                # Check for env files
                if file.startswith(".env") or "env.example" in file.lower() or "env.template" in file.lower() or "env.sample" in file.lower():
                    template_files_found.append(rel_path)
                    scanned_files_count += 1
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            for line in f:
                                line = line.strip()
                                if not line or line.startswith("#"):
                                    continue
                                match = re.match(r"^([a-zA-Z_][a-zA-Z0-9_]*)\s*=", line)
                                if match:
                                    key = match.group(1)
                                    template_vars.add(key)
                                    var_sources.setdefault(key, set()).add(rel_path)
                    except Exception as e:
                        logger.error(f"Error reading env file {rel_path} in {local_path}: {e}")
                        
                # Check for docker-compose files
                elif file in ("docker-compose.yml", "docker-compose.yaml"):
                    template_files_found.append(rel_path)
                    scanned_files_count += 1
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            dc_content = f.read()
                        # Match both `KEY=VALUE` and bare `KEY:` under environment: sections
                        for key in re.findall(r"^\s*-\s+([A-Z_][A-Z0-9_]{2,})\s*$", dc_content, re.MULTILINE):
                            template_vars.add(key)
                            var_sources.setdefault(key, set()).add(rel_path)
                        for key in re.findall(r"^\s*-\s+([A-Z_][A-Z0-9_]{2,})\s*=", dc_content, re.MULTILINE):
                            template_vars.add(key)
                            var_sources.setdefault(key, set()).add(rel_path)
                        for key in re.findall(r"^\s{4,}([A-Z_][A-Z0-9_]{2,}):\s", dc_content, re.MULTILINE):
                            template_vars.add(key)
                            var_sources.setdefault(key, set()).add(rel_path)
                    except Exception as e:
                        logger.error(f"Error scanning {rel_path} for env vars in {local_path}: {e}")

        # 3. Scan source code files using asyncio.to_thread for non-blocking I/O
        # Regex patterns for env var detection
        py_getenv = re.compile(r"""\bos\.getenv\(\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]""")
        py_envget = re.compile(r"""\bos\.environ\.get\(\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]""")
        py_envidx = re.compile(r"""\bos\.environ\[\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]""")
        node_envdot = re.compile(r"""\bprocess\.env\.([a-zA-Z_][a-zA-Z0-9_]*)\b""")
        node_envidx = re.compile(r"""\bprocess\.env\[\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]""")
        java_getenv = re.compile(r"""\bSystem\.getenv\(\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]""")
        go_getenv = re.compile(r"""\bos\.Getenv\(\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]""")
        go_envlook = re.compile(r"""\bos\.LookupEnv\(\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]""")
        rust_envvar = re.compile(r"""\benv::var\(\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]""")
        rust_dotenv = re.compile(r"""\bdotenv::var\(\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]""")
        php_getenv = re.compile(r"""\bgetenv\(\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]""")
        php_envarr = re.compile(r"""\$_ENV\[\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]\]""")
        php_srvarr = re.compile(r"""\$_SERVER\[\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]\]""")
        ruby_envidx = re.compile(r"""\bENV\[\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]\]""")
        ruby_envfetch = re.compile(r"""\bENV\.fetch\(\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]""")
        cs_getenv = re.compile(r"""\bEnvironment\.GetEnvironmentVariable\(\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]""")

        def _scan_source_files_sync():
            _scanned_count = 0
            _found_vars: Dict[str, Set[str]] = {}
            try:
                for root, dirs, files in os.walk(local_path):
                    dirs[:] = [
                        d for d in dirs
                        if not d.startswith('.')
                        and d not in ('venv', 'node_modules', '__pycache__', 'dist', 'target', 'build', 'gradle')
                    ]
                    for file in files:
                        file_path = os.path.join(root, file)
                        rel_path = os.path.relpath(file_path, local_path)
                        is_py = file.endswith(".py")
                        is_js = file.endswith((".js", ".jsx", ".ts", ".tsx"))
                        is_java = file.endswith(".java")
                        is_go = file.endswith(".go")
                        is_rs = file.endswith(".rs")
                        is_php = file.endswith(".php")
                        is_rb = file.endswith(".rb")
                        is_cs = file.endswith(".cs")
                        if not (is_py or is_js or is_java or is_go or is_rs or is_php or is_rb or is_cs):
                            continue
                        _scanned_count += 1
                        try:
                            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                                content = f.read()
                            found_keys: List[str] = []
                            if is_py:
                                found_keys.extend(py_getenv.findall(content))
                                found_keys.extend(py_envget.findall(content))
                                found_keys.extend(py_envidx.findall(content))
                            elif is_js:
                                found_keys.extend(node_envdot.findall(content))
                                found_keys.extend(node_envidx.findall(content))
                            elif is_java:
                                found_keys.extend(java_getenv.findall(content))
                            elif is_go:
                                found_keys.extend(go_getenv.findall(content))
                                found_keys.extend(go_envlook.findall(content))
                            elif is_rs:
                                found_keys.extend(rust_envvar.findall(content))
                                found_keys.extend(rust_dotenv.findall(content))
                            elif is_php:
                                found_keys.extend(php_getenv.findall(content))
                                found_keys.extend(php_envarr.findall(content))
                                found_keys.extend(php_srvarr.findall(content))
                            elif is_rb:
                                found_keys.extend(ruby_envidx.findall(content))
                                found_keys.extend(ruby_envfetch.findall(content))
                            elif is_cs:
                                found_keys.extend(cs_getenv.findall(content))
                            for key in found_keys:
                                _found_vars.setdefault(key, set()).add(rel_path)
                        except Exception:
                            pass
            except Exception as e:
                logger.error(f"Error walking files for environment scan: {e}")
            return _scanned_count, _found_vars

        src_scanned_count, src_found_vars = await asyncio.to_thread(_scan_source_files_sync)
        scanned_files_count += src_scanned_count
        for key, sources in src_found_vars.items():
            var_sources.setdefault(key, set()).update(sources)

        # 3. Consolidate results
        variables_list = []
        sorted_keys = sorted(list(var_sources.keys()))
        
        for key in sorted_keys:
            sources = sorted(list(var_sources[key]))
            # Determine if this variable is missing in template files but used in code
            is_missing_from_templates = len(template_files_found) > 0 and not any(t in sources for t in template_files_found)
            
            variables_list.append({
                "name": key,
                "sources": sources,
                "is_missing_from_template": is_missing_from_templates
            })

        # Generate copyable template text
        template_text = "\n".join([f"{key}=" for key in sorted_keys])
        if template_text:
            template_text += "\n"

        missing_count = sum(1 for v in variables_list if v["is_missing_from_template"])
        
        report_summary = (
            f"Detected {len(variables_list)} variables across {scanned_files_count} scanned files. "
            f"Templates scanned: {', '.join(template_files_found) if template_files_found else 'None'}. "
            f"Warnings: {missing_count} variables missing from template files."
        )

        profile = {
            "variables": variables_list,
            "template": template_text,
            "scanned_files_count": scanned_files_count,
            "template_files_found": template_files_found,
            "summary": report_summary
        }

        # Update database Repository record
        await repository_repo.update(db, db_obj=repo, obj_in={"environment_profile": profile})
        logger.info(f"Environment reconstruction complete for {repo_id}. Found {len(variables_list)} variables.")
        return profile

environment_service = EnvironmentService()
