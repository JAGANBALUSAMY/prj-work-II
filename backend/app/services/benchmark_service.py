import logging
import asyncio
from typing import List, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.benchmark import BenchmarkRun, BenchmarkResult
from app.models.repository import Repository
from app.repositories.repo_repo import repository_repo
from app.services.repo_service import RepoService, parse_github_url
from app.services.analysis_service import AnalysisService
from app.core.config import settings
import os

logger = logging.getLogger(__name__)

# Ground truth dataset of 15 repositories across 5 ecosystems
BENCHMARK_REPOSITORIES = [
    # Python
    {"url": "https://github.com/tiangolo/fastapi", "ecosystem": "Python", "has_deps": True, "has_env": False, "build_success": True, "has_readme": True},
    {"url": "https://github.com/pallets/flask", "ecosystem": "Python", "has_deps": True, "has_env": False, "build_success": True, "has_readme": True},
    {"url": "https://github.com/encode/starlette", "ecosystem": "Python", "has_deps": True, "has_env": False, "build_success": True, "has_readme": True},
    # Node.js
    {"url": "https://github.com/expressjs/express", "ecosystem": "Node.js", "has_deps": True, "has_env": False, "build_success": True, "has_readme": True},
    {"url": "https://github.com/tj/commander.js", "ecosystem": "Node.js", "has_deps": True, "has_env": False, "build_success": True, "has_readme": True},
    {"url": "https://github.com/axios/axios", "ecosystem": "Node.js", "has_deps": True, "has_env": False, "build_success": True, "has_readme": True},
    # Java
    {"url": "https://github.com/google/guava", "ecosystem": "Java", "has_deps": True, "has_env": False, "build_success": True, "has_readme": True},
    {"url": "https://github.com/qos-ch/slf4j", "ecosystem": "Java", "has_deps": True, "has_env": False, "build_success": True, "has_readme": True},
    {"url": "https://github.com/square/okhttp", "ecosystem": "Java", "has_deps": True, "has_env": False, "build_success": True, "has_readme": True},
    # Go
    {"url": "https://github.com/gin-gonic/gin", "ecosystem": "Go", "has_deps": True, "has_env": False, "build_success": True, "has_readme": True},
    {"url": "https://github.com/gofiber/fiber", "ecosystem": "Go", "has_deps": True, "has_env": False, "build_success": True, "has_readme": True},
    {"url": "https://github.com/spf13/cobra", "ecosystem": "Go", "has_deps": True, "has_env": False, "build_success": True, "has_readme": True},
    # Rust
    {"url": "https://github.com/tokio-rs/tokio", "ecosystem": "Rust", "has_deps": True, "has_env": False, "build_success": True, "has_readme": True},
    {"url": "https://github.com/serde-rs/serde", "ecosystem": "Rust", "has_deps": True, "has_env": False, "build_success": True, "has_readme": True},
    {"url": "https://github.com/actix/actix-web", "ecosystem": "Rust", "has_deps": True, "has_env": False, "build_success": True, "has_readme": True},
]

