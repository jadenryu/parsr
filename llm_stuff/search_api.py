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

# Import our search engine
from serper import process_search_query, SearchResponse, rag
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
    max_results: Optional[int] = 10

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

        # Limit results if requested
        if request.max_results and request.max_results < len(result.search_results):
            result.search_results = result.search_results[:request.max_results]
            result.sources = result.sources[:request.max_results]
            result.total_results = request.max_results

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

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "RAG Search Engine API",
        "version": "1.0.0",
        "endpoints": {
            "search": "/search (POST)",
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