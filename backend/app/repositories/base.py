from typing import Generic, Type, TypeVar, Any, Sequence, Optional
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import Base

ModelType = TypeVar("ModelType", bound=Base)

class BaseRepository(Generic[ModelType]):
    """
    Generic Repository with default methods to Create, Read, Update, Delete (CRUD).
    """
    def __init__(self, model: Type[ModelType]):
        self.model = model

    async def get(self, db: AsyncSession, id: UUID) -> Optional[ModelType]:
        """Fetch a single record by ID"""
        result = await db.execute(select(self.model).filter(self.model.id == id))
        return result.scalars().first()

    async def get_multi(self, db: AsyncSession, *, skip: int = 0, limit: int = 100) -> Sequence[ModelType]:
        """Fetch multiple records with pagination"""
        # Order by created_at desc if it exists on the model
        query = select(self.model)
        if hasattr(self.model, "created_at"):
            query = query.order_by(self.model.created_at.desc())
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()

    async def create(self, db: AsyncSession, *, obj_in: Any) -> ModelType:
        """Create a new database record"""
        if isinstance(obj_in, dict):
            obj_data = obj_in
        else:
            # Assume Pydantic model
            obj_data = obj_in.model_dump(exclude_unset=True)
            
        db_obj = self.model(**obj_data)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(self, db: AsyncSession, *, db_obj: ModelType, obj_in: Any) -> ModelType:
        """Update an existing database record"""
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            # Assume Pydantic model
            update_data = obj_in.model_dump(exclude_unset=True)
            
        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
                
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def remove(self, db: AsyncSession, *, id: UUID) -> Optional[ModelType]:
        """Delete a record by ID"""
        db_obj = await self.get(db, id)
        if db_obj:
            await db.delete(db_obj)
            await db.commit()
        return db_obj
