import requests
import json
import asyncio
from crawl4ai import *
from pydantic_ai import Agent, RunContext
from pydantic_ai.models.openai import OpenAIModel
from pydantic import BaseModel, Field
import os
from dotenv import load_dotenv
from dataclasses import dataclass
from typing import List
from qdrant_client import QdrantClient
from production_rag import ProductionRAGModule
import logging
import os

# Set production environment variables
os.environ['TOKENIZERS_PARALLELISM'] = 'false'
os.environ['LOGFIRE_IGNORE_NO_CONFIG'] = '1'

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize production RAG
try:
    rag = ProductionRAGModule()
    logger.info("Production RAG module initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize RAG module: {e}")
    raise
load_dotenv()

class SearchResult(BaseModel):
    title: str = Field(description="Title of the search result")
    link: str = Field(description="URL of the search result")
    snippet: str = Field(description="Brief description/snippet from the search result")
    source_number: int = Field(description="Reference number for citations")

class AIOverview(BaseModel):
    summary: str = Field(description="Comprehensive summary with in-text citations using [1], [2] format")
    key_points: List[str] = Field(description="Main points with citations")
    confidence_score: float = Field(description="Confidence in the summary quality", ge=0, le=1)

class SearchResponse(BaseModel):
    query: str = Field(description="Original search query")
    search_results: List[SearchResult] = Field(description="Google-style search results")
    ai_overview: AIOverview = Field(description="AI-generated overview with citations")
    sources: List[SearchResult] = Field(description="Numbered source list for citations")
    total_results: int = Field(description="Total number of search results found")
    processing_time: float = Field(description="Time taken to process the query")

@dataclass
class SearchContext:
    query: str
    combined_content: str
    rag_context: str = ""
    sources_list: List[SearchResult] = Field(default_factory=list)

api_key = os.getenv("OPENAI_API_KEY")
model = OpenAIModel('gpt-4o-mini')

final_agent = Agent(
    model=model,
    result_type=AIOverview,
    deps_type=SearchContext,
    system_prompt="""You are an expert research assistant that creates comprehensive AI overviews with proper citations.

CRITICAL CITATION RULES:
- Use ONLY in-text citations in the format [1], [2], [3], etc.
- Every factual claim, statistic, or specific information MUST have a citation
- Match citation numbers to the source list provided in the context
- If research paper context is provided, prioritize and cite academic sources
- Multiple sources can be cited together like [1, 2, 3]

SUMMARY REQUIREMENTS:
- Provide a comprehensive, neutral, and well-structured overview
- Include specific details, statistics, and findings with proper citations
- Organize information logically with clear flow
- Maintain objectivity and avoid bias
- Include limitations, controversies, or differing viewpoints when relevant

KEY POINTS REQUIREMENTS:
- Extract 3-7 main points that capture the essence of the topic
- Each key point should have relevant citations
- Focus on the most important and actionable information

CONFIDENCE SCORING:
- Score based on source quality, consistency, and comprehensiveness
- Research papers and authoritative sources = higher confidence
- Conflicting information or limited sources = lower confidence
- Range: 0.0 (low confidence) to 1.0 (high confidence)

Base your response ONLY on the provided content and sources."""
)

@final_agent.system_prompt
def add_search_context(ctx: RunContext[SearchContext]) -> str:
    base_prompt = f"User searched for: '{ctx.deps.query}'.\n\n"

    # Add sources list for citation reference
    if ctx.deps.sources_list:
        base_prompt += "SOURCES FOR CITATION:\n"
        for source in ctx.deps.sources_list:
            base_prompt += f"[{source.source_number}] {source.title} - {source.link}\n"
        base_prompt += "\n"

    base_prompt += f"CONTENT TO SUMMARIZE:\n{ctx.deps.combined_content}"

    if ctx.deps.rag_context:
        base_prompt += f"\n\nADDITIONAL RESEARCH CONTEXT:\n{ctx.deps.rag_context}"

    base_prompt += "\n\nRemember to cite sources using [1], [2], etc. format for every factual claim."

    return base_prompt
 
