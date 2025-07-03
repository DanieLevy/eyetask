import { NextRequest, NextResponse } from 'next/server';
import { supabaseDb as db } from '@/lib/supabase-database';
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
    const { projectName } = await params;
    const data = await db.getProjectPageData(projectName);
    
    if (!data) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in project-data API:', error);
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