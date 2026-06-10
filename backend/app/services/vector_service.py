import os
import json
import logging
from uuid import UUID
from typing import Dict, Any, List, Optional
import chromadb
from chromadb.api.types import Documents, EmbeddingFunction, Embeddings

from app.core.config import settings
from app.models.repository import Repository

logger = logging.getLogger(__name__)

class RobustEmbeddingFunction(EmbeddingFunction):
    """
    ChromaDB-compatible embedding function that tries to load the default
    local ONNX MiniLM-L6-V2 model. If it encounters network or library issues
    (e.g., offline mode or HuggingFace hub connection timeout), it falls back
    to a stable, mock 384-dimensional numeric vector generator.
    """
    def __init__(self):
        self.underlying = None
        try:
            from chromadb.utils import embedding_functions
            self.underlying = embedding_functions.DefaultEmbeddingFunction()
            logger.info("ChromaDB default local embedding function initialized successfully.")
        except Exception as e:
            logger.warning(f"Could not load default Chroma embedding function, using fallback mock: {e}")

    def __call__(self, input: Documents) -> Embeddings:
        if self.underlying:
            try:
                return self.underlying(input)
            except Exception as e:
                logger.warning(f"Chroma default embedding failed: {e}. Falling back to mock embeddings.")
        
        # Fallback Mock: return a simple deterministic 384-dimensional vector
        embeddings = []
        for text in input:
            val = float(len(text) % 100) / 100.0
            # Generate 384 floats
            vector = [val] * 384
            embeddings.append(vector)
        return embeddings

