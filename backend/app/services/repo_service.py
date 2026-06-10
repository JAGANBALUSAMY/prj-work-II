import os
import re
import shutil
import asyncio
import logging
from datetime import datetime
from urllib.parse import urlparse
from typing import Tuple, Dict, Any, Optional
import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.repository import Repository
from app.repositories.repo_repo import repository_repo

logger = logging.getLogger(__name__)

def parse_github_url(url: str) -> Tuple[str, str]:
    """
    Parses a GitHub URL and returns the owner and repository name.
    Supports formats:
      - https://github.com/owner/repo
      - https://github.com/owner/repo.git
      - git@github.com:owner/repo.git
    """
    url = url.strip()
    if url.startswith("git@"):
        # SSH Format
        match = re.match(r"git@github\.com:([^/]+)/([^.]+)(?:\.git)?", url)
        if match:
            return match.group(1), match.group(2)
    else:
        # HTTPS Format
        parsed = urlparse(url)
        if "github.com" in parsed.netloc:
            path = parsed.path.strip("/")
            parts = path.split("/")
            if len(parts) >= 2:
                owner = parts[0]
                repo = parts[1]
                if repo.endswith(".git"):
                    repo = repo[:-4]
                return owner, repo
                
    raise ValueError(
        "Invalid GitHub URL. Must be in the format "
        "https://github.com/owner/repo or git@github.com:owner/repo.git"
    )

class RepoService:
    @staticmethod
    async def fetch_github_metadata(owner: str, repo: str) -> Dict[str, Any]:
        """
        Fetches repository metadata from the GitHub REST API.
        Falls back to default values on API errors or rate limits.
        """
        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "FastAPI-Analyzer-Agent"
        }
        if settings.GITHUB_TOKEN:
            headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"

        metadata = {
            "name": repo,
            "owner": owner,
            "description": "No description available",
            "stars": 0,
            "forks": 0,
            "open_issues": 0,
            "contributors_count": 0,
            "last_commit_date": None
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                # 1. Fetch Repository Details
                repo_url = f"https://api.github.com/repos/{owner}/{repo}"
                resp = await client.get(repo_url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    metadata["name"] = data.get("name", repo)
                    metadata["description"] = data.get("description")
                    metadata["stars"] = data.get("stargazers_count", 0)
                    metadata["forks"] = data.get("forks_count", 0)
                    metadata["open_issues"] = data.get("open_issues_count", 0)
                else:
                    logger.warning(f"GitHub API details query failed: {resp.status_code} {resp.text}")

                # 2. Fetch Latest Commit Date
                commits_url = f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=1"
                commits_resp = await client.get(commits_url, headers=headers)
                if commits_resp.status_code == 200:
                    commits_data = commits_resp.json()
                    if commits_data and len(commits_data) > 0:
                        date_str = commits_data[0]["commit"]["committer"]["date"]
                        try:
                            # GitHub timestamp format: 2026-06-09T09:00:00Z
                            metadata["last_commit_date"] = datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%SZ")
                        except ValueError:
                            # Try alternate ISO parsing
                            metadata["last_commit_date"] = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                
                # 3. Fetch Contributors Count
                contrib_url = f"https://api.github.com/repos/{owner}/{repo}/contributors?per_page=100&anon=true"
                contrib_resp = await client.get(contrib_url, headers=headers)
                if contrib_resp.status_code == 200:
                    contrib_data = contrib_resp.json()
                    metadata["contributors_count"] = len(contrib_data)
                
            except Exception as e:
                logger.error(f"Error fetching metadata from GitHub: {str(e)}")
                # Continue with whatever fallback values we set
                
        return metadata

    @staticmethod
    async def clone_repo_async(clone_url: str, local_path: str) -> None:
        """
        Executes git clone asynchronously. Removes pre-existing directory if present.
        """
        # Ensure base directory exists
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        
        # If directory already exists, clear it first in a non-blocking thread
        if os.path.exists(local_path):
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, lambda: shutil.rmtree(local_path, ignore_errors=True))
            
        # Spawn async subprocess for git clone
        process = await asyncio.create_subprocess_exec(
            "git", "clone", clone_url, local_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            err_msg = stderr.decode("utf-8", errors="ignore")
            logger.error(f"Git clone command failed: {err_msg}")
            raise RuntimeError(f"Git clone failed: {err_msg}")

    @classmethod
    async def acquire_repository(
        cls, 
        db: AsyncSession, 
        clone_url: str, 
        repo_id: str
    ) -> None:
        """
        Background worker task to fetch metadata, clone, and update repository table.
        """
        # Fetch the repository from the DB using its UUID
        from uuid import UUID
        repo = await repository_repo.get(db, UUID(repo_id))
        if not repo:
            logger.error(f"Repository {repo_id} not found in database for acquisition.")
            return

        try:
            # Update status to cloning
            repo = await repository_repo.update(db, db_obj=repo, obj_in={"status": "cloning"})
            
            # Parse URL
            owner, repo_name = parse_github_url(clone_url)
            
            # Fetch metadata
            metadata = await cls.fetch_github_metadata(owner, repo_name)
            
            # Local clone directory path
            local_path = os.path.abspath(os.path.join(settings.CLONE_DIR, owner, repo_name))
            
            # Perform git clone
            await cls.clone_repo_async(clone_url, local_path)
            
            # Update repository metadata and status to cloned
            update_data = {
                "name": metadata["name"],
                "owner": metadata["owner"],
                "description": metadata["description"],
                "stars": metadata["stars"],
                "forks": metadata["forks"],
                "open_issues": metadata["open_issues"],
                "contributors_count": metadata["contributors_count"],
                "last_commit_date": metadata["last_commit_date"],
                "local_path": local_path,
                "status": "cloned"
            }
            await repository_repo.update(db, db_obj=repo, obj_in=update_data)
            logger.info(f"Successfully cloned and updated repository: {owner}/{repo_name}")
            
        except Exception as e:
            logger.error(f"Error during repository acquisition background task: {str(e)}")
            try:
                # Set status to failed
                await repository_repo.update(db, db_obj=repo, obj_in={"status": "failed"})
            except Exception as inner_e:
                logger.error(f"Failed to update repository status to failed: {str(inner_e)}")

repo_service = RepoService()
