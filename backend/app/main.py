import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base
from app.api.api import api_router
# Import models to ensure they are registered on the Base metadata
from app.models import User, Repository, Analysis, BenchmarkRun, BenchmarkResult

# Setup logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles application startup and shutdown lifecycle events.
    Automatically creates database tables on startup.
    """
    logger.info("Initializing application and database tables...")
    try:
        async with engine.begin() as conn:
            # Create all registered tables if they don't exist
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database tables: {str(e)}")
        
    yield
    
    logger.info("Shutting down application...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="REST API for the Repository Reproducibility and Survivability Analyzer",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS to allow interactions from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production requirements
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes under the /api prefix
app.include_router(api_router, prefix="/api")

@app.get("/", tags=["health"])
async def root_check():
    """
    Root endpoint serving as a base API health check.
    """
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "documentation": "/docs"
    }
