'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Playfair_Display } from 'next/font/google';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

const playfair = Playfair_Display({ subsets: ["latin"] });

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

interface SerperResponse {
  organic: SearchResult[];
  searchParameters: {
    q: string;
    type: string;
    engine: string;
  };
  searchInformation: {
    totalResults: string;
    timeTaken: number;
  };
  answerBox?: {
    answer: string;
    title: string;
    link: string;
  };
  knowledgeGraph?: {
    title: string;
    type: string;
    description: string;
    attributes: Record<string, string>;
  };
}

export default function SearchPage() {
  const params = useParams();
  const router = useRouter();
  const query = params.query as string;

  const [results, setResults] = useState<SerperResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search/${encodeURIComponent(searchQuery)}`);
  };

  useEffect(() => {
    if (!query) return;

    let aborted = false;

    const fetchResults = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const decodedQuery = decodeURIComponent(query);
        const response = await fetch(`/api/search?q=${encodeURIComponent(decodedQuery)}`);
        
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
          <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
            <div className="h-full border-r bg-muted/30 overflow-y-auto">
              <div className="p-4">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold mb-2">
                    Search Results for: {decodeURIComponent(query)}
                  </h2>
                  <div className="flex gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary">
                      {results.searchInformation?.totalResults} results
                    </Badge>
                    <Badge variant="outline">
                      {results.searchInformation?.timeTaken}s
                    </Badge>
                  </div>
                </div>

                {/* Answer Box */}
                {results.answerBox && (
                  <Card className="mb-4 border-blue-200 bg-blue-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-blue-900">
                        {results.answerBox.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-blue-800 mb-2 text-xs">{results.answerBox.answer}</p>
                      <a 
                        href={results.answerBox.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                      >
                        Source
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </CardContent>
                  </Card>
                )}

                {/* Knowledge Graph */}
                {results.knowledgeGraph && (
                  <Card className="mb-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{results.knowledgeGraph.title}</CardTitle>
                      <CardDescription className="text-xs">{results.knowledgeGraph.type}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="mb-2 text-xs">{results.knowledgeGraph.description}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Organic Results */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Web Results</h3>
                  {results.organic?.map((result, index) => (
                    <Card key={index} className="hover:shadow-sm transition-shadow cursor-pointer">
                      <CardContent className="p-3">
                        <a
                          href={result.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block group"
                        >
                          <h4 className="text-sm text-blue-600 hover:text-blue-800 group-hover:underline mb-1 line-clamp-2">
                            {result.title}
                          </h4>
                          <p className="text-green-700 text-xs mb-1 truncate">{result.link}</p>
                          <p className="text-muted-foreground text-xs line-clamp-3">{result.snippet}</p>
                        </a>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={70}>
            <div className="flex items-center justify-center h-full text-muted-foreground p-8">
              <div className="text-center">
                <h3 className="text-2xl font-semibold mb-2">Content Area</h3>
                <p>This space is reserved for future content</p>
              </div>
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