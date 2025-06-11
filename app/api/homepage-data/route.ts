import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { logger } from '@/lib/logger';
import { PerformanceTracker, logMemoryUsage } from '@/lib/enhanced-logging';
import { cache } from '@/lib/cache';

// GET /api/homepage-data - Fetch all homepage data in a single optimized query
export async function GET(request: NextRequest) {
  const tracker = new PerformanceTracker('HOMEPAGE_DATA_API', 'GET /api/homepage-data');
  
  try {
    tracker.checkpoint('start_processing');
    
    // Log the query parameters if any
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    if (Object.keys(params).length > 0) {
      logger.debug('Homepage data request params', 'HOMEPAGE_DATA_API', params);
    }
    
    tracker.checkpoint('before_db_query');
    
    // Get homepage data - the database service handles caching internally
    const data = await db.getHomepageData();
    
    tracker.checkpoint('after_db_query');
    
    // Log memory usage
    logMemoryUsage('HOMEPAGE_DATA_API_MEMORY');
    
    // Set response headers for client caching - 10 seconds max age
    // This allows client-side refreshes to pick up new data quickly while
    // still providing some caching benefit for frequent requests
    const headers = {
      'Cache-Control': 'public, max-age=10, s-maxage=10, stale-while-revalidate=60',
      'Content-Type': 'application/json'
    };
    
    tracker.checkpoint('before_response');
    
    // Log success with counts
    tracker.finish({
      projectCount: data.projects.length,
      taskCount: data.tasks.length,
      responseSize: `${(JSON.stringify(data).length / 1024).toFixed(2)} KB`,
      params
    });
    
    return NextResponse.json(data, { headers });
  } catch (error) {
    logger.error('Failed to fetch homepage data', 'HOMEPAGE_DATA_API', {
      error: (error as Error).message
    });
    
    tracker.finish({ error: (error as Error).message });
    
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
    
    logger.info('Homepage data cache cleared manually', 'HOMEPAGE_DATA_API');
    
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