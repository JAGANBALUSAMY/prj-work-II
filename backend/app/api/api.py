from fastapi import APIRouter
from app.api.endpoints import repositories, auth, search

api_router = APIRouter()

# Register endpoint groups
api_router.include_router(repositories.router, prefix="/repositories", tags=["repositories"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
