from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID
from app.schemas.analysis import AnalysisResponse

class RepositoryBase(BaseModel):
    clone_url: str

class RepositoryCreate(RepositoryBase):
    pass

class RepositoryUpdate(BaseModel):
    name: Optional[str] = None
    owner: Optional[str] = None
    description: Optional[str] = None
    stars: Optional[int] = None
    forks: Optional[int] = None
    open_issues: Optional[int] = None
    contributors_count: Optional[int] = None
    last_commit_date: Optional[datetime] = None
    local_path: Optional[str] = None
    status: Optional[str] = None
    detected_stack: Optional[dict] = None
    dependencies_profile: Optional[dict] = None
    environment_profile: Optional[dict] = None
    documentation_profile: Optional[dict] = None
    build_result: Optional[dict] = None
    failure_diagnosis: Optional[dict] = None
    vulnerability_profile: Optional[dict] = None

class BuildValidationResult(BaseModel):
    build_attempted: bool
    build_success: bool
    detected_ecosystem: str
    commands_executed: List[str]
    execution_time: float
    logs: str
    errors: Optional[str] = None
    container_logs: Optional[str] = None
    container_exit_code: Optional[int] = None
    container_execution_time: Optional[float] = None
    validation_category: Optional[str] = None
    dependency_success: Optional[bool] = None
    compilation_success: Optional[bool] = None
    test_success: Optional[bool] = None
    runtime_success: Optional[bool] = None
    build_maturity_score: Optional[int] = None

class AIRecommendationSchema(BaseModel):
    root_cause_explanation: str
    fix_steps: List[str]
    commands_to_execute: List[str]
    confidence_level: float

class FailureDiagnosisResponse(BaseModel):
    root_cause: str
    category: str
    confidence: float
    recommendations: List[str]
    ai_recommendation: Optional[AIRecommendationSchema] = None

class RepositoryInDBBase(RepositoryBase):
    id: UUID
    name: str
    owner: str
    description: Optional[str] = None
    stars: int
    forks: int
    open_issues: int
    contributors_count: int
    last_commit_date: Optional[datetime] = None
    local_path: Optional[str] = None
    status: str
    detected_stack: Optional[dict] = None
    dependencies_profile: Optional[dict] = None
    environment_profile: Optional[dict] = None
    documentation_profile: Optional[dict] = None
    build_result: Optional[dict] = None
    failure_diagnosis: Optional[dict] = None
    vulnerability_profile: Optional[dict] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class RepositoryResponse(RepositoryInDBBase):
    analyses: List[AnalysisResponse] = []

class SimilarFailureResponse(BaseModel):
    repository_id: str
    repository_name: str
    ecosystem: str
    category: str
    root_cause: str
    recommendations: List[str]
    logs: str
    similarity_score: float
