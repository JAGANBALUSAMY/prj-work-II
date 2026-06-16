from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    password: Optional[str] = None
    is_active: Optional[bool] = None

class UserInDBBase(UserBase):
    id: UUID
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserResponse(UserInDBBase):
    pass

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    email: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str