def get_header_link_snippet_from_user_query(query: str):
    """Get the header, link, and snippet from a user query using Serper API with enhanced error handling"""
    header = []
    link = []
    snippet = []

    try:
        if not query or len(query.strip()) < 2:
            logger.warning("Query is too short or empty")
            return {"headers": header, "links": link, "snippets": snippet}

        # Get API key from environment
        serper_api_key = os.getenv("SERPER_API_KEY")
        if not serper_api_key:
            logger.error("SERPER_API_KEY not found in environment variables")
            return {"headers": header, "links": link, "snippets": snippet}

        queries = query.split()
        total_query = "+".join(queries)
        url = f"https://google.serper.dev/search?q={total_query}&apiKey={serper_api_key}"

        # Add timeout and retry logic
        response = requests.get(url, timeout=30)
        response.raise_for_status()

        data = response.json()

        if 'knowledgeGraph' in data and 'description' in data['knowledgeGraph']:
            description = data['knowledgeGraph']['description']
            logger.info(f"Knowledge Graph Description: {description}")

        logger.info("\nProcessing organic search results...")
        organic_results = data.get('organic', [])

        if not organic_results:
            logger.warning("No organic results found in search response")
            return {"headers": header, "links": link, "snippets": snippet}

        # Limit results to prevent overload
        max_results = int(os.getenv("MAX_SEARCH_RESULTS", "10"))
        for result in organic_results[:max_results]:
            try:
                title = result.get('title', 'Unknown Title')
                result_link = result.get('link', '')
                result_snippet = result.get('snippet', '')

                if title and result_link:  # Only add if we have essential data
                    header.append(title)
                    link.append(result_link)
                    snippet.append(result_snippet)
                    logger.debug(f"Added result: {title[:50]}...")

            except Exception as e:
                logger.warning(f"Error processing search result: {e}")
                continue

        logger.info(f"Successfully processed {len(header)} search results")

    except requests.exceptions.Timeout:
        logger.error("Serper API request timed out")
    except requests.exceptions.RequestException as e:
        logger.error(f"Serper API request error: {e}")
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Serper API response: {e}")
    except Exception as e:
        logger.error(f"Unexpected error in search: {e}")

    return {"headers": header, "links": link, "snippets": snippet}

async def get_markdown_from_urls(urls: List[str]) -> List[str]:
    """Fetch markdown content from multiple URLs with enhanced error handling and rate limiting"""
    if not urls:
        logger.warning("No URLs provided for crawling")
        return []

    # Limit number of URLs to prevent overload
    max_urls = int(os.getenv("MAX_SEARCH_RESULTS", "10"))
    urls = urls[:max_urls]

    logger.info(f"Starting to crawl {len(urls)} URLs...")

    try:
        browser_config = BrowserConfig(
            browser_mode="builtin",
            headless=True
        )

        async def fetch_single_url(crawler, url: str, index: int) -> str:
            try:
                if not url or not url.startswith(('http://', 'https://')):
                    logger.warning(f"Invalid URL {index}: {url}")
                    return ""

                logger.debug(f"Crawling URL {index + 1}/{len(urls)}: {url[:50]}...")

                # Add timeout for individual requests
                result = await asyncio.wait_for(
                    crawler.arun(url=url),
                    timeout=30.0  # 30 second timeout per URL
                )

                content = result.markdown if result.markdown else ""

                # Limit content size to prevent memory issues
                max_content_size = 50000  # 50KB limit
                if len(content) > max_content_size:
                    content = content[:max_content_size] + "..."
                    logger.warning(f"Content truncated for URL {index}: {url[:50]}...")

                logger.debug(f"Successfully crawled URL {index + 1}: {len(content)} characters")
                return content

            except asyncio.TimeoutError:
                logger.debug(f"Timeout crawling URL {index}: {url}")
                return ""
            except Exception as e:
                logger.debug(f"Error crawling URL {index} ({url}): {e}")
                return ""

        try:
            async with AsyncWebCrawler(config=browser_config) as crawler:
                # Process URLs with controlled concurrency
                semaphore = asyncio.Semaphore(3)  # Limit to 3 concurrent requests

                async def limited_fetch(url: str, index: int) -> str:
                    async with semaphore:
                        return await fetch_single_url(crawler, url, index)

                tasks = [limited_fetch(url, i) for i, url in enumerate(urls)]
                results = await asyncio.gather(*tasks, return_exceptions=True)

                # Process results and handle exceptions
                markdown_contents = []
                for i, result in enumerate(results):
                    if isinstance(result, Exception):
                        logger.debug(f"Exception for URL {i}: {result}")
                        markdown_contents.append("")
                    else:
                        markdown_contents.append(result)

                success_count = sum(1 for content in markdown_contents if content)
                logger.info(f"Successfully crawled {success_count}/{len(urls)} URLs")

                return markdown_contents

        except Exception as e:
            logger.error(f"Error initializing crawler: {e}")
            return [""] * len(urls)

    except Exception as e:
        logger.error(f"Unexpected error in URL crawling: {e}")
        return [""] * len(urls)