class BenchmarkService:
    @staticmethod
    async def execute_benchmark_run(db: AsyncSession) -> BenchmarkRun:
        """
        Executes the benchmark against the 15 ground truth repositories.
        """
        # Create a new BenchmarkRun
        run = BenchmarkRun(total_repos=len(BENCHMARK_REPOSITORIES), status="running")
        db.add(run)
        await db.commit()
        await db.refresh(run)

        tech_correct = 0
        dep_correct = 0
        env_correct = 0
        build_correct = 0
        docs_correct = 0

        for idx, gt in enumerate(BENCHMARK_REPOSITORIES):
            url = gt["url"]
            logger.info(f"[{idx+1}/{len(BENCHMARK_REPOSITORIES)}] Benchmarking {url}...")
            try:
                owner, repo_name = parse_github_url(url)
                
                # Check if repo exists in DB
                stmt = select(Repository).where(Repository.clone_url == url)
                result = await db.execute(stmt)
                repo = result.scalar_one_or_none()
                
                if not repo:
                    repo = Repository(
                        name=repo_name,
                        owner=owner,
                        clone_url=url,
                        status="cloning"
                    )
                    db.add(repo)
                    await db.commit()
                    await db.refresh(repo)
                
                # Fetch metadata and clone
                metadata = await RepoService.fetch_github_metadata(owner, repo_name)
                local_path = os.path.abspath(os.path.join(settings.CLONE_DIR, owner, repo_name))
                await RepoService.clone_repo_async(url, local_path)
                
                # Update Repo with metadata
                repo.local_path = local_path
                repo.status = "cloned"
                repo.description = metadata.get("description")
                repo.stars = metadata.get("stars", 0)
                await db.commit()

                # Run Analysis Workflow
                await AnalysisService.run_analysis(repo.id)
                
                # Refresh repository to get analysis outputs
                await db.refresh(repo)
                
                # -------------------
                # Measure Accuracies
                # -------------------
                
                # Tech Detection
                predicted_ecosystem = repo.detected_stack.get("ecosystem") if repo.detected_stack else None
                tech_match = predicted_ecosystem == gt["ecosystem"]
                if tech_match: tech_correct += 1
                
                # Dependencies
                predicted_has_deps = bool(repo.dependencies_profile and len(repo.dependencies_profile.get("dependencies", [])) > 0)
                dep_match = predicted_has_deps == gt["has_deps"]
                if dep_match: dep_correct += 1
                
                # Environment
                predicted_has_env = bool(repo.environment_profile and len(repo.environment_profile.get("variables", [])) > 0)
                env_match = predicted_has_env == gt["has_env"]
                if env_match: env_correct += 1
                
                # Build Validation
                predicted_build_success = bool(repo.build_result and repo.build_result.get("build_success", False))
                build_match = predicted_build_success == gt["build_success"]
                if build_match: build_correct += 1
                
                # Documentation
                predicted_has_readme = bool(repo.documentation_profile and repo.documentation_profile.get("scanned_file") != "None")
                docs_match = predicted_has_readme == gt["has_readme"]
                if docs_match: docs_correct += 1
                
                # Create BenchmarkResult record
                b_result = BenchmarkResult(
                    run_id=run.id,
                    repo_url=url,
                    expected_ecosystem=gt["ecosystem"],
                    predicted_ecosystem=predicted_ecosystem,
                    tech_match=tech_match,
                    expected_has_deps=gt["has_deps"],
                    predicted_has_deps=predicted_has_deps,
                    dep_match=dep_match,
                    expected_has_env=gt["has_env"],
                    predicted_has_env=predicted_has_env,
                    env_match=env_match,
                    expected_build_success=gt["build_success"],
                    predicted_build_success=predicted_build_success,
                    build_match=build_match,
                    expected_has_readme=gt["has_readme"],
                    predicted_has_readme=predicted_has_readme,
                    docs_match=docs_match
                )
                db.add(b_result)
                await db.commit()
                
                run.completed_repos += 1
                await db.commit()
                
            except Exception as e:
                logger.error(f"Error benchmarking {url}: {str(e)}")
                # Still record a failed result to keep tracking accurate
                b_result = BenchmarkResult(
                    run_id=run.id,
                    repo_url=url,
                    expected_ecosystem=gt["ecosystem"],
                    predicted_ecosystem="Error",
                    tech_match=False,
                    expected_has_deps=gt["has_deps"],
                    predicted_has_deps=False,
                    dep_match=False,
                    expected_has_env=gt["has_env"],
                    predicted_has_env=False,
                    env_match=False,
                    expected_build_success=gt["build_success"],
                    predicted_build_success=False,
                    build_match=False,
                    expected_has_readme=gt["has_readme"],
                    predicted_has_readme=False,
                    docs_match=False
                )
                db.add(b_result)
                run.completed_repos += 1
                await db.commit()

        # Compute final aggregated metrics
        total = len(BENCHMARK_REPOSITORIES)
        run.tech_accuracy = round((tech_correct / total) * 100, 2)
        run.dependency_accuracy = round((dep_correct / total) * 100, 2)
        run.environment_accuracy = round((env_correct / total) * 100, 2)
        run.build_accuracy = round((build_correct / total) * 100, 2)
        run.docs_accuracy = round((docs_correct / total) * 100, 2)
        run.status = "completed"
        run.completed_at = datetime.utcnow()
        await db.commit()
        await db.refresh(run)

        return run

    @staticmethod
    async def get_latest_run(db: AsyncSession) -> BenchmarkRun | None:
        stmt = select(BenchmarkRun).order_by(BenchmarkRun.created_at.desc()).limit(1)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_run_results(db: AsyncSession, run_id: str) -> List[BenchmarkResult]:
        stmt = select(BenchmarkResult).where(BenchmarkResult.run_id == run_id)
        result = await db.execute(stmt)
        return list(result.scalars().all())

benchmark_service = BenchmarkService()
