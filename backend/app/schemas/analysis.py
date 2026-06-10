from typing import Optional, Dict, List, Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID

class AnalysisBase(BaseModel):
    repository_id: UUID

class AnalysisCreate(AnalysisBase):
    pass

class AnalysisUpdate(BaseModel):
    status: Optional[str] = None
    reproducibility_score: Optional[float] = None
    survivability_score: Optional[float] = None
    summary: Optional[str] = None
    findings: Optional[Dict[str, Any]] = None
    logs: Optional[List[Any]] = None
    completed_at: Optional[datetime] = None

class AnalysisInDBBase(AnalysisBase):
    id: UUID
    status: str
    reproducibility_score: Optional[float] = None
    survivability_score: Optional[float] = None
    summary: Optional[str] = None
    findings: Optional[Dict[str, Any]] = None
    logs: Optional[List[Any]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class AnalysisResponse(AnalysisInDBBase):
    pass
