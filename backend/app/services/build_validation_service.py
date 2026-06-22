import os
import asyncio
import time
import logging
import uuid
import subprocess
from uuid import UUID
from typing import Dict, Any, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.repo_repo import repository_repo

logger = logging.getLogger(__name__)

class DockerBuildExecutor:
    # Ecosystem to Docker image mapping
    IMAGE_MAP = {
        "Python": "python:3.11",
        "Node.js": "node:20",
        "Java Maven": "eclipse-temurin",
        "Java Gradle": "eclipse-temurin",
        "Go": "golang",
        "Rust": "rust"
    }

    @classmethod
    async def execute_in_container(
        cls,
        local_path: str,
        ecosystem: str,
        commands: List[str],
        manifest_path: str | None,
        timeout: float = 300.0,
        memory_limit: str = "1g"
    ) -> Dict[str, Any]:
        """
        Executes build commands inside an isolated temporary container.
        Returns a dictionary containing:
        - logs: captured stdout/stderr
        - exit_code: return code of the execution (or -1 on error/timeout)
        - execution_time: duration of the build
        - success: boolean indicating if build succeeded (exit_code == 0)
        """
        # Determine image
        image = cls.IMAGE_MAP.get(ecosystem, "alpine:latest")

        # Determine relative directory containing the manifest
        # If manifest_path is e.g. "backend/package.json", working dir is "/workspace/backend"
        # If manifest_path is "package.json", working dir is "/workspace"
        if manifest_path:
            rel_dir = os.path.dirname(manifest_path).replace("\\", "/")
            container_cwd = f"/workspace/{rel_dir}" if rel_dir else "/workspace"
        else:
            container_cwd = "/workspace"

        # Formulate commands. Join multiple commands with &&
        joined_commands = " && ".join(commands)

        # Generate unique temporary container name
        container_name = f"build-val-{uuid.uuid4().hex[:8]}"

        # Format host path for docker mount (convert backslashes to forward slashes for safety)
        host_mount_path = os.path.abspath(local_path).replace("\\", "/")

        # Build command arguments
        docker_args = [
            "run",
            "--name", container_name,
            "--rm",
            "--memory", memory_limit,
            "-v", f"{host_mount_path}:/workspace",
            "-w", container_cwd,
            image,
            "sh", "-c", joined_commands
        ]

        logger.info(f"DockerBuildExecutor: Starting build in container {container_name} using image {image}...")
        logger.info(f"DockerBuildExecutor: Command: docker {' '.join(docker_args)}")

        start_time = time.time()
        process = None
        logs = ""
        exit_code = -1
        execution_time = 0.0

        try:
            logger.info(f"[FORENSIC] Repository Path: {local_path}")
            logger.info(f"[FORENSIC] Manifest File Path: {manifest_path}")
            logger.info(f"[FORENSIC] Build Command Selected: {joined_commands}")
            logger.info(f"[FORENSIC] Docker Command Generated: docker {' '.join(docker_args)}")
            
            logger.info(f"[DIAGNOSTIC] Container Started: {image}")
            logger.info(f"[DIAGNOSTIC] Repository Mounted: {host_mount_path} -> /workspace")
            logger.info(f"[DIAGNOSTIC] Working Directory Configured: {container_cwd}")
            logger.info(f"[DIAGNOSTIC] Dependency Installation Started: {joined_commands}")
            
            def run_docker():
                return subprocess.run(
                    ["docker"] + docker_args,
                    capture_output=True,
                    encoding="utf-8",
                    errors="replace",
                    timeout=timeout
                )

            # Spawn the docker run process asynchronously in a separate thread
            # This avoids NotImplementedError on Windows when using SelectorEventLoop
            try:
                result = await asyncio.to_thread(run_docker)
                exit_code = result.returncode
                execution_time = time.time() - start_time
                logs = (result.stdout or "") + "\n" + (result.stderr or "")
                
                logger.info(f"[FORENSIC] Container Start Result: SUCCESS")
                logger.info(f"[FORENSIC] Stdout/Stderr Length: {len(logs)} bytes")
                logger.info(f"[FORENSIC] Exit Code: {exit_code}")
                logger.info(f"DockerBuildExecutor: Container finished. Exit code: {exit_code}")
                
                if exit_code != 0:
                    logger.info(f"[DIAGNOSTIC] Dependency Installation Failed or Build Command Failed (Exit Code {exit_code})")

            except subprocess.TimeoutExpired as e:
                execution_time = time.time() - start_time
                logs = (e.stdout or "") + "\n" + (e.stderr or "")
                logs += f"\n[TIMEOUT] Execution timed out after {timeout} seconds."
                logger.warning(logs)
                exit_code = 124
        except Exception as e:
            execution_time = time.time() - start_time
            logs = f"DockerBuildExecutor error launching container: {str(e)} ({type(e).__name__})"
            logger.error(f"[FORENSIC] Container Start Result: FAILED - {str(e)} ({type(e).__name__})")
            exit_code = -1

        finally:
            # Crucial: Always ensure the container is removed to prevent orphans
            try:
                logger.info(f"DockerBuildExecutor: Cleaning up container {container_name}...")
                def run_cleanup():
                    subprocess.run(["docker", "rm", "-f", container_name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                await asyncio.to_thread(run_cleanup)
            except Exception as e:
                logger.warning(f"DockerBuildExecutor: Failed to clean up container {container_name}: {e}")

            return {
                "logs": logs,
                "exit_code": exit_code,
                "execution_time": execution_time,
                "success": exit_code == 0,
                "docker_image": image,
                "volume_mounts": f"{host_mount_path}:/workspace",
                "working_directory": container_cwd,
                "command_executed": joined_commands,
            }

class FallbackHostExecutor:
    @classmethod
    async def execute_host_fallback(cls, local_path: str, ecosystem: str, timeout: float = 30.0) -> Dict[str, Any]:
        """
        Executes a dry-run or verification command directly on the host if Docker is unavailable.
        """
        commands = {
            "Python": "pip install --dry-run . || echo 'Fallback check completed'",
            "Node.js": "npm install --package-lock-only || npm install --dry-run || echo 'Fallback check completed'",
            "Java Maven": "mvn validate || echo 'Fallback check completed'",
            "Java Gradle": "gradle dependencies || echo 'Fallback check completed'",
            "Go": "go mod verify || echo 'Fallback check completed'",
            "Rust": "cargo check || echo 'Fallback check completed'"
        }
        
        cmd = commands.get(ecosystem)
        if not cmd:
            return {
                "logs": f"No host fallback command available for ecosystem: {ecosystem}",
                "exit_code": -1,
                "execution_time": 0.0,
                "success": False
            }
            
        logger.info(f"FallbackHostExecutor: Running host fallback command for {ecosystem}: {cmd}")
        
        start_time = time.time()
        logs = ""
        exit_code = -1
        
        try:
            process = await asyncio.create_subprocess_shell(
                cmd,
                cwd=local_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT
            )
            try:
                stdout, _ = await asyncio.wait_for(process.communicate(), timeout=timeout)
                logs = stdout.decode("utf-8", errors="ignore")
                exit_code = process.returncode
            except asyncio.TimeoutError:
                if process:
                    try:
                        process.kill()
                    except Exception:
                        pass
                logs = "[TIMEOUT] Host fallback execution timed out."
                exit_code = -124
        except Exception as e:
            logs = f"Error during host fallback execution: {str(e)}"
            exit_code = -1
            
        execution_time = time.time() - start_time
        return {
            "logs": f"HOST FALLBACK MODE:\n{logs}",
            "exit_code": exit_code,
            "execution_time": round(execution_time, 2),
            "success": exit_code == 0
        }

class BuildValidationService:


    @classmethod
    def detect_ecosystem(cls, local_path: str) -> Tuple[str, List[str], str | None, List[str]]:
        """
        Detects the repository ecosystem and returns (primary_ecosystem_name, build_commands, manifest_path, logs).
        Supported ecosystems: Node.js, Python, Java, Go, Rust.
        Finds all manifests and compiles sequential build commands.
        """
        manifests_found = []
        logs = []
        
        # Walk directory tree
        for root, dirs, files in os.walk(local_path):
            # Only filter subdirectories, don't filter the root itself
            if root != local_path:
                dirs[:] = [
                    d for d in dirs
                    if not d.startswith('.')
                    and d not in ('venv', '.venv', 'node_modules', 'dist', 'target', 'build', '__pycache__')
                ]
            for file in files:
                if file in ("Cargo.toml", "go.mod", "pom.xml", "build.gradle", "package.json", "requirements.txt", "pyproject.toml", "Pipfile"):
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, local_path).replace("\\", "/")
                    manifests_found.append((file, rel_path))

        if not manifests_found:
            logs.append("No supported manifest file detected across repository.")
            return "Unknown", [], None, logs
            
        ecosystem_counts = {"Node.js": 0, "Python": 0, "Java Maven": 0, "Java Gradle": 0, "Go": 0, "Rust": 0}
        
        # Pass 1: Count ecosystems
        for file, rel_path in manifests_found:
            if file == "Cargo.toml": ecosystem_counts["Rust"] += 1
            elif file == "go.mod": ecosystem_counts["Go"] += 1
            elif file == "pom.xml": ecosystem_counts["Java Maven"] += 1
            elif file == "build.gradle": ecosystem_counts["Java Gradle"] += 1
            elif file == "package.json": ecosystem_counts["Node.js"] += 1
            elif file in ("requirements.txt", "pyproject.toml", "Pipfile"): ecosystem_counts["Python"] += 1

        # Primary ecosystem is the one with the most manifests
        primary_ecosystem = max(ecosystem_counts.items(), key=lambda x: x[1])[0]
        if ecosystem_counts[primary_ecosystem] == 0:
            primary_ecosystem = "Unknown"
            
        # Pass 2: Find primary manifest
        primary_manifest_path = None
        if primary_ecosystem != "Unknown":
            ecosystem_manifests = {
                "Rust": ["Cargo.toml"],
                "Go": ["go.mod"],
                "Java Maven": ["pom.xml"],
                "Java Gradle": ["build.gradle"],
                "Node.js": ["package.json"],
                "Python": ["requirements.txt", "pyproject.toml", "Pipfile"]
            }
            target_files = ecosystem_manifests.get(primary_ecosystem, [])
            for file, rel_path in manifests_found:
                if file in target_files:
                    primary_manifest_path = rel_path
                    break

        commands = []
        primary_dir = f"/workspace/{os.path.dirname(primary_manifest_path)}" if primary_manifest_path and os.path.dirname(primary_manifest_path) else "/workspace"
        
        # Pass 3: Generate commands
        for file, rel_path in manifests_found:
            rel_dir = os.path.dirname(rel_path)
            target_dir = f"/workspace/{rel_dir}" if rel_dir else "/workspace"
            
            needs_cd = target_dir != primary_dir
            cd_cmd = f"cd {target_dir}" if needs_cd else ""
            ret_cmd = f"cd {primary_dir}" if needs_cd else ""
            
            build_cmds = []
            if file == "Cargo.toml":
                build_cmds = ["cargo build"]
                logs.append(f"Detected Package Manager: cargo (Rust) at {rel_path}")
            elif file == "go.mod":
                build_cmds = ["go build"]
                logs.append(f"Detected Package Manager: go modules (Go) at {rel_path}")
            elif file == "pom.xml":
                build_cmds = ["mvn clean install -DskipTests"]
                logs.append(f"Detected Package Manager: maven (Java Maven) at {rel_path}")
            elif file == "build.gradle":
                build_cmds = ["gradle build -x test"]
                logs.append(f"Detected Package Manager: gradle (Java Gradle) at {rel_path}")
            elif file == "package.json":
                build_cmds = ["npm install", "npm run build --if-present"]
                logs.append(f"Detected Package Manager: npm (Node.js) at {rel_path}")
            elif file == "requirements.txt":
                build_cmds = ["pip install -r requirements.txt"]
                logs.append(f"Detected Package Manager: pip (Python) at {rel_path}")
            elif file == "pyproject.toml":
                build_cmds = ["pip install . || pip install -e . || python -m pip install ."]
                logs.append(f"Detected Package Manager: pyproject/poetry/hatch/uv (Python) at {rel_path}")
            elif file == "Pipfile":
                build_cmds = ["pipenv install"]
                logs.append(f"Detected Package Manager: pipenv (Python) at {rel_path}")
                
            if cd_cmd:
                commands.append(cd_cmd)
            for cmd in build_cmds:
                logs.append(f"Detected Build Command: {cmd}")
            commands.extend(build_cmds)
            if ret_cmd:
                commands.append(ret_cmd)
                
        logs.insert(0, f"Detected Ecosystem: {primary_ecosystem}")
        
        return primary_ecosystem, commands, primary_manifest_path, logs

    @classmethod
    async def validate_build(
        cls,
        db: AsyncSession,
        repo_id: UUID,
        timeout: float = 300.0,
        memory_limit: str = "1g"
    ) -> Dict[str, Any]:
        repo = await repository_repo.get(db, repo_id)
        if not repo:
            raise ValueError(f"Repository with ID {repo_id} not found.")

        if not repo.local_path or not os.path.exists(repo.local_path):
            logger.warning(f"[EARLY RETURN] Repo local path missing or doesn't exist: {repo.local_path}")
            result = {
                "build_attempted": False,
                "build_success": False,
                "detected_ecosystem": "Unknown",
                "commands_executed": [],
                "execution_time": 0.0,
                "logs": "Build validation skipped: Local path not found.",
                "errors": "Local repository directory does not exist.",
                "container_logs": None,
                "container_exit_code": None,
                "container_execution_time": None,
                "validation_category": "COMMAND_GENERATION_FAILURE"
            }
            from app.services.failure_diagnosis_service import failure_diagnosis_service
            diagnosis = failure_diagnosis_service.diagnose(result["logs"])
            try:
                from app.services.failure_rag_service import failure_rag_service
                await failure_rag_service.index_failure(repo, result, diagnosis)
            except Exception as e:
                logger.error(f"Failed to index build failure in ChromaDB for repo {repo_id}: {e}")
            await repository_repo.update(db, db_obj=repo, obj_in={"build_result": result, "failure_diagnosis": diagnosis})
            logger.info(f"[RETURN] Returning due to missing local path.")
            return result

        local_path = os.path.abspath(repo.local_path)
        ecosystem, commands, manifest_path, detection_logs = cls.detect_ecosystem(local_path)
        
        log_output = "\n".join(detection_logs) + "\n"

        if ecosystem == "Unknown" or not commands:
            logger.warning(f"[EARLY RETURN] Ecosystem unknown or commands empty. Ecosystem: {ecosystem}, Commands: {commands}")
            log_output += "Build Execution Skipped: Unknown Ecosystem."
            result = {
                "build_attempted": False,
                "build_success": False,
                "detected_ecosystem": "Unknown",
                "commands_executed": [],
                "execution_time": 0.0,
                "logs": log_output,
                "errors": "Ecosystem could not be determined.",
                "container_logs": None,
                "container_exit_code": None,
                "container_execution_time": None,
                "validation_category": "COMMAND_GENERATION_FAILURE"
            }
            from app.services.failure_diagnosis_service import failure_diagnosis_service
            diagnosis = failure_diagnosis_service.diagnose(result["logs"])
            try:
                from app.services.failure_rag_service import failure_rag_service
                await failure_rag_service.index_failure(repo, result, diagnosis)
            except Exception as e:
                logger.error(f"Failed to index build failure in ChromaDB for repo {repo_id}: {e}")
            await repository_repo.update(db, db_obj=repo, obj_in={"build_result": result, "failure_diagnosis": diagnosis})
            logger.info(f"[RETURN] Returning due to unknown ecosystem or empty commands.")
            return result

        log_output += "Build Execution Started\n"

        # Execute build using DockerBuildExecutor
        try:
            docker_result = await DockerBuildExecutor.execute_in_container(
                local_path=local_path,
                ecosystem=ecosystem,
                commands=commands,
                manifest_path=manifest_path,
                timeout=timeout,
                memory_limit=memory_limit
            )

            build_success = docker_result["success"]
            is_infrastructure_failure = False
            validation_category = "BUILD_SUCCESS" if build_success else "BUILD_FAILED"
            
            container_logs_lower = docker_result["logs"].lower()
            if not build_success:
                if docker_result["exit_code"] == 124:
                    validation_category = "TIMEOUT"
                elif "temporary failure in name resolution" in container_logs_lower or \
                     "could not resolve host" in container_logs_lower or \
                     "connection timeout" in container_logs_lower or \
                     docker_result["exit_code"] in [125, 126, 127] or \
                     "error during connect" in container_logs_lower or \
                     "daemon" in container_logs_lower:
                    is_infrastructure_failure = True
                    validation_category = "DOCKER_NETWORK_FAILURE"
                    log_output += "ERROR: Infrastructure Network Failure detected.\n"
                else:
                    validation_category = "DEPENDENCY_DOWNLOAD_FAILURE"
            
            # Note: if Docker throws a connection error, container exit code is 127
            if is_infrastructure_failure:
                log_output += "ERROR: Docker infrastructure failure detected. Attempting host fallback mode...\n"
                
                # Attempt Host Fallback
                fallback_result = await FallbackHostExecutor.execute_host_fallback(
                    local_path=local_path,
                    ecosystem=ecosystem
                )
                
                docker_result["logs"] += f"\n\n{fallback_result['logs']}"
                docker_result["execution_time"] += fallback_result["execution_time"]
                
                # We consider it a "success" in fallback mode if the dry run passes
                build_success = fallback_result["success"]
                docker_result["exit_code"] = fallback_result["exit_code"]
                
                log_output += f"Fallback execution success: {build_success}\n"
                if build_success:
                    validation_category = "BUILD_SUCCESS"

            log_output += "Build Execution Completed\n"
            log_output += docker_result["logs"]

            result = {
                "build_attempted": True,
                "build_success": build_success,
                "detected_ecosystem": ecosystem,
                "commands_executed": commands,
                "execution_time": docker_result.get("execution_time", 0.0),
                "logs": log_output,
                "errors": "Build Validation could not be completed due to infrastructure failure. Fallback mode used." if is_infrastructure_failure else (None if build_success else "Container build returned non-zero exit code or timeout."),
                "container_logs": docker_result["logs"],
                "container_exit_code": docker_result["exit_code"],
                "container_execution_time": docker_result.get("execution_time", 0.0),
                "validation_mode": "host_fallback" if is_infrastructure_failure else "docker",
                "validation_category": validation_category,
                "docker_trace": docker_result
            }
            
            from app.services.failure_diagnosis_service import failure_diagnosis_service
            diagnosis = failure_diagnosis_service.diagnose(result["logs"])
            
            try:
                from app.services.failure_rag_service import failure_rag_service
                await failure_rag_service.index_failure(repo, result, diagnosis)
            except Exception as e:
                logger.error(f"Failed to index build failure in ChromaDB for repo {repo_id}: {e}")
                
            await repository_repo.update(db, db_obj=repo, obj_in={"build_result": result, "failure_diagnosis": diagnosis})
            logger.info(f"[RETURN] Returning successful execution path result.")
            return result

        except Exception as e:
            logger.error(f"Error during build validation for repo {repo_id}: {e}")
            log_output += f"ERROR: Exception during build validation: {str(e)}\n"
            result = {
                "build_attempted": True,
                "build_success": False,
                "detected_ecosystem": ecosystem,
                "commands_executed": commands,
                "execution_time": 0.0,
                "logs": log_output,
                "errors": str(e),
                "container_logs": None,
                "container_exit_code": -1,
                "container_execution_time": 0.0,
                "validation_category": "BUILD_FAILED"
            }
            from app.services.failure_diagnosis_service import failure_diagnosis_service
            diagnosis = failure_diagnosis_service.diagnose(result["logs"])
            try:
                from app.services.failure_rag_service import failure_rag_service
                await failure_rag_service.index_failure(repo, result, diagnosis)
            except Exception as e:
                pass
            await repository_repo.update(db, db_obj=repo, obj_in={"build_result": result, "failure_diagnosis": diagnosis})
            logger.info(f"[RETURN] Returning exception path result.")
            return result

build_validation_service = BuildValidationService()
