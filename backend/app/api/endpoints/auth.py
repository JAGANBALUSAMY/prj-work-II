import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, Token, UserLogin, RefreshTokenRequest
from app.repositories.user_repo import user_repo
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_token

logger = logging.getLogger(__name__)

router = APIRouter()

# Setup OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
        
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise credentials_exception
        
    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception
        
    user = await user_repo.get_by_email(db, email=email)
    if user is None:
        raise credentials_exception
        
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user

@router.post("/register", response_model=UserResponse)
async def register_user(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Registers a new user in the database.
    """
    existing_user = await user_repo.get_by_email(db, email=payload.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )
        
    hashed_pwd = get_password_hash(payload.password)
    user_db = await user_repo.create(db, obj_in={
        "email": payload.email,
        "hashed_password": hashed_pwd,
        "is_active": True
    })
    return user_db

@router.post("/login", response_model=Token)
async def login_user(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    """
    Authenticates a user and returns access/refresh token pair.
    """
    user = await user_repo.get_by_email(db, email=payload.email)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated."
        )
        
    access_token = create_access_token(user.email)
    refresh_token = create_refresh_token(user.email)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/refresh", response_model=Token)
async def refresh_token(payload: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """
    Refreshes an access token using a valid refresh token.
    """
    token = payload.refresh_token
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    decoded = decode_token(token)
    if decoded is None or decoded.get("type") != "refresh":
        raise credentials_exception
        
    email = decoded.get("sub")
    if not email:
        raise credentials_exception
        
    user = await user_repo.get_by_email(db, email=email)
    if user is None or not user.is_active:
        raise credentials_exception
        
    access_token = create_access_token(user.email)
    new_refresh_token = create_refresh_token(user.email)
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_active_user)):
    """
    Returns the currently authenticated user details.
    """
    return current_user
