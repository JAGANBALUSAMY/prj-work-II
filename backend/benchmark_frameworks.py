import asyncio
import os
import shutil
import uuid
from pathlib import Path
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from app.models.repository import Repository
from app.services.build_validation_service import build_validation_service
from app.repositories.repo_repo import repository_repo

BENCHMARK_DIR = Path("benchmark_repos")

REPOS = {
    "FastAPI": {
        "files": {
            "requirements.txt": "fastapi>=0.100.0\nuvicorn>=0.20.0\n",
            "main.py": "from fastapi import FastAPI\napp = FastAPI()\n@app.get('/')\ndef read_root(): return {'Hello': 'World'}\n"
        }
    },
    "Flask": {
        "files": {
            "requirements.txt": "Flask>=2.0.0\n",
            "app.py": "from flask import Flask\napp = Flask(__name__)\n@app.route('/')\ndef hello(): return 'Hello'\n"
        }
    },
    "React": {
        "files": {
            "package.json": '{"name": "react-app", "version": "1.0.0", "dependencies": {"react": "^18.2.0", "react-dom": "^18.2.0"}, "scripts": {"build": "echo \\"react build ok\\"", "test": "echo \\"react test ok\\""}}\n'
        }
    },
    "Express": {
        "files": {
            "package.json": '{"name": "express-app", "version": "1.0.0", "dependencies": {"express": "^4.18.2"}, "scripts": {"build": "echo \\"express build ok\\"", "test": "echo \\"express test ok\\""}}\n',
            "index.js": "const express = require('express'); const app = express(); app.get('/', (req, res) => res.send('ok'));"
        }
    },
    "Spring Boot": {
        "files": {
            "pom.xml": '''<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>demo</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>demo</name>
</project>'''
        }
    }
}

async def setup_db():
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:1234@localhost:5432/analyzer")
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    return async_session

async def main():
    print("=== Setting up Benchmark Environments ===")
    if BENCHMARK_DIR.exists():
        shutil.rmtree(BENCHMARK_DIR)
    BENCHMARK_DIR.mkdir()

    async_session = await setup_db()

    results = []

    async with async_session() as db:
        for framework, config in REPOS.items():
            repo_path = BENCHMARK_DIR / framework.lower().replace(" ", "_")
            repo_path.mkdir()
            
            for file_name, content in config["files"].items():
                (repo_path / file_name).write_text(content, encoding="utf-8")

            # Create dummy repo in DB
            repo_id = uuid.uuid4()
            repo = Repository(
                id=repo_id,
                name=f"benchmark-{framework.lower()}",
                owner="benchmark",
                clone_url=f"https://github.com/benchmark/{framework.lower()}",
                local_path=str(repo_path.absolute()),
                status="cloned"
            )
            db.add(repo)
            await db.commit()
            await db.refresh(repo)

            print(f"\\n--- Benchmarking {framework} ---")
            try:
                result = await build_validation_service.validate_build(db, repo_id, timeout=60.0)
                results.append((framework, result))
                print(f"Status: {result.get('validation_category')}")
                print(f"Score: {result.get('build_maturity_score')}/100")
            except Exception as e:
                print(f"Error benchmarking {framework}: {e}")

    print("\\n=== BENCHMARK SUMMARY ===")
    print(f"{'Framework':<15} | {'Category':<35} | {'Score':<5} | {'Ecosystem'}")
    print("-" * 75)
    for fw, r in results:
        cat = r.get('validation_category', 'ERROR')
        score = r.get('build_maturity_score', 0)
        eco = r.get('detected_ecosystem', 'Unknown')
        print(f"{fw:<15} | {cat:<35} | {score:<5} | {eco}")
        if fw == "FastAPI":
            print("\\n--- FastAPI Logs ---")
            print(r.get('logs'))
            print("------------------\\n")

if __name__ == "__main__":
    asyncio.run(main())
