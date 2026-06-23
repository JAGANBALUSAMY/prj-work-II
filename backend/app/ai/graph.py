import logging
from uuid import UUID
from datetime import datetime, timedelta
from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, END

from app.core.database import AsyncSessionLocal
from app.repositories.repo_repo import repository_repo
from app.repositories.analysis_repo import analysis_repo
from app.services.repo_service import repo_service
from app.services.stack_service import stack_service
from app.services.dependency_service import dependency_service
from app.services.environment_service import environment_service
from app.services.documentation_service import documentation_service
from app.services.vector_service import vector_service
from app.services.build_validation_service import build_validation_service
from app.services.failure_rag_service import failure_rag_service
from app.services.health_prediction_service import health_prediction_service
from app.services.intelligence_service import intelligence_service
from app.services.vulnerability_service import vulnerability_service

logger = logging.getLogger(__name__)

class AnalysisState(TypedDict):
    """
    State tracking schema for the repository analysis pipeline.
    """
    clone_url: str
    repository_id: str
    local_path: str
    status: str
    reproducibility_score: float
    survivability_score: float
    summary: str
    findings: Dict[str, Any]
    logs: List[str]
    ai_documentation: Dict[str, Any]
    ai_dependency: Dict[str, Any]
    ai_summary: Dict[str, Any]
    build_result: Dict[str, Any]
    failure_diagnosis: Dict[str, Any]
    ai_recommendation: Dict[str, Any]

# --- Node Implementations ---

async def repository_acquisition_node(state: AnalysisState) -> Dict[str, Any]:
    """
    Node 1: Clones the repository locally and fetches metadata from GitHub.
    """
    logs = state.get("logs", [])
    logs.append("Node [repository_acquisition]: Initiating repository clone and metadata acquisition...")
    
    repo_id = UUID(state["repository_id"])
    clone_url = state["clone_url"]
    
    async with AsyncSessionLocal() as db:
        try:
            await repo_service.acquire_repository(db, clone_url, str(repo_id))
            repo = await repository_repo.get(db, repo_id)
            if repo and repo.status == "cloned":
                logs.append(f"Node [repository_acquisition]: Repository cloned successfully to {repo.local_path}")
                return {
                    "local_path": repo.local_path,
                    "status": "cloned",
                    "logs": logs
                }
            else:
                logs.append("Node [repository_acquisition]: Repository acquisition failed.")
                return {
                    "status": "failed",
                    "logs": logs
                }
        except Exception as e:
            logs.append(f"Node [repository_acquisition]: Exception occurred: {str(e)}")
            return {
                "status": "failed",
                "logs": logs
            }

async def technology_discovery_node(state: AnalysisState) -> Dict[str, Any]:
    """
    Node 2: Discovers the backend/frontend technology stack, databases, and configuration markers.
    """
    logs = state.get("logs", [])
    if state.get("status") != "cloned":
        logs.append("Node [technology_discovery]: Skipped (Repository not cloned).")
        return {"logs": logs}
        
    logs.append("Node [technology_discovery]: Running technology discovery scanner...")
    repo_id = UUID(state["repository_id"])
    
    async with AsyncSessionLocal() as db:
        try:
            profile = await stack_service.discover_stack(db, repo_id)
            backend_techs = ", ".join(profile.get("backend", []))
            frontend_techs = ", ".join(profile.get("frontend", []))
            logs.append(f"Node [technology_discovery]: Discovered technologies (Backend: [{backend_techs}], Frontend: [{frontend_techs}]).")
            return {"logs": logs}
        except Exception as e:
            logs.append(f"Node [technology_discovery]: Exception occurred: {str(e)}")
            return {"logs": logs}

async def dependency_analysis_node(state: AnalysisState) -> Dict[str, Any]:
    """
    Node 3: Scans configuration files (package.json, requirements.txt, etc.) and lists dependencies.
    """
    logs = state.get("logs", [])
    if state.get("status") != "cloned":
        logs.append("Node [dependency_analysis]: Skipped (Repository not cloned).")
        return {"logs": logs}
        
    logs.append("Node [dependency_analysis]: Running dependency intelligence scanner...")
    repo_id = UUID(state["repository_id"])
    
    async with AsyncSessionLocal() as db:
        try:
            await dependency_service.analyze_dependencies(db, repo_id)
            repo = await repository_repo.get(db, repo_id)
            # Index dependency report into vector store
            await vector_service.index_dependency_report(repo)
            
            report = repo.dependencies_profile.get("report", {})
            logs.append(f"Node [dependency_analysis]: Scanned {report.get('total_count', 0)} packages. Found {len(report.get('duplicates', []))} duplicates.")
            return {"logs": logs}
        except Exception as e:
            logs.append(f"Node [dependency_analysis]: Exception occurred: {str(e)}")
            return {"logs": logs}

