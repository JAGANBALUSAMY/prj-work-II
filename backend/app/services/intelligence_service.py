import logging
from typing import Dict, Any, List
from app.models.repository import Repository

logger = logging.getLogger(__name__)

class IntelligenceService:
    @classmethod
    def evaluate_architecture(cls, repo: Repository) -> Dict[str, Any]:
        """
        Derives Architecture Intelligence based on module roles and technologies.
        """
        stack = repo.detected_stack or {}
        modules = stack.get("modules", [])
        
        backend_count = 0
        frontend_count = 0
        evidence = []
        
        for m in modules:
            role = m.get("role", "unknown").lower()
            if role == "backend":
                backend_count += 1
                evidence.append(f"Detected backend directory '{m.get('path')}' containing {len(m.get('technologies', []))} technologies.")
            elif role == "frontend":
                frontend_count += 1
                evidence.append(f"Detected frontend directory '{m.get('path')}' containing {len(m.get('technologies', []))} technologies.")
                
        tech_list = stack.get("backend", []) + stack.get("frontend", [])
        tech_lower = [t.lower() for t in tech_list]
        
        has_mongo = any(db.lower() == "mongodb" for db in stack.get("databases", []))
        if has_mongo: evidence.append("Detected MongoDB database driver.")
        
        has_react = "react" in tech_lower
        if has_react: evidence.append("Detected React frontend library.")
        
        has_express = "express" in tech_lower or "node.js" in tech_lower
        if has_express: evidence.append("Detected Express/Node.js backend framework.")
        
        has_fastapi = "fastapi" in tech_lower
        if has_fastapi: evidence.append("Detected FastAPI backend framework.")

        arch_type = "Unknown Architecture"
        confidence = 50
        reasoning = "Not enough data to determine the architecture."
        assessment = "Requires further manual review."

        if backend_count > 1:
            arch_type = "Microservices / Distributed System"
            confidence = 0
            reasoning = f"Detected {backend_count} distinct backend modules, suggesting a distributed architecture."
            assessment = "Highly scalable but introduces operational complexity and network overhead."
        elif has_mongo and has_react and has_express:
            arch_type = "MERN Stack Application"
            confidence = 0
            reasoning = "Detected MongoDB, Express/Node.js backend, and React frontend."
            assessment = "Modern full-stack architecture with a unified Javascript ecosystem."
        elif backend_count == 1 and frontend_count == 1:
            arch_type = "Client-Server Full Stack"
            confidence = 0
            reasoning = "Detected distinct frontend and backend module boundaries."
            assessment = "Clear separation of presentation and business logic layers."
        elif backend_count == 1 and frontend_count == 0:
            arch_type = "API Service"
            confidence = 0
            reasoning = "Detected backend framework without an accompanying frontend module."
            assessment = "Focused backend service, likely serving APIs to independent clients."
        elif backend_count == 0 and frontend_count == 1:
            arch_type = "Standalone Frontend (SPA)"
            confidence = 0
            reasoning = "Detected frontend framework without backend services."
            assessment = "Standalone UI application relying on external or serverless APIs."
        elif len(modules) == 1 and modules[0].get("path") == "root":
            arch_type = "Monolithic Architecture"
            confidence = 0
            reasoning = "All code and manifests are located at the repository root without modular boundaries."
            assessment = "Simple to develop and deploy, but may become difficult to maintain as the codebase grows."

        if not evidence:
            evidence.append("No explicit framework manifests found.")

        return {
            "architecture_type": arch_type,
            "confidence": confidence,
            "reasoning": reasoning,
            "assessment": assessment,
            "evidence": evidence
        }

    @classmethod
    def evaluate_maturity(cls, repo: Repository) -> Dict[str, Any]:
        doc_score = repo.documentation_profile.get("completeness_score", 0) if repo.documentation_profile else 0
        build_result = repo.build_result or {}
        build_success = build_result.get("build_success", False)
        
        has_docker = False
        if repo.analyses and repo.analyses[0].findings:
            has_docker = repo.analyses[0].findings.get("reproducibility_factors", {}).get("has_dockerfile", False)
        
        details = {}
        if repo.analyses and repo.analyses[0].findings:
            details = repo.analyses[0].findings.get("survivability_details", {}).get("raw_stats", {})
            
        tags = details.get("tags_count", 0)
        contributors = details.get("total_contributors", 1)
        days_ago = details.get("last_commit_days_ago", 365)

        dim_doc = doc_score
        dim_deploy = 100 if build_success and has_docker else (50 if build_success else 0)
        dim_release = min(tags * 10, 100)
        dim_community = min(contributors * 20, 100)
        dim_maint = max(0, 100 - (days_ago / 3.65))

        avg = (dim_doc + dim_deploy + dim_release + dim_community + dim_maint) / 5

        if avg >= 80:
            classification = "Enterprise Grade"
            reasoning = "Excellent documentation, containerized deployments, active community, and structured releases."
        elif avg >= 60:
            classification = "Production Ready"
            reasoning = "Solid foundation with working builds and reasonable maintenance, but minor gaps exist."
        elif avg >= 40:
            classification = "Intermediate"
            reasoning = "Core logic is present, but lacks robust release management, testing, or broad community support."
        elif avg >= 20:
            classification = "Early Stage"
            reasoning = "Project is actively developed but missing critical production safeguards (docs, CI, releases)."
        else:
            classification = "Prototype / Experimental"
            reasoning = "Basic code structure without standard packaging, documentation, or release workflows."

        return {
            "classification": classification,
            "score": round(avg, 1),
            "reasoning": reasoning,
            "dimensions": {
                "documentation": round(dim_doc),
                "deployment": round(dim_deploy),
                "release_management": round(dim_release),
                "community": round(dim_community),
                "maintenance": round(dim_maint)
            }
        }

    @classmethod
    def evaluate_deployment_readiness(cls, repo: Repository) -> Dict[str, Any]:
        score = 0
        recs = []
        
        build = repo.build_result or {}
        if build.get("build_success"):
            score += 40
        else:
            recs.append("Fix failing build compilation to enable deployment.")
            
        has_docker = False
        if repo.analyses and repo.analyses[0].findings:
            has_docker = repo.analyses[0].findings.get("reproducibility_factors", {}).get("has_dockerfile", False)
            
        if has_docker:
            score += 30
        else:
            recs.append("Add a Dockerfile to standardize the deployment environment.")
            
        env_profile = repo.environment_profile or {}
        vars_list = env_profile.get("variables", [])
        missing = sum(1 for v in vars_list if v.get("is_missing_from_template"))
        if len(vars_list) == 0:
            score += 5
        elif missing == 0:
            score += 15
        else:
            score += 5
            recs.append(f"Document {missing} missing environment variables in a .env.example file.")
            
        dep_profile = repo.dependencies_profile or {}
        report = dep_profile.get("report", {})
        unpinned = len(report.get("missing_versions", []))
        if unpinned == 0:
            score += 15
        elif unpinned <= 5:
            score += 10
            recs.append("Pin minor dependency versions to ensure deterministic deployments.")
        else:
            recs.append(f"Pin {unpinned} unpinned dependencies to prevent production drift.")

        if score >= 80:
            status = "Ready for Deployment"
        elif score >= 50:
            status = "Needs Minor Configuration"
        else:
            status = "Not Ready for Deployment"

        if not recs and status == "Ready for Deployment":
            recs.append("Maintain current containerization and pinning standards.")

        return {
            "deployment_readiness_score": score,
            "status": status,
            "recommendations": recs
        }

    @classmethod
    def generate_execution_guide(cls, repo: Repository) -> Dict[str, Any]:
        import os
        import json
        
        stack = repo.detected_stack or {}
        modules = stack.get("modules", [])
        env_profile = repo.environment_profile or {}
        local_path = repo.local_path
        
        clone_url = repo.clone_url or "https://github.com/unknown/unknown.git"
        
        steps = []
        step_counter = 1
        
        def add_step(title, command, desc=""):
            nonlocal step_counter
            steps.append({
                "step": step_counter,
                "title": title,
                "command": command,
                "description": desc
            })
            step_counter += 1

        add_step("Clone Repository", f"git clone {clone_url}\ncd {repo.name}")
        
        template_files = env_profile.get("template_files_found", [])
        vars_list = env_profile.get("variables", [])
        
        if template_files:
            template = template_files[0]
            env_cmd = f"cp {template} .env\n# Edit .env and configure"
            add_step("Environment Setup", env_cmd, f"Copy the {template} file and configure required variables.")
        elif vars_list and len(vars_list) > 3:
            # Only suggest touching a .env file if there are many variables indicating heavy environment usage
            required = [str(v.get("name")) for v in vars_list if v.get("name")]
            if required:
                env_cmd = f"touch .env\n# Edit .env and configure:\n# " + "\n# ".join(required[:5])
                if len(required) > 5:
                    env_cmd += "\n# ... and others"
                add_step("Environment Setup", env_cmd, "Create the environment file and configure required variables.")
        if local_path and os.path.exists(os.path.join(local_path, "docker-compose.yml")):
            add_step("Start Infrastructure", "docker-compose up -d", "Start required databases and services.")
            
        backend_modules = [m for m in modules if m.get("role") == "backend" or m.get("path") == "root"]
        frontend_modules = [m for m in modules if m.get("role") == "frontend"]
        
        def process_module(m, is_backend):
            role_name = "Backend" if is_backend else "Frontend"
            rel_path = m.get("path", "root")
            cd_cmd = f"cd {rel_path}\n" if rel_path != "root" else ""
            
            install_cmds = []
            start_cmds = []
            
            if local_path:
                mod_path = os.path.join(local_path, rel_path) if rel_path != "root" else local_path
                
                pj_path = os.path.join(mod_path, "package.json")
                if os.path.exists(pj_path):
                    install_cmds.append("npm install")
                    try:
                        with open(pj_path, "r", encoding="utf-8") as f:
                            pj = json.load(f)
                            scripts = pj.get("scripts", {})
                            if "dev" in scripts:
                                start_cmds.append("npm run dev")
                            elif "start" in scripts:
                                start_cmds.append("npm start")
                            elif "vite" in scripts.values():
                                start_cmds.append("npm run dev")
                            elif "next dev" in scripts.values():
                                start_cmds.append("npm run dev")
                            else:
                                start_cmds.append("npm start")
                    except Exception as e:
                        logger.error(f"Failed to parse package.json: {e}")
                        start_cmds.append("npm run dev")
                        
                req_path = os.path.join(mod_path, "requirements.txt")
                pyproj_path = os.path.join(mod_path, "pyproject.toml")
                is_python = False
                
                if os.path.exists(req_path):
                    install_cmds.append("pip install -r requirements.txt")
                    is_python = True
                    try:
                        with open(req_path, "r", encoding="utf-8") as f:
                            content = f.read().lower()
                            if "fastapi" in content: start_cmds.append("uvicorn main:app --reload")
                            elif "django" in content: start_cmds.append("python manage.py runserver")
                            elif "flask" in content: start_cmds.append("flask run")
                    except Exception:
                        pass
                
                if os.path.exists(pyproj_path) and not is_python:
                    install_cmds.append("pip install .")
                    is_python = True
                    try:
                        with open(pyproj_path, "r", encoding="utf-8") as f:
                            content = f.read().lower()
                            if "fastapi" in content: start_cmds.append("uvicorn main:app --reload")
                            elif "django" in content: start_cmds.append("python manage.py runserver")
                            elif "flask" in content: start_cmds.append("flask run")
                    except Exception:
                        pass
                
                if is_python and not start_cmds:
                    start_cmds.append("python main.py")
                    
                pom_path = os.path.join(mod_path, "pom.xml")
                gradle_path = os.path.join(mod_path, "build.gradle")
                if os.path.exists(pom_path):
                    install_cmds.append("mvn clean install")
                    start_cmds.append("mvn spring-boot:run")
                elif os.path.exists(gradle_path):
                    install_cmds.append("gradle build")
                    start_cmds.append("gradle run")
                    
                go_path = os.path.join(mod_path, "go.mod")
                if os.path.exists(go_path):
                    install_cmds.append("go mod tidy")
                    start_cmds.append("go run main.go")
                    
                cargo_path = os.path.join(mod_path, "Cargo.toml")
                if os.path.exists(cargo_path):
                    install_cmds.append("cargo build")
                    start_cmds.append("cargo run")

            if not install_cmds and not start_cmds:
                tech_lower = [t.lower() for t in m.get("technologies", [])]
                if "node.js" in tech_lower or "react" in tech_lower:
                    install_cmds.append("npm install")
                    start_cmds.append("npm run dev")
                elif "python" in tech_lower:
                    install_cmds.append("pip install -r requirements.txt")
                    start_cmds.append("uvicorn main:app --reload" if "fastapi" in tech_lower else "python main.py")
            
            install_cmd_str = cd_cmd + "\n".join(install_cmds)
            start_cmd_str = cd_cmd + "\n".join(start_cmds)
            
            if install_cmds:
                add_step(f"Install {role_name} Dependencies", install_cmd_str.strip())
            if start_cmds:
                add_step(f"Start {role_name}", start_cmd_str.strip())

        for m in backend_modules:
            process_module(m, is_backend=True)
            
        for m in frontend_modules:
            process_module(m, is_backend=False)
            
        if len(steps) <= 2:
            add_step("Fallback Setup", "cd src\nnpm install\nnpm run dev", "Could not perfectly identify framework. Assuming Node.js generic setup.")

        return {
            "steps": steps
        }

    @classmethod
    def analyze_dependency_criticality(cls, repo: Repository) -> Dict[str, Any]:
        dep_profile = repo.dependencies_profile or {}
        deps = dep_profile.get("dependencies", [])
        
        critical_deps = []
        for d in deps:
            name = d.get("name", "")
            if not name:
                continue
                
            name_lower = name.lower()
            risk_level = "Low"
            criticality = "Medium"
            purpose = "Application Library"
            rec = "Keep updated."
            impact = "Minor feature degradation"
            
            if "react" in name_lower or "vue" in name_lower or "angular" in name_lower or "next" in name_lower or "express" in name_lower or "fastapi" in name_lower or "django" in name_lower or "flask" in name_lower or "spring" in name_lower:
                criticality = "High"
                purpose = "Core Framework"
                impact = "Complete application failure"
                
            if "mongoose" in name_lower or "pg" in name_lower or "sqlalchemy" in name_lower or "mysql" in name_lower or "redis" in name_lower or "prisma" in name_lower:
                criticality = "High"
                purpose = "Database ORM / Driver"
                impact = "Inability to query database, critical failure"
                
            if "jwt" in name_lower or "auth" in name_lower or "crypto" in name_lower or "bcrypt" in name_lower or "passport" in name_lower:
                criticality = "High"
                purpose = "Security / Authentication"
                impact = "Security vulnerabilities, inability to login"
                
            if "webpack" in name_lower or "vite" in name_lower or "babel" in name_lower or "eslint" in name_lower or "typescript" in name_lower:
                criticality = "Medium"
                purpose = "Build Tooling"
                impact = "Cannot build or deploy the application"
                
            is_unpinned = d.get("version") in ("*", "latest", "unspecified", None)
            if is_unpinned and criticality == "High":
                risk_level = "High"
                rec = "CRITICAL: Pin version to avoid production drift."
            elif is_unpinned:
                risk_level = "Medium"
                rec = "Pin version for deterministic builds."
                
            if criticality == "High":
                critical_deps.append({
                    "name": name,
                    "version": d.get("version", "unknown"),
                    "purpose": purpose,
                    "criticality": criticality,
                    "risk": risk_level,
                    "impact_if_removed": impact,
                    "recommendation": rec
                })
                
        critical_deps = sorted(critical_deps, key=lambda x: (x["risk"] == "High", x["criticality"] == "High"), reverse=True)[:8]

        return {
            "summary": f"Analyzed {len(deps)} total dependencies. Identified {len(critical_deps)} highly critical components.",
            "top_critical_dependencies": critical_deps
        }

    @classmethod
    def evaluate_environment_intelligence(cls, repo: Repository) -> Dict[str, Any]:
        env_profile = repo.environment_profile or {}
        vars_list = env_profile.get("variables", [])
        
        required_vars = []
        missing_vars = []
        
        for v in vars_list:
            if v.get("is_missing_from_template"):
                missing_vars.append(v.get("key"))
            else:
                required_vars.append(v.get("key"))
                
        total = len(vars_list)
        missing_count = len(missing_vars)
        completeness = 100 if total == 0 else round(((total - missing_count) / total) * 100, 1)
        
        if total == 0:
            quality = "N/A"
        elif completeness == 100:
            quality = "Excellent"
        elif completeness >= 70:
            quality = "Good"
        elif completeness >= 40:
            quality = "Poor"
        else:
            quality = "Critical Deficit"
            
        return {
            "required_variables": required_vars,
            "missing_variables": missing_vars,
            "completeness_percentage": completeness,
            "template_quality": quality
        }


    @classmethod
    def generate_repository_reasoning(cls, repo) -> dict:
        strengths = []
        weaknesses = []
        risks = []
        observations = []
        
        # Build
        build = repo.build_result or {}
        if build.get("build_success"):
            strengths.append("Build executes successfully out-of-the-box.")
        else:
            weaknesses.append("Build compilation is currently failing.")
            risks.append("Unable to deploy or execute the application due to build failure.")
            
        # Docker
        has_docker = False
        if repo.analyses and repo.analyses[0].findings:
            has_docker = repo.analyses[0].findings.get("reproducibility_factors", {}).get("has_dockerfile", False)
        if has_docker:
            strengths.append("Containerized execution environment is provided (Dockerfile/Compose).")
        else:
            weaknesses.append("No containerization found, relying on local host environment.")
            
        # Env
        env_profile = repo.environment_profile or {}
        vars_list = env_profile.get("variables", [])
        missing_vars = sum(1 for v in vars_list if v.get("is_missing_from_template"))
        if vars_list and missing_vars == 0:
            strengths.append("Environment variables are fully documented in templates.")
        elif missing_vars > 0:
            weaknesses.append(f"{missing_vars} undocumented environment variables found in code.")
            risks.append("Hidden environment variables may cause unexpected runtime crashes.")
            
        # Deps
        dep_profile = repo.dependencies_profile or {}
        report = dep_profile.get("report", {})
        unpinned = len(report.get("missing_versions", []))
        if unpinned > 0:
            risks.append(f"{unpinned} unpinned dependencies could introduce breaking changes unexpectedly.")
            
        # Docs
        doc_score = repo.documentation_profile.get("completeness_score", 0) if repo.documentation_profile else 0
        if doc_score >= 80:
            strengths.append("Comprehensive documentation and setup instructions provided.")
        elif doc_score < 40:
            weaknesses.append("Documentation is sparse or missing critical setup instructions.")
            
        observations.append(f"Repository utilizes {len(vars_list)} environment variables.")
        if repo.detected_stack:
            backend = repo.detected_stack.get("backend", [])
            frontend = repo.detected_stack.get("frontend", [])
            tech_names = []
            for module in backend + frontend:
                if isinstance(module, dict):
                    tech_names.extend(module.get("technologies", []))
            if tech_names:
                observations.append(f"Core technology stack includes: {', '.join(tech_names[:3])}.")

        # Fallbacks
        if not strengths: strengths.append("No notable architectural strengths detected.")
        if not weaknesses: weaknesses.append("No immediate structural weaknesses detected.")
        if not risks: risks.append("No critical operational risks detected.")
        
        return {
            "strengths": strengths,
            "weaknesses": weaknesses,
            "risks": risks,
            "observations": observations
        }

    @classmethod
    def generate_repository_grade(cls, repo, repro_score: float = None, surv_score: float = None) -> dict:
        if repro_score is None or surv_score is None:
            if not repo.analyses:
                return {"grade": "N/A", "explanation": "Repository has not been analyzed."}
            analysis = repo.analyses[0]
            repro = analysis.reproducibility_score or 0
            surv = analysis.survivability_score or 0
        else:
            repro = repro_score
            surv = surv_score
            
        score = (repro + surv) / 2
        
        if score >= 90:
            grade = "A+"
            explanation = "Exceptional repository. Outstanding documentation, robust containerization, highly active maintenance, and perfect dependency health."
        elif score >= 80:
            grade = "A"
            explanation = "Excellent repository. Production-ready with solid documentation and reliable build pipelines, minor improvements possible."
        elif score >= 75:
            grade = "B+"
            explanation = "Very good repository. Reliable architecture and build, but may have minor gaps in environment documentation or recent maintenance."
        elif score >= 65:
            grade = "B"
            explanation = "Good repository. Usable and structurally sound, but showing signs of technical debt or missing containerization."
        elif score >= 55:
            grade = "C+"
            explanation = "Average repository. Requires some manual effort to reproduce locally, and maintenance activity is slowing down."
        elif score >= 45:
            grade = "C"
            explanation = "Below average repository. Missing critical setup documentation, failing builds, or significant undocumented environment variables."
        elif score >= 35:
            grade = "D"
            explanation = "Poor repository. Extremely difficult to reproduce, highly dormant, with critical dependency risks."
        else:
            grade = "F"
            explanation = "Failing repository. Abandoned, unbuildable, and poses extreme operational risks if deployed."
            
        breakdown = {
            "reproducibility": {
                "score": repro,
                "weight": 50,
                "components": [
                    {"name": "Build Validation", "impact": "High", "description": "Successful containerized build process"},
                    {"name": "Execution Guide", "impact": "Medium", "description": "Automated startup command detection"}
                ]
            },
            "survivability": {
                "score": surv,
                "weight": 50,
                "components": [
                    {"name": "Dependency Health", "impact": "High", "description": "Version pinning and security profile"},
                    {"name": "Environment Quality", "impact": "Medium", "description": "Template completeness and variables"},
                    {"name": "Documentation", "impact": "Medium", "description": "Setup instruction availability"}
                ]
            }
        }
            
        return {
            "grade": grade,
            "explanation": explanation,
            "breakdown": breakdown
        }

intelligence_service = IntelligenceService()
