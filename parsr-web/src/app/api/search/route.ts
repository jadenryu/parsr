import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'SERPER_API_KEY environment variable is not set' },
        { status: 500 }
      );
    }
    console.log(process.env.SERPER_API_KEY);

    const url = new URL('https://google.serper.dev/search');
    url.searchParams.set('q', query);
    url.searchParams.set('apiKey', apiKey);

    const res = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow', // mirrors curl -L
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
      // next: { revalidate: 0 }, // optional
    });

    if (!res.ok) {
      const details = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Serper API responded with status: ${res.status}`, details },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch search results' },
      { status: 500 }
    );
  }
}