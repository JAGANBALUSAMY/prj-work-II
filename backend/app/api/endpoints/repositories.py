import logging
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, AsyncSessionLocal
from app.schemas.repository import RepositoryResponse, RepositoryCreate, BuildValidationResult, FailureDiagnosisResponse, SimilarFailureResponse
from app.repositories.repo_repo import repository_repo
from app.services.repo_service import repo_service, parse_github_url
from app.services.analysis_service import analysis_service
from app.services.stack_service import stack_service
from app.services.dependency_service import dependency_service
from app.services.environment_service import environment_service
from app.services.documentation_service import documentation_service
from app.services.vector_service import vector_service
from app.services.build_validation_service import build_validation_service

from app.api.endpoints.auth import get_current_active_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()

async def background_acquire_and_analyze(repo_id: UUID, clone_url: str):
    """
    Background worker that executes the unified LangGraph analysis workflow.
    """
    try:
        logger.info(f"Background task: Running unified LangGraph analysis workflow for {repo_id}...")
        await analysis_service.run_analysis(repo_id)
    except Exception as e:
        logger.error(f"Failed background worker task for repo {repo_id}: {str(e)}")

@router.post("/analyze", response_model=RepositoryResponse, status_code=status.HTTP_202_ACCEPTED)
async def analyze_repository(
    payload: RepositoryCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Accepts a GitHub repository clone URL, validates it, inserts it into the database,
    and spawns a background task to clone, fetch metadata, and perform analysis.
    """
    clone_url = payload.clone_url.strip()
    
    # 1. Validate GitHub URL format
    try:
        owner, repo_name = parse_github_url(clone_url)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    existing_repo = await repository_repo.get_by_clone_url(db, clone_url)
    if existing_repo:
        if existing_repo.user_id and existing_repo.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This repository is already registered by another user."
            )
        # If it already exists and belongs to this user (or no owner), reset status
        repo = await repository_repo.update(
            db, 
            db_obj=existing_repo, 
            obj_in={"status": "cloning", "user_id": current_user.id}
        )
    else:
        # Create a new repository entry
        repo = await repository_repo.create(db, obj_in={
            "name": repo_name,
            "owner": owner,
            "clone_url": clone_url,
            "status": "cloning",
            "stars": 0,
            "forks": 0,
            "open_issues": 0,
            "contributors_count": 0,
            "user_id": current_user.id
        })

    # 3. Add cloning & analysis tasks to FastAPI BackgroundTasks
    background_tasks.add_task(background_acquire_and_analyze, repo.id, clone_url)
    
    return repo

@router.get("", response_model=List[RepositoryResponse])
async def list_repositories(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Lists all repositories in the database belonging to the current user.
    """
    # Use standard SQLAlchemy filter for user_id to restrict access
    from sqlalchemy.future import select
    from app.models.repository import Repository
    
    query = select(Repository).filter(Repository.user_id == current_user.id).offset(skip).limit(limit)
    result = await db.execute(query)
    repos = result.scalars().all()
    return repos

@router.get("/{id}", response_model=RepositoryResponse)
async def get_repository_details(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieves detailed metadata and history for a specific repository.
    """
    repo = await repository_repo.get(db, id)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository with ID {id} not found"
        )
    if repo.user_id and repo.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this repository"
        )
    if repo.user_id and repo.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this repository"
        )
    return repo

@router.get("/{id}/stack")
async def get_repository_stack(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieves the detected technology stack profile for a specific repository.
    """
    repo = await repository_repo.get(db, id)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository with ID {id} not found"
        )
    if repo.user_id and repo.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this repository"
        )
    
    stack = repo.detected_stack or {
        "backend": [],
        "frontend": [],
        "databases": [],
        "scanned_files": []
    }
    return {
        "repository_id": id,
        **stack
    }

@router.get("/{id}/dependencies")
async def get_repository_dependencies(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieves the parsed dependency intelligence profile for a specific repository.
    """
    repo = await repository_repo.get(db, id)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository with ID {id} not found"
        )
    if repo.user_id and repo.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this repository"
        )
    
    profile = repo.dependencies_profile or {
        "dependencies": [],
        "report": {
            "total_count": 0,
            "duplicates": [],
            "missing_versions": [],
            "suspicious_declarations": [],
            "summary": "No dependencies analyzed yet."
        }
    }
    return {
        "repository_id": id,
        **profile
    }

@router.get("/{id}/environment")
async def get_repository_environment(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieves the reconstructed environment variable profile for a specific repository.
    """
    repo = await repository_repo.get(db, id)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository with ID {id} not found"
        )
    if repo.user_id and repo.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this repository"
        )
    
    profile = repo.environment_profile or {
        "variables": [],
        "template": "",
        "scanned_files_count": 0,
        "template_files_found": [],
        "summary": "No environment scan run yet."
    }
    return {
        "repository_id": id,
        **profile
    }

