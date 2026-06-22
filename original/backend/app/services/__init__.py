# app/services/__init__.py
# Intentionally avoids eager imports to prevent circular import with app.ai.graph.
# Import services directly where needed:
#   from app.services.repo_service import repo_service
#   from app.services.analysis_service import analysis_service
#   etc.
__all__ = [
    "repo_service",
    "analysis_service",
    "stack_service",
    "dependency_service",
    "environment_service",
    "documentation_service",
    "vector_service"
]
