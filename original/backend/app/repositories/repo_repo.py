from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.repository import Repository
from app.repositories.base import BaseRepository

class RepositoryRepository(BaseRepository[Repository]):
    def __init__(self):
        super().__init__(Repository)

    async def get_by_clone_url(self, db: AsyncSession, clone_url: str) -> Optional[Repository]:
        """Find a repository in the database by its exact clone URL"""
        result = await db.execute(select(self.model).filter(self.model.clone_url == clone_url))
        return result.scalars().first()

repository_repo = RepositoryRepository()