async def environment_reconstruction_node(state: AnalysisState) -> Dict[str, Any]:
    """
    Node 4: Scans code files and template files to extract environment variables and discrepancies.
    """
    logs = state.get("logs", [])
    if state.get("status") != "cloned":
        logs.append("Node [environment_reconstruction]: Skipped (Repository not cloned).")
        return {"logs": logs}
        
    logs.append("Node [environment_reconstruction]: Running environment variables reconstruction agent...")
    repo_id = UUID(state["repository_id"])
    
    async with AsyncSessionLocal() as db:
        try:
            await environment_service.reconstruct_environment(db, repo_id)
            repo = await repository_repo.get(db, repo_id)
            # Index environment report into vector store
            await vector_service.index_environment_report(repo)
            
            profile = repo.environment_profile
            vars_list = profile.get("variables", [])
            undocumented = sum(1 for v in vars_list if v.get("is_missing_from_template"))
            logs.append(f"Node [environment_reconstruction]: Found {len(vars_list)} variables. Warnings: {undocumented} undocumented keys.")
            return {"logs": logs}
        except Exception as e:
            logs.append(f"Node [environment_reconstruction]: Exception occurred: {str(e)}")
            return {"logs": logs}

async def documentation_analysis_node(state: AnalysisState) -> Dict[str, Any]:
    """
    Node 5: Reads project README.md to score documentation completeness across onboarding categories.
    """
    logs = state.get("logs", [])
    if state.get("status") != "cloned":
        logs.append("Node [documentation_analysis]: Skipped (Repository not cloned).")
        return {"logs": logs}
        
    logs.append("Node [documentation_analysis]: Running documentation intelligence agent...")
    repo_id = UUID(state["repository_id"])
    
    async with AsyncSessionLocal() as db:
        try:
            await documentation_service.analyze_documentation(db, repo_id)
            repo = await repository_repo.get(db, repo_id)
            # Index documentation report into vector store
            await vector_service.index_documentation_report(repo)
            
            profile = repo.documentation_profile
            logs.append(f"Node [documentation_analysis]: README analyzed. Score: {profile.get('completeness_score', 0)}%.")
            return {"logs": logs}
        except Exception as e:
            logs.append(f"Node [documentation_analysis]: Exception occurred: {str(e)}")
            return {"logs": logs}

async def vulnerability_analysis_node(state: AnalysisState) -> Dict[str, Any]:
    """
    Node 5.5: Analyzes vulnerabilities using external security scanners (npm audit, pip-audit, etc.)
    """
    logs = state.get("logs", [])
    if state.get("status") != "cloned":
        logs.append("Node [vulnerability_analysis]: Skipped (Repository not cloned).")
        return {"logs": logs}
        
    logs.append("Node [vulnerability_analysis]: Running vulnerability intelligence scanner...")
    repo_id = UUID(state["repository_id"])
    
    async with AsyncSessionLocal() as db:
        try:
            profile = await vulnerability_service.analyze_vulnerabilities(db, repo_id)
            logs.append(f"Node [vulnerability_analysis]: Scan complete. Score: {profile.get('security_score', 0)}/100, Total Vulns: {profile.get('total_vulnerabilities', 0)}")
            return {"logs": logs}
        except Exception as e:
            logs.append(f"Node [vulnerability_analysis]: Exception occurred: {str(e)}")
            return {"logs": logs}

def get_git_metrics(local_path: str) -> dict:
    import os
    import subprocess
    from datetime import datetime
    
    metrics = {
        "commit_count_1y": 0,
        "tags_count": 0,
        "total_contributors": 0,
        "active_contributors_90d": 0,
        "last_commit_days_ago": 365
    }
    if not local_path or not os.path.exists(local_path) or not os.path.exists(os.path.join(local_path, ".git")):
        return metrics
    
    try:
        # 1. Commit count in last 365 days
        res = subprocess.run(
            ["git", "rev-list", "--count", "--since=365 days ago", "HEAD"],
            cwd=local_path, capture_output=True, encoding="utf-8", errors="replace", check=True
        )
        metrics["commit_count_1y"] = int(res.stdout.strip())
    except Exception:
        pass
        
    try:
        # 2. Tags count
        res = subprocess.run(
            ["git", "tag"],
            cwd=local_path, capture_output=True, encoding="utf-8", errors="replace", check=True
        )
        tags = [t.strip() for t in res.stdout.split("\n") if t.strip()]
        metrics["tags_count"] = len(tags)
    except Exception:
        pass
        
    try:
        # 3. Contributors
        res = subprocess.run(
            ["git", "log", "--format=%ae"],
            cwd=local_path, capture_output=True, encoding="utf-8", errors="replace", check=True
        )
        emails = [e.strip() for e in res.stdout.split("\n") if e.strip()]
        metrics["total_contributors"] = len(set(emails))
    except Exception:
        pass
        
    try:
        # 4. Active contributors in last 90 days
        res = subprocess.run(
            ["git", "log", "--since=90 days ago", "--format=%ae"],
            cwd=local_path, capture_output=True, encoding="utf-8", errors="replace", check=True
        )
        active_emails = [e.strip() for e in res.stdout.split("\n") if e.strip()]
        metrics["active_contributors_90d"] = len(set(active_emails))
    except Exception:
        pass

    try:
        # 5. Last commit timestamp
        res = subprocess.run(
            ["git", "log", "-1", "--format=%ct"],
            cwd=local_path, capture_output=True, encoding="utf-8", errors="replace", check=True
        )
        timestamp = int(res.stdout.strip())
        last_date = datetime.fromtimestamp(timestamp)
        delta = datetime.now() - last_date
        metrics["last_commit_days_ago"] = max(0, delta.days)
    except Exception:
        pass
        
    return metrics

