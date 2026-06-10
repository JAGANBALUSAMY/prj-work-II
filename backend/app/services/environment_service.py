import os
import re
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

        # 1. Scan standard template files
        env_templates = [".env.example", ".env.template", ".env.sample"]
        for t_file in env_templates:
            t_path = os.path.join(local_path, t_file)
            if os.path.exists(t_path):
                template_files_found.append(t_file)
                scanned_files_count += 1
                try:
                    with open(t_path, "r", encoding="utf-8", errors="ignore") as f:
                        for line in f:
                            line = line.strip()
                            # Skip comments or empty lines
                            if not line or line.startswith("#"):
                                continue
                            # Match variable assignment: KEY=VALUE or KEY=
                            match = re.match(r"^([a-zA-Z_][a-zA-Z0-9_]*)\s*=", line)
                            if match:
                                key = match.group(1)
                                template_vars.add(key)
                                var_sources.setdefault(key, set()).add(t_file)
                except Exception as e:
                    logger.error(f"Error reading env template {t_file} in {local_path}: {e}")

        # 2. Scan source code files
        # Regex specs:
        # Python: os.getenv("VAR") or os.environ.get("VAR") or os.environ["VAR"]
        py_getenv = re.compile(r"""\bos\.getenv\(\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]""")
        py_envget = re.compile(r"""\bos\.environ\.get\(\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]""")
        py_envidx = re.compile(r"""\bos\.environ\[\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]""")

        # Node: process.env.VAR or process.env["VAR"]
        node_envdot = re.compile(r"""\bprocess\.env\.([a-zA-Z_][a-zA-Z0-9_]*)\b""")
        node_envidx = re.compile(r"""\bprocess\.env\[\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]""")

        # Java: System.getenv("VAR")
        java_getenv = re.compile(r"""\bSystem\.getenv\(\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]""")

        try:
            for root, dirs, files in os.walk(local_path):
                # Prune common ignore dirs
                dirs[:] = [
                    d for d in dirs 
                    if not d.startswith('.') 
                    and d not in ('venv', 'node_modules', '__pycache__', 'dist', 'target', 'build', 'gradle')
                ]
                
                for file in files:
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, local_path)
                    
                    # Check file type
                    is_py = file.endswith(".py")
                    is_js = file.endswith((".js", ".jsx", ".ts", ".tsx"))
                    is_java = file.endswith(".java")

                    if not (is_py or is_js or is_java):
                        continue

                    scanned_files_count += 1
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

                            for key in found_keys:
                                var_sources.setdefault(key, set()).add(rel_path)
                    except Exception as e:
                        logger.warning(f"Failed to read file {rel_path} during env scan: {e}")
        except Exception as e:
            logger.error(f"Error walking files for environment scan: {e}")

        # 3. Consolidate results
        variables_list = []
        sorted_keys = sorted(list(var_sources.keys()))
        
        for key in sorted_keys:
            sources = sorted(list(var_sources[key]))
            # Determine if this variable is missing in template files but used in code
            is_missing_from_templates = len(template_files_found) > 0 and not any(t in sources for t in env_templates)
            
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
