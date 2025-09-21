import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source_url, original_query } = body;

    if (!source_url || !original_query) {
      return NextResponse.json(
        { error: 'source_url and original_query are required' },
        { status: 400 }
      );
    }

    // Forward the request to the Python backend
    const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
    console.log(`Attempting to connect to FastAPI at: ${fastApiUrl}/summarize`);

    const response = await fetch(`${fastApiUrl}/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_url,
        original_query,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`FastAPI summarize error - Status: ${response.status}, URL: ${fastApiUrl}/summarize`, errorData);
      return NextResponse.json(
        {
          error: `Backend error: ${errorData}`,
          fastApiUrl: fastApiUrl,
          timestamp: new Date().toISOString()
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Summarize API route error:', error);

    // Provide specific error messages for common connection issues
    let errorMessage = 'Internal server error';
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