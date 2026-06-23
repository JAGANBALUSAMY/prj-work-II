import asyncio
import os
from uuid import UUID
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from app.repositories.analysis_repo import analysis_repo

async def main():
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:1234@localhost:5432/analyzer")
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with async_session() as db:
        res = await db.execute(text("SELECT id FROM analyses LIMIT 1;"))
        row = res.fetchone()
        if not row:
            print("No analyses.")
            return
        analysis_id = row[0]
        analysis_db = await analysis_repo.get(db, analysis_id)
        
        # Test updating a JSON column
        old_val = analysis_db.logs or []
        new_val = list(old_val)
        new_val.append("TEST_LOG_SURVIVES")
        
        await analysis_repo.update(db, db_obj=analysis_db, obj_in={"logs": new_val})
        
    # Open new session to verify persistence
    async with async_session() as db2:
        analysis2 = await analysis_repo.get(db2, analysis_id)
        if "TEST_LOG_SURVIVES" in (analysis2.logs or []):
            print("Test flag in new session: SURVIVES")
        else:
            print("Test flag in new session: FAILED")

if __name__ == "__main__":
    asyncio.run(main())
