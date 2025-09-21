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
from typing import List, Optional, Union
from qdrant_client import QdrantClient
from production_rag import ProductionRAGModule
import logging
import os
import re

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

class Statistic(BaseModel):
    value: Union[float, int, str] = Field(description="The statistical value (number, percentage, or descriptive value)")
    unit: Optional[str] = Field(default=None, description="Unit of measurement (%, years, cases, etc.)")
    context: str = Field(description="Brief context explaining what this statistic represents")
    source_citation: str = Field(description="Citation in [1], [2] format referencing the source")
    confidence: float = Field(description="Confidence in this statistic", ge=0, le=1)

class KeyFinding(BaseModel):
    finding: str = Field(description="The key finding or insight")
    category: str = Field(description="Category of finding (e.g., 'Clinical Trial Result', 'Market Analysis', 'Research Outcome')")
    significance: str = Field(description="Why this finding is significant or important")
    supporting_evidence: str = Field(description="Evidence supporting this finding with citations")
    limitations: Optional[str] = Field(default=None, description="Any limitations or caveats to this finding")

class ResearchQuality(BaseModel):
    source_types: List[str] = Field(description="Types of sources found (e.g., 'peer-reviewed', 'government report', 'news article')")
    academic_paper_count: int = Field(description="Number of academic/research papers found")
    publication_years: List[int] = Field(description="Years of publication for academic sources")
    study_methodologies: List[str] = Field(description="Research methodologies identified in sources")
    sample_sizes: List[str] = Field(description="Sample sizes mentioned in studies")

class AIOverview(BaseModel):
    summary: str = Field(description="Comprehensive summary with in-text citations using [1], [2] format")
    key_points: List[str] = Field(description="Main points with citations")
    statistics: List[Statistic] = Field(description="Extracted statistics and numerical findings")
    key_findings: List[KeyFinding] = Field(description="Important research findings and insights")
    research_quality: ResearchQuality = Field(description="Assessment of research quality and source types")
    confidence_score: float = Field(description="Confidence in the summary quality", ge=0, le=1)
    methodology_notes: Optional[str] = Field(default=None, description="Notes on research methodologies found")
    future_research_directions: Optional[str] = Field(default=None, description="Suggested areas for future research")

class SearchResponse(BaseModel):
    query: str = Field(description="Original search query")
    search_results: List[SearchResult] = Field(description="Google-style search results")
    ai_overview: AIOverview = Field(description="AI-generated overview with citations")
    sources: List[SearchResult] = Field(description="Numbered source list for citations")
    total_results: int = Field(description="Total number of search results found")
    processing_time: float = Field(description="Time taken to process the query")
    current_page: int = Field(default=1, description="Current page number")
    per_page: int = Field(default=20, description="Results per page")
    total_available: int = Field(default=0, description="Total results available across all pages")
    has_next_page: bool = Field(default=False, description="Whether there are more pages available")

@dataclass
class SearchContext:
    query: str
    combined_content: str
    rag_context: str = ""
    sources_list: List[SearchResult] = Field(default_factory=list)

api_key = os.getenv("OPENAI_API_KEY")
# Configure environment for OpenRouter
os.environ["OPENAI_API_KEY"] = api_key
os.environ["OPENAI_BASE_URL"] = "https://openrouter.ai/api/v1"

model = OpenAIModel('gpt-4o-mini')

