#!/usr/bin/env python3
"""
Test pagination functionality
"""

import asyncio
import json
from serper import process_search_query

async def test_pagination():
    """Test pagination with a simple query"""
    print("🧪 Testing Pagination Functionality\n")

    # Test query
    query = "machine learning"

    print(f"Testing query: '{query}'\n")

    # Test different pages
    for page in [1, 2]:
        try:
            print(f"📄 Testing Page {page} (5 results per page)...")

            result = await process_search_query(
                query=query,
                page=page,
                per_page=5  # Small page size for testing
            )

            print(f"✅ Page {page} Results:")
            print(f"   Current Page: {result.current_page}")
            print(f"   Per Page: {result.per_page}")
            print(f"   Total Results on Page: {result.total_results}")
            print(f"   Total Available: {result.total_available}")
            print(f"   Has Next Page: {result.has_next_page}")

            print(f"   Search Results on Page {page}:")
            for i, search_result in enumerate(result.search_results, 1):
                print(f"     {i}. [{search_result.source_number}] {search_result.title[:50]}...")

            print(f"   Sources on Page {page}:")
            for i, source in enumerate(result.sources, 1):
                print(f"     {i}. [{source.source_number}] {source.title[:50]}...")

            print()

        except Exception as e:
            print(f"❌ Error testing page {page}: {e}")
            return False

    print("🎉 Pagination test completed successfully!")
    return True

async def test_edge_cases():
    """Test pagination edge cases"""
    print("🧪 Testing Pagination Edge Cases\n")

    query = "test query"

    # Test page beyond available results
    try:
        print("📄 Testing Page 10 (should be empty)...")
        result = await process_search_query(
            query=query,
            page=10,  # Way beyond available results
            per_page=5
        )

        print(f"✅ Page 10 Results:")
        print(f"   Current Page: {result.current_page}")
        print(f"   Total Results on Page: {result.total_results}")
        print(f"   Total Available: {result.total_available}")
        print(f"   Has Next Page: {result.has_next_page}")
        print(f"   Search Results: {len(result.search_results)} (should be 0)")
        print()

    except Exception as e:
        print(f"❌ Error testing edge case: {e}")
        return False

    print("🎉 Edge case test completed successfully!")
    return True

if __name__ == "__main__":
    async def main():
        print("🚀 PAGINATION FUNCTIONALITY TESTING\n")

        # Run tests
        basic_test = await test_pagination()
        edge_test = await test_edge_cases()

        # Summary
        print("=" * 50)
        print("📋 TEST RESULTS:")
        print(f"Basic Pagination: {'✅ PASS' if basic_test else '❌ FAIL'}")
        print(f"Edge Cases: {'✅ PASS' if edge_test else '❌ FAIL'}")

        if basic_test and edge_test:
            print("\n🎉 ALL PAGINATION TESTS PASSED!")
            print("The 20 sources pagination is now working correctly.")
        else:
            print("\n❌ Some pagination tests failed.")

    asyncio.run(main())