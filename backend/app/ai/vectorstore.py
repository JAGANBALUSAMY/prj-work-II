import os
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

def get_chroma_client():
    """
    Creates a persistent ChromaDB client pointing to the configured storage path.
    """
    import chromadb
    os.makedirs(settings.CHROMA_DB_PATH, exist_ok=True)
    return chromadb.PersistentClient(path=settings.CHROMA_DB_PATH)

def get_vector_store(collection_name: str = "repo_code"):
    """
    Returns a configured LangChain Chroma vector store instance.
    Uses OllamaEmbeddings as the default embedding strategy.
    """
    try:
        from langchain_community.vectorstores import Chroma
        # Try modern Ollama embeddings first, or fallback
        try:
            from langchain_ollama import OllamaEmbeddings
            embeddings = OllamaEmbeddings(
                base_url=settings.OLLAMA_BASE_URL,
                model=settings.OLLAMA_MODEL
            )
        except ImportError:
            from langchain_community.embeddings import OllamaEmbeddings
            embeddings = OllamaEmbeddings(
                base_url=settings.OLLAMA_BASE_URL,
                model=settings.OLLAMA_MODEL
            )
            
        client = get_chroma_client()
        return Chroma(
            client=client,
            collection_name=collection_name,
            embedding_function=embeddings
        )
    except Exception as e:
        logger.error(f"Failed to initialize Chroma vector store: {str(e)}")
        # Provide a mock or raise for safety
        raise RuntimeError(f"ChromaDB configuration failed: {str(e)}")
