import asyncio
import os
import sys
from uuid import UUID
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from app.services.build_validation_service import build_validation_service

async def main():
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:1234@localhost:5432/analyzer")
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with async_session() as db:
        res = await db.execute(text("SELECT id FROM repositories LIMIT 1;"))
        row = res.fetchone()
        if not row:
            print("No repositories found in the database.")
            return
        repo_id_str = str(row[0])
        
        print(f"Triggering multi-stage validation for {repo_id_str}...")
        result = await build_validation_service.validate_build(db, UUID(repo_id_str))
        
        print("\n=== MULTI-STAGE VALIDATION BENCHMARK RESULTS ===")
        print(f"Build Success:       {result.get('build_success')}")
        print(f"Build Maturity:      {result.get('build_maturity_score')}/100")
        print(f"Dependency Success:  {result.get('dependency_success')}")
        print(f"Compilation Success: {result.get('compilation_success')}")
        print(f"Test Success:        {result.get('test_success')}")
        print(f"Runtime Success:     {result.get('runtime_success')}")
        print(f"Ecosystem Detected:  {result.get('detected_ecosystem')}")
        print("\nCommands Executed:")
        for cmd in result.get("commands_executed", []):
            print(f"  - {cmd}")
            
        print("\nLog snippet:")
        logs = result.get("container_logs", "") or ""
        print("\n".join(logs.split("\n")[-15:]))

if __name__ == "__main__":
    asyncio.run(main())