async def store_results_node(state: AnalysisState) -> Dict[str, Any]:
    """
    Node 6: Calculates reproducibility/survivability indices, indexes metadata, and saves DB records.
    """
    import os
    logs = state.get("logs", [])
    repo_id = UUID(state["repository_id"])
    
    if state.get("status") != "cloned":
        logs.append("Node [store_results]: Skipped final report compile (Repository acquisition failed).")
        return {
            "reproducibility_score": 0.0,
            "survivability_score": 0.0,
            "summary": "Analysis failed during repository clone or metadata acquisition phases.",
            "logs": logs
        }
        
    logs.append("Node [store_results]: Computing reproducibility and survivability metrics...")
    
    async with AsyncSessionLocal() as db:
        try:
            repo = await repository_repo.get(db, repo_id)
            
            # Save AI results to Repository JSONB columns
            ai_doc = state.get("ai_documentation")
            if ai_doc:
                doc_profile = dict(repo.documentation_profile) if repo.documentation_profile else {}
                doc_profile["ai_analysis"] = ai_doc
                await repository_repo.update(db, db_obj=repo, obj_in={"documentation_profile": doc_profile})
                
            ai_dep = state.get("ai_dependency")
            if ai_dep:
                dep_profile = dict(repo.dependencies_profile) if repo.dependencies_profile else {}
                dep_profile["ai_analysis"] = ai_dep
                await repository_repo.update(db, db_obj=repo, obj_in={"dependencies_profile": dep_profile})
                
            ai_sum = state.get("ai_summary")
            if ai_sum:
                stack_profile = dict(repo.detected_stack) if repo.detected_stack else {}
                stack_profile["ai_analysis"] = ai_sum
                await repository_repo.update(db, db_obj=repo, obj_in={"detected_stack": stack_profile})

            ai_rec = state.get("ai_recommendation")
            if ai_rec:
                diag = dict(repo.failure_diagnosis) if repo.failure_diagnosis else {}
                diag["ai_recommendation"] = ai_rec
                await repository_repo.update(db, db_obj=repo, obj_in={"failure_diagnosis": diag})

            # Re-fetch repo to get the latest updated profile fields for indexing
            repo = await repository_repo.get(db, repo_id)
            
            # Index metadata in vector DB
            await vector_service.index_repository_metadata(repo)
            
            # --- Redesigned Reproducibility Scoring Logic ---
            # Maximum Score: 100
            
            # 1. Build Validation (Max 30)
            build_score = 0.0
            build_reason = "No successful build process detected."
            if repo.build_result and repo.build_result.get("build_success"):
                build_score = 30.0
                build_reason = "Docker container built successfully without errors."
            elif repo.build_result and "build_maturity_score" in repo.build_result:
                partial = repo.build_result.get("build_maturity_score", 0) * 0.15 # Max 15 if it fails but has setup
                build_score = partial
                build_reason = f"Build failed, but earned partial setup credit ({round(partial, 1)} pts)."
            elif repo.detected_stack:
                files = repo.detected_stack.get("scanned_files", [])
                if "Dockerfile" in files or "docker-compose.yml" in files:
                    build_score = 10.0
                    build_reason = "Build unvalidated, but Docker configuration files are present."
            
            # 2. Dependency Health (Max 15)
            dep_score = 0.0
            dep_reason = "No dependencies detected."
            if repo.dependencies_profile:
                deps_list = repo.dependencies_profile.get("dependencies", [])
                if deps_list:
                    pinned_ratio = sum(1 for d in deps_list if d.get("version") and d.get("version") not in ("*", "latest", "unspecified")) / len(deps_list)
                    dep_score = 15.0 * pinned_ratio
                    dep_reason = f"{round(pinned_ratio*100)}% of {len(deps_list)} dependencies are explicitly pinned."
                else:
                    dep_reason = "Dependency parsing failed or no recognizable manifest."
            
            # 3. Environment Completeness (Max 15)
            env_score = 0.0
            env_reason = "No environment templates or variables detected."
            if repo.environment_profile:
                vars_list = repo.environment_profile.get("variables", [])
                if vars_list:
                    # Score based on how many have default/example values mapped
                    has_defaults = sum(1 for v in vars_list if v.get("has_default") or v.get("example_value"))
                    env_score = min(15.0, 5.0 + (10.0 * (has_defaults / len(vars_list))))
                    env_reason = f"Detected {len(vars_list)} configuration keys; {has_defaults} have example defaults provided."
            
            # 4. Documentation Quality (Max 15)
            docs_score = 0.0
            docs_reason = "No documentation found."
            completeness = 0
            if repo.documentation_profile and repo.documentation_profile.get("scanned_file"):
                completeness = repo.documentation_profile.get("completeness_score", 0)
                docs_score = 15.0 * (completeness / 100.0)
                docs_reason = f"README completeness evaluated at {completeness}%."
            
            # 5. Execution Guide Quality (Max 10)
            exec_score = 0.0
            exec_reason = "Execution guide generation incomplete."
            # Since AI recommendation nodes update 'state', we extract it from there
            ai_rec = state.get("ai_recommendation", {})
            if ai_rec:
                # If we have a recommendation, assume we have enough context to run it
                exec_score = 10.0
                exec_reason = "AI-generated execution path and run instructions are fully articulated."
            elif repo.documentation_profile and repo.documentation_profile.get("scanned_file"):
                # Fallback to whether docs have install instructions
                exec_score = 5.0
                exec_reason = "Partial execution clarity derived from README."
                
            # 6. Security Health (Max 15)
            sec_score = 15.0
            sec_reason = "No critical vulnerabilities detected."
            if repo.vulnerability_profile:
                vulns = repo.vulnerability_profile.get("vulnerabilities", [])
                if vulns:
                    high_critical = sum(1 for v in vulns if v.get("severity", "").upper() in ("HIGH", "CRITICAL"))
                    if high_critical > 0:
                        sec_score = max(0.0, 15.0 - (high_critical * 5))
                        sec_reason = f"Penalized due to {high_critical} High/Critical CVEs."
                    else:
                        sec_score = 15.0
                        sec_reason = f"Detected {len(vulns)} minor vulnerabilities, acceptable security health."
            elif repo.dependencies_profile:
                report = repo.dependencies_profile.get("report", {})
                num_susp = len(report.get("suspicious_declarations", []))
                if num_susp > 0:
                    sec_score = max(0.0, 15.0 - (num_susp * 5))
                    sec_reason = f"Penalized due to {num_susp} suspicious/unpinned declarations."

            rep_score = round(build_score + dep_score + env_score + docs_score + exec_score + sec_score, 1)
            
            reproducibility_breakdown = [
                {"category": "Build Validation", "score": round(build_score, 1), "max": 30.0, "reason": build_reason},
                {"category": "Dependency Health", "score": round(dep_score, 1), "max": 15.0, "reason": dep_reason},
                {"category": "Environment Completeness", "score": round(env_score, 1), "max": 15.0, "reason": env_reason},
                {"category": "Documentation Quality", "score": round(docs_score, 1), "max": 15.0, "reason": docs_reason},
                {"category": "Execution Guide Quality", "score": round(exec_score, 1), "max": 10.0, "reason": exec_reason},
                {"category": "Security Health", "score": round(sec_score, 1), "max": 15.0, "reason": sec_reason}
            ]
            
            # --- Upgraded Survivability Scoring Logic ---
            # 1. Run git metrics scan
            git_metrics = get_git_metrics(repo.local_path)
            days_ago = git_metrics["last_commit_days_ago"]
            commit_count = git_metrics["commit_count_1y"]
            tags_count = git_metrics["tags_count"]
            total_contribs = git_metrics["total_contributors"]
            active_contribs = git_metrics["active_contributors_90d"]
            open_issues = repo.open_issues or 0
            stars = repo.stars or 0
            forks = repo.forks or 0
            
            surv_breakdown = []
            
            # A. Commit Frequency (Max 20.0)
            cf_score = 0.0
            cf_reason = ""
            if days_ago < 30:
                cf_score = 20.0
                cf_reason = f"Excellent momentum: Last commit was {days_ago} days ago."
            elif days_ago < 90:
                cf_score = 16.0
                cf_reason = f"Healthy activity: Last commit was {days_ago} days ago."
            elif days_ago < 180:
                cf_score = 12.0
                cf_reason = f"Slowing activity: Last commit was {days_ago} days ago."
            elif days_ago < 365:
                cf_score = 8.0
                cf_reason = f"Stale: Last commit was {days_ago} days ago."
            else:
                cf_score = 3.0
                cf_reason = f"Dormant: No commits in over {days_ago} days."
                
            surv_breakdown.append({
                "category": "Commit Frequency",
                "score": round(cf_score, 1),
                "max": 20.0,
                "reason": cf_reason
            })
            
            # B. Contributor Activity (Max 20.0)
            ca_score = 0.0
            ca_reason = ""
            if active_contribs >= 3:
                ca_score = 20.0
                ca_reason = f"Robust team: {active_contribs} active contributors in the last 90 days."
            elif active_contribs >= 1:
                ca_score = 16.0
                ca_reason = f"Maintained: {active_contribs} active contributors in the last 90 days."
            elif total_contribs >= 5:
                ca_score = 12.0
                ca_reason = f"Historically active: {total_contribs} total contributors, but none active recently."
            elif total_contribs >= 2:
                ca_score = 8.0
                ca_reason = f"Small historical team: {total_contribs} total contributors."
            else:
                ca_score = 4.0
                ca_reason = f"Single contributor project: High bus factor risk."

            surv_breakdown.append({
                "category": "Contributor Activity",
                "score": round(ca_score, 1),
                "max": 20.0,
                "reason": ca_reason
            })
            
            # C. Repository Popularity (Max 15.0)
            rp_score = 0.0
            rp_reason = ""
            popularity = stars + forks * 2
            if popularity > 500:
                rp_score = 15.0
                rp_reason = f"Highly popular: {stars} stars, {forks} forks."
            elif popularity > 100:
                rp_score = 12.0
                rp_reason = f"Recognized: {stars} stars, {forks} forks."
            elif popularity > 20:
                rp_score = 8.0
                rp_reason = f"Growing: {stars} stars, {forks} forks."
            elif popularity > 0:
                rp_score = 4.0
                rp_reason = f"Niche: {stars} stars, {forks} forks."
            else:
                rp_score = 0.0
                rp_reason = "No notable community popularity."

            surv_breakdown.append({
                "category": "Repository Popularity",
                "score": round(rp_score, 1),
                "max": 15.0,
                "reason": rp_reason
            })

            # D. Security Health (Max 15.0)
            sh_score = 15.0
            sh_reason = "Acceptable security posture."
            num_susp = 0
            num_dups = 0
            num_unpinned = 0
            if repo.dependencies_profile:
                report = repo.dependencies_profile.get("report", {})
                num_susp = len(report.get("suspicious_declarations", []))
                num_dups = len(report.get("duplicates", []))
                num_unpinned = len(report.get("missing_versions", []))
                
            sh_score -= min(6.0, num_susp * 3.0)
            sh_score -= min(4.0, num_dups * 1.0)
            sh_score -= min(5.0, num_unpinned * 1.0)
            
            build_failed = False
            if repo.build_result and not repo.build_result.get("build_success"):
                build_failed = True
                sh_score -= 5.0
                
            sh_score = max(0.0, sh_score)
            
            if sh_score == 15.0:
                sh_reason = "No critical vulnerabilities or suspicious dependencies."
            elif sh_score > 8.0:
                sh_reason = f"Minor risks detected: {num_susp} suspicious, {num_unpinned} unpinned."
            else:
                sh_reason = f"High risk: {num_susp} suspicious, {num_unpinned} unpinned, {build_failed and 'build failure' or ''}."

            surv_breakdown.append({
                "category": "Security Health",
                "score": round(sh_score, 1),
                "max": 15.0,
                "reason": sh_reason
            })

            # E. Dependency Freshness (Max 10.0)
            df_score = 0.0
            df_reason = ""
            total_deps = 0
            pinned_deps = 0
            if repo.dependencies_profile:
                deps_list = repo.dependencies_profile.get("dependencies", [])
                total_deps = len(deps_list)
                pinned_deps = sum(1 for d in deps_list if d.get("version") and d.get("version") not in ("*", "latest", "unspecified"))
            
            if total_deps > 0:
                pin_ratio = pinned_deps / total_deps
                df_score = pin_ratio * 10.0
                # Apply decay based on inactivity
                if days_ago < 90:
                    decay = 1.0
                elif days_ago < 180:
                    decay = 0.8
                elif days_ago < 365:
                    decay = 0.6
                else:
                    decay = 0.4
                df_score = df_score * decay
                df_reason = f"{round(pin_ratio*100)}% pinned deps. Activity decay multiplier: {decay}x."
            else:
                df_score = 7.5
                df_reason = "No dependencies detected to evaluate."

            surv_breakdown.append({
                "category": "Dependency Freshness",
                "score": round(df_score, 1),
                "max": 10.0,
                "reason": df_reason
            })

            # F. Release Frequency (Max 10.0)
            rf_score = 0.0
            rf_reason = ""
            if tags_count >= 10:
                rf_score = 10.0
                rf_reason = f"Frequent releases: {tags_count} tags cataloged."
            elif tags_count >= 5:
                rf_score = 8.5
                rf_reason = f"Steady releases: {tags_count} tags cataloged."
            elif tags_count >= 1:
                rf_score = 6.0
                rf_reason = f"Occasional releases: {tags_count} tags cataloged."
            else:
                rf_score = 2.5
                rf_reason = "No formal release versions or git tags cataloged."

            surv_breakdown.append({
                "category": "Release Frequency",
                "score": round(rf_score, 1),
                "max": 10.0,
                "reason": rf_reason
            })

            # G. Issue Resolution (Max 10.0)
            ir_score = 0.0
            ir_reason = ""
            if open_issues == 0:
                ir_score = 10.0
                ir_reason = "No open issues."
            else:
                res_ratio = 1.0 - (open_issues / (popularity + 5.0))
                res_ratio = max(0.2, min(1.0, res_ratio))
                ir_score = res_ratio * 10.0
                ir_reason = f"Ratio of {open_issues} open issues relative to repository popularity."

            surv_breakdown.append({
                "category": "Issue Resolution",
                "score": round(ir_score, 1),
                "max": 10.0,
                "reason": ir_reason
            })

            srv_score = round(cf_score + ca_score + rp_score + sh_score + df_score + rf_score + ir_score, 1)

            # Confidence Score Calculation
            # Higher confidence if we have history and active data.
            confidence_score = 0.0
            if days_ago < 365 and total_contribs > 0:
                confidence_score = 95.0
            elif days_ago >= 365:
                # Less confident predicting survivability for dormant repos based on current snapshot
                confidence_score = 80.0
            else:
                confidence_score = 65.0 # Very little data
                
            if not repo.dependencies_profile:
                confidence_score -= 15.0 # Less confidence without dep parsing
            if not repo.detected_stack:
                confidence_score -= 10.0

            # Determine Health Category
            if days_ago >= 365 and cf_score <= 5.0:
                health_category = "Dormant"
            elif srv_score >= 80:
                health_category = "Healthy"
            elif srv_score >= 60:
                health_category = "Moderate"
            elif srv_score >= 30:
                health_category = "At Risk"
            else:
                health_category = "Dormant"

            # Compute Risk Factors list
            risk_factors = []
            if days_ago >= 180:
                risk_factors.append(f"Inactivity: No commits in the last {days_ago} days.")
            if tags_count == 0:
                risk_factors.append("No release versions or git tags cataloged.")
            if total_contribs <= 1:
                risk_factors.append("Single contributor: High bus-factor / developer dependency.")
            if num_unpinned > 3:
                risk_factors.append(f"Environmental drift: Contains {num_unpinned} unpinned dependencies.")
            if num_susp > 0:
                risk_factors.append(f"Vulnerability risk: {num_susp} suspicious packages detected.")
            if build_failed:
                risk_factors.append("Build failure: Current codebase state fails containerized compilation.")
            if open_issues > 20 and open_issues / (stars + forks + 1) > 0.5:
                risk_factors.append(f"Maintenance backlog: {open_issues} open issues pending resolution.")

            rep_score = min(100.0, max(0.0, rep_score))
            
            # Repository Health Prediction
            # Update Survivability Factors dictionary
            survivability_factors = {
                "breakdown": surv_breakdown,
                "confidence_score": round(confidence_score, 1),
                "total_score": srv_score,
                "active_maintenance": days_ago < 90,
                "license_permissive": True,
                "dependency_health": "warnings" if (num_dups + num_susp) > 2 else "healthy"
            }
            
            survivability_details = {
                "health_category": health_category,
                "risk_factors": risk_factors,
                "raw_stats": {
                    "commit_count_1y": commit_count,
                    "tags_count": tags_count,
                    "total_contributors": total_contribs,
                    "active_contributors_90d": active_contribs,
                    "last_commit_days_ago": days_ago,
                    "open_issues": open_issues
                }
            }
            
            prediction_input_commits = {
                "last_commit_days_ago": days_ago,
                "commit_count_1y": commit_count
            }
            prediction_input_contributors = {
                "total_contributors": total_contribs,
                "active_contributors_90d": active_contribs
            }
            prediction_input_issue = {
                "open_issues": open_issues,
                "stars": stars,
                "forks": forks
            }
            prediction_input_releases = {
                "tags_count": tags_count
            }
            
            prediction = health_prediction_service.predict_health(
                commits=prediction_input_commits,
                contributors=prediction_input_contributors,
                dependency_freshness=df_score * 10.0,
                issue_activity=prediction_input_issue,
                releases=prediction_input_releases
            )

            summary = (
                f"Successfully parsed repository {repo.owner}/{repo.name}. "
                f"Technology stack uses: {', '.join(repo.detected_stack.get('backend', [])) if repo.detected_stack else 'None'}. "
                f"Onboarding score is {int(completeness)}% and environment scan listed {len(repo.environment_profile.get('variables', [])) if repo.environment_profile else 0} variables."
            )
            
            findings = {
                "reproducibility_factors": {
                    "breakdown": reproducibility_breakdown,
                    "total_score": rep_score
                },
                "survivability_factors": survivability_factors,
                "survivability_details": survivability_details,
                "health_prediction": prediction,
                "intelligence": {
                    "architecture": intelligence_service.evaluate_architecture(repo),
                    "maturity": intelligence_service.evaluate_maturity(repo),
                    "deployment_readiness": intelligence_service.evaluate_deployment_readiness(repo),
                    "execution_guide": intelligence_service.generate_execution_guide(repo),
                    "dependency_criticality": intelligence_service.analyze_dependency_criticality(repo),
                    "environment_intelligence": intelligence_service.evaluate_environment_intelligence(repo),
                    "repository_reasoning": intelligence_service.generate_repository_reasoning(repo),
                    "repository_grade": intelligence_service.generate_repository_grade(repo, repro_score=rep_score, surv_score=srv_score)
                }
            }
            
            logs.append("Node [store_results]: Execution trace finalized and saved.")
            
            return {
                "reproducibility_score": round(rep_score, 1),
                "survivability_score": round(srv_score, 1),
                "summary": summary,
                "findings": findings,
                "logs": logs
            }
            
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            logs.append(f"Node [store_results]: Exception occurred during metrics calculation: {str(e)}\n{tb}")
            return {
                "reproducibility_score": 0.0,
                "survivability_score": 0.0,
                "summary": f"Metrics compilation failed with error: {str(e)}",
                "logs": logs
            }

