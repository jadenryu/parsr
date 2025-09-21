'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Instrument_Serif, Playfair_Display } from 'next/font/google';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, AlertCircle, X, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const playfair = Instrument_Serif({ weight: "400", subsets: ["latin"] });

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  source_number: number;
}

interface AIOverview {
  summary: string;
  key_points: string[];
  confidence_score: number;
}

interface SearchResponse {
  query: string;
  search_results: SearchResult[];
  ai_overview: AIOverview;
  sources: SearchResult[];
  total_results: number;
  processing_time: number;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search/${encodeURIComponent(searchQuery)}`);
  };

  const openSourceTab = (source: SearchResult) => {
    // Check if tab is already open
    if (sourceTabs.find(tab => tab.source_number === source.source_number)) {
      setActiveTab(`source-${source.source_number}`);
      return;
    }

    // Add new source tab
    setSourceTabs(prev => [...prev, source]);
    setActiveTab(`source-${source.source_number}`);
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
            max_results: 10
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
  }, [query]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <div className="backdrop-blur-sm bg-white/80 border-b border-slate-200/60 sticky top-0 z-50">
        <div className="flex flex-col items-center pt-6 pb-4">
          <h1 className={`text-slate-800 text-4xl mb-4 font-light tracking-tight ${playfair.className}`}>
            parsr
          </h1>
          <form onSubmit={handleSubmit} className="w-full max-w-2xl flex gap-3 px-4">
            <div className="relative flex-1">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`${decodeURIComponent(query)}`}
                className={`h-12 text-center bg-white/70 border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 ${playfair.className}`}
              />
            </div>
            <Button
              type="submit"
              className="h-12 w-12 bg-blue-600 hover:bg-blue-700 border-0 shadow-md hover:shadow-lg transition-all duration-200 rounded-xl"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="h-5 w-5 text-white"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1116.65 16.65z"
                />
              </svg>
            </Button>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
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
            <div className="h-full border-r border-slate-200/60 bg-white/50 backdrop-blur-sm overflow-y-auto">
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-slate-800 mb-3">
                    Search Results
                  </h2>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                      {results.total_results} results
                    </span>
                    <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full font-medium">
                      {results.processing_time.toFixed(1)}s
                    </span>
                    <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                      {(results.ai_overview.confidence_score * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                </div>

                {/* Search Results */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-slate-600 uppercase tracking-wide">Web Results</h3>
                  {results.search_results?.map((result, index) => (
                    <div key={index} className="group relative">
                      <div className="bg-white rounded-xl border border-slate-200/60 hover:border-blue-300 hover:shadow-lg transition-all duration-200 overflow-hidden">
                        <a
                          href={result.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                              {result.source_number}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-slate-900 group-hover:text-blue-600 mb-1 line-clamp-2 transition-colors">
                                {result.title}
                              </h4>
                              <p className="text-xs text-emerald-600 mb-2 truncate font-mono">{result.link}</p>
                              <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{result.snippet}</p>
                            </div>
                          </div>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={60}>
            <div className="h-full overflow-y-auto bg-white/30 backdrop-blur-sm">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-200/60">
                  <div className="flex items-center gap-1 p-2 overflow-x-auto scrollbar-hide">
                    <button
                      onClick={() => setActiveTab("overview")}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                        activeTab === "overview"
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                          : "bg-white/70 text-slate-600 hover:bg-white hover:text-blue-600 border border-slate-200"
                      }`}
                    >
                      <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                      AI Overview
                    </button>
                    {sourceTabs.map((source) => (
                      <div key={source.source_number} className="flex items-center gap-1">
                        <button
                          onClick={() => setActiveTab(`source-${source.source_number}`)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 max-w-[160px] ${
                            activeTab === `source-${source.source_number}`
                              ? "bg-slate-800 text-white shadow-lg"
                              : "bg-white/70 text-slate-600 hover:bg-white hover:text-slate-800 border border-slate-200"
                          }`}
                          title={source.title}
                        >
                          <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded text-white text-xs flex items-center justify-center font-semibold">
                            {source.source_number}
                          </div>
                          <span className="truncate">
                            {source.title.length > 12 ? `${source.title.substring(0, 12)}...` : source.title}
                          </span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSourceTabs(prev => prev.filter(tab => tab.source_number !== source.source_number));
                            if (activeTab === `source-${source.source_number}`) {
                              setActiveTab("overview");
                            }
                          }}
                          className="w-6 h-6 rounded-full bg-slate-200 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors flex items-center justify-center text-sm"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <TabsContent value="overview" className="p-6 space-y-6 h-full overflow-y-auto">
                  {/* AI Overview */}
                  <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 rounded-2xl border border-blue-200/60 overflow-hidden shadow-sm">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                          </div>
                          <h3 className="text-xl font-semibold">AI Overview</h3>
                        </div>
                        <div className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                          {(results.ai_overview.confidence_score * 100).toFixed(0)}% confidence
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="prose prose-slate max-w-none">
                        <div className="text-slate-700 leading-relaxed text-[15px] font-light">
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
                        <div className="mt-6 pt-6 border-t border-blue-100">
                          <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></div>
                            Key Insights
                          </h4>
                          <div className="space-y-3">
                            {results.ai_overview.key_points.map((point, index) => (
                              <div key={index} className="flex items-start gap-3 p-3 bg-white/70 rounded-xl border border-slate-100">
                                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                                  {index + 1}
                                </div>
                                <div className="text-slate-700 text-sm leading-relaxed">
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

                  <div className="bg-gradient-to-br from-slate-50 via-white to-gray-50 rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-slate-700 to-gray-800 text-white p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Sources</h3>
                      <p className="text-white/70 text-sm">Referenced sources with citation numbers</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {results.sources?.map((source) => (
                      <div key={source.source_number} className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-100 hover:border-slate-200 transition-all duration-200 hover:shadow-md group">
                        <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-gray-700 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {source.source_number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-slate-800 mb-2 line-clamp-2 group-hover:text-slate-900">
                            {source.title}
                          </h4>
                          <p className="text-xs text-slate-600 mb-3 line-clamp-2 leading-relaxed">
                            {source.snippet}
                          </p>
                          <a
                            href={source.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-slate-500 hover:text-blue-600 transition-colors duration-200 truncate block"
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
                        Source #{source.source_number}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {source.link}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none">
                          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                            <p className="text-sm text-yellow-800">
                              <strong>Note:</strong> This is a placeholder for the source summary content that will be provided by the API.
                            </p>
                          </div>
                          <div className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg">
                            <h3 className="font-semibold mb-2">Source Summary for: {source.title}</h3>
                            <p className="mb-4">This will contain the detailed source summary and analysis from the API.</p>
                            <p className="mb-2"><strong>URL:</strong> {source.link}</p>
                            <p><strong>Snippet:</strong> {source.snippet}</p>
                          </div>
                          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                            <h4 className="font-semibold text-blue-900 mb-2">Related Links:</h4>
                            <ul className="space-y-1">
                              <li>
                                <a href="#" className="text-blue-600 hover:underline text-sm">
                                  📌 Link to related content (placeholder)
                                </a>
                              </li>
                              <li>
                                <a href="#" className="text-blue-600 hover:underline text-sm">
                                  📌 Another related link (placeholder)
                                </a>
                              </li>
                              <li>
                                <a
                                  href={source.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-sm"
                                >
                                  🔗 View Original Source
                                </a>
                              </li>
                            </ul>
                          </div>
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