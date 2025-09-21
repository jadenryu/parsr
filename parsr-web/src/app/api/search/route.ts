import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, max_results = 20, page = 1, per_page = 20 } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
    console.log(`Attempting to connect to FastAPI at: ${fastApiUrl}`);

    const response = await fetch(`${fastApiUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        max_results,
        page,
        per_page
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`FastAPI error - Status: ${response.status}, URL: ${fastApiUrl}/search`, errorData);
      return NextResponse.json(
        {
          error: errorData.detail || `FastAPI responded with status: ${response.status}`,
          fastApiUrl: fastApiUrl,
          timestamp: new Date().toISOString()
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Search API error:', error);

    // Provide specific error messages for common connection issues
    let errorMessage = 'Failed to fetch search results';
    let debugInfo: any = {
      fastApiUrl: process.env.FASTAPI_URL || 'http://localhost:8000',
      timestamp: new Date().toISOString()
    };

    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Cannot connect to FastAPI backend. Please ensure it is running.';
      debugInfo.suggestion = 'Check if your FastAPI server is running and accessible at the configured URL';
    } else if (error.name === 'TypeError' && error.message.includes('fetch failed')) {
      errorMessage = 'Network error connecting to backend';
      debugInfo.suggestion = 'Verify the FASTAPI_URL environment variable is correct';
    }

    return NextResponse.json(
      {
        error: errorMessage,
        debug: debugInfo,
        originalError: error.message
      },
      { status: 500 }
    );
  }
}