async def ai_documentation_node(state: AnalysisState) -> Dict[str, Any]:
    """
    Node 7: Runs AI Documentation Agent on README and scores.
    """
    logs = state.get("logs", [])
    if state.get("status") != "cloned":
        logs.append("Node [ai_documentation]: Skipped (Repository not cloned).")
        return {"logs": logs}
        
    logs.append("Node [ai_documentation]: Running AI Documentation Agent...")
    repo_id = UUID(state["repository_id"])
    
    async with AsyncSessionLocal() as db:
        try:
            repo = await repository_repo.get(db, repo_id)
            if not repo or not repo.documentation_profile:
                logs.append("Node [ai_documentation]: No documentation profile found.")
                return {"logs": logs}
                
            readme_preview = repo.documentation_profile.get("readme_preview", "")
            completeness_score = repo.documentation_profile.get("completeness_score", 0.0)
            sections = repo.documentation_profile.get("sections", [])
            
            from app.ai.agents import AIDocumentationAgent
            ai_doc = await AIDocumentationAgent.analyze(readme_preview, completeness_score, sections)
            logs.append(f"Node [ai_documentation]: AI assessment complete. Quality: {ai_doc.get('documentation_quality')}")
            return {
                "logs": logs,
                "ai_documentation": ai_doc
            }
        except Exception as e:
            logs.append(f"Node [ai_documentation]: Exception occurred: {str(e)}")
            return {"logs": logs}