@router.get("/{id}/documentation")
async def get_repository_documentation(
    id: UUID,
    db: AsyncSession = Depends(get_db)
,
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieves the documentation intelligence completeness profile for a specific repository.
    """
    repo = await repository_repo.get(db, id)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository with ID {id} not found"
        )
    if repo.user_id and repo.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this repository"
        )
    
    profile = repo.documentation_profile or {
        "completeness_score": 0,
        "scanned_file": None,
        "sections": [],
        "suggestions": [],
        "summary": "No documentation scan run yet.",
        "readme_preview": ""
    }
    return {
        "repository_id": id,
        **profile
    }


@router.get("/{id}/build-status", response_model=BuildValidationResult)
async def get_repository_build_status(
    id: UUID,
    force_rebuild: bool = False,
    db: AsyncSession = Depends(get_db)
,
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieves the build validation status/result for a specific repository.
    If build has not been validated yet (or force_rebuild=True), it triggers the build validator.
    """
    repo = await repository_repo.get(db, id)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository with ID {id} not found"
        )
    if repo.user_id and repo.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this repository"
        )
    
    if repo.build_result and not force_rebuild:
        return repo.build_result
        
    try:
        result = await build_validation_service.validate_build(db, id)
        await db.commit()
        return result
    except Exception as e:
        logger.error(f"Error executing build validation for repo {id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Build validation failed: {str(e)}"
        )


@router.get("/{id}/failure-analysis", response_model=FailureDiagnosisResponse)
async def get_repository_failure_analysis(
    id: UUID,
    db: AsyncSession = Depends(get_db)
,
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieves the failure diagnosis result for a specific repository.
    If no build has been executed yet, raises 404.
    If the build succeeded, returns a default success description.
    """
    repo = await repository_repo.get(db, id)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository with ID {id} not found"
        )
    if repo.user_id and repo.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this repository"
        )
    
    # If build hasn't run yet
    if not repo.build_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No build has been run for repository {id} yet. Run a build validation first."
        )
        
    # If the build was successful, return default "Build Succeeded" response
    if repo.build_result.get("build_success") is True:
        return {
            "root_cause": "Build succeeded. No errors detected.",
            "category": "Unknown",
            "confidence": 1.0,
            "recommendations": ["No remediation required."]
        }
        
    # If failure diagnosis is already computed, return it
    if repo.failure_diagnosis:
        return repo.failure_diagnosis
        
    # Otherwise, diagnose on the fly using stored logs
    try:
        from app.services.failure_diagnosis_service import failure_diagnosis_service
        logs = repo.build_result.get("logs") or ""
        diagnosis = failure_diagnosis_service.diagnose(logs)
        
        # Save diagnosis to DB
        await repository_repo.update(db, db_obj=repo, obj_in={"failure_diagnosis": diagnosis})
        await db.commit()
        return diagnosis
    except Exception as e:
        logger.error(f"Error diagnosing build logs for repo {id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failure diagnosis failed: {str(e)}"
        )


@router.get("/{id}/similar-failures", response_model=List[SimilarFailureResponse])
async def get_repository_similar_failures(
    id: UUID,
    limit: int = 3,
    db: AsyncSession = Depends(get_db)
,
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieves the top similar failures from the ChromaDB Failure Knowledge Base
    matching the target repository's current build failure logs.
    """
    repo = await repository_repo.get(db, id)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository with ID {id} not found"
        )
    if repo.user_id and repo.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this repository"
        )

    # If build hasn't run yet
    if not repo.build_result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No build has been run for repository {id} yet. Similar failures require query logs."
        )

    logs = repo.build_result.get("logs") or ""
    if not logs.strip():
        return []

    try:
        from app.services.failure_rag_service import failure_rag_service
        # Fetch limit + 1 items in case the query repository itself is returned
        similar = failure_rag_service.retrieve_similar_failures(logs, limit=limit + 1)
        
        # Self-filtering: remove the query repository from the retrieved items
        filtered_similar = [s for s in similar if s["repository_id"] != str(id)][:limit]
        return filtered_similar
    except Exception as e:
        logger.error(f"Error querying similar failures for repo {id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Similar failures query failed: {str(e)}"
        )


@router.get("/{id}/report")
async def get_repository_report(
    id: UUID,
    db: AsyncSession = Depends(get_db)
,
    current_user: User = Depends(get_current_active_user)
):
    """
    Generates and downloads a professional PDF diagnostic report for the repository.
    """
    from fastapi import Response
    from app.services.report_service import ReportService
    
    repo = await repository_repo.get(db, id)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository with ID {id} not found"
        )
    if repo.user_id and repo.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this repository"
        )
        
    try:
        pdf_bytes = await ReportService.generate_pdf_report(db, id)
        
        safe_owner = "".join(c for c in repo.owner if c.isalnum() or c in ('-', '_')).strip()
        safe_name = "".join(c for c in repo.name if c.isalnum() or c in ('-', '_')).strip()
        filename = f"repository_report_{safe_owner}_{safe_name}.pdf"
        
        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers=headers
        )
    except Exception as e:
        logger.error(f"Error generating PDF report for repo {id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate report: {str(e)}"
        )


@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_repository(
    id: UUID,
    db: AsyncSession = Depends(get_db)
,
    current_user: User = Depends(get_current_active_user)
):
    """
    Deletes a specific repository and its associated analyses.
    """
    repo = await repository_repo.get(db, id)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository with ID {id} not found"
        )
    if repo.user_id and repo.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this repository"
        )
    await repository_repo.remove(db, id=id)
    return {"message": f"Repository {id} deleted successfully"}


@router.delete("", status_code=status.HTTP_200_OK)
async def delete_all_repositories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Deletes all repositories belonging to the current user.
    """
    from sqlalchemy.future import select
    from app.models.repository import Repository
    
    query = select(Repository).filter(Repository.user_id == current_user.id).limit(10000)
    result = await db.execute(query)
    repos = result.scalars().all()
    
    for r in repos:
        await repository_repo.remove(db, id=r.id)
    return {"message": "All your repositories deleted successfully"}
