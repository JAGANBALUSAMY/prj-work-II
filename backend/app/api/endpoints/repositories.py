import logging
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, AsyncSessionLocal
from app.schemas.repository import RepositoryResponse, RepositoryCreate
from app.repositories.repo_repo import repository_repo
from app.services.repo_service import repo_service, parse_github_url
from app.services.analysis_service import analysis_service
from app.services.stack_service import stack_service
from app.services.dependency_service import dependency_service
from app.services.environment_service import environment_service
from app.services.documentation_service import documentation_service
from app.services.vector_service import vector_service

logger = logging.getLogger(__name__)

router = APIRouter()

async def background_acquire_and_analyze(repo_id: UUID, clone_url: str):
    """
    Background worker that executes the unified LangGraph analysis workflow.
    """
    async with AsyncSessionLocal() as db:
        try:
            logger.info(f"Background task: Running unified LangGraph analysis workflow for {repo_id}...")
            await analysis_service.run_analysis(db, repo_id)
        except Exception as e:
            logger.error(f"Failed background worker task for repo {repo_id}: {str(e)}")

@router.post("/analyze", response_model=RepositoryResponse, status_code=status.HTTP_202_ACCEPTED)
async def analyze_repository(
    payload: RepositoryCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
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

    # 2. Check if repository is already registered
    existing_repo = await repository_repo.get_by_clone_url(db, clone_url)
    if existing_repo:
        # If it already exists, reset status to re-trigger analysis
        repo = await repository_repo.update(
            db, 
            db_obj=existing_repo, 
            obj_in={"status": "cloning"}
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
            "contributors_count": 0
        })

    # 3. Add cloning & analysis tasks to FastAPI BackgroundTasks
    background_tasks.add_task(background_acquire_and_analyze, repo.id, clone_url)
    
    return repo

@router.get("", response_model=List[RepositoryResponse])
async def list_repositories(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    Lists all repositories in the database with their current status and metadata.
    """
    repos = await repository_repo.get_multi(db, skip=skip, limit=limit)
    return repos

@router.get("/{id}", response_model=RepositoryResponse)
async def get_repository_details(
    id: UUID,
    db: AsyncSession = Depends(get_db)
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
    return repo

@router.get("/{id}/stack")
async def get_repository_stack(
    id: UUID,
    db: AsyncSession = Depends(get_db)
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
    db: AsyncSession = Depends(get_db)
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
    db: AsyncSession = Depends(get_db)
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


@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_repository(
    id: UUID,
    db: AsyncSession = Depends(get_db)
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
    await repository_repo.remove(db, id=id)
    return {"message": f"Repository {id} deleted successfully"}


@router.delete("", status_code=status.HTTP_200_OK)
async def delete_all_repositories(
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes all repositories and all associated analyses.
    """
    repos = await repository_repo.get_multi(db, limit=10000)
    for r in repos:
        await repository_repo.remove(db, id=r.id)
    return {"message": "All repositories deleted successfully"}
