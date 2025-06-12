import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { auth, requireAdmin } from '@/lib/auth';
import { logger } from '@/lib/logger';

// GET /api/projects - Fetch all projects
export async function GET(request: NextRequest) {
  try {
    const projects = await db.getAllProjects();
    
    logger.info('Projects fetched successfully', 'PROJECTS_API', { count: projects.length });
    
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

// POST /api/projects - Create new project (admin only)
export async function POST(request: NextRequest) {
  try {
    // Extract and verify user authentication
    const user = auth.extractUserFromRequest(request);
    requireAdmin(user);
    
    const body = await request.json();
    
    // Validate required fields (description is optional)
    if (!body.name) {
      return NextResponse.json(
        { error: 'Missing required field: name', success: false },
        { status: 400 }
      );
    }
    
    const projectId = await db.createProject({
      name: body.name,
      description: body.description || '',
      isActive: body.isActive !== undefined ? body.isActive : true,
      color: body.color || '#3B82F6',
      priority: body.priority || 1,
      clientName: body.clientName || '',
      clientEmail: body.clientEmail || '',
      clientPhone: body.clientPhone || '',
      notes: body.notes || '',
      image: body.image || ''
    });
    
    const newProject = await db.getProjectById(projectId);
    
    logger.info('Project created successfully', 'PROJECTS_API', { 
      projectId,
      name: body.name,
      userId: user?.id 
    });
    
    return NextResponse.json({ 
      project: {
        _id: newProject?._id?.toString(),
        name: newProject?.name,
        description: newProject?.description,
        isActive: newProject?.isActive,
        color: newProject?.color,
        priority: newProject?.priority,
        clientName: newProject?.clientName,
        clientEmail: newProject?.clientEmail,
        clientPhone: newProject?.clientPhone,
        notes: newProject?.notes,
        image: newProject?.image,
        createdAt: newProject?.createdAt.toISOString(),
        updatedAt: newProject?.updatedAt.toISOString()
      }, 
      success: true 
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json(
        { error: error.message, success: false },
        { status: 401 }
      );
    }
    
    logger.error('Error creating project', 'PROJECTS_API', undefined, error as Error);
    return NextResponse.json(
      { error: 'Failed to create project', success: false },
      { status: 500 }
    );
  }
} 