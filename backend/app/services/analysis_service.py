import logging
from datetime import datetime
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis import Analysis
from app.repositories.analysis_repo import analysis_repo
from app.repositories.repo_repo import repository_repo
from app.ai.graph import build_workflow

logger = logging.getLogger(__name__)

class AnalysisService:
    @classmethod
    async def run_analysis(cls, repository_id: UUID) -> Analysis:
        """
        Orchestrates the execution of the unified repository analysis workflow
        using the compiled LangGraph state graph.
        """
        from app.core.database import AsyncSessionLocal
        
        # 1. Fetch Repository and Create Initial Record in a short-lived session
        async with AsyncSessionLocal() as db:
            repo = await repository_repo.get(db, repository_id)
            if not repo:
                raise ValueError(f"Repository {repository_id} not found.")

            # 2. Create Initial Pending Analysis Record in Database
            analysis_db = await analysis_repo.create(db, obj_in={
                "repository_id": repository_id,
                "status": "running",
                "logs": ["Initiating unified LangGraph workflow..."]
            })
            analysis_id = analysis_db.id
            clone_url = repo.clone_url
            local_path = repo.local_path
            status = repo.status

        try:
            # 3. Build LangGraph Workflow
            workflow = build_workflow()
            
            initial_state = {
                "clone_url": clone_url,
                "repository_id": str(repository_id),
                "local_path": local_path or "",
                "status": status,
                "reproducibility_score": 0.0,
                "survivability_score": 0.0,
                "summary": "",
                "findings": {},
                "logs": ["State machine initialized."],
                "ai_documentation": {},
                "ai_dependency": {},
                "ai_summary": {},
                "build_result": {},
                "failure_diagnosis": {},
                "ai_recommendation": {}
            }

            # 4. Invoke Workflow Asynchronously
            final_state = await workflow.ainvoke(initial_state)

            # Check if workflow nodes completed successfully
            success = final_state.get("status") == "cloned"
            status_str = "completed" if success else "failed"

            # 5. Save Final Results to Database using a fresh session
            async with AsyncSessionLocal() as db:
                analysis_db = await analysis_repo.get(db, analysis_id)
                if analysis_db:
                    update_data = {
                        "status": status_str,
                        "reproducibility_score": final_state.get("reproducibility_score", 0.0),
                        "survivability_score": final_state.get("survivability_score", 0.0),
                        "summary": final_state.get("summary", ""),
                        "findings": final_state.get("findings", {}),
                        "logs": final_state.get("logs", []),
                        "completed_at": datetime.utcnow()
                    }
                    analysis_db = await analysis_repo.update(db, db_obj=analysis_db, obj_in=update_data)
            
            logger.info(f"LangGraph analysis workflow finished with status '{status_str}' for repository {repository_id}")
            return analysis_db

        except Exception as e:
            logger.error(f"Error running LangGraph analysis workflow for repository {repository_id}: {str(e)}")
            # Record failure logs in DB
            async with AsyncSessionLocal() as db:
                analysis_db = await analysis_repo.get(db, analysis_id)
                if analysis_db:
                    try:
                        await analysis_repo.update(db, db_obj=analysis_db, obj_in={
                            "status": "failed",
                            "logs": [f"Execution failed with error: {str(e)}"]
                        })
                    except Exception as inner_e:
                        logger.error(f"Could not update analysis to failed state: {str(inner_e)}")
            raise e

analysis_service = AnalysisService()
