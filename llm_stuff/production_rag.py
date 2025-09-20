import os
import asyncio
import logging
from typing import List, Dict, Any, Optional
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from dotenv import load_dotenv
import uuid
import time
from functools import wraps

# Set environment variables for production
os.environ['TOKENIZERS_PARALLELISM'] = 'false'
os.environ['LOGFIRE_IGNORE_NO_CONFIG'] = '1'

load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def retry_on_failure(max_retries=3, delay=1):
    """Decorator for retry logic"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    logger.warning(f"Attempt {attempt + 1} failed for {func.__name__}: {e}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(delay * (2 ** attempt))  # Exponential backoff
            raise last_exception
        return wrapper
    return decorator

class ProductionRAGModule:
    def __init__(self):
        try:
            # Load configuration with validation
            self.embedding_model = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
            self.collection_name = os.getenv("COLLECTION_NAME", "research_papers_prod")
            self.rag_top_k = int(os.getenv("RAG_TOP_K", "5"))
            self.chunk_size = int(os.getenv("CHUNK_SIZE", "500"))

            # Validate required environment variables
            required_vars = ["QDRANT_URL", "QDRANT_API_KEY"]
            missing_vars = [var for var in required_vars if not os.getenv(var)]
            if missing_vars:
                raise ValueError(f"Missing required environment variables: {missing_vars}")

            # Initialize model with error handling
            logger.info(f"Loading embedding model: {self.embedding_model}")
            self.model = SentenceTransformer(self.embedding_model)

            # Initialize Qdrant client with error handling
            self.qdrant_client = QdrantClient(
                url=os.getenv("QDRANT_URL"),
                api_key=os.getenv("QDRANT_API_KEY"),
                timeout=30  # 30 second timeout
            )

            # Test connection
            self._test_connection()

        except Exception as e:
            logger.error(f"Failed to initialize RAG module: {e}")
            raise

    def _test_connection(self):
        """Test Qdrant connection"""
        try:
            collections = self.qdrant_client.get_collections()
            logger.info("Qdrant connection successful")
        except Exception as e:
            logger.error(f"Qdrant connection failed: {e}")
            raise

    def is_research_paper(self, title: str, link: str, snippet: str) -> bool:
        """Enhanced research paper detection with safety checks"""
        try:
            if not title or not link or not snippet:
                return False

            research_indicators = [
                # Academic domains
                "arxiv.org", "pubmed.ncbi.nlm.nih.gov", "scholar.google.com",
                "ieee.org", "acm.org", "springer.com", "sciencedirect.com",
                "nature.com", "researchgate.net", "biorxiv.org", "medrxiv.org",
                "jstor.org", "wiley.com", "tandfonline.com", "sage.com",

                # Academic keywords
                "study", "research", "analysis", "findings", "paper", "journal",
                "proceedings", "conference", "peer-reviewed", "systematic review",
                "meta-analysis", "clinical trial", "experiment", "methodology"
            ]

            text_to_check = f"{title} {link} {snippet}".lower()

            # Check for research indicators
            for indicator in research_indicators:
                if indicator in text_to_check:
                    return True

            return False

        except Exception as e:
            logger.warning(f"Error in research paper detection: {e}")
            return False

    async def _url_exists_in_db(self, url: str) -> bool:
        """Check if URL already exists in the vector database"""
        try:
            # Search for documents with this exact URL
            search_results = self.qdrant_client.scroll(
                collection_name=self.collection_name,
                scroll_filter={
                    "must": [
                        {"key": "link", "match": {"value": url}}
                    ]
                },
                limit=1
            )

            return len(search_results[0]) > 0
        except Exception as e:
            logger.warning(f"Error checking URL existence: {e}")
            return False

    @retry_on_failure(max_retries=3)
    async def add_documents(self, search_results: Dict[str, List[str]], markdown_contents: List[str]):
        """Add documents with error handling, rate limiting, and URL deduplication"""
        try:
            headers = search_results.get('headers', [])
            links = search_results.get('links', [])
            snippets = search_results.get('snippets', [])

            if not all([headers, links, snippets, markdown_contents]):
                logger.warning("Missing data in search results")
                return

            research_papers = []
            processed_count = 0
            duplicate_count = 0

            for i, (header, link, snippet, content) in enumerate(zip(headers, links, snippets, markdown_contents)):
                try:
                    if self.is_research_paper(header, link, snippet):
                        # Check if URL already exists in database
                        if await self._url_exists_in_db(link):
                            logger.info(f"URL already exists in database, skipping: {link}")
                            duplicate_count += 1
                            continue

                        # Limit content size to prevent memory issues
                        max_content_size = 50000  # 50KB limit
                        if len(content) > max_content_size:
                            content = content[:max_content_size] + "..."

                        full_text = f"{header}\n{snippet}\n{content}"
                        chunks = self._create_chunks(full_text, max_length=self.chunk_size)

                        for chunk_idx, chunk in enumerate(chunks):
                            if len(chunk.strip()) > 50:
                                try:
                                    embedding = self.model.encode(chunk, show_progress_bar=False)

                                    point = PointStruct(
                                        id=str(uuid.uuid4()),
                                        vector=embedding.tolist(),
                                        payload={
                                            "title": header[:200],  # Limit title length
                                            "link": link,
                                            "snippet": snippet[:500],  # Limit snippet length
                                            "content": chunk,
                                            "chunk_index": chunk_idx,
                                            "source_index": i,
                                            "timestamp": int(time.time())
                                        }
                                    )
                                    research_papers.append(point)
                                    processed_count += 1

                                except Exception as e:
                                    logger.warning(f"Error processing chunk {chunk_idx} for document {i}: {e}")
                                    continue

                except Exception as e:
                    logger.warning(f"Error processing document {i}: {e}")
                    continue

            if research_papers:
                # Batch insert with error handling
                try:
                    self.qdrant_client.upsert(
                        collection_name=self.collection_name,
                        points=research_papers
                    )
                    logger.info(f"Added {len(research_papers)} new research paper chunks to vector database")
                    if duplicate_count > 0:
                        logger.info(f"Skipped {duplicate_count} duplicate URLs")
                except Exception as e:
                    logger.error(f"Failed to upsert to Qdrant: {e}")
                    raise
            else:
                if duplicate_count > 0:
                    logger.info(f"All {duplicate_count} research papers were duplicates, no new papers added")
                else:
                    logger.info("No research papers found in search results")

        except Exception as e:
            logger.error(f"Error in add_documents: {e}")
            raise

    def _create_chunks(self, text: str, max_length: int = 500) -> List[str]:
        """Create text chunks with error handling"""
        try:
            if not text or len(text) < 100:
                return [text] if text else []

            sentences = text.split('. ')
            chunks = []
            current_chunk = ""

            for sentence in sentences:
                if len(current_chunk + sentence) < max_length:
                    current_chunk += sentence + ". "
                else:
                    if current_chunk:
                        chunks.append(current_chunk.strip())
                    current_chunk = sentence + ". "

            if current_chunk:
                chunks.append(current_chunk.strip())

            return chunks[:20]  # Limit number of chunks per document

        except Exception as e:
            logger.warning(f"Error creating chunks: {e}")
            return [text[:max_length]] if text else []

    @retry_on_failure(max_retries=3)
    async def search_relevant_papers(self, query: str, top_k: Optional[int] = None) -> List[Dict[str, Any]]:
        """Search with comprehensive error handling"""
        try:
            if not query or len(query.strip()) < 3:
                logger.warning("Query too short or empty")
                return []

            if top_k is None:
                top_k = self.rag_top_k

            query_embedding = self.model.encode(query, show_progress_bar=False)

            search_results = self.qdrant_client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding.tolist(),
                limit=min(top_k, 50),  # Limit maximum results
                with_payload=True
            )

            papers = []
            for result in search_results:
                try:
                    papers.append({
                        "title": result.payload.get("title", "Unknown"),
                        "link": result.payload.get("link", ""),
                        "content": result.payload.get("content", ""),
                        "score": float(result.score),
                        "snippet": result.payload.get("snippet", "")
                    })
                except Exception as e:
                    logger.warning(f"Error processing search result: {e}")
                    continue

            logger.info(f"Found {len(papers)} relevant papers for query: {query[:50]}...")
            return papers

        except Exception as e:
            logger.error(f"Error searching papers: {e}")
            return []

    async def get_rag_context(self, query: str, top_k: Optional[int] = None) -> str:
        """Get RAG context with fallback"""
        try:
            papers = await self.search_relevant_papers(query, top_k)

            if not papers:
                logger.info("No relevant research papers found")
                return ""

            context = "RESEARCH PAPER CONTEXT:\n\n"
            for i, paper in enumerate(papers, 1):
                title = paper.get('title', 'Unknown')[:100]
                link = paper.get('link', '')
                content = paper.get('content', '')[:300]
                score = paper.get('score', 0)

                context += f"{i}. {title}\n"
                context += f"   Source: {link}\n"
                context += f"   Content: {content}...\n"
                context += f"   Relevance Score: {score:.3f}\n\n"

            return context

        except Exception as e:
            logger.error(f"Error getting RAG context: {e}")
            return ""

    def health_check(self) -> Dict[str, Any]:
        """Production health check"""
        try:
            # Test Qdrant connection
            collections = self.qdrant_client.get_collections()
            collection_exists = any(c.name == self.collection_name for c in collections.collections)

            # Test embedding model
            test_embedding = self.model.encode("test", show_progress_bar=False)

            return {
                "status": "healthy",
                "qdrant_connected": True,
                "collection_exists": collection_exists,
                "embedding_model_loaded": True,
                "embedding_dimension": len(test_embedding)
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "qdrant_connected": False,
                "collection_exists": False,
                "embedding_model_loaded": False
            }