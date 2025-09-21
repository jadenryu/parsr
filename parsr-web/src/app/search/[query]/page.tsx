'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Eye, Search } from 'lucide-react';
import GlassIcons from '@/components/GlassIcons';
import ReactMarkdown from 'react-markdown';

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent } from "@/components/ui/tabs";

// Times New Roman font family for all text
const roboto = "ui-sans-serif, Roboto, system-ui, -apple-system, sans-serif";

// Helper function to convert numbers to Roman numerals
const toRomanNumeral = (num: number): string => {
  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const symbols = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let result = '';

  for (let i = 0; i < values.length; i++) {
    while (num >= values[i]) {
      result += symbols[i];
      num -= values[i];
    }
  }

  return result;
};


interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  source_number: number;
}

interface Statistic {
  value: string | number;
  unit?: string;
  context: string;
  source_citation: string;
  confidence: number;
}

interface KeyFinding {
  finding: string;
  category: string;
  significance: string;
  supporting_evidence: string;
  limitations?: string;
}

interface ResearchQuality {
  source_types: string[];
  academic_paper_count: number;
  publication_years: number[];
  study_methodologies: string[];
  sample_sizes: string[];
}

interface AIOverview {
  summary: string;
  key_points: string[];
  statistics: Statistic[];
  key_findings: KeyFinding[];
  research_quality: ResearchQuality;
  confidence_score: number;
  methodology_notes?: string;
  future_research_directions?: string;
}

interface SourceSummary {
  summary: string;
  key_points: string[];
  statistics: Statistic[];
  relevance_to_query: string;
  confidence_score: number;
  content_type: string;
}

interface SearchResponse {
  query: string;
  search_results: SearchResult[];
  ai_overview: AIOverview;
  sources: SearchResult[];
  total_results: number;
  processing_time: number;
  current_page: number;
  per_page: number;
  total_available: number;
  has_next_page: boolean;
}

interface TabContent {
  id: string;
  title: string;
  source: SearchResult;
  content: string;
}

// Simple cache to store search results
const searchCache = new Map<string, SearchResponse>();

