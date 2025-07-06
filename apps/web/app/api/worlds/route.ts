import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';
    const search = searchParams.get('search') || '';
    
    // Build query string
    const queryParams = new URLSearchParams({
      page,
      limit,
      ...(search && { search })
    });
    
    // Fetch active worlds from the Colyseus server
    const response = await fetch(`http://localhost:2567/api/worlds?${queryParams}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch worlds: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching worlds:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch worlds', 
        worlds: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0
        }
      },
      { status: 200 } // Return 200 to avoid error on client
    );
  }
}