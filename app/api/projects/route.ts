import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { auth, requireAdmin } from '@/lib/auth';
import { logger } from '@/lib/logger';

// GET /api/projects - Fetch all projects
export async function GET(request: NextRequest) {
  try {
    const projects = await db.getAllProjects();
    

    
    return NextResponse.json({
      projects: projects.map(project => ({
        _id: project._id?.toString(),
        name: project.name,
        description: project.description,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString()
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
    // Check authentication
    const user = auth.extractUserFromRequest(request);
    const adminUser = requireAdmin(user);

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
      userId: adminUser.id,
      username: adminUser.username,
      userRole: adminUser.role,
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
      userId: adminUser.id,
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