async def ai_dependency_node(state: AnalysisState) -> Dict[str, Any]:
    """
    Node 8: Runs AI Dependency Risk Agent on parsed dependency profile.
    """
    logs = state.get("logs", [])
    if state.get("status") != "cloned":
        logs.append("Node [ai_dependency]: Skipped (Repository not cloned).")
        return {"logs": logs}
        
    logs.append("Node [ai_dependency]: Running AI Dependency Risk Agent...")
    repo_id = UUID(state["repository_id"])
    
    async with AsyncSessionLocal() as db:
        try:
            repo = await repository_repo.get(db, repo_id)
            if not repo or not repo.dependencies_profile:
                logs.append("Node [ai_dependency]: No dependency profile found.")
                return {"logs": logs}
                
            dependencies = repo.dependencies_profile.get("dependencies", [])
            report = repo.dependencies_profile.get("report", {})
            
            from app.ai.agents import AIDependencyAgent
            ai_dep = await AIDependencyAgent.analyze(dependencies, report)
            logs.append(f"Node [ai_dependency]: AI dependency risk audit complete. Risk: {ai_dep.get('risk_level')}")
            return {
                "logs": logs,
                "ai_dependency": ai_dep
            }
        except Exception as e:
            logs.append(f"Node [ai_dependency]: Exception occurred: {str(e)}")
            return {"logs": logs}

