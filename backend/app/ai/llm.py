import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

def get_llm():
    """
    Returns a configured LangChain ChatOllama instance.
    Prepares the Ollama integration for repository code analysis.
    """
    try:
        # Try importing the modern langchain-ollama integration
        from langchain_ollama import ChatOllama
        return ChatOllama(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_MODEL,
            temperature=0.0
        )
    except ImportError:
        try:
            # Fallback to the community-supported legacy import
            from langchain_community.chat_models import ChatOllama
            return ChatOllama(
                base_url=settings.OLLAMA_BASE_URL,
                model=settings.OLLAMA_MODEL,
                temperature=0.0
            )
        except ImportError:
            logger.error("LangChain Ollama wrappers are not installed. AI analysis will fail.")
            raise RuntimeError("Ollama LangChain modules not found. Ensure requirements are installed.")
