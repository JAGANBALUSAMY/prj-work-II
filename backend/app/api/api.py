from fastapi import APIRouter
from app.api.endpoints import repositories, auth

api_router = APIRouter()

# Register endpoint groups
api_router.include_router(repositories.router, prefix="/repositories", tags=["repositories"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