async def ai_repository_summary_node(state: AnalysisState) -> Dict[str, Any]:
    """
    Node 9: Runs AI Repository Summary Agent.
    """
    logs = state.get("logs", [])
    if state.get("status") != "cloned":
        logs.append("Node [ai_repository_summary]: Skipped (Repository not cloned).")
        return {"logs": logs}
        
    logs.append("Node [ai_repository_summary]: Running AI Repository Executive Summary Agent...")
    repo_id = UUID(state["repository_id"])
    
    async with AsyncSessionLocal() as db:
        try:
            repo = await repository_repo.get(db, repo_id)
            if not repo:
                logs.append("Node [ai_repository_summary]: Repository record not found.")
                return {"logs": logs}
                
            repo_meta = {
                "stars": repo.stars,
                "forks": repo.forks,
                "contributors_count": repo.contributors_count,
                "open_issues": repo.open_issues
            }
            tech_stack = repo.detected_stack or {}
            dep_profile = repo.dependencies_profile or {}
            env_profile = repo.environment_profile or {}
            doc_profile = repo.documentation_profile or {}
            
            from app.ai.agents import AIRepositoryIntelligenceAgent
            ai_sum = await AIRepositoryIntelligenceAgent.analyze(
                repo_meta, tech_stack, dep_profile, env_profile, doc_profile
            )
            logs.append(f"Node [ai_repository_summary]: Executive summary generated. Health: {ai_sum.get('repository_health')}")
            return {
                "logs": logs,
                "ai_summary": ai_sum
            }
        except Exception as e:
            logs.append(f"Node [ai_repository_summary]: Exception occurred: {str(e)}")
            return {"logs": logs}