class VectorService:
    def __init__(self):
        os.makedirs(settings.CHROMA_DB_PATH, exist_ok=True)
        self.client = chromadb.PersistentClient(path=settings.CHROMA_DB_PATH)
        self.embedding_function = RobustEmbeddingFunction()
        
        # Initialize collections
        self.collections = {
            "metadata": self.client.get_or_create_collection(
                name="repo_metadata",
                embedding_function=self.embedding_function
            ),
            "dependencies": self.client.get_or_create_collection(
                name="dependency_reports",
                embedding_function=self.embedding_function
            ),
            "environments": self.client.get_or_create_collection(
                name="environment_reports",
                embedding_function=self.embedding_function
            ),
            "documentation": self.client.get_or_create_collection(
                name="documentation_reports",
                embedding_function=self.embedding_function
            )
        }
        logger.info("ChromaDB vector collections initialized successfully.")

    async def index_repository_metadata(self, repo: Repository) -> None:
        """Indexes repository base details: name, description, owner, stars, forks"""
        try:
            doc_id = str(repo.id)
            doc_text = (
                f"Repository: {repo.owner}/{repo.name}\n"
                f"Description: {repo.description or 'No description available.'}\n"
                f"Clone URL: {repo.clone_url}\n"
                f"Metrics: Stars={repo.stars}, Forks={repo.forks}, Open Issues={repo.open_issues}"
            )
            metadata = {
                "repository_id": str(repo.id),
                "name": repo.name,
                "owner": repo.owner,
                "stars": repo.stars,
                "forks": repo.forks
            }
            self.collections["metadata"].upsert(
                ids=[doc_id],
                documents=[doc_text],
                metadatas=[metadata]
            )
            logger.info(f"Indexed repository metadata in ChromaDB for: {repo.id}")
        except Exception as e:
            logger.error(f"Failed to index repository metadata in ChromaDB: {e}")

    async def index_dependency_report(self, repo: Repository) -> None:
        """Indexes parsed dependency intelligence profile details"""
        if not repo.dependencies_profile:
            logger.warning(f"No dependencies profile available to index for: {repo.id}")
            return
            
        try:
            doc_id = str(repo.id)
            profile = repo.dependencies_profile
            report = profile.get("report", {})
            deps = profile.get("dependencies", [])
            
            # Format list of packages
            pkgs_str = ", ".join([f"{d.get('name')}({d.get('version')})" for d in deps[:50]])
            if len(deps) > 50:
                pkgs_str += "... [and more]"
                
            doc_text = (
                f"Dependency Report for project {repo.owner}/{repo.name}\n"
                f"Summary: {report.get('summary', 'No summary.')}\n"
                f"Total Package Count: {report.get('total_count', 0)}\n"
                f"Duplicate Package Declarations: {len(report.get('duplicates', []))}\n"
                f"Missing Version Warnings: {len(report.get('missing_versions', []))}\n"
                f"Suspicious Declarations: {len(report.get('suspicious_declarations', []))}\n"
                f"Packages: {pkgs_str}"
            )
            metadata = {
                "repository_id": str(repo.id),
                "total_packages": int(report.get("total_count", 0)),
                "duplicates_count": len(report.get("duplicates", [])),
                "missing_versions_count": len(report.get("missing_versions", [])),
                "suspicious_count": len(report.get("suspicious_declarations", []))
            }
            self.collections["dependencies"].upsert(
                ids=[doc_id],
                documents=[doc_text],
                metadatas=[metadata]
            )
            logger.info(f"Indexed dependency report in ChromaDB for: {repo.id}")
        except Exception as e:
            logger.error(f"Failed to index dependency report in ChromaDB: {e}")

    async def index_environment_report(self, repo: Repository) -> None:
        """Indexes environment variable reconstruction details"""
        if not repo.environment_profile:
            logger.warning(f"No environment profile available to index for: {repo.id}")
            return

        try:
            doc_id = str(repo.id)
            profile = repo.environment_profile
            vars_list = profile.get("variables", [])
            
            undocumented = [v.get("name") for v in vars_list if v.get("is_missing_from_template")]
            documented = [v.get("name") for v in vars_list if not v.get("is_missing_from_template")]
            
            doc_text = (
                f"Environment Variables Report for project {repo.owner}/{repo.name}\n"
                f"Summary: {profile.get('summary', 'No summary.')}\n"
                f"Total Variables Scanned: {len(vars_list)}\n"
                f"Scanned Files Count: {profile.get('scanned_files_count', 0)}\n"
                f"Documented Variables: {', '.join(documented) if documented else 'None'}\n"
                f"Undocumented Code References: {', '.join(undocumented) if undocumented else 'None'}\n"
                f"Template File Output:\n{profile.get('template', '')}"
            )
            metadata = {
                "repository_id": str(repo.id),
                "variables_count": len(vars_list),
                "undocumented_count": len(undocumented),
                "template_files": ", ".join(profile.get("template_files_found", []))
            }
            self.collections["environments"].upsert(
                ids=[doc_id],
                documents=[doc_text],
                metadatas=[metadata]
            )
            logger.info(f"Indexed environment report in ChromaDB for: {repo.id}")
        except Exception as e:
            logger.error(f"Failed to index environment report in ChromaDB: {e}")

    async def index_documentation_report(self, repo: Repository) -> None:
        """Indexes documentation intelligence completeness details"""
        if not repo.documentation_profile:
            logger.warning(f"No documentation profile available to index for: {repo.id}")
            return

        try:
            doc_id = str(repo.id)
            profile = repo.documentation_profile
            sections = profile.get("sections", [])
            suggestions = profile.get("suggestions", [])
            
            sections_str = ", ".join([f"{s.get('category')} ({s.get('score')}%)" for s in sections])
            suggestions_str = "\n".join([f"- {s}" for s in suggestions])
            
            doc_text = (
                f"Documentation Intelligence Report for project {repo.owner}/{repo.name}\n"
                f"Summary: {profile.get('summary', 'No summary.')}\n"
                f"Documentation Completeness Score: {profile.get('completeness_score', 0)}%\n"
                f"README File Found: {profile.get('scanned_file', 'None')}\n"
                f"Evaluated Categories: {sections_str}\n"
                f"Optimization Suggestions:\n{suggestions_str if suggestions_str else 'None'}"
            )
            metadata = {
                "repository_id": str(repo.id),
                "completeness_score": int(profile.get("completeness_score", 0)),
                "scanned_file": profile.get("scanned_file") or "None",
                "suggestions_count": len(suggestions)
            }
            self.collections["documentation"].upsert(
                ids=[doc_id],
                documents=[doc_text],
                metadatas=[metadata]
            )
            logger.info(f"Indexed documentation report in ChromaDB for: {repo.id}")
        except Exception as e:
            logger.error(f"Failed to index documentation report in ChromaDB: {e}")

    def _query_collection(self, collection_name: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Queries a collection and formats standard retrieval results"""
        try:
            col = self.collections[collection_name]
            results = col.query(
                query_texts=[query],
                n_results=limit
            )
            
            formatted = []
            if results and results.get("ids") and len(results["ids"]) > 0:
                ids = results["ids"][0]
                docs = results["documents"][0]
                metas = results["metadatas"][0]
                distances = results["distances"][0] if results.get("distances") else [0.0] * len(ids)
                
                for i in range(len(ids)):
                    formatted.append({
                        "id": ids[i],
                        "text": docs[i],
                        "metadata": metas[i],
                        "score": float(distances[i])
                    })
            return formatted
        except Exception as e:
            logger.error(f"Error querying collection {collection_name}: {e}")
            return []

    def search_metadata(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Searches indexed repository metadata"""
        return self._query_collection("metadata", query, limit)

    def search_dependencies(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Searches indexed dependency reports"""
        return self._query_collection("dependencies", query, limit)

    def search_environments(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Searches indexed environment reports"""
        return self._query_collection("environments", query, limit)

    def search_documentation(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Searches indexed documentation reports"""
        return self._query_collection("documentation", query, limit)

vector_service = VectorService()
