#!/usr/bin/env python3
"""
Test the new search format with citations and structured results
"""

import asyncio
import json
from serper import process_search_query

async def test_search_format():
    """Test the new Google-style format with citations"""

    print("🚀 Testing New Search Engine Format with Citations\n")

    test_query = "machine learning applications in healthcare"

    try:
        print(f"🔍 Searching for: '{test_query}'")
        print("⏳ Processing (this may take a moment)...\n")

        # Process search query
        result = await process_search_query(test_query)

        # Display results exactly as frontend would receive them
        print("="*80)
        print("📱 FRONTEND PREVIEW - SEARCH RESULTS")
        print("="*80)

        # Query info
        print(f"Query: {result.query}")
        print(f"Total Results: {result.total_results}")
        print(f"Processing Time: {result.processing_time:.2f}s")
        print()

        # Search Results Section (like Google)
        print("📊 SEARCH RESULTS:")
        print("-" * 40)
        for i, search_result in enumerate(result.search_results[:5], 1):  # Show first 5
            print(f"{i}. {search_result.title}")
            print(f"   🔗 {search_result.link}")
            print(f"   📝 {search_result.snippet}")
            print()

        # AI Overview Section (like Google's AI Overview)
        print("🤖 AI OVERVIEW")
        print(f"Confidence: {result.ai_overview.confidence_score:.1f}/1.0")
        print("-" * 40)
        print(result.ai_overview.summary)
        print()

        # Key Points
        print("📋 KEY INSIGHTS:")
        for i, point in enumerate(result.ai_overview.key_points, 1):
            print(f"  {i}. {point}")
        print()

        # Sources for Citations
        print("📚 SOURCES:")
        print("-" * 40)
        for source in result.sources:
            print(f"[{source.source_number}] {source.title}")
            print(f"    {source.link}")
        print()

        print("="*80)
        print("✅ SUCCESS: New format working with citations!")
        print("="*80)

        # Show JSON structure for frontend developers
        print("\n🔧 JSON STRUCTURE FOR FRONTEND:")
        print("-" * 40)
        sample_json = {
            "query": result.query,
            "total_results": result.total_results,
            "processing_time": result.processing_time,
            "search_results": [
                {
                    "title": result.search_results[0].title,
                    "link": result.search_results[0].link,
                    "snippet": result.search_results[0].snippet,
                    "source_number": result.search_results[0].source_number
                }
            ] if result.search_results else [],
            "ai_overview": {
                "summary": result.ai_overview.summary[:100] + "..." if len(result.ai_overview.summary) > 100 else result.ai_overview.summary,
                "key_points": result.ai_overview.key_points,
                "confidence_score": result.ai_overview.confidence_score
            },
            "sources": [
                {
                    "source_number": result.sources[0].source_number,
                    "title": result.sources[0].title,
                    "link": result.sources[0].link
                }
            ] if result.sources else []
        }

        print(json.dumps(sample_json, indent=2))

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_search_format())