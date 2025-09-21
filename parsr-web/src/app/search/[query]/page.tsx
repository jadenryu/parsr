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

    const fetchResults = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const decodedQuery = decodeURIComponent(query);
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
    <div className="min-h-screen bg-background">
      <div className="flex flex-col items-center pt-8 pb-6 border-b">
        <h1 className={`text-foreground justify-center text-5xl mb-6 ${playfair.className}`}>parsr</h1>
        <form onSubmit={handleSubmit} className="mb-6 w-full max-w-lg flex gap-2">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`${decodeURIComponent(query)}`}
            className={`text-center ${playfair.className}`}
          />
          <Button type="submit" variant="outline" className="flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-5 w-5"
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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin" />
        </div>
      ) : error ? (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      ) : results ? (
        <ResizablePanelGroup
          direction="horizontal"
          className="h-[calc(100vh-200px)]"
        >
          <ResizablePanel defaultSize={40} minSize={30} maxSize={60}>
            <div className="h-full border-r bg-muted/30 overflow-y-auto">
              <div className="p-4">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold mb-2">
                    Search Results for: {results.query}
                  </h2>
                  <div className="flex gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary">
                      {results.total_results} results
                    </Badge>
                    <Badge variant="outline">
                      {results.processing_time.toFixed(2)}s
                    </Badge>
                    <Badge variant="outline">
                      Confidence: {(results.ai_overview.confidence_score * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>

                {/* Search Results */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Web Results</h3>
                  {results.search_results?.map((result, index) => (
                    <Card key={index} className="hover:shadow-sm transition-shadow cursor-pointer">
                      <CardContent className="p-3">
                        <a
                          href={result.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block group"
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-xs bg-gray-100 text-gray-600 rounded-full w-5 h-5 flex items-center justify-center font-medium flex-shrink-0 mt-1">
                              {result.source_number}
                            </span>
                            <div className="flex-1">
                              <h4 className="text-sm text-blue-600 hover:text-blue-800 group-hover:underline mb-1 line-clamp-2">
                                {result.title}
                              </h4>
                              <p className="text-green-700 text-xs mb-1 truncate">{result.link}</p>
                              <p className="text-muted-foreground text-xs line-clamp-3">{result.snippet}</p>
                            </div>
                          </div>
                        </a>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={60}>
            <div className="h-full overflow-y-auto">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${1 + sourceTabs.length}, 1fr)` }}>
                  <TabsTrigger value="overview">🤖 AI Overview</TabsTrigger>
                  {sourceTabs.map((source) => (
                    <TabsTrigger key={source.source_number} value={`source-${source.source_number}`} className="relative group">
                      <span className="truncate max-w-[120px]" title={source.title}>
                        {source.title.length > 15 ? `${source.title.substring(0, 15)}...` : source.title}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSourceTabs(prev => prev.filter(tab => tab.source_number !== source.source_number));
                          if (activeTab === `source-${source.source_number}`) {
                            setActiveTab("overview");
                          }
                        }}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                      >
                        ×
                      </button>
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="overview" className="p-4 h-full overflow-y-auto">
                  {/* AI Overview */}
                  <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardHeader>
                  <CardTitle className="text-blue-900 flex items-center gap-2">
                    🤖 AI Overview
                    <Badge variant="outline" className="text-xs">
                      Confidence: {(results.ai_overview.confidence_score * 100).toFixed(0)}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-blue max-w-none">
                    <p className="text-blue-800 leading-relaxed whitespace-pre-wrap">{results.ai_overview.summary}</p>
                  </div>

                  {results.ai_overview.key_points && results.ai_overview.key_points.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-blue-900 mb-2">Key Points:</h4>
                      <ul className="space-y-1">
                        {results.ai_overview.key_points.map((point, index) => (
                          <li key={index} className="text-blue-800 flex items-start gap-2">
                            <span className="text-blue-600 font-bold mt-1">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sources */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">📚 Sources</CardTitle>
                  <CardDescription>Referenced sources with citation numbers. Click "View Source Summary" to open detailed analysis in a new tab.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {results.sources?.map((source) => (
                      <div key={source.source_number} className="flex items-start gap-3 p-2 rounded-lg bg-gray-50">
                        <span className="text-xs bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center font-medium flex-shrink-0">
                          {source.source_number}
                        </span>
                        <div className="flex-1">
                          <a
                            href={source.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                          >
                            {source.title}
                          </a>
                          <p className="text-xs text-gray-600 mt-1">{source.link}</p>
                          <Button
                            onClick={() => openSourceTab(source)}
                            variant="outline"
                            size="sm"
                            className="mt-2 h-7 text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Source Summary
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
                </TabsContent>

                {/* Source Tabs */}
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