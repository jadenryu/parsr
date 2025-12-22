# Parsr

<div align="center">
  <img src="parsr.png" alt="Parsr Logo" width="200"/>
  
  **AI-Powered RAG Search Engine**
  
  A production-ready search engine that combines traditional web search with Retrieval-Augmented Generation (RAG) to provide intelligent, cited answers.
  
  [![Python 3.12](https://img.shields.io/badge/python-3.12-blue.svg)](https://www.python.org/downloads/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.117.1+-green.svg)](https://fastapi.tiangolo.com)
  [![Next.js 15](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
</div>

---

## Features

- **AI-Powered Overviews**: Get intelligent summaries with inline citations [1], [2], [3]
- **Enhanced Search Results**: Google-style search results with titles, snippets, and links
- **Reputable Source Detection**: Automatically identifies and prioritizes academic sources
- **RAG Integration**: Leverages Qdrant vector database for semantic search
- **Real-Time Processing**: Fast, asynchronous search processing
- **Source Summaries**: On-demand detailed summaries for any search result

## Architecture

### Backend (Python)
- **FastAPI**: High-performance API framework
- **Pydantic AI**: Advanced AI agent orchestration
- **Qdrant**: Vector database for semantic search
- **Sentence Transformers**: Text embedding models
- **Crawl4AI**: Intelligent web crawling
- **Serper API**: Enhanced search results

### Frontend (Next.js)
- **Next.js 15**: React framework with App Router
- **React 19**: Latest React features
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible component primitives
- **TypeScript**: Type-safe development

### Vector Search
- **Embedding Model**: `all-MiniLM-L6-v2`
- **Database**: Qdrant Cloud
- **Top-K Retrieval**: Configurable semantic search depth

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- Qdrant Cloud account (or self-hosted Qdrant)
- OpenAI API key (or OpenRouter)
- Serper API key

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/jadenryu/parsr.git
   cd parsr
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   # OpenAI/OpenRouter Configuration
   OPENAI_API_KEY=your_openai_or_openrouter_key
   
   # Qdrant Configuration
   QDRANT_URL=https://your-cluster.qdrant.io
   QDRANT_API_KEY=your_qdrant_api_key
   
   # Search API
   SERPER_API_KEY=your_serper_api_key
   
   # Optional: Logging
   LOGFIRE_TOKEN=your_logfire_token
   
   # RAG Configuration (Optional)
   EMBEDDING_MODEL=all-MiniLM-L6-v2
   COLLECTION_NAME=research_papers_prod
   RAG_TOP_K=5
   CHUNK_SIZE=500
   ```

4. **Run the backend**
   ```bash
   python3 llm_stuff/search_api.py
   ```
   
   The API will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd parsr-web
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create `.env.local` in the `parsr-web` directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) in your browser

## Configuration

### Environment Variables

#### Backend Configuration
| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI or OpenRouter API key | Required |
| `QDRANT_URL` | Qdrant instance URL | Required |
| `QDRANT_API_KEY` | Qdrant API key | Required |
| `SERPER_API_KEY` | Serper search API key | Required |
| `EMBEDDING_MODEL` | Sentence transformer model | `all-MiniLM-L6-v2` |
| `COLLECTION_NAME` | Qdrant collection name | `research_papers_prod` |
| `RAG_TOP_K` | Number of RAG results to retrieve | `5` |
| `CHUNK_SIZE` | Text chunk size for processing | `500` |
| `LOGFIRE_TOKEN` | Logfire logging token | Optional |

#### Frontend Configuration
| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000` |

## Project Structure

```
parsr/
├── llm_stuff/              # Backend source code
│   ├── search_api.py       # Main FastAPI application
│   ├── serper.py           # Search and RAG integration
│   ├── production_rag.py   # RAG module
│   ├── llm.py              # LLM agent utilities
│   └── ...
├── parsr-web/              # Frontend Next.js application
│   ├── src/
│   │   ├── app/            # Next.js app router
│   │   ├── components/     # React components
│   │   └── lib/            # Utilities
│   └── public/             # Static assets
├── requirements.txt        # Python dependencies
├── Dockerfile              # Docker configuration
├── railway.toml            # Railway deployment config
└── README.md               # This file
```

## License

This project is open source and available under the [MIT License](LICENSE).

---