async def build_validation_node(state: AnalysisState) -> Dict[str, Any]:
    """
    Node 10: Runs the build validation service inside the container/host.
    """
    logs = state.get("logs", [])
    if state.get("status") != "cloned":
        logs.append("Node [build_validation]: Skipped (Repository not cloned).")
        return {
            "logs": logs,
            "build_result": {"build_success": False, "logs": "Repository acquisition failed.", "build_attempted": False},
            "failure_diagnosis": {"category": "Acquisition Failure", "root_cause": "Repository not cloned.", "recommendations": []}
        }
        
    logs.append("Node [build_validation]: Running build validation...")
    repo_id = UUID(state["repository_id"])
    
    async with AsyncSessionLocal() as db:
        try:
            # Run build validation (which also runs diagnosis and indexes failures)
            result = await build_validation_service.validate_build(db, repo_id)
            
            # Re-fetch repo to get the latest updated fields
            repo = await repository_repo.get(db, repo_id)
            
            logs.append(f"Node [build_validation]: Build completed. Success: {result.get('build_success')}")
            return {
                "logs": logs,
                "build_result": result,
                "failure_diagnosis": repo.failure_diagnosis or {}
            }
        except Exception as e:
            logs.append(f"Node [build_validation]: Exception occurred: {str(e)}")
            return {
                "logs": logs,
                "build_result": {"build_success": False, "logs": str(e)},
                "failure_diagnosis": {"category": "Unknown", "root_cause": str(e), "recommendations": []}
            }


