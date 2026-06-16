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

async def store_results_node(state: AnalysisState) -> Dict[str, Any]:
    """
    Node 6: Calculates reproducibility/survivability indices, indexes metadata, and saves DB records.
    """
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
                    rep_score += 30.0
                    has_docker = True
            
            if repo.documentation_profile:
                readme_file = repo.documentation_profile.get("scanned_file")
                if readme_file:
                    rep_score += 10.0
                    has_readme = True
                readme_score = repo.documentation_profile.get("completeness_score", 0)
                rep_score += (readme_score * 0.3)
                
            # Calculate Survivability Score
            srv_score = 40.0
            active_maint = False
            dep_health = "good"
            
            # Maintenance check
            if repo.last_commit_date:
                one_year_ago = datetime.utcnow() - timedelta(days=365)
                # Ensure last_commit_date is offset-naive for comparison
                commit_naive = repo.last_commit_date.replace(tzinfo=None)
                if commit_naive > one_year_ago:
                    srv_score += 10.0
                    active_maint = True
            
            # Popularity check
            srv_score += min(30.0, (repo.stars + repo.forks * 2) / 5)
            
            # Contributors check
            srv_score += min(20.0, repo.contributors_count * 2)
            
            # Dependency warnings check
            if repo.dependencies_profile:
                warnings = len(repo.dependencies_profile.get("report", {}).get("duplicates", [])) + \
                           len(repo.dependencies_profile.get("report", {}).get("suspicious_declarations", []))
                if warnings > 3:
                    srv_score -= 10.0
                    dep_health = "warnings"
            
            rep_score = min(100.0, max(0.0, rep_score))
            srv_score = min(100.0, max(0.0, srv_score))
            
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
                    "active_maintenance": active_maint,
                    "license_permissive": True,
                    "dependency_health": dep_health
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
            logs.append(f"Node [store_results]: Exception occurred during metrics calculation: {str(e)}")
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
    workflow.add_edge("ai_dependency", "ai_repository_summary")
    workflow.add_edge("ai_repository_summary", "store_results")
    workflow.add_edge("store_results", END)
    
    return workflow.compile()
