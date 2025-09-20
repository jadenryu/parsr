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
    router.push(`search/${encodeURIComponent(searchQuery)}`);
  };

  useEffect(() => {
    if (!query) return;

    const fetchResults = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const decodedQuery = decodeURIComponent(query);
        const response = await fetch(`/api/search?q=${encodeURIComponent(decodedQuery)}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error);
        }

        const data = await response.json();
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <h1 className={`text-foreground text-5xl mb-6 ${playfair.className}`}>parsr</h1>
      <form onSubmit={handleSubmit} className="mb-6 w-full max-w-lg flex gap-2">
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search..."
          className={`text-center ${playfair.className}`}
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {loading ? (
        <div className="flex items-center justify-center">
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
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">
              Search Results for: {decodeURIComponent(query)}
            </h1>
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
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-900">
                  {results.answerBox.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-blue-800 mb-2">{results.answerBox.answer}</p>
                <a 
                  href={results.answerBox.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                >
                  {results.answerBox.link}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </CardContent>
            </Card>
          )}

          {/* Knowledge Graph */}
          {results.knowledgeGraph && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{results.knowledgeGraph.title}</CardTitle>
                <CardDescription>{results.knowledgeGraph.type}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">{results.knowledgeGraph.description}</p>
                
                {results.knowledgeGraph.attributes && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(results.knowledgeGraph.attributes).map(([key, value]) => (
                      <div key={key} className="flex">
                        <span className="font-medium mr-2">{key}:</span>
                        <span className="text-muted-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Organic Results */}
          <div className="space-y-4">
            {results.organic?.map((result, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <a
                    href={result.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group"
                  >
                    <h3 className="text-xl text-blue-600 hover:text-blue-800 group-hover:underline mb-1 flex items-center gap-2">
                      {result.title}
                      <ExternalLink className="h-4 w-4" />
                    </h3>
                    <p className="text-green-700 text-sm mb-2">{result.link}</p>
                    <p className="text-muted-foreground leading-relaxed">{result.snippet}</p>
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Raw Response (for debugging) */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-sm">Raw API Response</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                {JSON.stringify(results, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-muted-foreground">No results found.</p>
      )}
    </div>
  );
}