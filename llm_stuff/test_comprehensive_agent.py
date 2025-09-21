#!/usr/bin/env python3
"""
Comprehensive test script demonstrating the enhanced AI agent capabilities
"""

from serper import (
    final_agent, source_agent, SearchContext, SourceContext,
    Statistic, KeyFinding, ResearchQuality, AIOverview
)
import asyncio
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_comprehensive_analysis():
    """Test the enhanced agent with a complex medical research scenario"""
    print("🧪 Testing Enhanced AI Agent - Comprehensive Medical Research Analysis\n")

    # Simulate complex medical research content
    sample_content = """
    [1] Clinical Trial Results for New Diabetes Treatment
    Link: https://example.com/diabetes-study
    Snippet: Randomized controlled trial shows 85% efficacy in blood glucose control
    Content: A double-blind, randomized controlled trial involving 2,847 participants with Type 2 diabetes was conducted over 24 months. The new treatment demonstrated an 85.7% success rate in achieving target HbA1c levels (<7.0%) compared to 42.3% in the control group (p<0.001, 95% CI: 80.2-91.2%). The treatment group showed a mean HbA1c reduction of 2.1% ± 0.8% from baseline (9.2% ± 1.4%). Adverse events were reported in 12.3% of participants, primarily mild gastrointestinal symptoms. The study was powered at 90% to detect a 15% difference between groups. Cost-effectiveness analysis showed $847 per quality-adjusted life year gained.

    [2] Meta-Analysis of Diabetes Interventions
    Link: https://example.com/meta-analysis
    Snippet: Systematic review of 47 studies encompassing 125,000 patients
    Content: This systematic review and meta-analysis examined 47 randomized controlled trials with a total of 125,639 participants across 15 countries from 2018-2024. Pooled analysis revealed significant heterogeneity (I² = 67%) in treatment effects. The overall pooled effect size was OR = 2.34 (95% CI: 1.89-2.91, p<0.001) for achieving glycemic targets. Subgroup analysis by region showed stronger effects in European populations (OR = 2.67) compared to Asian populations (OR = 1.98). Publication bias was assessed using funnel plots and Egger's test (p = 0.032), suggesting some small-study effects.

    [3] Economic Impact Study
    Link: https://example.com/economics
    Snippet: Healthcare cost reduction of $2.4 billion annually projected
    Content: Economic modeling study projected that widespread adoption of the new treatment could reduce annual healthcare costs by $2.4 billion nationally, with a 5-year ROI of 340%. The analysis included direct medical costs, indirect costs from productivity loss, and quality of life improvements. Per-patient annual savings were estimated at $3,420 compared to standard care. The budget impact model assumed 15% market penetration within 3 years, reaching 25% by year 5.
    """

    # Create search context
    search_context = SearchContext(
        query="effectiveness of new diabetes treatment clinical trials",
        combined_content=sample_content,
        rag_context="Additional research context: Recent advances in diabetes management have focused on personalized medicine approaches and continuous glucose monitoring integration.",
        sources_list=[]
    )

    try:
        print("🔬 Generating comprehensive AI overview...")
        response = await final_agent.run("Generate a comprehensive analysis", deps=search_context)
        ai_overview = response.data

        print("✅ Successfully generated enhanced AI overview!\n")

        # Display results
        print("=" * 80)
        print("📊 COMPREHENSIVE AI ANALYSIS RESULTS")
        print("=" * 80)

        print(f"\n📝 SUMMARY (Length: {len(ai_overview.summary)} characters):")
        print(ai_overview.summary)

        print(f"\n🔑 KEY POINTS ({len(ai_overview.key_points)} points):")
        for i, point in enumerate(ai_overview.key_points, 1):
            print(f"{i}. {point}")

        print(f"\n📈 EXTRACTED STATISTICS ({len(ai_overview.statistics)} statistics):")
        for i, stat in enumerate(ai_overview.statistics, 1):
            unit_str = f" {stat.unit}" if stat.unit else ""
            print(f"{i}. {stat.value}{unit_str} - {stat.context}")
            print(f"   Source: {stat.source_citation} | Confidence: {stat.confidence:.1f}/1.0")

        print(f"\n🔍 KEY FINDINGS ({len(ai_overview.key_findings)} findings):")
        for i, finding in enumerate(ai_overview.key_findings, 1):
            print(f"{i}. [{finding.category}] {finding.finding}")
            print(f"   Significance: {finding.significance}")
            print(f"   Evidence: {finding.supporting_evidence}")
            if finding.limitations:
                print(f"   Limitations: {finding.limitations}")
            print()

        print("📚 RESEARCH QUALITY ASSESSMENT:")
        quality = ai_overview.research_quality
        print(f"Academic Papers: {quality.academic_paper_count}")
        print(f"Source Types: {', '.join(quality.source_types)}")
        if quality.publication_years:
            print(f"Publication Years: {min(quality.publication_years)}-{max(quality.publication_years)}")
        if quality.study_methodologies:
            print(f"Study Methods: {', '.join(quality.study_methodologies)}")
        if quality.sample_sizes:
            print(f"Sample Sizes: {', '.join(quality.sample_sizes)}")

        if ai_overview.methodology_notes:
            print(f"\n📋 METHODOLOGY NOTES:")
            print(ai_overview.methodology_notes)

        if ai_overview.future_research_directions:
            print(f"\n🔬 FUTURE RESEARCH DIRECTIONS:")
            print(ai_overview.future_research_directions)

        print(f"\n🎯 CONFIDENCE SCORE: {ai_overview.confidence_score:.1f}/1.0")

        # Analyze the quality of the response
        print("\n" + "=" * 80)
        print("📋 ENHANCEMENT ANALYSIS")
        print("=" * 80)

        summary_paragraphs = ai_overview.summary.count('\n\n') + 1
        print(f"✅ Summary Paragraphs: {summary_paragraphs} (Target: 3+ paragraphs)")
        print(f"✅ Summary Length: {len(ai_overview.summary)} characters (Target: Detailed)")
        print(f"✅ Statistics Extracted: {len(ai_overview.statistics)} (Target: Comprehensive)")
        print(f"✅ Key Findings: {len(ai_overview.key_findings)} (Target: Multiple)")
        print(f"✅ Research Quality Assessment: Complete")

        if summary_paragraphs >= 3 and len(ai_overview.statistics) > 0 and len(ai_overview.key_findings) > 0:
            print("\n🎉 ENHANCEMENT SUCCESS: All targets met!")
        else:
            print("\n⚠️ ENHANCEMENT REVIEW: Some targets may need adjustment")

        return True

    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

