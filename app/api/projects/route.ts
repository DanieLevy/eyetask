import { NextRequest, NextResponse } from 'next/server';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { logger } from '@/lib/logger';
import { supabaseDb as db } from '@/lib/supabase-database';

// GET /api/projects - Fetch all projects
export async function GET(_request: NextRequest) {
  try {
    const projects = await db.getAllProjects();
    
    return NextResponse.json({
      projects: projects.map(project => ({
        _id: project.id || project._id?.toString(),
        name: project.name,
        description: project.description,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      })),
      total: projects.length,
      success: true
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    logger.error('Error fetching projects', 'PROJECTS_API', undefined, error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch projects', success: false },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    // Check authentication and project management permission
    const user = authService.extractUserFromRequest(request);
    if (!user || !authService.canManageData(user)) {
      return NextResponse.json({
        error: 'Unauthorized access - Project management permission required',
        success: false
      }, { status: 401 });
    }

    const data = await request.json();
    
    if (!data.name) {
      return NextResponse.json({
        error: 'Project name is required',
        success: false
      }, { status: 400 });
    }

    const projectData = {
      name: data.name,
      description: data.description || '',
      isActive: data.isActive !== undefined ? data.isActive : true,
      color: data.color || '#3B82F6',
      priority: data.priority || 1,
      clientName: data.clientName || '',
      clientEmail: data.clientEmail || '',
      clientPhone: data.clientPhone || '',
      notes: data.notes || '',
      image: data.image || ''
    };

    const projectId = await db.createProject(projectData);
    
    // Clear caches
    db.invalidateHomepageCache();
    db.clearAllCaches();
    
    // Log the action
    await db.logAction({
      userId: user.id,
      username: user.username,
      userRole: user.role,
      action: `יצר פרויקט חדש: ${data.name}`,
      category: 'project',
      target: {
        id: projectId,
        type: 'project',
        name: data.name
      },
      severity: 'success'
    });

    logger.info('Project created successfully', 'PROJECTS_API', { 
      projectId, 
      userId: user.id,
      projectName: data.name 
    });

    return NextResponse.json({
      success: true,
      projectId
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({
        error: error.message,
        success: false
      }, { status: 401 });
    }

    logger.error('Project creation error', 'PROJECTS_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to create project',
      success: false
    }, { status: 500 });
  }
} 