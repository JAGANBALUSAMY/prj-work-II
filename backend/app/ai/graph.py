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
from app.services.health_prediction_service import health_prediction_service
from app.services.intelligence_service import intelligence_service

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
            
            # Calculate Reproducibility Score
            rep_score = 30.0
            has_docker = False
            has_readme = False
            readme_score = 0
            
            if repo.detected_stack:
                files = repo.detected_stack.get("scanned_files", [])
                if "Dockerfile" in files or "docker-compose.yml" in files:
                    rep_score += 10.0
                    has_docker = True
                    
            if repo.build_result and repo.build_result.get("build_success"):
                rep_score += 20.0
            
            if repo.documentation_profile:
                readme_file = repo.documentation_profile.get("scanned_file")
                if readme_file:
                    rep_score += 10.0
                    has_readme = True
                readme_score = repo.documentation_profile.get("completeness_score", 0)
                rep_score += (readme_score * 0.3)
                
            # --- Upgraded Survivability Scoring Logic ---
            # 1. Run git metrics scan
            git_metrics = get_git_metrics(repo.local_path)
            days_ago = git_metrics["last_commit_days_ago"]
            
            # A. Commit frequency score (out of 100)
            if days_ago < 30:
                commit_freq_score = 100
            elif days_ago < 90:
                commit_freq_score = 80
            elif days_ago < 180:
                commit_freq_score = 60
            elif days_ago < 365:
                commit_freq_score = 40
            else:
                commit_freq_score = 15
            # Add volume bonus: up to 100 max
            commit_count = git_metrics["commit_count_1y"]
            if commit_count > 50:
                commit_freq_score = min(100, commit_freq_score + 20)
            elif commit_count > 20:
                commit_freq_score = min(100, commit_freq_score + 10)
                
            # B. Release frequency score (out of 100)
            tags_count = git_metrics["tags_count"]
            if tags_count >= 10:
                release_freq_score = 100
            elif tags_count >= 5:
                release_freq_score = 85
            elif tags_count >= 1:
                release_freq_score = 60
            else:
                release_freq_score = 25
                
            # C. Dependency freshness score (out of 100)
            total_deps = 0
            pinned_deps = 0
            has_deps = False
            if repo.dependencies_profile:
                deps_list = repo.dependencies_profile.get("dependencies", [])
                if deps_list:
                    has_deps = True
                    total_deps = len(deps_list)
                    pinned_deps = sum(1 for d in deps_list if d.get("version") and d.get("version") not in ("*", "latest", "unspecified"))
            
            if has_deps:
                pin_ratio = pinned_deps / total_deps
                dep_freshness = pin_ratio * 100
            else:
                dep_freshness = 75.0
                
            # Apply decay based on inactivity
            if days_ago < 90:
                decay = 1.0
            elif days_ago < 180:
                decay = 0.8
            elif days_ago < 365:
                decay = 0.6
            else:
                decay = 0.4
            dependency_freshness_score = round(dep_freshness * decay, 1)

            # D. Contributor activity score (out of 100)
            total_contribs = git_metrics["total_contributors"]
            active_contribs = git_metrics["active_contributors_90d"]
            if active_contribs >= 3:
                contributor_activity_score = 100
            elif active_contribs >= 1:
                contributor_activity_score = 80
            elif total_contribs >= 5:
                contributor_activity_score = 60
            elif total_contribs >= 2:
                contributor_activity_score = 45
            else:
                contributor_activity_score = 25

            # E. Issue resolution score (out of 100)
            open_issues = repo.open_issues or 0
            stars = repo.stars or 0
            forks = repo.forks or 0
            if open_issues == 0:
                issue_resolution_score = 100
            else:
                popularity = stars + forks * 2
                res_ratio = 1.0 - (open_issues / (popularity + 5.0))
                res_ratio = max(0.2, min(1.0, res_ratio))
                issue_resolution_score = round(res_ratio * 100, 1)

            # F. Security risk score (out of 100)
            sec_score = 100.0
            num_dups = 0
            num_susp = 0
            num_unpinned = 0
            if repo.dependencies_profile:
                report = repo.dependencies_profile.get("report", {})
                num_dups = len(report.get("duplicates", []))
                num_susp = len(report.get("suspicious_declarations", []))
                num_unpinned = len(report.get("missing_versions", []))
            
            sec_score -= min(30, num_susp * 15)
            sec_score -= min(20, num_dups * 5)
            sec_score -= min(25, num_unpinned * 3)
            
            build_failed = False
            if repo.build_result and not repo.build_result.get("build_success"):
                build_failed = True
                sec_score -= 20.0
                
            security_risks_score = max(10.0, sec_score)

            # Weighted average for survivability score
            srv_score = (
                commit_freq_score * 0.25 +
                release_freq_score * 0.15 +
                dependency_freshness_score * 0.15 +
                contributor_activity_score * 0.20 +
                issue_resolution_score * 0.10 +
                security_risks_score * 0.15
            )
            srv_score = round(min(100.0, max(0.0, srv_score)), 1)

            # Determine Health Category
            if days_ago >= 365 and commit_freq_score <= 15:
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
                dependency_freshness=dependency_freshness_score,
                issue_activity=prediction_input_issue,
                releases=prediction_input_releases
            )

            summary = (
                f"Successfully parsed repository {repo.owner}/{repo.name}. "
                f"Technology stack uses: {', '.join(repo.detected_stack.get('backend', [])) if repo.detected_stack else 'None'}. "
                f"Onboarding score is {int(readme_score)}% and environment scan listed {len(repo.environment_profile.get('variables', [])) if repo.environment_profile else 0} variables."
            )
            
            findings = {
                "reproducibility_factors": {
                    "has_dockerfile": has_docker,
                    "has_readme": has_readme,
                    "environment_instructions_score": float(readme_score / 10)
                },
                "survivability_factors": {
                    "active_maintenance": days_ago < 90,
                    "license_permissive": True,
                    "dependency_health": "warnings" if (num_dups + num_susp) > 2 else "healthy"
                },
                "survivability_details": {
                    "survivability_score": srv_score,
                    "health_category": health_category,
                    "risk_factors": risk_factors,
                    "metrics": {
                        "commit_frequency_score": commit_freq_score,
                        "release_frequency_score": release_freq_score,
                        "dependency_freshness_score": dependency_freshness_score,
                        "contributor_activity_score": contributor_activity_score,
                        "issue_resolution_score": issue_resolution_score,
                        "security_risks_score": security_risks_score
                    },
                    "raw_stats": {
                        "commit_count_1y": commit_count,
                        "tags_count": tags_count,
                        "total_contributors": total_contribs,
                        "active_contributors_90d": active_contribs,
                        "last_commit_days_ago": days_ago,
                        "open_issues": open_issues
                    }
                },
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
    
    if build_res.get("build_success") is True:
        logs.append("Node [ai_recommendation]: Skipped (Build succeeded).")
        return {"logs": logs, "ai_recommendation": {}}
        
    logs.append("Node [ai_recommendation]: Running AI Recommendation Agent...")
    repo_id = UUID(state["repository_id"])
    
    async with AsyncSessionLocal() as db:
        try:
            repo = await repository_repo.get(db, repo_id)
            if not repo:
                logs.append("Node [ai_recommendation]: Repository record not found.")
                return {"logs": logs}
                
            diagnosis = repo.failure_diagnosis or {}
            
            # Fetch similar failures
            query_logs = build_res.get("logs") or ""
            similar_failures = []
            if query_logs.strip():
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
    workflow.add_edge("dependency_analysis", "environment_reconstruction")
    workflow.add_edge("environment_reconstruction", "documentation_analysis")
    workflow.add_edge("documentation_analysis", "ai_documentation")
    workflow.add_edge("ai_documentation", "ai_dependency")
    workflow.add_edge("ai_dependency", "build_validation")
    workflow.add_edge("build_validation", "ai_repository_summary")
    workflow.add_edge("ai_repository_summary", "ai_recommendation")
    workflow.add_edge("ai_recommendation", "store_results")
    workflow.add_edge("store_results", END)
    
    return workflow.compile()