async def ai_recommendation_node(state: AnalysisState) -> Dict[str, Any]:
    """
    Node 11: Runs AI Failure Recommendation Agent if the build failed.
    """
    logs = state.get("logs", [])
    build_res = state.get("build_result") or {}
    
    logs.append("Node [ai_recommendation]: Running AI Recommendation Agent...")
    repo_id = UUID(state["repository_id"])
    
    async with AsyncSessionLocal() as db:
        try:
            repo = await repository_repo.get(db, repo_id)
            if not repo:
                logs.append("Node [ai_recommendation]: Repository record not found.")
                return {"logs": logs}
                
            diagnosis = repo.failure_diagnosis or {}
            
            # If build succeeded, shift diagnosis context to Codebase Optimization
            if build_res.get("build_success") is True:
                logs.append("Node [ai_recommendation]: Build succeeded. Generating codebase optimization recommendation instead of failure diagnosis.")
                diagnosis = {
                    "category": "Codebase Optimization",
                    "root_cause": "Build succeeded perfectly. No critical errors detected.",
                    "recommendations": []
                }
            
            # Fetch similar failures if any
            query_logs = build_res.get("logs") or ""
            similar_failures = []
            if query_logs.strip() and not build_res.get("build_success"):
                # Fetch up to 4 similar failures (filter out itself later)
                raw_similar = failure_rag_service.retrieve_similar_failures(query_logs, limit=4)
                similar_failures = [sf for sf in raw_similar if sf["repository_id"] != str(repo_id)][:3]
                
            repo_meta = {
                "name": repo.name,
                "owner": repo.owner,
                "detected_ecosystem": build_res.get("detected_ecosystem") or "Unknown"
            }
            
            from app.ai.agents import AIRecommendationAgent
            ai_rec = await AIRecommendationAgent.analyze(diagnosis, similar_failures, repo_meta)
            
            logs.append(f"Node [ai_recommendation]: Recommendation generated. Confidence: {ai_rec.get('confidence_level')}")
            return {
                "logs": logs,
                "ai_recommendation": ai_rec
            }
        except Exception as e:
            logs.append(f"Node [ai_recommendation]: Exception occurred: {str(e)}")
            return {"logs": logs}


def build_workflow() -> Any:
    """
    Compiles the unified LangGraph state machine.
    """
    workflow = StateGraph(AnalysisState)
    
    # Register Nodes
    workflow.add_node("repository_acquisition", repository_acquisition_node)
    workflow.add_node("technology_discovery", technology_discovery_node)
    workflow.add_node("dependency_analysis", dependency_analysis_node)
    workflow.add_node("vulnerability_analysis", vulnerability_analysis_node)
    workflow.add_node("environment_reconstruction", environment_reconstruction_node)
    workflow.add_node("documentation_analysis", documentation_analysis_node)
    workflow.add_node("ai_documentation", ai_documentation_node)
    workflow.add_node("ai_dependency", ai_dependency_node)
    workflow.add_node("ai_repository_summary", ai_repository_summary_node)
    workflow.add_node("build_validation", build_validation_node)
    workflow.add_node("ai_recommendation", ai_recommendation_node)
    workflow.add_node("store_results", store_results_node)
    
    # Establish Entry Point
    workflow.set_entry_point("repository_acquisition")
    
    # Link Nodes Sequentially
    workflow.add_edge("repository_acquisition", "technology_discovery")
    workflow.add_edge("technology_discovery", "dependency_analysis")
    workflow.add_edge("dependency_analysis", "vulnerability_analysis")
    workflow.add_edge("vulnerability_analysis", "environment_reconstruction")
    workflow.add_edge("environment_reconstruction", "documentation_analysis")
    workflow.add_edge("documentation_analysis", "ai_documentation")
    workflow.add_edge("ai_documentation", "ai_dependency")
    workflow.add_edge("ai_dependency", "build_validation")
    workflow.add_edge("build_validation", "ai_repository_summary")
    workflow.add_edge("ai_repository_summary", "ai_recommendation")
    workflow.add_edge("ai_recommendation", "store_results")
    workflow.add_edge("store_results", END)
    
    return workflow.compile()
