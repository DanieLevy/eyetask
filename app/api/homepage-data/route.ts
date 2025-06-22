import { NextRequest, NextResponse } from 'next/server';
import { getHomepageData } from '@/lib/database';
import { db } from '@/lib/database';
import { logger } from '@/lib/logger';

// GET /api/homepage-data - Fetch all homepage data in a single optimized query
export async function GET(request: NextRequest) {
  try {
    const data = await getHomepageData();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in homepage-data API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch homepage data' },
      { status: 500 }
    );
  }
}

// Clear cache endpoint (admin only)
export async function DELETE(request: NextRequest) {
  try {
    // Clear homepage data cache
    db.invalidateHomepageCache();
    

    
    return NextResponse.json(
      { success: true, message: 'Homepage data cache cleared' },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Failed to clear homepage data cache', 'HOMEPAGE_DATA_API', {
      error: (error as Error).message
    });
    
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
} 