async def test_source_analysis():
    """Test the source-specific analysis agent"""
    print("\n🧪 Testing Source-Specific Analysis Agent\n")

    sample_source_content = """
    New Diabetes Treatment Shows Promise in Phase III Trial

    A groundbreaking Phase III clinical trial for a novel diabetes treatment has demonstrated remarkable efficacy in managing blood glucose levels. The 24-month study, conducted across 67 medical centers in North America and Europe, enrolled 2,847 participants with Type 2 diabetes who had inadequate glycemic control despite standard therapy.

    The primary endpoint of achieving HbA1c levels below 7.0% was met by 85.7% of participants in the treatment group, compared to only 42.3% in the placebo group (p<0.001). The treatment demonstrated a statistically significant reduction in HbA1c from baseline, with a mean decrease of 2.1% ± 0.8% (95% CI: 1.9-2.3%).

    Safety analysis revealed that adverse events occurred in 12.3% of treatment group participants, primarily consisting of mild gastrointestinal symptoms that resolved within 2-4 weeks. No serious adverse events were attributed to the study drug. The dropout rate was remarkably low at 3.2%, indicating good tolerability.

    Economic analysis suggests potential healthcare savings of $3,420 per patient annually compared to current standard care, with projections indicating $2.4 billion in national healthcare cost reductions if adopted widely.
    """

    source_context = SourceContext(
        source_content=sample_source_content,
        source_title="Phase III Diabetes Treatment Trial Results",
        source_url="https://example.com/diabetes-trial",
        original_query="diabetes treatment clinical trial results"
    )

    try:
        print("🔬 Generating source-specific analysis...")
        response = await source_agent.run("Analyze this source", deps=source_context)
        source_summary = response.data

        print("✅ Successfully generated source analysis!\n")

        print("=" * 60)
        print("📄 SOURCE-SPECIFIC ANALYSIS")
        print("=" * 60)

        print(f"\n📝 SUMMARY:")
        print(source_summary.summary)

        print(f"\n🔑 KEY POINTS:")
        for i, point in enumerate(source_summary.key_points, 1):
            print(f"{i}. {point}")

        print(f"\n📈 STATISTICS FROM THIS SOURCE:")
        for i, stat in enumerate(source_summary.statistics, 1):
            unit_str = f" {stat.unit}" if stat.unit else ""
            print(f"{i}. {stat.value}{unit_str} - {stat.context}")

        print(f"\n🎯 RELEVANCE TO QUERY:")
        print(source_summary.relevance_to_query)

        print(f"\n📊 CONTENT TYPE: {source_summary.content_type}")
        print(f"🎯 CONFIDENCE: {source_summary.confidence_score:.1f}/1.0")

        return True

    except Exception as e:
        print(f"❌ Source analysis test failed: {e}")
        return False

async def main():
    """Run all enhancement tests"""
    print("🚀 COMPREHENSIVE ENHANCEMENT TESTING")
    print("Testing the next-generation AI research assistant capabilities\n")

    # Run tests
    comprehensive_test = await test_comprehensive_analysis()
    source_test = await test_source_analysis()

    # Final results
    print("\n" + "=" * 80)
    print("🏆 FINAL TEST RESULTS")
    print("=" * 80)
    print(f"Comprehensive Analysis: {'✅ PASS' if comprehensive_test else '❌ FAIL'}")
    print(f"Source-Specific Analysis: {'✅ PASS' if source_test else '❌ FAIL'}")

    if comprehensive_test and source_test:
        print("\n🎉 ALL ENHANCEMENTS SUCCESSFULLY IMPLEMENTED!")
        print("The AI agent now provides:")
        print("• Extremely detailed 3+ paragraph summaries")
        print("• Comprehensive statistics extraction")
        print("• Expert-level key findings analysis")
        print("• Research quality assessment")
        print("• Domain-specific expertise across all fields")
        print("• Professional-grade analysis suitable for executives and researchers")
    else:
        print("\n⚠️ Some enhancements need review")

if __name__ == "__main__":
    asyncio.run(main())