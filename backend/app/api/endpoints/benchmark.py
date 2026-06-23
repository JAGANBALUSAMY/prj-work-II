import logging
from typing import List, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.responses import FileResponse
import os

from app.core.database import get_db, AsyncSessionLocal
from app.services.benchmark_service import benchmark_service
from app.services.benchmark_report_service import benchmark_report_service
from app.api.endpoints.auth import get_current_active_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()

async def background_benchmark_execution():
    """
    Background worker that executes the benchmark framework.
    """
    try:
        logger.info("Background task: Starting Benchmark Execution Suite...")
        async with AsyncSessionLocal() as db:
            await benchmark_service.execute_benchmark_run(db)
        logger.info("Background task: Benchmark Execution Suite completed.")
    except Exception as e:
        logger.error(f"Failed background worker task for benchmark: {str(e)}")

@router.post("/run", status_code=status.HTTP_202_ACCEPTED)
async def trigger_benchmark_run(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user)
):
    """
    Triggers a new background benchmark run.
    """
    background_tasks.add_task(background_benchmark_execution)
    return {"message": "Benchmark run initiated in the background."}

@router.get("/latest", response_model=Dict[str, Any])
async def get_latest_benchmark_run(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieves the latest benchmark run and its results.
    """
    run = await benchmark_service.get_latest_run(db)
    if not run:
        return {"status": "none"}
    
    results = await benchmark_service.get_run_results(db, str(run.id))
    
    return {
        "id": str(run.id),
        "status": run.status,
        "total_repos": run.total_repos,
        "completed_repos": run.completed_repos,
        "tech_accuracy": run.tech_accuracy,
        "dependency_accuracy": run.dependency_accuracy,
        "environment_accuracy": run.environment_accuracy,
        "build_accuracy": run.build_accuracy,
        "docs_accuracy": run.docs_accuracy,
        "created_at": run.created_at.isoformat() if run.created_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        "results": [
            {
                "id": str(r.id),
                "repo_url": r.repo_url,
                "expected_ecosystem": r.expected_ecosystem,
                "predicted_ecosystem": r.predicted_ecosystem,
                "tech_match": r.tech_match,
                "dep_match": r.dep_match,
                "env_match": r.env_match,
                "build_match": r.build_match,
                "docs_match": r.docs_match,
                "created_at": r.created_at.isoformat() if r.created_at else None
            } for r in results
        ]
    }

@router.get("/latest/report", response_class=FileResponse)
async def download_latest_benchmark_report(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Downloads the PDF report for the latest benchmark run.
    """
    run = await benchmark_service.get_latest_run(db)
    if not run:
        raise HTTPException(status_code=404, detail="No benchmark runs found.")
    
    results = await benchmark_service.get_run_results(db, str(run.id))
    
    pdf_bytes = benchmark_report_service.generate_pdf(run, results)
    
    # Save to a temporary file because FileResponse needs a filepath
    import tempfile
    fd, path = tempfile.mkstemp(suffix=".pdf")
    with os.fdopen(fd, 'wb') as f:
        f.write(pdf_bytes)
        
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=f"benchmark_report_{run.id}.pdf"
    )