final_agent = Agent(
    model=model,
    result_type=AIOverview,
    deps_type=SearchContext,
    system_prompt="""You are an expert research assistant that creates comprehensive AI overviews with proper citations, statistics extraction, and key findings analysis.

CRITICAL CITATION RULES:
- Use ONLY in-text citations in the format [1], [2], [3], etc.
- Every factual claim, statistic, or specific information MUST have a citation
- Match citation numbers to the source list provided in the context
- If research paper context is provided, prioritize and cite academic sources
- Multiple sources can be cited together like [1, 2, 3]

STATISTICS EXTRACTION REQUIREMENTS:
- Extract ALL numerical data, percentages, measurements, sample sizes, effect sizes, confidence intervals
- For each statistic, provide: value, unit, context, source citation, and confidence level
- Include demographic data, financial figures, scientific measurements, survey results
- Look for: success rates, failure rates, correlations, time periods, quantities, ranges
- Example statistics to extract: "85% of participants showed improvement [1]", "Study included 2,847 subjects [2]", "Cost increased by $1.2 billion [3]"

KEY FINDINGS EXTRACTION REQUIREMENTS:
- Identify significant research outcomes, conclusions, and insights
- Categorize findings (e.g., Clinical Trial Result, Market Analysis, Research Outcome, Policy Impact)
- Explain the significance and implications of each finding
- Include supporting evidence with citations
- Note any limitations or caveats
- Look for: causal relationships, breakthrough discoveries, unexpected results, comparative outcomes

RESEARCH QUALITY ASSESSMENT REQUIREMENTS:
- Identify source types: peer-reviewed papers, government reports, clinical trials, meta-analyses
- Count academic papers vs. other source types
- Extract publication years to assess recency
- Identify research methodologies: randomized controlled trials, observational studies, surveys, meta-analyses
- Note sample sizes and study populations
- Assess geographical and demographic scope

SUMMARY REQUIREMENTS:
- Provide comprehensive, neutral, well-structured overview with academic depth
- Include specific details, statistics, and findings with proper citations
- Organize information logically with clear flow and subsections
- Maintain objectivity and include limitations, controversies, or differing viewpoints
- Sound like an expert wrote it for an educated audience
- Go beyond surface-level overview with nuanced insights and analysis

KEY POINTS REQUIREMENTS:
- Extract 3-7 main points that capture the essence and most important findings
- Each key point should have relevant citations
- Focus on actionable information and significant insights

METHODOLOGY NOTES:
- Document research approaches found in sources
- Note study designs, data collection methods, analysis techniques
- Highlight methodological strengths and limitations

FUTURE RESEARCH DIRECTIONS:
- Identify gaps in current research mentioned in sources
- Suggest areas needing further investigation based on findings
- Note researcher recommendations for future studies

CONFIDENCE SCORING:
- Score based on source quality, consistency, comprehensiveness, and recency
- Research papers and authoritative sources = higher confidence
- Conflicting information or limited sources = lower confidence
- Range: 0.0 (low confidence) to 1.0 (high confidence)

CRITICAL: Base your response ONLY on the provided content and sources. DO NOT HALLUCINATE FACTS OR MAKE UP STATISTICS. If information is not in the provided content, state that it is not available rather than fabricating details. Prioritize research paper context and academic sources when available.
"""
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

# Source Summarization Models
class SourceSummary(BaseModel):
    summary: str = Field(description="Comprehensive summary of the source content with key findings and insights")
    key_points: List[str] = Field(description="3-5 main points from the source")
    statistics: List[Statistic] = Field(description="Important statistics and data from this source")
    relevance_to_query: str = Field(description="How this source relates to the original search query")
    confidence_score: float = Field(description="Confidence in the summary quality", ge=0, le=1)
    content_type: str = Field(description="Type of content (e.g., 'Academic Paper', 'News Article', 'Website', 'Report')")

class SourceContext(BaseModel):
    source_content: str = Field(description="The source content to summarize")
    source_title: str = Field(description="Title of the source")
    source_url: str = Field(description="URL of the source")
    original_query: str = Field(description="The original search query for context")

# Source Summarization Agent
source_agent = Agent(
    model=model,
    result_type=SourceSummary,
    system_prompt="""You are an expert content analyst specializing in creating comprehensive, detailed summaries of individual sources. Your task is to thoroughly analyze and summarize a single source document with the same depth and quality as a main AI overview.

CORE REQUIREMENTS:
- Create a comprehensive summary that captures all important information from the source
- Include specific details, statistics, findings, and key insights
- Maintain the same level of depth and sophistication as the main AI overview
- Focus on what makes this source unique and valuable
- Extract all numerical data and statistics present in the source
- Organize information logically with clear structure

SUMMARY REQUIREMENTS:
- Write 3-5 paragraphs providing comprehensive coverage of the source
- Include specific details, data points, methodologies, and findings
- Explain the source's main arguments, conclusions, and evidence
- Note any limitations, biases, or controversies mentioned
- Sound authoritative and well-researched

KEY POINTS:
- Extract 3-5 most important insights from this specific source
- Focus on unique information not found in other sources
- Include specific details that demonstrate expertise

STATISTICS EXTRACTION:
- Extract ALL numerical data, percentages, measurements, dates, quantities
- Provide context for each statistic (what it measures, time period, etc.)
- Include confidence level based on how the data is presented

RELEVANCE ASSESSMENT:
- Explain how this source specifically addresses the search query
- Identify what unique perspective or information it provides
- Note any gaps or limitations in addressing the query

CONTENT TYPE IDENTIFICATION:
- Classify the source (Academic Paper, News Article, Government Report, etc.)
- Consider this classification when assessing credibility and depth

CRITICAL: Base your analysis ONLY on the provided source content. Do not add external information or make assumptions beyond what's explicitly stated in the source."""
)

@source_agent.system_prompt
def add_source_context(ctx: RunContext[SourceContext]) -> str:
    return f"""
SOURCE TO ANALYZE:
Title: {ctx.deps.source_title}
URL: {ctx.deps.source_url}
Original Query: "{ctx.deps.original_query}"

CONTENT:
{ctx.deps.source_content}

Provide a comprehensive analysis and summary of this source with the same depth and quality as a main AI overview.
"""
 
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
            statistics=[],
            key_findings=[],
            research_quality=ResearchQuality(
                source_types=["web search results"],
                academic_paper_count=0,
                publication_years=[],
                study_methodologies=[],
                sample_sizes=[]
            ),
            confidence_score=0.3,
            methodology_notes="Analysis limited due to processing error",
            future_research_directions=None
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

async def summarize_source(source_url: str, original_query: str) -> SourceSummary:
    """Generate a comprehensive summary of a specific source"""
    import time
    logger.info(f"Generating source summary for: {source_url}")

    try:
        # First, get the content for this specific URL
        content = await get_markdown_from_urls([source_url])
        if not content or not content[0]:
            raise ValueError(f"Could not retrieve content from URL: {source_url}")

        source_content = content[0]

        # Extract title from URL or use a default
        source_title = source_url.split("/")[-1] if "/" in source_url else source_url

        # Create source context
        source_context = SourceContext(
            source_content=source_content,
            source_title=source_title,
            source_url=source_url,
            original_query=original_query
        )

        # Generate summary using the source agent
        logger.info("Generating source summary...")
        response = await source_agent.run("", deps=source_context)
        source_summary = response.data
        logger.info("Successfully generated source summary")

        return source_summary

    except Exception as e:
        logger.error(f"Error generating source summary: {e}")
        # Fallback summary
        return SourceSummary(
            summary=f"Unable to generate detailed summary for this source. The source at {source_url} could not be processed due to technical limitations.",
            key_points=[f"Source URL: {source_url}", "Content could not be analyzed"],
            statistics=[],
            relevance_to_query=f"This source was found in relation to the query: '{original_query}'",
            confidence_score=0.1,
            content_type="Unknown"
        )

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

                # Show Statistics
                if result.ai_overview.statistics:
                    print(f"\n{'='*80}")
                    print("📊 EXTRACTED STATISTICS")
                    print(f"{'='*80}")
                    for i, stat in enumerate(result.ai_overview.statistics, 1):
                        unit_str = f" {stat.unit}" if stat.unit else ""
                        print(f"{i}. {stat.value}{unit_str} - {stat.context}")
                        print(f"   Source: {stat.source_citation} | Confidence: {stat.confidence:.1f}/1.0")

                # Show Key Findings
                if result.ai_overview.key_findings:
                    print(f"\n{'='*80}")
                    print("🔍 KEY RESEARCH FINDINGS")
                    print(f"{'='*80}")
                    for i, finding in enumerate(result.ai_overview.key_findings, 1):
                        print(f"{i}. [{finding.category}] {finding.finding}")
                        print(f"   Significance: {finding.significance}")
                        print(f"   Evidence: {finding.supporting_evidence}")
                        if finding.limitations:
                            print(f"   Limitations: {finding.limitations}")
                        print()

                # Show Research Quality Assessment
                quality = result.ai_overview.research_quality
                if quality.academic_paper_count > 0 or quality.source_types:
                    print(f"\n{'='*80}")
                    print("📚 RESEARCH QUALITY ASSESSMENT")
                    print(f"{'='*80}")
                    print(f"Academic Papers Found: {quality.academic_paper_count}")
                    if quality.source_types:
                        print(f"Source Types: {', '.join(quality.source_types)}")
                    if quality.publication_years:
                        print(f"Publication Years: {min(quality.publication_years)}-{max(quality.publication_years)}")
                    if quality.study_methodologies:
                        print(f"Study Methods: {', '.join(quality.study_methodologies)}")
                    if quality.sample_sizes:
                        print(f"Sample Sizes: {', '.join(quality.sample_sizes)}")

                # Show Methodology Notes
                if result.ai_overview.methodology_notes:
                    print(f"\n📋 METHODOLOGY NOTES:")
                    print(f"{result.ai_overview.methodology_notes}")

                # Show Future Research Directions
                if result.ai_overview.future_research_directions:
                    print(f"\n🔬 FUTURE RESEARCH DIRECTIONS:")
                    print(f"{result.ai_overview.future_research_directions}")

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