async def process_search_query(query: str) -> SearchResponse:
    """Process a search query and return structured results"""
    import time
    start_time = time.time()

    logger.info(f"Processing query: {query}")

    # Step 1: Get search results
    search_results = get_header_link_snippet_from_user_query(query)
    headers = search_results['headers']
    links = search_results['links']
    snippets = search_results['snippets']

    if not headers:
        raise ValueError("No search results found")

    logger.info(f"Found {len(headers)} search results")

    # Step 2: Create structured search results
    structured_results = []
    sources_list = []

    for i, (header, link, snippet) in enumerate(zip(headers, links, snippets), 1):
        search_result = SearchResult(
            title=header,
            link=link,
            snippet=snippet,
            source_number=i
        )
        structured_results.append(search_result)
        sources_list.append(search_result)

    # Step 3: Crawl content
    try:
        markdown_contents = await get_markdown_from_urls(links)
        successful_crawls = sum(1 for content in markdown_contents if content)
        logger.info(f"Successfully crawled {successful_crawls}/{len(links)} URLs")
    except Exception as e:
        logger.error(f"Error in crawling: {e}")
        markdown_contents = [""] * len(links)

    # Step 4: Add to RAG
    try:
        await rag.add_documents(search_results, markdown_contents)
        logger.info("Successfully processed documents for RAG")
    except Exception as e:
        logger.error(f"Error adding documents to RAG: {e}")

    # Step 5: Get RAG context
    try:
        rag_context = await rag.get_rag_context(query)
        if rag_context:
            logger.info("Retrieved relevant research paper context")
        else:
            logger.info("No relevant research papers found")
    except Exception as e:
        logger.error(f"Error getting RAG context: {e}")
        rag_context = ""

    # Step 6: Combine content with source references
    combined_content = ""
    for i, (header, link, snippet, markdown_content) in enumerate(zip(headers, links, snippets, markdown_contents), 1):
        combined_content += f"[{i}] {header}\nLink: {link}\nSnippet: {snippet}\nContent: {markdown_content}\n\n"

    # Step 7: Create search context
    search_context = SearchContext(
        query=query,
        combined_content=combined_content,
        rag_context=rag_context,
        sources_list=sources_list
    )

    # Step 8: Generate AI overview
    try:
        logger.info("Generating AI overview...")
        response = await final_agent.run("", deps=search_context)
        ai_overview = response.data
        logger.info("Successfully generated AI overview")
    except Exception as e:
        logger.error(f"Error generating AI overview: {e}")
        # Fallback AI overview
        ai_overview = AIOverview(
            summary=f"Search results for '{query}' show various perspectives on this topic. Due to processing limitations, detailed analysis is not available.",
            key_points=[f"Multiple sources found for '{query}'", "Detailed analysis temporarily unavailable"],
            confidence_score=0.3
        )

    # Step 9: Calculate processing time
    processing_time = time.time() - start_time

    # Step 10: Create final response
    search_response = SearchResponse(
        query=query,
        search_results=structured_results,
        ai_overview=ai_overview,
        sources=sources_list,
        total_results=len(structured_results),
        processing_time=processing_time
    )

    return search_response

async def main():
    """Main application loop for interactive mode"""
    logger.info("Starting production search engine with RAG...")

    # Health check
    health = rag.health_check()
    if health["status"] != "healthy":
        logger.error(f"System health check failed: {health}")
        print("System is not ready. Check logs for details.")
        return

    logger.info("System health check passed. Ready for queries.")
    print("🚀 Production Search Engine with RAG is ready!")
    print("Type 'exit' or 'quit' to stop.\n")

    while True:
        try:
            user_input = input("What would you like to search for? ")

            if user_input.lower() in ['exit', 'quit']:
                logger.info("User requested exit")
                break

            if not user_input or len(user_input.strip()) < 2:
                print("⚠️ Please enter a valid search query (at least 2 characters)")
                continue

            try:
                # Process the search query
                result = await process_search_query(user_input)

                # Display results in Google-style format
                print(f"\n{'='*80}")
                print(f"SEARCH RESULTS FOR: {result.query}")
                print(f"Found {result.total_results} results in {result.processing_time:.2f} seconds")
                print(f"{'='*80}")

                # Show search results
                print("\nSEARCH RESULTS:")
                for i, search_result in enumerate(result.search_results, 1):
                    print(f"\n{i}. {search_result.title}")
                    print(f"   🔗 {search_result.link}")
                    print(f"   📝 {search_result.snippet}")

                # Show AI Overview
                print(f"\n{'='*80}")
                print("AI OVERVIEW")
                print(f"Confidence Score: {result.ai_overview.confidence_score:.1f}/1.0")
                print(f"{'='*80}")
                print(f"\n{result.ai_overview.summary}")

                print(f"\nKEY POINTS:")
                for i, point in enumerate(result.ai_overview.key_points, 1):
                    print(f"{i}. {point}")

                # Show sources
                print(f"\n{'='*80}")
                print("SOURCES")
                print(f"{'='*80}")
                for source in result.sources:
                    print(f"[{source.source_number}] {source.title}")
                    print(f"    {source.link}")
                print(f"\n{'='*80}\n")

            except Exception as e:
                logger.error(f"Error processing search: {e}")
                print("Search processing failed. Please try again.")

        except KeyboardInterrupt:
            logger.info("User interrupted with Ctrl+C")
            print("\nGoodbye!")
            break

        except Exception as e:
            logger.error(f"Unexpected error in main loop: {e}")
            print("An unexpected error occurred. Please try again.")
            continue

    logger.info("Search engine stopped")

def run_main():
    asyncio.run(main())

if __name__ == "__main__":
    run_main()