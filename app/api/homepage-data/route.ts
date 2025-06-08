import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { logger } from '@/lib/logger';

// GET /api/homepage-data - Fetch all homepage data in a single optimized query
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Get homepage data using optimized aggregation
    const homepageData = await db.getHomepageData();
    
    const queryTime = Date.now() - startTime;
    
    logger.info('Homepage data fetched successfully', 'HOMEPAGE_DATA_API', { 
      projectCount: homepageData.projects.length,
      taskCount: homepageData.tasks.length,
      queryTime: `${queryTime}ms`
    });
    
    return NextResponse.json({
      ...homepageData,
      success: true,
      queryTime
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        'CDN-Cache-Control': 'public, max-age=300',
        'Vary': 'Accept-Encoding'
      }
    });
  } catch (error) {
    logger.error('Error fetching homepage data', 'HOMEPAGE_DATA_API', undefined, error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch homepage data', success: false },
      { status: 500 }
    );
  }
} 