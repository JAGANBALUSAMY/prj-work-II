import os
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-Powered Intelligent Repository Reproducibility and Survivability Analyzer"
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "supersecretkey_change_me_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 11520
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/analyzer"
    
    # Git Acquisition & Storage
    CLONE_DIR: str = "./data/cloned_repos"
    GITHUB_TOKEN: Optional[str] = None
    
    # AI Stack
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"
    CHROMA_DB_PATH: str = "./data/chromadb"

    # SettingsConfigDict specifies env file loading
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
