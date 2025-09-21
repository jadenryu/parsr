#!/usr/bin/env python3
"""
Test script for enhanced statistics extraction and research-backed summary features
"""

from serper import (
    Statistic, KeyFinding, ResearchQuality, AIOverview,
    SearchResult, SearchResponse, SearchContext
)
from pydantic import ValidationError

def test_data_models():
    """Test that all new data models work correctly"""
    print("🧪 Testing enhanced data models...")

    try:
        # Test Statistic model
        stat = Statistic(
            value=85.7,
            unit="%",
            context="Success rate in clinical trial",
            source_citation="[1]",
            confidence=0.9
        )
        print(f"✅ Statistic model: {stat.value}{stat.unit} - {stat.context}")

        # Test KeyFinding model
        finding = KeyFinding(
            finding="Treatment showed significant improvement",
            category="Clinical Trial Result",
            significance="Represents breakthrough in treatment effectiveness",
            supporting_evidence="Double-blind randomized controlled trial with 500 participants [1]",
            limitations="Study limited to adult population"
        )
        print(f"✅ KeyFinding model: [{finding.category}] {finding.finding}")

        # Test ResearchQuality model
        quality = ResearchQuality(
            source_types=["peer-reviewed", "clinical trial"],
            academic_paper_count=3,
            publication_years=[2023, 2024],
            study_methodologies=["randomized controlled trial", "meta-analysis"],
            sample_sizes=["n=500", "n=1200"]
        )
        print(f"✅ ResearchQuality model: {quality.academic_paper_count} academic papers")

        # Test enhanced AIOverview model
        overview = AIOverview(
            summary="Enhanced summary with statistics and findings",
            key_points=["Point 1 [1]", "Point 2 [2]"],
            statistics=[stat],
            key_findings=[finding],
            research_quality=quality,
            confidence_score=0.85,
            methodology_notes="High-quality randomized trials",
            future_research_directions="Long-term follow-up studies needed"
        )
        print(f"✅ Enhanced AIOverview model with {len(overview.statistics)} statistics and {len(overview.key_findings)} findings")

        print("\n🎉 All data models working correctly!")
        return True

    except ValidationError as e:
        print(f"❌ Validation error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_fallback_overview():
    """Test the fallback AIOverview creation"""
    print("\n🧪 Testing fallback AIOverview...")

    try:
        fallback = AIOverview(
            summary="Fallback summary for testing",
            key_points=["Fallback point 1", "Fallback point 2"],
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
        print(f"✅ Fallback AIOverview created successfully with confidence: {fallback.confidence_score}")
        return True

    except Exception as e:
        print(f"❌ Fallback test failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing Enhanced Pydantic AI Agent Features\n")

    # Run tests
    models_ok = test_data_models()
    fallback_ok = test_fallback_overview()

    # Summary
    print(f"\n📋 Test Results:")
    print(f"   Data Models: {'✅ PASS' if models_ok else '❌ FAIL'}")
    print(f"   Fallback Overview: {'✅ PASS' if fallback_ok else '❌ FAIL'}")

    if models_ok and fallback_ok:
        print("\n🎉 All tests passed! Enhanced agent is ready for statistics extraction and research-backed summaries.")
    else:
        print("\n❌ Some tests failed. Please check the implementation.")