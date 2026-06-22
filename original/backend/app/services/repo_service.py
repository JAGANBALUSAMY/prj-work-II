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
        Includes github_api_status field to indicate data quality.
        """
        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "FastAPI-Analyzer-Agent"
        }
        if settings.GITHUB_TOKEN:
            headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"
        else:
            logger.warning(
                "GITHUB_TOKEN is not set in .env. GitHub API calls are unauthenticated and limited to "
                "60 requests/hour. Metadata (stars, forks, contributors) may return as 0 on rate-limit. "
                "Set GITHUB_TOKEN in your .env file for accurate survivability scores."
            )

        metadata = {
            "name": repo,
            "owner": owner,
            "description": "No description available",
            "stars": 0,
            "forks": 0,
            "open_issues": 0,
            "contributors_count": 0,
            "last_commit_date": None,
            "github_api_status": "not_fetched"
        }

        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            try:
                # 1. Fetch Repository Details
                repo_url = f"https://api.github.com/repos/{owner}/{repo}"
                resp = await client.get(repo_url, headers=headers)

                # Check for rate limit
                remaining = resp.headers.get("X-RateLimit-Remaining", "")
                if resp.status_code == 403 and remaining == "0":
                    reset_ts = resp.headers.get("X-RateLimit-Reset", "unknown")
                    logger.warning(
                        f"GitHub API rate limit exceeded for {owner}/{repo}. "
                        f"Limit resets at timestamp {reset_ts}. "
                        "Set GITHUB_TOKEN in .env to raise limit to 5000 req/hour."
                    )
                    metadata["github_api_status"] = "rate_limited"
                    return metadata

                if resp.status_code == 404:
                    logger.warning(f"GitHub repository {owner}/{repo} not found (404). URL may be private or incorrect.")
                    metadata["github_api_status"] = "not_found"
                    return metadata

                if resp.status_code == 200:
                    data = resp.json()
                    metadata["name"] = data.get("name", repo)
                    metadata["description"] = data.get("description") or "No description available"
                    metadata["stars"] = data.get("stargazers_count", 0)
                    metadata["forks"] = data.get("forks_count", 0)
                    metadata["open_issues"] = data.get("open_issues_count", 0)
                    metadata["github_api_status"] = "ok"
                else:
                    logger.warning(f"GitHub API details query failed: HTTP {resp.status_code} for {owner}/{repo}")
                    metadata["github_api_status"] = f"http_{resp.status_code}"

                # 2. Fetch Latest Commit Date
                commits_url = f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=1"
                commits_resp = await client.get(commits_url, headers=headers)
                if commits_resp.status_code == 200:
                    commits_data = commits_resp.json()
                    if commits_data and len(commits_data) > 0:
                        date_str = commits_data[0]["commit"]["committer"]["date"]
                        try:
                            metadata["last_commit_date"] = datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%SZ")
                        except ValueError:
                            metadata["last_commit_date"] = datetime.fromisoformat(date_str.replace("Z", "+00:00"))

                # 3. Fetch Contributors Count
                contrib_url = f"https://api.github.com/repos/{owner}/{repo}/contributors?per_page=100&anon=true"
                contrib_resp = await client.get(contrib_url, headers=headers)
                if contrib_resp.status_code == 200:
                    contrib_data = contrib_resp.json()
                    metadata["contributors_count"] = len(contrib_data)

            except Exception as e:
                logger.error(f"Error fetching metadata from GitHub for {owner}/{repo}: {str(e)}")
                metadata["github_api_status"] = f"error: {str(e)[:80]}"

        return metadata


    @staticmethod
    async def clone_repo_async(clone_url: str, local_path: str) -> None:
        """
        Executes git clone asynchronously. Removes pre-existing directory if present.
        """
        # Ensure base directory exists
        os.makedirs(os.path.dirname(local_path), exist_ok=True)

        # Optimization: if repo already cloned, reuse it to speed up analysis
        if os.path.exists(local_path) and os.path.exists(os.path.join(local_path, ".git")):
            logger.info(f"Repository already cloned at {local_path}. Reusing existing clone.")
            return
        
        # If directory already exists, clear it first.
        # On Windows, deferred file deletion can cause race conditions where git clone fails
        # because the folder is not fully cleared from NTFS metadata. 
        # Renaming the directory to a temporary name first is an atomic operation that resolves this.
        if os.path.exists(local_path):
            import stat
            import uuid
            def remove_readonly(func, path, excinfo):
                try:
                    os.chmod(path, stat.S_IWRITE)
                    func(path)
                except Exception:
                    pass
            
            temp_delete_path = f"{local_path}_del_{uuid.uuid4().hex}"
            try:
                os.rename(local_path, temp_delete_path)
                target_path = temp_delete_path
            except Exception as rename_err:
                logger.warning(f"Failed to atomically rename clone dir for deletion: {str(rename_err)}")
                target_path = local_path
                
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, lambda: shutil.rmtree(target_path, onerror=remove_readonly))
            
        # Run git clone synchronously in a separate thread to support both Selector and Proactor loops on Windows
        CLONE_TIMEOUT_SECONDS = 60
        import subprocess

        def _run_git_clone():
            return subprocess.run(
                ["git", "clone", "--depth=1", clone_url, local_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                errors="replace",
                timeout=CLONE_TIMEOUT_SECONDS
            )

        try:
            result = await asyncio.to_thread(_run_git_clone)
            returncode = result.returncode
            stdout = result.stdout
            stderr = result.stderr
        except subprocess.TimeoutExpired:
            logger.error(
                f"Git clone timed out after {CLONE_TIMEOUT_SECONDS}s for {clone_url}."
            )
            raise TimeoutError(
                f"Git clone timed out after {CLONE_TIMEOUT_SECONDS} seconds. "
                "The repository may be too large or the network connection is slow. "
                "Check your internet connection or try again later."
            )

        if returncode != 0:
            err_msg = stderr
            # If the clone succeeded but checkout failed (due to Windows path/case limitations),
            # we log it as a warning but proceed, since the repository objects are cloned.
            if "Clone succeeded, but checkout failed" in err_msg or "unable to checkout working tree" in err_msg:
                logger.warning(f"Git clone completed with Windows checkout warnings: {err_msg}")
                return
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
            import traceback
            tb = traceback.format_exc()
            logger.error(f"Error during repository acquisition background task: {tb}")
            try:
                # Set status to failed
                await repository_repo.update(db, db_obj=repo, obj_in={"status": "failed"})
            except Exception as inner_e:
                logger.error(f"Failed to update repository status to failed: {str(inner_e)}")
            raise RuntimeError(f"Repository acquisition failed: {str(e)}\n{tb}")

repo_service = RepoService()
