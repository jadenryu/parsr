#!/usr/bin/env python3
"""
Test script for RAG-enhanced search engine
"""

import asyncio
from serper import get_header_link_snippet_from_user_query, get_markdown_from_urls, final_agent, SearchContext
from rag_module import RAGModule

async def test_rag_search(query: str):
    """Test the RAG-enhanced search with a specific query"""

    print(f"🔍 Testing RAG search with query: '{query}'\n")

    # Initialize RAG module
    rag = RAGModule()

    # Get search results
    print("📊 Getting search results...")
    search_results = get_header_link_snippet_from_user_query(query)
    headers = search_results['headers']
    links = search_results['links']
    snippets = search_results['snippets']

    print(f"Found {len(headers)} search results")

    # Get markdown content
    print("🕷️ Crawling content...")
    markdown_contents = await get_markdown_from_urls(links)

    # Add research papers to RAG
    print("🧠 Processing research papers for RAG...")
    rag.add_documents(search_results, markdown_contents)

    # Get RAG context
    print("📚 Retrieving relevant research papers...")
    rag_context = rag.get_rag_context(query)

    if rag_context:
        print("✅ Found relevant research papers!")
        print(f"RAG Context Preview:\n{rag_context[:300]}...\n")
    else:
        print("⚠️ No research papers found in search results\n")

    # Combine all content
    combined_content = ""
    for header, link, snippet, markdown_content in zip(headers, links, snippets, markdown_contents):
        combined_content += f"Header: {header}\nLink: {link}\nSnippet: {snippet}\nContent: {markdown_content}\n\n"

    # Create search context
    search_context = SearchContext(
        query=query,
        combined_content=combined_content,
        rag_context=rag_context
    )

    # Get AI summary
    print("🤖 Generating AI summary...")
    try:
        response = await final_agent.run("", deps=search_context)

        print(f"\n{'='*60}")
        print(f"🎯 SUMMARY FOR: {query}")
        print(f"{'='*60}")
        print(f"{response.data.summary}")
        print(f"\n📋 KEY POINTS:")
        for i, point in enumerate(response.data.key_points, 1):
            print(f"{i}. {point}")
        print(f"{'='*60}\n")

        return True

    except Exception as e:
        print(f"❌ Error generating summary: {e}")
        return False

async def main():
    """Run test scenarios"""

    print("🚀 Starting RAG-Enhanced Search Engine Tests\n")

    test_queries = [
        "machine learning research papers 2023",
        "climate change mitigation strategies",
        "quantum computing applications"
    ]

    for i, query in enumerate(test_queries, 1):
        print(f"\n{'🔬' * 20} TEST {i} {'🔬' * 20}")
        success = await test_rag_search(query)

        if success:
            print(f"✅ Test {i} completed successfully")
        else:
            print(f"❌ Test {i} failed")

        if i < len(test_queries):
            print("\n" + "⏳ Waiting 2 seconds before next test...\n")
            await asyncio.sleep(2)

    print(f"\n{'🎉' * 20} TESTS COMPLETE {'🎉' * 20}")

if __name__ == "__main__":
    asyncio.run(main())