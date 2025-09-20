'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Playfair_Display } from 'next/font/google';

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
          throw new Error(errorData.error || 'Failed to fetch search results');
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <h1 className={`text-black text-5xl mb-6 ${playfair.className}`}>parsr</h1>
      <form onSubmit={handleSubmit} className="mb-6 w-full max-w-lg">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search..."
          className={`text-center w-full text-black border border-black transition duration-300 ease-in-out focus:outline-none ${playfair.className}`}
        />
      </form>

      {loading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-800 text-lg font-semibold mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      ) : results ? (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Search Results for: {decodeURIComponent(query)}
            </h1>
            <p className="text-gray-600">
              About {results.searchInformation?.totalResults} results 
              ({results.searchInformation?.timeTaken}s)
            </p>
          </div>

          {/* Answer Box */}
          {results.answerBox && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                {results.answerBox.title}
              </h3>
              <p className="text-blue-800 mb-2">{results.answerBox.answer}</p>
              <a 
                href={results.answerBox.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm"
              >
                {results.answerBox.link}
              </a>
            </div>
          )}

          {/* Knowledge Graph */}
          {results.knowledgeGraph && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {results.knowledgeGraph.title}
              </h3>
              <p className="text-sm text-gray-600 mb-2">{results.knowledgeGraph.type}</p>
              <p className="text-gray-800 mb-4">{results.knowledgeGraph.description}</p>
              
              {results.knowledgeGraph.attributes && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(results.knowledgeGraph.attributes).map(([key, value]) => (
                    <div key={key} className="flex">
                      <span className="font-medium text-gray-700 mr-2">{key}:</span>
                      <span className="text-gray-600">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Organic Results */}
          <div className="space-y-6">
            {results.organic?.map((result, index) => (
              <div key={index} className="border-b border-gray-200 pb-4">
                <a
                  href={result.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <h3 className="text-xl text-blue-600 hover:text-blue-800 group-hover:underline mb-1">
                    {result.title}
                  </h3>
                  <p className="text-green-700 text-sm mb-2">{result.link}</p>
                  <p className="text-gray-700 leading-relaxed">{result.snippet}</p>
                </a>
              </div>
            ))}
          </div>

          {/* Raw Response (for debugging) */}
          <details className="mt-8">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
              View Raw API Response
            </summary>
            <pre className="mt-4 bg-gray-100 p-4 rounded-lg overflow-auto text-xs">
              {JSON.stringify(results, null, 2)}
            </pre>
          </details>
        </div>
      ) : (
        <p className="text-gray-600">No results found.</p>
      )}
    </div>
  );
}