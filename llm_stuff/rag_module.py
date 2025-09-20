import os
import re
from typing import List, Dict, Any
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from dotenv import load_dotenv
import uuid

load_dotenv()

class RAGModule:
    def __init__(self):
        # Load configuration from environment
        self.embedding_model = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        self.collection_name = os.getenv("COLLECTION_NAME", "research_papers_prod")
        self.rag_top_k = int(os.getenv("RAG_TOP_K", "5"))
        self.chunk_size = int(os.getenv("CHUNK_SIZE", "500"))

        # Initialize model and client
        self.model = SentenceTransformer(self.embedding_model)
        self.qdrant_client = QdrantClient(
            url=os.getenv("QDRANT_URL"),
            api_key=os.getenv("QDRANT_API_KEY"),
        )
        self._setup_collection()

    def _setup_collection(self):
        """Create collection if it doesn't exist"""
        try:
            collections = self.qdrant_client.get_collections()
            collection_names = [col.name for col in collections.collections]

            if self.collection_name not in collection_names:
                self.qdrant_client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=384,  # all-MiniLM-L6-v2 embedding size
                        distance=Distance.COSINE
                    )
                )
                print(f"Created collection: {self.collection_name}")
            else:
                print(f"Collection {self.collection_name} already exists")
        except Exception as e:
            print(f"Error setting up collection: {e}")

    def is_research_paper(self, title: str, link: str, snippet: str) -> bool:
        """Filter to only include research papers"""
        research_indicators = [
            # Academic domains
            "arxiv.org", "pubmed.ncbi.nlm.nih.gov", "scholar.google.com",
            "ieee.org", "acm.org", "springer.com", "sciencedirect.com",
            "nature.com", "researchgate.net", "biorxiv.org", "medrxiv.org",

            # Academic keywords in title/snippet
            "study", "research", "analysis", "findings", "paper", "journal",
            "proceedings", "conference", "peer-reviewed", "systematic review",
            "meta-analysis", "clinical trial", "experiment", "methodology"
        ]

        text_to_check = f"{title} {link} {snippet}".lower()

        # Check for research indicators
        for indicator in research_indicators:
            if indicator in text_to_check:
                return True

        # Check for academic patterns
        if re.search(r'\b(doi:|pmid:|issn:)\b', text_to_check):
            return True

        # Check for citation patterns
        if re.search(r'\b\d{4}\b.*\b(et al\.|citation|cited by)\b', text_to_check):
            return True

        return False

    def add_documents(self, search_results: Dict[str, List[str]], markdown_contents: List[str]):
        """Add research papers to vector database"""
        headers = search_results['headers']
        links = search_results['links']
        snippets = search_results['snippets']

        research_papers = []

        for i, (header, link, snippet, content) in enumerate(zip(headers, links, snippets, markdown_contents)):
            if self.is_research_paper(header, link, snippet):
                # Combine all text for embedding
                full_text = f"{header}\n{snippet}\n{content}"

                # Create chunks for better retrieval
                chunks = self._create_chunks(full_text, max_length=self.chunk_size)

                for chunk_idx, chunk in enumerate(chunks):
                    if len(chunk.strip()) > 50:  # Only add substantial chunks
                        embedding = self.model.encode(chunk)

                        point = PointStruct(
                            id=str(uuid.uuid4()),
                            vector=embedding.tolist(),
                            payload={
                                "title": header,
                                "link": link,
                                "snippet": snippet,
                                "content": chunk,
                                "chunk_index": chunk_idx,
                                "source_index": i
                            }
                        )
                        research_papers.append(point)

        if research_papers:
            self.qdrant_client.upsert(
                collection_name=self.collection_name,
                points=research_papers
            )
            print(f"Added {len(research_papers)} research paper chunks to vector database")
        else:
            print("No research papers found in search results")

    def _create_chunks(self, text: str, max_length: int = 500) -> List[str]:
        """Split text into overlapping chunks"""
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

        return chunks

    def search_relevant_papers(self, query: str, top_k: int = None) -> List[Dict[str, Any]]:
        """Search for relevant research papers"""
        try:
            if top_k is None:
                top_k = self.rag_top_k

            query_embedding = self.model.encode(query)

            search_results = self.qdrant_client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding.tolist(),
                limit=top_k,
                with_payload=True
            )

            papers = []
            for result in search_results:
                papers.append({
                    "title": result.payload["title"],
                    "link": result.payload["link"],
                    "content": result.payload["content"],
                    "score": result.score,
                    "snippet": result.payload["snippet"]
                })

            return papers
        except Exception as e:
            print(f"Error searching papers: {e}")
            return []

    def get_rag_context(self, query: str, top_k: int = None) -> str:
        """Get research paper context for RAG"""
        papers = self.search_relevant_papers(query, top_k)

        if not papers:
            return ""

        context = "RESEARCH PAPER CONTEXT:\n\n"
        for i, paper in enumerate(papers, 1):
            context += f"{i}. {paper['title']}\n"
            context += f"   Source: {paper['link']}\n"
            context += f"   Content: {paper['content'][:300]}...\n"
            context += f"   Relevance Score: {paper['score']:.3f}\n\n"

        return context