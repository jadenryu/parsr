#!/usr/bin/env python3
"""
Production Search API with RAG
Returns structured JSON for frontend integration
"""

import os
import asyncio
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import our search engine
from serper import process_search_query, SearchResponse, rag, summarize_source, SourceSummary
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(
    title="RAG Search Engine API",
    description="Production search engine with RAG capabilities",
    version="1.0.0"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SearchRequest(BaseModel):
    query: str
    max_results: Optional[int] = 20
    page: Optional[int] = 1
    per_page: Optional[int] = 20

class SourceSummaryRequest(BaseModel):
    source_url: str
    original_query: str

class HealthResponse(BaseModel):
    status: str
    message: str
    system_health: dict

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    try:
        health = rag.health_check()
        return HealthResponse(
            status="healthy" if health["status"] == "healthy" else "unhealthy",
            message="System is operational" if health["status"] == "healthy" else "System has issues",
            system_health=health
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return HealthResponse(
            status="unhealthy",
            message=f"Health check failed: {str(e)}",
            system_health={"error": str(e)}
        )

@app.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """
    Main search endpoint

    Returns:
    - search_results: Google-style search results with titles, links, snippets
    - ai_overview: AI-generated summary with citations [1], [2], etc.
    - sources: Numbered source list for citations
    - total_results: Number of results found
    - processing_time: Time taken to process
    """
    try:
        if not request.query or len(request.query.strip()) < 2:
            raise HTTPException(
                status_code=400,
                detail="Query must be at least 2 characters long"
            )

        logger.info(f"Processing search query: {request.query}")

        # Process the search query
        result = await process_search_query(request.query)

        # Calculate pagination
        page = request.page or 1
        per_page = request.per_page or 20
        max_results = request.max_results or per_page

        # Calculate offset for pagination
        start_index = (page - 1) * per_page
        end_index = start_index + min(per_page, max_results)

        # Apply pagination to results
        total_available = len(result.search_results)
        if start_index < total_available:
            result.search_results = result.search_results[start_index:end_index]
            result.sources = result.sources[start_index:end_index]
            result.total_results = len(result.search_results)
        else:
            # Page beyond available results
            result.search_results = []
            result.sources = []
            result.total_results = 0

        # Set pagination metadata
        result.current_page = page
        result.per_page = per_page
        result.total_available = total_available
        result.has_next_page = (page * per_page) < total_available

        logger.info(f"Successfully processed search query: {request.query}")
        return result

    except ValueError as e:
        logger.error(f"Search validation error: {e}")
        raise HTTPException(status_code=404, detail=str(e))

    except Exception as e:
        logger.error(f"Search processing error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Search processing failed: {str(e)}"
        )

@app.post("/summarize", response_model=SourceSummary)
async def summarize_source_endpoint(request: SourceSummaryRequest):
    """
    Generate comprehensive summary for a specific source

    Returns:
    - summary: Detailed analysis of the source content
    - key_points: Main insights from the source
    - statistics: Numerical data found in the source
    - relevance_to_query: How the source relates to the original query
    - confidence_score: Quality assessment of the summary
    - content_type: Type of source content
    """
    try:
        if not request.source_url or len(request.source_url.strip()) < 10:
            raise HTTPException(
                status_code=400,
                detail="Source URL must be provided and valid"
            )

        if not request.original_query or len(request.original_query.strip()) < 2:
            raise HTTPException(
                status_code=400,
                detail="Original query must be at least 2 characters long"
            )

        logger.info(f"Processing source summary for: {request.source_url}")

        # Generate source summary
        summary = await summarize_source(request.source_url, request.original_query)

        logger.info(f"Successfully processed source summary for: {request.source_url}")
        return summary

    except ValueError as e:
        logger.error(f"Source summarization validation error: {e}")
        raise HTTPException(status_code=404, detail=str(e))

    except Exception as e:
        logger.error(f"Source summarization error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Source summarization failed: {str(e)}"
        )

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "RAG Search Engine API",
        "version": "1.0.0",
        "endpoints": {
            "search": "/search (POST)",
            "summarize": "/summarize (POST)",
            "health": "/health (GET)",
            "docs": "/docs (GET)"
        },
        "example_request": {
            "url": "/search",
            "method": "POST",
            "body": {
                "query": "machine learning applications",
                "max_results": 10
            }
        }
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print("🚀 Starting RAG Search Engine API...")
    print(f"📖 API Documentation: http://localhost:{port}/docs")
    print(f"🔍 Search Endpoint: http://localhost:{port}/search")
    print(f"💚 Health Check: http://localhost:{port}/health")

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )