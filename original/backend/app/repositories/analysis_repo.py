from typing import List
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.analysis import Analysis
from app.repositories.base import BaseRepository

class AnalysisRepository(BaseRepository[Analysis]):
    def __init__(self):
        super().__init__(Analysis)

    async def get_by_repository_id(self, db: AsyncSession, repository_id: UUID) -> List[Analysis]:
        """Fetch all analysis runs associated with a specific repository"""
        result = await db.execute(
            select(self.model)
            .filter(self.model.repository_id == repository_id)
            .order_by(self.model.created_at.desc())
        )
        return list(result.scalars().all())

analysis_repo = AnalysisRepository()
