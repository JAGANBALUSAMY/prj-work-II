import json
import logging
from typing import Dict, Any, List
from app.models.repository import Repository
from app.services.vector_service import vector_service

logger = logging.getLogger(__name__)

class FailureRAGService:
    def __init__(self):
        try:
            self.collection = vector_service.client.get_or_create_collection(
                name="failure_patterns",
                embedding_function=vector_service.embedding_function
            )
            logger.info("ChromaDB collection 'failure_patterns' initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize 'failure_patterns' collection in ChromaDB: {e}")
            self.collection = None

    async def index_failure(self, repo: Repository, build_result: Dict[str, Any], diagnosis: Dict[str, Any]) -> None:
        """
        Indexes a build failure into ChromaDB collection.
        - Document: Build logs.
        - Metadata: Repository details, ecosystem, category, root cause, and serialized recommendations.
        """
        if not self.collection:
            logger.warning("failure_patterns collection is not initialized. Skipping indexing.")
            return

        try:
            doc_id = str(repo.id)
            logs = build_result.get("logs") or ""
            
            if not logs.strip():
                logger.warning(f"No logs available to index for build failure of repo {repo.id}.")
                return

            metadata = {
                "repository_id": str(repo.id),
                "repository_name": repo.name,
                "repository_owner": repo.owner,
                "detected_ecosystem": build_result.get("detected_ecosystem") or "Unknown",
                "category": diagnosis.get("category") or "Unknown",
                "root_cause": diagnosis.get("root_cause") or "Unknown",
                "recommendations_json": json.dumps(diagnosis.get("recommendations") or [])
            }

            self.collection.upsert(
                ids=[doc_id],
                documents=[logs],
                metadatas=[metadata]
            )
            logger.info(f"Successfully indexed build failure in ChromaDB for repo: {repo.id}")
        except Exception as e:
            logger.error(f"Failed to index build failure in ChromaDB for repo {repo.id}: {e}")

    def retrieve_similar_failures(self, query_logs: str, limit: int = 3) -> List[Dict[str, Any]]:
        """
        Retrieves the top similar failures from the database matching the query logs.
        Returns a list of dictionaries containing:
        - repository_id
        - repository_name
        - ecosystem
        - category
        - root_cause
        - recommendations (list of strings)
        - logs (matching document text)
        - similarity_score (distance)
        """
        if not self.collection:
            logger.warning("failure_patterns collection is not initialized. Returning empty list.")
            return []

        if not query_logs or not query_logs.strip():
            return []

        try:
            results = self.collection.query(
                query_texts=[query_logs],
                n_results=limit
            )

            formatted = []
            if results and results.get("ids") and len(results["ids"]) > 0:
                ids = results["ids"][0]
                docs = results["documents"][0]
                metas = results["metadatas"][0]
                distances = results["distances"][0] if results.get("distances") else [0.0] * len(ids)

                for i in range(len(ids)):
                    meta = metas[i] or {}
                    try:
                        recs = json.loads(meta.get("recommendations_json", "[]"))
                    except Exception:
                        recs = []

                    formatted.append({
                        "repository_id": meta.get("repository_id"),
                        "repository_name": meta.get("repository_name"),
                        "ecosystem": meta.get("detected_ecosystem"),
                        "category": meta.get("category"),
                        "root_cause": meta.get("root_cause"),
                        "recommendations": recs,
                        "logs": docs[i],
                        "similarity_score": float(distances[i])
                    })
            return formatted
        except Exception as e:
            logger.error(f"Error retrieving similar failures from ChromaDB: {e}")
            return []

failure_rag_service = FailureRAGService()
