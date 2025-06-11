import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { logger } from '@/lib/logger';
import { PerformanceTracker, logMemoryUsage } from '@/lib/enhanced-logging';

interface RouteParams {
  params: Promise<{ projectName: string }>;
}

// GET /api/project-data/[projectName] - Fetch all project page data in a single optimized query
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const tracker = new PerformanceTracker('PROJECT_DATA_API', 'GET /api/project-data/[projectName]');
  
  try {
    tracker.checkpoint('start_processing');
    
    // Await params to fix Next.js 15 requirement
    const { projectName: rawProjectName } = await params;
    const projectName = decodeURIComponent(rawProjectName);
    
    logger.debug(`Project data request for: ${projectName}`, 'PROJECT_DATA_API');
    
    tracker.checkpoint('before_db_query');
    
    // Get project data - the database service handles caching internally
    const data = await db.getProjectPageData(projectName);
    
    tracker.checkpoint('after_db_query');
    
    // Log memory usage
    logMemoryUsage('PROJECT_DATA_API_MEMORY');
    
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
      projectName,
      taskCount: data.tasks.length,
      responseSize: `${(JSON.stringify(data).length / 1024).toFixed(2)} KB`
    });
    
    return NextResponse.json(data, { headers });
  } catch (error) {
    logger.error('Failed to fetch project data', 'PROJECT_DATA_API', {
      error: (error as Error).message,
      projectName: (await params).projectName
    });
    
    tracker.finish({ error: (error as Error).message });
    
    return NextResponse.json(
      { error: 'Failed to fetch project data' },
      { status: 500 }
    );
  }
}

// Clear cache endpoint (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { projectName: rawProjectName } = await params;
    const projectName = decodeURIComponent(rawProjectName);
    
    // Clear project data cache
    db.invalidateProjectCache(projectName);
    
    logger.info(`Project data cache cleared for: ${projectName}`, 'PROJECT_DATA_API');
    
    return NextResponse.json(
      { success: true, message: `Project data cache cleared for: ${projectName}` },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Failed to clear project data cache', 'PROJECT_DATA_API', {
      error: (error as Error).message,
      projectName: (await params).projectName
    });
    
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
} 