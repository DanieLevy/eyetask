import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ projectName: string }>;
}

// GET /api/project-data/[projectName] - Fetch all project page data in a single optimized query
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Await params to fix Next.js 15 requirement
    const { projectName: rawProjectName } = await params;
    const projectName = decodeURIComponent(rawProjectName);
    
    const startTime = Date.now();
    
    // Get project data using optimized aggregation
    const projectData = await db.getProjectPageData(projectName);
    
    const queryTime = Date.now() - startTime;
    
    if (!projectData.project) {
      return NextResponse.json(
        { error: 'Project not found', success: false },
        { status: 404 }
      );
    }
    
    logger.info('Project data fetched successfully', 'PROJECT_DATA_API', { 
      projectName,
      taskCount: projectData.tasks.length,
      subtaskCount: Object.values(projectData.subtasks).reduce((acc, subtasks) => acc + subtasks.length, 0),
      queryTime: `${queryTime}ms`
    });
    
    return NextResponse.json({
      ...projectData,
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
    logger.error('Error fetching project data', 'PROJECT_DATA_API', undefined, error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch project data', success: false },
      { status: 500 }
    );
  }
} 