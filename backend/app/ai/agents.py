import json
import logging
import re
from typing import Dict, Any, List
from app.ai.llm import get_llm

logger = logging.getLogger(__name__)

def clean_json_response(text: str) -> str:
    """
    Extracts the JSON substring from a model response if wrapped in markdown code blocks or other text.
    """
    text = text.strip()
    # Find JSON block pattern ```json ... ```
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    
    # Otherwise try to find the first '{' and last '}'
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start:end+1].strip()
        
    return text

class AIDocumentationAgent:
    @classmethod
    async def analyze(cls, readme_content: str, completeness_score: float, sections: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Runs the Documentation Intelligence Agent.
        Inputs: readme_content, rule-based completeness score, sections list.
        """
        logger.info("Documentation Intelligence Agent: Initiating assessment...")
        
        prompt = f"""You are an AI Documentation Assessment Agent. Analyze the following repository README file and scoring metadata to generate a structured quality assessment.

README content (first 4000 characters):
{readme_content[:4000]}

Rule-Based Scoring Metadata:
- Completeness Score: {completeness_score}%
- Scanned Sections: {json.dumps(sections, indent=2)}

Generate a JSON object with EXACTLY the following keys. Do not include any other markdown decoration outside of the JSON output:
{{
  "documentation_quality": "Good" | "Fair" | "Poor",
  "summary": "A high-level summary of the documentation completeness, what it provides and what it lacks.",
  "missing_documentation_areas": ["Area 1", "Area 2", ...],
  "improvement_recommendations": ["Recommendation 1", "Recommendation 2", ...],
  "setup_difficulty_estimate": "Easy" | "Medium" | "Hard"
}}
"""
        try:
            llm = get_llm()
            # Set system prompts if supported, otherwise standard invoke
            response = await llm.ainvoke(prompt)
            response_text = response.content if hasattr(response, 'content') else str(response)
            cleaned = clean_json_response(response_text)
            data = json.loads(cleaned)
            
            # Basic schema validation
            required_keys = ["documentation_quality", "summary", "missing_documentation_areas", "improvement_recommendations", "setup_difficulty_estimate"]
            if all(k in data for k in required_keys):
                logger.info("Documentation Intelligence Agent: Successfully analyzed documentation using Ollama.")
                return data
            else:
                logger.warning("Documentation Intelligence Agent: Ollama JSON response did not match expected schema. Falling back.")
        except Exception as e:
            logger.warning(f"Documentation Intelligence Agent: Ollama invocation failed ({str(e)}). Falling back to rules.")
            
        return cls._fallback_analyze(completeness_score, sections)

    @classmethod
    def _fallback_analyze(cls, completeness_score: float, sections: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Deterministic fallback analysis when Ollama fails."""
        missing = []
        recommendations = []
        
        # Check specific sections
        section_status = {s["category"].lower(): s.get("score", 0) for s in sections}
        
        if section_status.get("project description", 0) < 50:
            missing.append("Project Description / Overview")
            recommendations.append("Add a detailed Description section explaining the purpose of the project.")
            
        if section_status.get("installation instructions", 0) < 50:
            missing.append("Installation Instructions")
            recommendations.append("Add explicit step-by-step Installation instructions with terminal commands.")
            
        if section_status.get("setup instructions", 0) < 50:
            missing.append("Configuration / Setup Directives")
            recommendations.append("Provide a Setup / Configuration section indicating key settings or bootstrap scripts.")
            
        if section_status.get("environment variables", 0) < 50:
            missing.append("Environment Variables Listing")
            recommendations.append("Document required Environment Variables, ideally with sample keys.")
            
        if section_status.get("usage examples", 0) < 50:
            missing.append("Usage Examples / Run Commands")
            recommendations.append("Provide Usage Examples showing how to launch or run the project.")
            
        if section_status.get("api documentation", 0) < 50:
            missing.append("API Reference / Endpoint Documentation")
            recommendations.append("Add an API Reference section mapping available endpoints, requests, and responses.")

        # Overall estimation
        if completeness_score >= 80:
            quality = "Good"
            difficulty = "Easy"
            summary = "The repository contains thorough, structured documentation covering installation, configuration, and execution guidelines."
        elif completeness_score >= 50:
            quality = "Fair"
            difficulty = "Medium"
            summary = f"The repository provides basic setup guidance, but lacks comprehensive documentation in areas such as: {', '.join(missing) if missing else 'advanced usage'}."
        else:
            quality = "Poor"
            difficulty = "Hard"
            summary = "The repository documentation is extremely sparse, missing critical onboarding sections, installation steps, and code examples."

        # Guarantee at least some recommendations
        if not recommendations:
            recommendations = ["Add more detailed usage examples.", "Add troubleshooting or FAQ section.", "Provide deployment guidelines."]
        if not missing:
            missing = ["Advanced configuration options", "Deployment tutorials"]

        return {
            "documentation_quality": quality,
            "summary": summary,
            "missing_documentation_areas": missing,
            "improvement_recommendations": recommendations,
            "setup_difficulty_estimate": difficulty
        }


class AIDependencyAgent:
    @classmethod
    async def analyze(cls, dependencies: List[Dict[str, Any]], report: Dict[str, Any]) -> Dict[str, Any]:
        """
        Runs the Dependency Risk Intelligence Agent.
        Inputs: Dependency list, dependency statistics report.
        """
        logger.info("Dependency Intelligence Agent: Initiating assessment...")
        
        prompt = f"""You are an AI Dependency Intelligence Agent. Analyze the following dependency list and parsing reports to generate a vulnerability and reproducibility risk assessment.

Dependency Statistics:
- Total Packages: {report.get('total_count', 0)}
- Duplicate Packages: {json.dumps(report.get('duplicates', []), indent=2)}
- Unspecified/Unpinned Versions: {json.dumps(report.get('missing_versions', []), indent=2)}
- Suspicious Declarations: {json.dumps(report.get('suspicious_declarations', []), indent=2)}

Example Dependency List (up to 50):
{json.dumps(dependencies[:50], indent=2)}

Generate a JSON object with EXACTLY the following keys. Do not include any other text:
{{
  "risk_level": "Low" | "Medium" | "High",
  "reason": "Clear explanation of the dependency risk level and reproducibility threats.",
  "dependency_health_summary": "High-level summary of dependency stack stability and formatting.",
  "version_pinning_assessment": "Analysis of the level of dependency version specification (e.g. are versions strict, loose, or missing entirely).",
  "upgrade_suggestions": ["Suggestion 1", "Suggestion 2", ...]
}}
"""
        try:
            llm = get_llm()
            response = await llm.ainvoke(prompt)
            response_text = response.content if hasattr(response, 'content') else str(response)
            cleaned = clean_json_response(response_text)
            data = json.loads(cleaned)
            
            required_keys = ["risk_level", "reason", "dependency_health_summary", "version_pinning_assessment", "upgrade_suggestions"]
            if all(k in data for k in required_keys):
                logger.info("Dependency Intelligence Agent: Successfully analyzed dependencies using Ollama.")
                return data
            else:
                logger.warning("Dependency Intelligence Agent: Ollama JSON response did not match expected schema. Falling back.")
        except Exception as e:
            logger.warning(f"Dependency Intelligence Agent: Ollama invocation failed ({str(e)}). Falling back to rules.")
            
        return cls._fallback_analyze(dependencies, report)

    @classmethod
    def _fallback_analyze(cls, dependencies: List[Dict[str, Any]], report: Dict[str, Any]) -> Dict[str, Any]:
        """Deterministic fallback analysis when Ollama fails."""
        duplicates_count = len(report.get("duplicates", []))
        missing_versions_count = len(report.get("missing_versions", []))
        suspicious_count = len(report.get("suspicious_declarations", []))
        total_count = report.get("total_count", 0)

        # Risk criteria
        if suspicious_count > 0 or duplicates_count > 2 or (total_count > 0 and (missing_versions_count / total_count) > 0.4):
            risk = "High"
            reason = "High risk due to critical issues such as duplicate packages, unpinned versions, or suspicious package coordinates."
        elif duplicates_count > 0 or missing_versions_count > 0:
            risk = "Medium"
            reason = "Medium risk. The dependency tree is mostly clean but contains some loose constraints or duplicates that could introduce runtime volatility."
        else:
            risk = "Low"
            reason = "Low risk. All dependencies appear to be fully declared, pinned, and structurally sound."

        # Summary
        summary = (
            f"Analyzed {total_count} dependencies. Found {duplicates_count} duplicate registrations, "
            f"{missing_versions_count} packages with missing/unpinned versions, and {suspicious_count} suspicious declarations."
        )

        # Pinning assessment
        if total_count == 0:
            pinning = "No dependencies declared in standard package manifests."
        else:
            pinned_ratio = (total_count - missing_versions_count) / total_count
            pinning = f"Approximately {int(pinned_ratio * 100)}% of dependencies have specified versions. "
            if missing_versions_count > 0:
                pinning += "Unpinned packages allow arbitrary upgrades, raising reproducibility risks."
            else:
                pinning += "Full version specification ensures a stable and reproducible execution environment."

        # Suggestions
        suggestions = []
        if duplicates_count > 0:
            suggestions.append("Consolidate duplicate package declarations to ensure single-version resolution.")
        if missing_versions_count > 0:
            for m in report.get("missing_versions", [])[:3]:
                suggestions.append(f"Pin version for '{m['name']}' in {m['source_file']} instead of using wildcard or loose constraints.")
            if missing_versions_count > 3:
                suggestions.append(f"Pin the remaining {missing_versions_count - 3} unversioned package definitions.")
        if suspicious_count > 0:
            suggestions.append("Verify credentials or registry endpoints for suspicious local/SSH/file dependency references.")
            
        if not suggestions:
            suggestions = ["Maintain dependencies updated to verify security patches.", "Run audit commands (e.g. npm audit, pip-audit) periodically."]

        return {
            "risk_level": risk,
            "reason": reason,
            "dependency_health_summary": summary,
            "version_pinning_assessment": pinning,
            "upgrade_suggestions": suggestions
        }


class AIRepositoryIntelligenceAgent:
    @classmethod
    async def analyze(cls, repo_meta: Dict[str, Any], tech_stack: Dict[str, Any], dep_profile: Dict[str, Any], env_profile: Dict[str, Any], doc_profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Runs the Repository Executive Intelligence Agent.
        Inputs: Metadata, Stack Discovery, Dependencies, Env variables, and Documentation profiles.
        """
        logger.info("Repository Intelligence Agent: Initiating assessment...")
        
        # Extract summary information
        stars = repo_meta.get("stars", 0)
        forks = repo_meta.get("forks", 0)
        contributors = repo_meta.get("contributors_count", 0)
        open_issues = repo_meta.get("open_issues", 0)
        
        doc_score = doc_profile.get("completeness_score", 0) if doc_profile else 0
        deps_count = len(dep_profile.get("dependencies", [])) if dep_profile else 0
        env_vars_count = len(env_profile.get("variables", [])) if env_profile else 0
        
        prompt = f"""You are an AI Repository Intelligence Architect. You need to review this repository audit bundle and synthesize an Executive Summary and Health Check.

Metadata:
- Stars: {stars}, Forks: {forks}, Contributors: {contributors}, Open Issues: {open_issues}
- Technology Stack: {json.dumps(tech_stack, indent=2)}

Scanners Metadata:
- Documentation Score: {doc_score}%
- Total Dependencies: {deps_count}
- Reconstructed Env Variables: {env_vars_count}

Instruction on Directory Layout and Project Structure:
Look closely at the `modules` key inside `Technology Stack`. If multiple modules are detected (e.g. monorepo split into backend/frontend directories, client/server projects, etc.), you MUST explicitly describe this repository structure and directory layout in the `executive_summary`. Explain where the backend and frontend modules reside (e.g. backend at "FULLSATCK/backend" and frontend at "FULLSATCK/frontend") and how they interact.

Generate a JSON object with EXACTLY the following keys. Do not include any other text:
{{
  "repository_health": "Good" | "Moderate" | "Poor",
  "executive_summary": "A professional executive summary outlining what the repository is, its tech stack, its directory layout / monorepo structure (referencing specific folders in 'modules' list), and ready-to-run evaluation.",
  "risk_assessment": "Overall summary of reproducibility and survivability risks (such as missing docker, unpinned dependencies, low activity).",
  "strengths": ["Strength 1", "Strength 2", ...],
  "weaknesses": ["Weakness 1", "Weakness 2", ...]
}}
"""
        try:
            llm = get_llm()
            response = await llm.ainvoke(prompt)
            response_text = response.content if hasattr(response, 'content') else str(response)
            cleaned = clean_json_response(response_text)
            data = json.loads(cleaned)
            
            required_keys = ["repository_health", "executive_summary", "risk_assessment", "strengths", "weaknesses"]
            if all(k in data for k in required_keys):
                logger.info("Repository Intelligence Agent: Successfully compiled Executive Summary using Ollama.")
                return data
            else:
                logger.warning("Repository Intelligence Agent: Ollama JSON response did not match expected schema. Falling back.")
        except Exception as e:
            logger.warning(f"Repository Intelligence Agent: Ollama invocation failed ({str(e)}). Falling back to rules.")
            
        return cls._fallback_analyze(repo_meta, tech_stack, dep_profile, env_profile, doc_profile)

    @classmethod
    def _fallback_analyze(cls, repo_meta: Dict[str, Any], tech_stack: Dict[str, Any], dep_profile: Dict[str, Any], env_profile: Dict[str, Any], doc_profile: Dict[str, Any]) -> Dict[str, Any]:
        """Deterministic fallback analysis when Ollama fails."""
        stars = repo_meta.get("stars", 0)
        contributors = repo_meta.get("contributors_count", 0)
        doc_score = doc_profile.get("completeness_score", 0) if doc_profile else 0
        has_docker = False
        
        if tech_stack:
            files = tech_stack.get("scanned_files", [])
            if "Dockerfile" in files or "docker-compose.yml" in files:
                has_docker = True
                
        # Strengths / Weaknesses list
        strengths = []
        weaknesses = []
        
        # Determine strengths
        if doc_score >= 70:
            strengths.append("High-quality documentation with structured setup guidelines.")
        if stars > 50:
            strengths.append(f"Established developer popularity ({stars} stars).")
        if contributors >= 3:
            strengths.append(f"Collaborative community with {contributors} contributors.")
        if has_docker:
            strengths.append("Docker containers configuration detected, enabling instant environment virtualization.")
        else:
            weaknesses.append("Missing Docker configuration, requiring manual setup of runtime environments.")
            
        if not strengths:
            strengths.append("Simple structure, making codebase navigation straightforward.")
            
        # Determine weaknesses
        if doc_score < 50:
            weaknesses.append("Insufficient README documentation, raising barrier to onboarding.")
            
        dep_report = dep_profile.get("report", {}) if dep_profile else {}
        missing_pinned = len(dep_report.get("missing_versions", []))
        if missing_pinned > 0:
            weaknesses.append(f"Contains {missing_pinned} unpinned dependencies, risking pipeline breaks on version upgrades.")
            
        if not weaknesses:
            weaknesses.append("No testing framework files detected in root configuration.")
            
        # Check for modules layout in tech_stack to build description
        modules = tech_stack.get("modules", []) if tech_stack else []
        structure_desc = ""
        if len(modules) > 1:
            structure_desc = " The repository is structured as a monorepo with multiple modules: " + ", ".join([f"'{m.get('path')}' ({m.get('role')})" for m in modules]) + "."
        elif len(modules) == 1:
            structure_desc = f" The repository layout contains a single module at '{modules[0].get('path')}' ({modules[0].get('role')})."

        # Health check
        if doc_score >= 85 and has_docker and contributors >= 2:
            health = "Good"
            exec_summary = f"The repository represents a highly reproducible and stable workspace. Built using {', '.join(tech_stack.get('backend', [])) if tech_stack else 'standard technologies'}, it includes virtualized containers and comprehensive docs.{structure_desc}"
            risk = "Low risk. Robust configuration setups minimize environmental and reproducibility issues."
        elif doc_score >= 50 or has_docker:
            health = "Moderate"
            exec_summary = f"The repository is moderately structured. It utilizes a stack consisting of {', '.join(tech_stack.get('backend', [])) if tech_stack else 'custom packages'}, but could be improved by standardizing virtualized environments and polishing docs.{structure_desc}"
            risk = "Medium risk. Missing or unpinned configurations might result in minor setup challenges."
        else:
            health = "Poor"
            exec_summary = f"The repository exhibits poor reproducibility configurations. Lacking Docker wrappers, explicit dependency pinning, and onboarding docs, it will require manual developer troubleshooting to launch.{structure_desc}"
            risk = "High risk. Large reproduction overhead with a high probability of environment drift."

        return {
            "repository_health": health,
            "executive_summary": exec_summary,
            "risk_assessment": risk,
            "strengths": strengths,
            "weaknesses": weaknesses
        }


class AIRecommendationAgent:
    @classmethod
    async def analyze(
        cls,
        diagnosis: Dict[str, Any],
        similar_failures: List[Dict[str, Any]],
        repo_meta: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Runs the AI Recommendation Agent.
        Inputs: Failure Diagnosis, Similar Failures (RAG), Repository Metadata.
        """
        logger.info("AI Recommendation Agent: Initiating build failure remediation analysis...")
        
        # Format similar failures for the prompt
        sim_str = ""
        if similar_failures:
            for idx, sf in enumerate(similar_failures[:3]):
                sim_str += f"""
Similar Failure {idx+1}:
- Ecosystem: {sf.get('ecosystem')}
- Category: {sf.get('category')}
- Root Cause: {sf.get('root_cause')}
- Fix Recommendations: {json.dumps(sf.get('recommendations'))}
"""
        else:
            sim_str = "No historical similar failures found in the database."

        prompt = f"""You are an AI DevOps and Build Reliability Engineer. Analyze the following build failure diagnosis and historical context to generate a precise remediation plan.

Repository Metadata:
- Name: {repo_meta.get('name')}
- Owner: {repo_meta.get('owner')}
- Ecosystem: {repo_meta.get('detected_ecosystem')}

Current Build Failure Diagnosis:
- Category: {diagnosis.get('category')}
- Root Cause: {diagnosis.get('root_cause')}
- Suggestions: {json.dumps(diagnosis.get('recommendations'))}

Historical Context (Similar Failures):
{sim_str}

Generate a JSON object with EXACTLY the following keys. Do not include any other text:
{{
  "root_cause_explanation": "A clear, developer-friendly explanation of why the build failed and what the logs indicate.",
  "fix_steps": ["Step 1 to resolve the issue", "Step 2 to resolve...", ...],
  "commands_to_execute": ["Specific CLI command to run (e.g. npm install, pip install package)", ...],
  "confidence_level": 0.85
}}
"""
        try:
            llm = get_llm()
            response = await llm.ainvoke(prompt)
            response_text = response.content if hasattr(response, 'content') else str(response)
            cleaned = clean_json_response(response_text)
            data = json.loads(cleaned)
            
            required_keys = ["root_cause_explanation", "fix_steps", "commands_to_execute", "confidence_level"]
            if all(k in data for k in required_keys):
                logger.info("AI Recommendation Agent: Successfully generated recommendations using Ollama.")
                return data
            else:
                logger.warning("AI Recommendation Agent: Ollama JSON response did not match expected schema. Falling back.")
        except Exception as e:
            logger.warning(f"AI Recommendation Agent: Ollama invocation failed ({str(e)}). Falling back to templates.")
            
        return cls._fallback_analyze(diagnosis, similar_failures, repo_meta)

    @classmethod
    def _fallback_analyze(
        cls,
        diagnosis: Dict[str, Any],
        similar_failures: List[Dict[str, Any]],
        repo_meta: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Deterministic fallback analysis when Ollama fails."""
        category = diagnosis.get("category", "Unknown")
        root_cause = diagnosis.get("root_cause", "Build failed due to compile or setup error.")
        recs = diagnosis.get("recommendations", [])
        
        # Simple rule-based formatting based on category
        steps = []
        commands = []
        confidence = 0.5

        if category == "Missing Dependency":
            steps = [
                f"Verify if the dependency referenced in '{root_cause}' is correctly declared in the manifest file.",
                "Ensure that the package registry is accessible from the container or host."
            ]
            for r in recs:
                if "pip install" in r or "npm install" in r or "go get" in r or "cargo" in r:
                    commands.append(r)
            if not commands:
                commands = ["pip install -r requirements.txt" if repo_meta.get("detected_ecosystem") == "Python" else "npm install"]
            confidence = 0.7
        elif category == "Missing Environment Variable":
            steps = [
                "Locate the environment variable referenced in the logs.",
                "Create a local .env configuration file and populate the missing key."
            ]
            commands = ["echo 'KEY=VALUE' >> .env"]
            confidence = 0.8
        elif category == "Build Tool Missing":
            steps = [
                "Install the missing compiler or packaging utility on the host or container.",
                "Ensure the required bin directory is added to your environment $PATH."
            ]
            commands = ["sudo apt-get update && sudo apt-get install -y <tool>"]
            confidence = 0.75
        elif category == "Docker Failure":
            steps = [
                "Check if the Docker daemon is running and has sufficient CPU/memory resources.",
                "Ensure that container volume mount permissions are correct."
            ]
            commands = ["docker info", "docker rm -f $(docker ps -a -q)"]
            confidence = 0.7
        elif category == "Network Failure":
            steps = [
                "Check host DNS settings and verify internet connection.",
                "Ensure the package registry proxy allows outgoing HTTPS requests."
            ]
            commands = ["curl -I https://registry.npmjs.org", "ping -c 3 8.8.8.8"]
            confidence = 0.8
        elif category == "Permission Failure":
            steps = [
                "Check directory write and read permissions in the workspace.",
                "Adjust file permissions or run inside a non-root container context with correct permissions."
            ]
            commands = ["chmod -R 755 .", "whoami"]
            confidence = 0.75
        else:
            steps = [
                "Inspect the build logs stdout and stderr to identify the exact error line.",
                "Verify compatibility between code versions and build tool configurations."
            ]
            commands = []
            confidence = 0.4

        for r in recs:
            if r not in commands and len(steps) < 5:
                steps.append(r)

        return {
            "root_cause_explanation": f"The build failed under category '{category}' with root cause: {root_cause}",
            "fix_steps": steps,
            "commands_to_execute": commands,
            "confidence_level": confidence
        }
