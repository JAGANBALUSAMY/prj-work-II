import logging
import asyncio
from typing import Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.vector_service import vector_service
from app.repositories.repo_repo import repository_repo

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("", response_model=Dict[str, Any])
async def search_repositories(
    q: str = Query(..., description="Query string to search in vectors"),
    type: str = Query("all", description="Type of reports to search: 'metadata', 'dependencies', 'environments', 'documentation', or 'all'"),
    limit: int = Query(5, ge=1, le=50, description="Max results per category"),
    db: AsyncSession = Depends(get_db)
):
    """
    Search ChromaDB vector collections for matching repository metadata,
    dependencies, environments, or documentation.
    """
    if not q.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query cannot be empty."
        )

    valid_types = ["all", "metadata", "dependencies", "environments", "documentation"]
    if type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid search type. Must be one of {valid_types}"
        )

    results = {}

    # Define searches to perform
    searches = []
    if type == "all":
        searches = [
            ("metadata", vector_service.search_metadata),
            ("dependencies", vector_service.search_dependencies),
            ("environments", vector_service.search_environments),
            ("documentation", vector_service.search_documentation),
        ]
    else:
        if type == "metadata":
            searches = [("metadata", vector_service.search_metadata)]
        elif type == "dependencies":
            searches = [("dependencies", vector_service.search_dependencies)]
        elif type == "environments":
            searches = [("environments", vector_service.search_environments)]
        elif type == "documentation":
            searches = [("documentation", vector_service.search_documentation)]

    for cat_name, search_func in searches:
        try:
            # Query ChromaDB using asyncio.to_thread to avoid blocking the event loop
            cat_results = await asyncio.to_thread(search_func, q, limit)
            
            # Enrich results with repo db information if possible
            enriched_results = []
            for item in cat_results:
                repo_id = item.get("id") or item.get("metadata", {}).get("repository_id")
                repo_db_info = {}
                if repo_id:
                    try:
                        from uuid import UUID
                        repo_uuid = UUID(repo_id)
                        repo_obj = await repository_repo.get(db, repo_uuid)
                        if repo_obj:
                            repo_db_info = {
                                "name": repo_obj.name,
                                "owner": repo_obj.owner,
                                "description": repo_obj.description,
                                "status": repo_obj.status,
                                "detected_stack": repo_obj.detected_stack
                            }
                    except Exception:
                        pass
                
                item["repository"] = repo_db_info
                enriched_results.append(item)
                
            results[cat_name] = enriched_results
        except Exception as e:
            logger.error(f"Search failed for category {cat_name}: {e}")
            results[cat_name] = []

    return {
        "query": q,
        "type": type,
        "results": results
    }