export default function SearchPage() {
  const params = useParams();
  const router = useRouter();
  const query = params.query as string;

  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceTabs, setSourceTabs] = useState<SearchResult[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [sourceSummaries, setSourceSummaries] = useState<Record<number, SourceSummary | null>>({});
  const [loadingSummaries, setLoadingSummaries] = useState<Record<number, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setCurrentPage(1); // Reset to first page for new search
    router.push(`/search/${encodeURIComponent(searchQuery)}`);
  };

  const fetchSourceSummary = async (source: SearchResult) => {
    if (sourceSummaries[source.source_number] || loadingSummaries[source.source_number]) {
      return; // Already have summary or currently loading
    }

    setLoadingSummaries(prev => ({ ...prev, [source.source_number]: true }));

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_url: source.link,
          original_query: decodeURIComponent(query)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch source summary');
      }

      const summary = await response.json();
      setSourceSummaries(prev => ({ ...prev, [source.source_number]: summary }));
    } catch (error) {
      console.error('Error fetching source summary:', error);
      setSourceSummaries(prev => ({ ...prev, [source.source_number]: null }));
    } finally {
      setLoadingSummaries(prev => ({ ...prev, [source.source_number]: false }));
    }
  };

  const openSourceTab = async (source: SearchResult) => {
    // Check if tab is already open
    if (sourceTabs.find(tab => tab.source_number === source.source_number)) {
      setActiveTab(`source-${source.source_number}`);
      return;
    }

    // Add new source tab
    setSourceTabs(prev => [...prev, source]);
    setActiveTab(`source-${source.source_number}`);

    // Fetch summary for this source
    await fetchSourceSummary(source);
  };

  useEffect(() => {
    if (!query) return;

    let aborted = false;
    const decodedQuery = decodeURIComponent(query);

    // Check cache first
    const cachedResult = searchCache.get(decodedQuery);
    if (cachedResult) {
      setResults(cachedResult);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchResults = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: decodedQuery,
            max_results: 20,
            page: currentPage,
            per_page: 20
          }),
        });

        if (aborted) return;
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error);
        }

        const data = await response.json();
        if (!aborted) {
          setResults(data);
          // Cache the result
          searchCache.set(decodedQuery, data);
        }
      } catch (err) {
        if (!aborted) {
          setError(err instanceof Error ? err.message : 'An error occurred');
          console.error('Search error:', err);
        }
      } finally {
        if (!aborted) {
          setLoading(false);
        }
      }
    };

    fetchResults();

    return () => {
      aborted = true;
    };
  }, [query, currentPage]);

  // Reset to page 1 when query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query]);
  

  return (
    <div className="min-h-screen">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 -z-10">
        <div className="fixed inset-0 w-full h-full -z-10">
          {/* Base gradient */}
          <div className="absolute inset-0 bg-white"></div>

        </div>
      </div>
      {/* Header */}
      <div className="backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-50">
        <div className="flex flex-col items-center pt-6 pb-4">
          <div className="flex items-center gap-4 mb-4">
            <h1 className="text-slate-800 text-4xl font-light tracking-tight" style={{ fontFamily: 'Times New Roman, serif' }}>
              parsr
            </h1>
            <div className="flex gap-2">
              <GlassIcons
                items={[
                  {
                    icon: <Search className="w-4 h-4" />,
                    label: "Search",
                    color: "blue"
                  }
                ]}
                className="!grid-cols-1 !gap-0 !p-0"
              />
            </div>
          </div>
          <form onSubmit={handleSubmit} className="w-full max-w-2xl flex gap-3 px-4">
            <div className="relative flex-1">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`${decodeURIComponent(query)}`}
                className={`h-12 text-center bg-white/70 border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 focus:ring-2 focus:ring-stone-500/20 focus:border-stone-400 ${roboto}`}
              />
            </div>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-stone-200 border-t-stone-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-blue-400 rounded-full animate-ping"></div>
          </div>
          <p className="mt-6 text-slate-600 font-medium">Searching the web...</p>
          <p className="mt-2 text-sm text-slate-400">This may take a few moments</p>
        </div>
      ) : error ? (
        <div className="container mx-auto px-6 py-12 max-w-2xl">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Search Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          </div>
        </div>
      ) : results ? (
        <ResizablePanelGroup
          direction="horizontal"
          className="h-[calc(100vh-200px)]"
        >
          <ResizablePanel defaultSize={40} minSize={30} maxSize={60}>
            <div className="h-full border-r border-slate-200/60 backdrop-blur-sm overflow-y-auto">
              <div className="p-6">
                <div className="mb-6">
                  <h2 className={`text-xl font-semibold text-slate-800 mb-3 ${roboto}`}>
                    Search Results
                  </h2>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={`px-3 py-1.5 bg-stone-100 text-stone-700 rounded-full font-medium ${roboto}`}>
                      {results.total_results} results
                    </span>
                    <span className={`px-3 py-1.5 bg-green-100 text-green-700 rounded-full font-medium ${roboto}`}>
                      {results.processing_time.toFixed(1)}s
                    </span>
                    <span className={`px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full font-medium ${roboto}`}>
                      {(results.ai_overview.confidence_score * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                </div>

                {/* Search Results */}
                <div className="space-y-4">
                  <h3 className={`text-sm font-medium text-slate-600 uppercase tracking-wide ${roboto}`}>Web Results</h3>
                  {results.search_results?.map((result, index) => (
                    <div key={index} className="group relative">
                      <div className="bg-white rounded-xl border border-slate-200/60 hover:border-stone-300 hover:shadow-lg transition-all duration-200 overflow-hidden">
                        <a
                          href={result.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 bg-stone-200 rounded-lg flex items-center justify-center text-stone-700 text-xs font-semibold flex-shrink-0">
                              {toRomanNumeral(result.source_number)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-sm font-medium text-slate-900 group-hover:text-stone-600 mb-1 line-clamp-2 transition-colors ${roboto}`}>
                                {result.title}
                              </h4>
                              <p className={`text-xs text-emerald-600 mb-2 truncate ${roboto}`}>{result.link}</p>
                              <p className={`text-xs text-slate-600 line-clamp-3 leading-relaxed ${roboto}`}>{result.snippet}</p>
                            </div>
                          </div>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {results && results.total_available > results.per_page && (
                  <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm text-slate-600 ${roboto}`}>
                        Page {results.current_page} of {Math.ceil(results.total_available / results.per_page)}
                      </p>
                      <span className={`text-xs text-slate-500 ${roboto}`}>
                        ({results.total_results} of {results.total_available} results)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Previous Page Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage <= 1 || loading}
                        className={`${roboto} text-xs px-3 py-1.5`}
                      >
                        Previous
                      </Button>

                      {/* Page Numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, Math.ceil(results.total_available / results.per_page)) }, (_, i) => {
                          const totalPages = Math.ceil(results.total_available / results.per_page);
                          let startPage = Math.max(1, currentPage - 2);
                          const endPage = Math.min(totalPages, startPage + 4);

                          if (endPage - startPage < 4) {
                            startPage = Math.max(1, endPage - 4);
                          }

                          const pageNum = startPage + i;
                          if (pageNum <= totalPages) {
                            return (
                              <Button
                                key={pageNum}
                                variant={pageNum === currentPage ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                disabled={loading}
                                className={`${roboto} text-xs px-2 py-1.5 min-w-[32px]`}
                              >
                                {pageNum}
                              </Button>
                            );
                          }
                          return null;
                        })}
                      </div>

                      {/* Next Page Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={!results.has_next_page || loading}
                        className={`${roboto} text-xs px-3 py-1.5`}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={60}>
            <div className="h-full overflow-y-auto backdrop-blur-sm">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-100">
                  <div className="flex items-center gap-0 p-1 overflow-x-auto scrollbar-hide">
                    <button
                      onClick={() => setActiveTab("overview")}
                      className={`relative px-4 py-3 text-sm font-medium transition-all duration-300 whitespace-nowrap ${roboto} ${
                        activeTab === "overview"
                          ? "text-slate-900"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      AI Overview
                      {activeTab === "overview" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full"></div>
                      )}
                    </button>
                    {sourceTabs.map((source) => (
                      <div key={source.source_number} className="flex items-center group">
                        <button
                          onClick={() => setActiveTab(`source-${source.source_number}`)}
                          className={`relative flex items-center gap-2 px-3 py-3 text-sm font-medium transition-all duration-300 max-w-[140px] ${roboto} ${
                            activeTab === `source-${source.source_number}`
                              ? "text-slate-900"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                          title={source.title}
                        >
                          <span className="text-xs text-slate-400 font-normal">
                            {toRomanNumeral(source.source_number)}
                          </span>
                          <span className="truncate">
                            {source.title.length > 10 ? `${source.title.substring(0, 10)}...` : source.title}
                          </span>
                          {activeTab === `source-${source.source_number}` && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full"></div>
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSourceTabs(prev => prev.filter(tab => tab.source_number !== source.source_number));
                            if (activeTab === `source-${source.source_number}`) {
                              setActiveTab("overview");
                            }
                          }}
                          className="ml-1 w-4 h-4 rounded-full text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center text-xs opacity-0 group-hover:opacity-100"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <TabsContent value="overview" className="p-6 space-y-6 h-full overflow-y-auto">
                  {/* AI Overview */}
                  <div className="bg-stone-50 rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                    <div className="bg-white border-b border-stone-200 p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-stone-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                          </div>
                          <h3 className={`text-xl font-semibold text-stone-800 ${roboto}`}>AI Overview</h3>
                        </div>
                        <div className="px-3 py-1 bg-stone-100 rounded-full text-sm font-medium text-stone-700">
                          {(results.ai_overview.confidence_score * 100).toFixed(0)}% confidence
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="prose prose-slate max-w-none">
                        <div className={`text-slate-700 leading-relaxed text-[15px] font-light ${roboto}`}>
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                              strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>
                            }}
                          >
                            {results.ai_overview.summary}
                          </ReactMarkdown>
                        </div>
                      </div>


                      {results.ai_overview.key_points && results.ai_overview.key_points.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-stone-100">
                          <h4 className={`font-semibold text-slate-800 mb-4 flex items-center gap-2 ${roboto}`}>
                            <div className="w-1.5 h-6 bg-stone-600 rounded-full"></div>
                            Key Insights
                          </h4>
                          <div className="space-y-3">
                            {results.ai_overview.key_points.map((point, index) => (
                              <div key={index} className="flex items-start gap-3 p-3 bg-white/70 rounded-xl border border-slate-100">
                                <div className="w-6 h-6 bg-stone-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                                  {toRomanNumeral(index + 1)}
                                </div>
                                <div className={`text-slate-700 text-sm leading-relaxed ${roboto}`}>
                                  <ReactMarkdown
                                    components={{
                                      p: ({ children }) => <p className="mb-0">{children}</p>,
                                      strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>
                                    }}
                                  >
                                    {point}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-stone-50 rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
                <div className="bg-stone-700 text-white p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className={`text-xl font-semibold ${roboto}`}>Sources</h3>
                      <p className={`text-white/70 text-sm ${roboto}`}>Referenced sources with citation numbers</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {results.sources?.map((source) => (
                      <div key={source.source_number} className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-100 hover:border-slate-200 transition-all duration-200 hover:shadow-md group">
                        <div className="w-8 h-8 bg-stone-600 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {toRomanNumeral(source.source_number)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-semibold text-slate-800 mb-2 line-clamp-2 group-hover:text-slate-900 ${roboto}`}>
                            {source.title}
                          </h4>
                          <p className={`text-xs text-slate-600 mb-3 line-clamp-2 leading-relaxed ${roboto}`}>
                            {source.snippet}
                          </p>
                          <a
                            href={source.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-xs text-slate-500 hover:text-stone-600 transition-colors duration-200 truncate block ${roboto}`}
                          >
                            {source.link}
                          </a>
                        </div>
                        <div className="flex-shrink-0">
                          <Button
                            onClick={() => openSourceTab(source)}
                            variant="outline"
                            size="sm"
                            className="h-9 px-4 text-xs font-medium border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
                          >
                            <Eye className="h-3 w-3 mr-2" />
                            View Summary
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {sourceTabs.map((source) => (
              <TabsContent key={source.source_number} value={`source-${source.source_number}`} className="p-4 h-full overflow-y-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      📄 Source Summary
                      <Badge variant="outline">
                        Source {toRomanNumeral(source.source_number)}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {source.link}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className={`prose max-w-none ${roboto}`}>
                      {loadingSummaries[source.source_number] ? (
                        <div className="flex flex-col items-center justify-center py-8">
                          <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin mb-4"></div>
                          <p className={`text-slate-600 ${roboto}`}>Generating comprehensive summary...</p>
                        </div>
                      ) : sourceSummaries[source.source_number] ? (
                        <div>
                          {/* Content Type and Confidence */}
                          <div className="flex items-center justify-between mb-4 p-3 bg-stone-50 rounded-lg">
                            <span className={`text-sm font-medium text-stone-700 ${roboto}`}>
                              📄 {sourceSummaries[source.source_number]?.content_type}
                            </span>
                            <span className={`text-xs text-stone-600 ${roboto}`}>
                              {Math.round((sourceSummaries[source.source_number]?.confidence_score || 0) * 100)}% confidence
                            </span>
                          </div>

                          {/* Main Summary */}
                          <div className="mb-6">
                            <h3 className={`text-lg font-semibold text-slate-800 mb-3 ${roboto}`}>Summary</h3>
                            <div className={`text-slate-700 leading-relaxed ${roboto}`}>
                              <ReactMarkdown
                                components={{
                                  p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                                  strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>
                                }}
                              >
                                {sourceSummaries[source.source_number]?.summary || ""}
                              </ReactMarkdown>
                            </div>
                          </div>
                          
                          {/* Key Points */}
                          {(sourceSummaries[source.source_number]?.key_points?.length ?? 0) > 0 && (
                            <div className="mb-6">
                              <h4 className={`font-semibold text-slate-800 mb-3 flex items-center gap-2 ${roboto}`}>
                                <div className="w-1.5 h-6 bg-stone-600 rounded-full"></div>
                                Key Points
                              </h4>
                              <div className="space-y-3">
                                {sourceSummaries[source.source_number]?.key_points.map((point, index) => (
                                  <div key={index} className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl">
                                    <div className="w-6 h-6 bg-stone-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                                      {toRomanNumeral(index + 1)}
                                    </div>
                                    <div className={`text-slate-700 text-sm leading-relaxed ${roboto}`}>
                                      <ReactMarkdown
                                        components={{
                                          p: ({ children }) => <p className="mb-0">{children}</p>,
                                          strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>
                                        }}
                                      >
                                        {point}
                                      </ReactMarkdown>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Statistics */}
                          {(sourceSummaries[source.source_number]?.statistics?.length ?? 0) > 0 && (
                            <div className="mb-6">
                              <h4 className={`font-semibold text-slate-800 mb-3 flex items-center gap-2 ${roboto}`}>
                                <div className="w-1.5 h-6 bg-emerald-600 rounded-full"></div>
                                Statistics from Source
                              </h4>
                              <div className="grid grid-cols-1 gap-3">
                                {sourceSummaries[source.source_number]?.statistics.map((stat, index) => (
                                  <div key={index} className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="text-xl font-bold text-emerald-800">
                                        {stat.value}{stat.unit && <span className="text-base">{stat.unit}</span>}
                                      </div>
                                      <span className={`text-xs text-emerald-600 ${roboto}`}>{stat.source_citation}</span>
                                    </div>
                                    <p className={`text-sm text-emerald-700 leading-relaxed ${roboto}`}>{stat.context}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Relevance */}
                          <div className="mb-6">
                            <h4 className={`font-semibold text-slate-800 mb-3 ${roboto}`}>Relevance to Query</h4>
                            <p className={`text-slate-700 text-sm leading-relaxed ${roboto}`}>
                              {sourceSummaries[source.source_number]?.relevance_to_query}
                            </p>
                          </div>

                          {/* Source Link */}
                          <div className="p-4 bg-stone-50 rounded-lg">
                            <a
                              href={source.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`text-stone-600 hover:text-stone-800 hover:underline text-sm transition-colors ${roboto}`}
                            >
                              🔗 View Original Source
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4">
                          <p className={`text-sm text-red-800 ${roboto}`}>
                            <strong>Error:</strong> Could not generate summary for this source. Please try again later.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                    </Card>
                  </TabsContent>
            ))}
            </Tabs>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No results found.</p>
        </div>
      )}
    </div>
  );
}