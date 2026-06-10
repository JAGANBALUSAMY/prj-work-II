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
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class RepositoryResponse(RepositoryInDBBase):
    analyses: List[AnalysisResponse] = []
