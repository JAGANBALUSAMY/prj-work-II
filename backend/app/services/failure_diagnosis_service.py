import re
from typing import Dict, Any, List

class FailureDiagnosisService:
    # Rule definitions: tuple of (regex_pattern, category, confidence, root_cause_format, recommendations)
    RULES = [
        # 1. Missing Environment Variable (check first, often specific)
        (
            r"(?i)KeyError:\s*'([^']*)'",
            "Missing Environment Variable",
            0.9,
            "Python KeyError: Missing required environment variable '{0}'.",
            [
                "Define the environment variable '{0}' in your environment configurations or .env file.",
                "Ensure environment_profile parser detects and maps '{0}'."
            ]
        ),
        (
            r"(?i)Environment\s*variable\s*([\w_]+)\s*is\s*not\s*set",
            "Missing Environment Variable",
            0.9,
            "Environment variable '{0}' is not configured.",
            [
                "Add '{0}' environment variable to your deployment or configuration settings.",
                "Create a .env file containing '{0}=your_value'."
            ]
        ),
        (
            r"(?i)Missing\s*required\s*environment\s*variable\s*([\w_]+)",
            "Missing Environment Variable",
            0.9,
            "Required environment variable '{0}' is missing.",
            [
                "Add '{0}' env var to your build environment.",
                "Check env templates to find the expected variable syntax."
            ]
        ),

        # 2. Missing Dependency
        (
            r"(?i)ModuleNotFoundError:\s*No\s*module\s*named\s*'([^']*)'",
            "Missing Dependency",
            0.95,
            "Python module '{0}' is not installed.",
            [
                "Add '{0}' to requirements.txt, pyproject.toml, or Pipfile.",
                "Check for typos in import statement for module '{0}'."
            ]
        ),
        (
            r"(?i)ImportError:\s*cannot\s*import\s*name\s*'([^']*)'",
            "Missing Dependency",
            0.85,
            "Python failed to import '{0}' from a package.",
            [
                "Check for circular imports or version conflicts with the package providing '{0}'.",
                "Reinstall or upgrade the module containing '{0}'."
            ]
        ),
        (
            r"(?i)Error:\s*Cannot\s*find\s*module\s*'([^']*)'",
            "Missing Dependency",
            0.95,
            "Node.js package or module '{0}' could not be resolved.",
            [
                "Run 'npm install {0}' or 'npm install' in the project directory.",
                "Ensure '{0}' is listed in package.json dependencies."
            ]
        ),
        (
            r"(?i)package\s*([\w\.]+)\s*does\s*not\s*exist",
            "Missing Dependency",
            0.9,
            "Java package '{0}' does not exist.",
            [
                "Add the dependency containing package '{0}' to pom.xml or build.gradle.",
                "Ensure Maven or Gradle has successfully downloaded project dependencies."
            ]
        ),
        (
            r"(?i)cannot\s*find\s*module\s*providing\s*package\s*([\w\.\-/]+)",
            "Missing Dependency",
            0.9,
            "Go package '{0}' could not be found.",
            [
                "Run 'go get {0}' to download the missing module.",
                "Run 'go mod tidy' to synchronize go.mod and go.sum."
            ]
        ),
        (
            r"(?i)error\[E0432\]:\s*unresolved\s*import\s*`([^`]+)`",
            "Missing Dependency",
            0.9,
            "Rust unresolved import '{0}'.",
            [
                "Ensure the dependency providing '{0}' is listed in Cargo.toml.",
                "Check the namespace path for '{0}'."
            ]
        ),
        (
            r"(?i)No\s*matching\s*distribution\s*found\s*for\s*([\w\-\[\]\.]+)",
            "Missing Dependency",
            0.9,
            "No matching version found for dependency '{0}'.",
            [
                "Check the spelling and version requirements of '{0}'.",
                "Ensure your package index (e.g. PyPI) is accessible and configured correctly."
            ]
        ),
        (
            r"(?i)Could\s*not\s*resolve\s*dependencies\s*for\s*project\s*([^:]+)",
            "Missing Dependency",
            0.8,
            "Build automation failed to resolve dependencies for '{0}'.",
            [
                "Check build logs for underlying network or version conflict errors.",
                "Verify dependencies configuration in the project build file."
            ]
        ),

        # 3. Build Tool Missing
        (
            r"(?i)sh:\s*\d*:\s*([\w\-]+):\s*not\s*found",
            "Build Tool Missing",
            0.95,
            "Build tool or executable '{0}' is not installed or not in PATH.",
            [
                "Install '{0}' on the host system or container image.",
                "Ensure '{0}' executable is added to the system PATH environment variable."
            ]
        ),
        (
            r"(?i)executable\s*file\s*not\s*found\s*in\s*\$PATH",
            "Build Tool Missing",
            0.85,
            "A required executable binary was not found in PATH.",
            [
                "Ensure the required compiler or build tool is installed.",
                "Verify container base image matches the expected runtime ecosystem."
            ]
        ),
        (
            r"(?i)'([\w\-]+)'\s*is\s*not\s*recognized\s*as\s*an\s*internal\s*or\s*external\s*command",
            "Build Tool Missing",
            0.9,
            "Windows command shell failed to find executable '{0}'.",
            [
                "Install tool '{0}' on Windows host.",
                "Check if '{0}' is added to system Environment Variables PATH."
            ]
        ),

        # 4. Version Conflict
        (
            r"(?i)VersionConflict:\s*\(([^)]+)\)",
            "Version Conflict",
            0.95,
            "Python dependency version conflict: {0}.",
            [
                "Resolve the conflict by adjusting pins in requirements.txt or setup.py.",
                "Run builds in a clean environment or recreate virtual environment."
            ]
        ),
        (
            r"(?i)npm\s*ERR!\s*code\s*ERESOLVE",
            "Version Conflict",
            0.95,
            "Node.js dependency resolution conflict (ERESOLVE).",
            [
                "Run installation with '--legacy-peer-deps' if dependencies are incompatible.",
                "Update dependencies in package.json to compatible versions."
            ]
        ),
        (
            r"(?i)Could\s*not\s*resolve\s*dependency\s*([^:]+)",
            "Version Conflict",
            0.85,
            "Failed to resolve dependency for '{0}'.",
            [
                "Verify compatibility of '{0}' with other packages.",
                "Check package.json or dependency lock files."
            ]
        ),
        (
            r"(?i)has\s*requirement\s*([^,]+),\s*but\s*you\s*have\s*([^ ]+)",
            "Version Conflict",
            0.9,
            "Incompatible versions: requires {0}, but current is {1}.",
            [
                "Upgrade or downgrade dependency to satisfy the version requirement.",
                "Use virtual environment isolation to prevent pollution from global packages."
            ]
        ),

        # 5. Docker Failure (including Timeout)
        (
            r"(?i)DockerBuildExecutor\s*error\s*launching\s*container:\s*([^\n]+)",
            "Docker Failure",
            0.95,
            "Failed to start Docker container: {0}.",
            [
                "Ensure Docker Desktop is running and the daemon is online.",
                "Check WSL2 engine status and resource allocations."
            ]
        ),
        (
            r"(?i)Cannot\s*connect\s*to\s*the\s*Docker\s*daemon",
            "Docker Failure",
            0.95,
            "Docker daemon is unreachable.",
            [
                "Verify that Docker Desktop is launched and status is active.",
                "Start the Docker background service (com.docker.service)."
            ]
        ),
        (
            r"(?i)\[TIMEOUT\]\s*Execution\s*timed\s*out\s*after\s*([\d\.]+)\s*seconds",
            "Docker Failure",
            0.9,
            "Build execution timed out after {0} seconds.",
            [
                "Increase build timeout settings (currently {0} seconds).",
                "Ensure build step is not waiting for interactive input or hanging indefinitely."
            ]
        ),
        (
            r"(?i)docker:\s*Error\s*response\s*from\s*daemon:\s*([^\n]+)",
            "Docker Failure",
            0.9,
            "Docker daemon returned an error: {0}.",
            [
                "Check if the image is valid and accessible.",
                "Inspect volume mounts or port mappings."
            ]
        ),

        # 6. Network Failure
        (
            r"(?i)Could\s*not\s*resolve\s*host:\s*([^\s\n]+)",
            "Network Failure",
            0.95,
            "DNS resolution failure for host '{0}'.",
            [
                "Verify internet connectivity on the host machine.",
                "Ensure container can access external network (check proxy/DNS settings)."
            ]
        ),
        (
            r"(?i)Connection\s*refused",
            "Network Failure",
            0.85,
            "Network connection refused.",
            [
                "Check if the remote package registry server is online.",
                "Verify firewall or security group rules on host and network."
            ]
        ),
        (
            r"(?i)Temporary\s*failure\s*in\s*name\s*resolution",
            "Network Failure",
            0.9,
            "DNS lookup failed. Container network is disconnected.",
            [
                "Check internet connection.",
                "Restart Docker Desktop to reset network bridges."
            ]
        ),
        (
            r"(?i)ETIMEDOUT",
            "Network Failure",
            0.85,
            "Network request timed out.",
            [
                "Check remote registry latency or down status.",
                "Verify proxy or gateway configuration settings."
            ]
        ),

        # 7. Permission Failure
        (
            r"(?i)Permission\s*denied",
            "Permission Failure",
            0.9,
            "Access denied: Permission failure encountered during build.",
            [
                "Check filesystem access permissions for the repository workspace.",
                "Run execution under correct container user permissions or run with elevated rights if safe."
            ]
        ),
        (
            r"(?i)PermissionError:\s*\[Errno\s*13\]\s*Permission\s*denied",
            "Permission Failure",
            0.95,
            "Python permission error: [Errno 13] Access denied.",
            [
                "Ensure build execution process has write access to the targeted directory.",
                "Verify that no other application is locking the target files."
            ]
        ),
        (
            r"(?i)EACCES",
            "Permission Failure",
            0.9,
            "Node.js permission error: EACCES.",
            [
                "Avoid installing global npm modules without sudo/root or configure local directories.",
                "Verify workspace directory permissions."
            ]
        )
    ]

    @classmethod
    def diagnose(cls, logs: str) -> Dict[str, Any]:
        """
        Diagnoses build logs using rule-based pattern matching.
        Returns a dict conforming to FailureDiagnosisResponse.
        """
        if not logs or not logs.strip():
            return {
                "root_cause": "No logs provided for failure diagnosis.",
                "category": "Unknown",
                "confidence": 0.0,
                "recommendations": ["Ensure build processes output logs to capture details."]
            }

        best_match = None

        # Search logs for rule matches
        for pattern, category, confidence, rc_format, recommendations in cls.RULES:
            match = re.search(pattern, logs)
            if match:
                # Format root cause with regex captured group(s)
                groups = match.groups()
                try:
                    root_cause = rc_format.format(*groups) if groups else rc_format
                except Exception:
                    root_cause = rc_format

                # Format recommendations with captured group if needed
                formatted_recs = []
                for rec in recommendations:
                    try:
                        formatted_recs.append(rec.format(*groups) if groups else rec)
                    except Exception:
                        formatted_recs.append(rec)

                current_match = {
                    "root_cause": root_cause,
                    "category": category,
                    "confidence": confidence,
                    "recommendations": formatted_recs
                }

                # We select the match with the highest confidence
                if not best_match or current_match["confidence"] > best_match["confidence"]:
                    best_match = current_match

        if best_match:
            return best_match

        # Fallback if no rules match
        return {
            "root_cause": "Build failed due to an unidentified compile-time or runtime error.",
            "category": "Unknown",
            "confidence": 0.3,
            "recommendations": [
                "Examine full build stdout and stderr logs for detailed errors.",
                "Ensure all required dependencies and environment configurations are met."
            ]
        }

failure_diagnosis_service = FailureDiagnosisService()
