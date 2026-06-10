import os
import re
import logging
from uuid import UUID
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.repo_repo import repository_repo

logger = logging.getLogger(__name__)

class DocumentationService:
    @classmethod
    async def analyze_documentation(cls, db: AsyncSession, repo_id: UUID) -> Dict[str, Any]:
        """
        Orchestrates documentation analysis. It searches for README files,
        evaluates sections (Description, Installation, Setup, Env Vars, Usage, API Docs),
        generates completeness metrics, compiles a structured report,
        and persists the profile in the database.
        
        This method is structured modularly to allow switching between rule-based parser
        and LLM-based analysis in the future.
        """
        repo = await repository_repo.get(db, repo_id)
        if not repo or not repo.local_path or not os.path.exists(repo.local_path):
            logger.warning(f"Repository {repo_id} path '{repo.local_path if repo else 'None'}' does not exist. Skipping doc scan.")
            return cls._empty_profile("Repository path not found.")

        # Resolve README file path
        readme_path = cls._find_readme_path(repo.local_path)
        if not readme_path:
            profile = cls._empty_profile("No README.md found in the repository root.")
            await repository_repo.update(db, db_obj=repo, obj_in={"documentation_profile": profile})
            return profile

        # Read README content
        try:
            with open(readme_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
        except Exception as e:
            logger.error(f"Failed to read README file at {readme_path}: {e}")
            profile = cls._empty_profile(f"Error reading README file: {str(e)}")
            await repository_repo.update(db, db_obj=repo, obj_in={"documentation_profile": profile})
            return profile

        # Choose analysis method: Rule-Based Parser (default)
        # In the future, this can be toggled or merged with LLM analysis:
        # if settings.USE_LLM_ANALYSIS:
        #     profile = await cls._analyze_with_llm(content)
        # else:
        #     profile = cls._analyze_with_rules(content)
        
        profile = cls._analyze_with_rules(content, os.path.basename(readme_path))

        # Update database Repository record
        await repository_repo.update(db, db_obj=repo, obj_in={"documentation_profile": profile})
        logger.info(f"Documentation analysis complete for {repo_id}. Score: {profile['completeness_score']}%")
        return profile

    @classmethod
    def _find_readme_path(cls, root_dir: str) -> Optional[str]:
        """Looks for common README filenames in the repository root (case-insensitive)"""
        candidates = ["README.md", "README.markdown", "readme.md", "README.txt", "README"]
        for candidate in candidates:
            path = os.path.join(root_dir, candidate)
            if os.path.exists(path):
                return path
        # Try a case-insensitive match for anything starting with 'readme' in root directory
        try:
            for item in os.listdir(root_dir):
                if item.lower().startswith("readme") and os.path.isfile(os.path.join(root_dir, item)):
                    return os.path.join(root_dir, item)
        except Exception:
            pass
        return None

    @classmethod
    def _analyze_with_rules(cls, content: str, filename: str) -> Dict[str, Any]:
        """Rule-based parsing logic to score README sections and extract details"""
        
        # 1. Project Description (Weight: 15%)
        # Look for description sections or general opening lines
        has_desc_header = re.search(r"(?i)#+\s*(description|overview|about|introduction)", content)
        desc_score = 0
        desc_feedback = "No description section found."
        # If there is a header or if the content has a title at top followed by text
        top_text_len = len(re.sub(r"#+.*", "", content).strip())
        if has_desc_header:
            desc_score = 100
            desc_feedback = "Project description is documented under a dedicated section."
        elif top_text_len > 100:
            desc_score = 80
            desc_feedback = "No dedicated Description header found, but introductory paragraph is present."
        elif len(content.strip()) > 50:
            desc_score = 40
            desc_feedback = "Description is very brief."

        # 2. Installation Instructions (Weight: 20%)
        has_install_header = re.search(r"(?i)#+\s*(install|prerequisites|requirements|getting\s+started|download)", content)
        has_install_code = re.search(r"(?i)(npm\s+install|pip\s+install|docker\s+pull|git\s+clone|mvn\s+install|go\s+get|yarn\s+add)", content)
        install_score = 0
        install_feedback = "No installation details detected."
        if has_install_header and has_install_code:
            install_score = 100
            install_feedback = "Dedicated installation section with package installation code blocks is present."
        elif has_install_header:
            install_score = 60
            install_feedback = "Installation header found, but lacks package installer code blocks."
        elif has_install_code:
            install_score = 50
            install_feedback = "Install commands detected, but no dedicated Installation section header exists."

        # 3. Setup Instructions (Weight: 20%)
        has_setup_header = re.search(r"(?i)#+\s*(setup|config|environment\s+setup|configure|bootstrap|initialization)", content)
        has_setup_keywords = re.search(r"(?i)(\.env|config\.json|config\.py|settings\.py|setup\s+steps|environment\s+variables)", content)
        setup_score = 0
        setup_feedback = "No setup or configuration details detected."
        if has_setup_header and has_setup_keywords:
            setup_score = 100
            setup_feedback = "Dedicated setup section containing file configuration instructions is present."
        elif has_setup_header:
            setup_score = 60
            setup_feedback = "Setup header found, but lacks explicit configuration file directives."
        elif has_setup_keywords:
            setup_score = 50
            setup_feedback = "Configuration keywords found, but no dedicated Setup header is present."

        # 4. Environment Variables (Weight: 15%)
        # Look for mention of environment variables or env keys
        has_env_docs = re.search(r"(?i)(environment\s+variables|env\s+vars|\.env\.example|\.env\.template|configuration\s+keys)", content)
        has_env_vars = re.search(r"\b(DATABASE_URL|JWT_SECRET|PORT|REDIS_HOST|MONGO_URI|AWS_|SECRET_KEY|API_KEY|API_SECRET)\b", content)
        env_score = 0
        env_feedback = "No environment variables documentation found."
        if has_env_docs and has_env_vars:
            env_score = 100
            env_feedback = "Dedicated environment variables section listing specific configuration keys is present."
        elif has_env_docs:
            env_score = 60
            env_feedback = "Environment variables mentioned, but no listing of key names detected."
        elif has_env_vars:
            env_score = 50
            env_feedback = "Individual environment variable keys detected in the text, but lacks structured documentation."

        # 5. Usage Examples (Weight: 15%)
        has_usage_header = re.search(r"(?i)#+\s*(usage|run|how\s+to\s+run|examples|quickstart|start)", content)
        has_usage_cmds = re.search(r"(?i)(npm\s+run|python\s+main|node\s+index|npm\s+start|python\s+-m|java\s+-jar|docker-compose\s+up|python\s+run\.py)", content)
        usage_score = 0
        usage_feedback = "No usage details or execution commands detected."
        if has_usage_header and has_usage_cmds:
            usage_score = 100
            usage_feedback = "Dedicated usage section with execution examples/commands is present."
        elif has_usage_header:
            usage_score = 60
            usage_feedback = "Usage header found, but lacks clear execution or CLI command examples."
        elif has_usage_cmds:
            usage_score = 50
            usage_feedback = "Usage commands detected in text, but no dedicated Usage header exists."

        # 6. API Documentation (Weight: 15%)
        has_api_header = re.search(r"(?i)#+\s*(api|endpoints|routes|rest\s+api|http\s+endpoints|swagger)", content)
        has_api_details = re.search(r"(?i)(GET|POST|PUT|DELETE|/api/|JSON|GraphQL|query|mutation|headers|response)", content)
        api_score = 0
        api_feedback = "No API endpoints documentation found."
        if has_api_header and has_api_details:
            api_score = 100
            api_feedback = "Dedicated API routing documentation with request/endpoint declarations is present."
        elif has_api_header:
            api_score = 60
            api_feedback = "API header found, but lacks structured endpoints listing."
        elif has_api_details:
            api_score = 40
            api_feedback = "API keywords detected, but no formal API docs section exists."

        # Compute weighted overall score
        completeness_score = int(
            (desc_score * 0.15) +
            (install_score * 0.20) +
            (setup_score * 0.20) +
            (env_score * 0.15) +
            (usage_score * 0.15) +
            (api_score * 0.15)
        )

        # Build suggestions
        suggestions = []
        if desc_score < 80:
            suggestions.append("Add a detailed description or overview section explaining the project's purpose.")
        if install_score < 100:
            suggestions.append("Provide explicit installation instructions (e.g. clone commands, npm/pip packages installer blocks).")
        if setup_score < 100:
            suggestions.append("Document configuration setup steps, including config file placement or command-line boot steps.")
        if env_score < 100:
            suggestions.append("List and document all environment variables required by the project (e.g. DATABASE_URL, JWT_SECRET).")
        if usage_score < 100:
            suggestions.append("Add clear usage examples showing how to run the application locally or run tests.")
        if api_score < 100:
            suggestions.append("Document API endpoints, HTTP routes (GET/POST), request parameters, and response schemas.")

        sections = [
            {"category": "Project Description", "score": desc_score, "found": desc_score > 0, "details": desc_feedback},
            {"category": "Installation Instructions", "score": install_score, "found": install_score > 0, "details": install_feedback},
            {"category": "Setup Instructions", "score": setup_score, "found": setup_score > 0, "details": setup_feedback},
            {"category": "Environment Variables", "score": env_score, "found": env_score > 0, "details": env_feedback},
            {"category": "Usage Examples", "score": usage_score, "found": usage_score > 0, "details": usage_feedback},
            {"category": "API Documentation", "score": api_score, "found": api_score > 0, "details": api_feedback}
        ]

        report_summary = (
            f"Evaluated {filename}. Overall completeness score is {completeness_score}%. "
            f"Detected {sum(1 for s in sections if s['found'])} out of 6 key documentation sections."
        )

        return {
            "completeness_score": completeness_score,
            "scanned_file": filename,
            "sections": sections,
            "suggestions": suggestions,
            "summary": report_summary,
            "readme_preview": content[:2000] + ("\n... [truncated]" if len(content) > 2000 else "")
        }

    @classmethod
    async def _analyze_with_llm(cls, content: str) -> Dict[str, Any]:
        """
        Placeholder method for future LLM integration (e.g. Ollama/LangChain pipeline).
        This makes the service class structure future-ready and modular.
        """
        # Here we would write:
        # chain = prompt | llm | parser
        # result = await chain.ainvoke({"readme": content})
        # return result
        raise NotImplementedError("LLM analyzer is not yet integrated.")

    @classmethod
    def _empty_profile(cls, message: str) -> Dict[str, Any]:
        """Returns a default structure when documentation is missing or unreadable"""
        return {
            "completeness_score": 0,
            "scanned_file": None,
            "sections": [
                {"category": "Project Description", "score": 0, "found": False, "details": "README file missing or unreadable."},
                {"category": "Installation Instructions", "score": 0, "found": False, "details": "README file missing or unreadable."},
                {"category": "Setup Instructions", "score": 0, "found": False, "details": "README file missing or unreadable."},
                {"category": "Environment Variables", "score": 0, "found": False, "details": "README file missing or unreadable."},
                {"category": "Usage Examples", "score": 0, "found": False, "details": "README file missing or unreadable."},
                {"category": "API Documentation", "score": 0, "found": False, "details": "README file missing or unreadable."}
            ],
            "suggestions": ["Create a README.md file in the root directory to document the project."],
            "summary": message,
            "readme_preview": ""
        }

documentation_service = DocumentationService()
