import { NextRequest, NextResponse } from 'next/server';
import { supabaseDb as db } from '@/lib/supabase-database';
import { authSupabase as authService } from '@/lib/auth-supabase';

import { logger } from '@/lib/logger';

// GET /api/projects/[id] - Get a single project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await db.getProjectById(id);
    
    if (!project) {
      return NextResponse.json({
        error: 'Project not found',
        success: false
      }, { status: 404 });
    }
    
    return NextResponse.json({
      project: {
        _id: project.id || project._id?.toString(),
        name: project.name,
        description: project.description,
        isActive: project.isActive,
        color: project.color,
        priority: project.priority,
        clientName: project.clientName,
        clientEmail: project.clientEmail,
        clientPhone: project.clientPhone,
        notes: project.notes,
        image: project.image,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      },
      success: true
    });
  } catch (error) {
    logger.error('Error fetching project', 'PROJECTS_API', { projectId: (await params).id }, error as Error);
    return NextResponse.json({
      error: 'Failed to fetch project',
      success: false
    }, { status: 500 });
  }
}

// PUT /api/projects/[id] - Update a project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check authentication and project management permission
    const user = authService.extractUserFromRequest(request);
    if (!user || !authService.canManageData(user)) {
      return NextResponse.json({
        error: 'Unauthorized access - Project management permission required',
        success: false
      }, { status: 401 });
    }
    
    const data = await request.json();
    
    // Get existing project to verify it exists
    const existingProject = await db.getProjectById(id);
    if (!existingProject) {
      return NextResponse.json({
        error: 'Project not found',
        success: false
      }, { status: 404 });
    }
    
    // Create update object with only the fields that are provided
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.clientName !== undefined) updateData.clientName = data.clientName;
    if (data.clientEmail !== undefined) updateData.clientEmail = data.clientEmail;
    if (data.clientPhone !== undefined) updateData.clientPhone = data.clientPhone;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.image !== undefined) updateData.image = data.image;
    
    const success = await db.updateProject(id, updateData);
    
    if (!success) {
      return NextResponse.json({
        error: 'Failed to update project',
        success: false
      }, { status: 500 });
    }
    
    // Clear caches
    db.clearAllCaches();
    
    // Log the action
    await db.logAction({
      userId: user.id,
      username: user.username,
      userRole: user.role,
      action: `עדכן פרויקט: ${existingProject.name}`,
      category: 'project',
      target: {
        id: id,
        type: 'project',
        name: existingProject.name
      },
      metadata: { updatedFields: Object.keys(updateData) },
      severity: 'info'
    });
    
    logger.info('Project updated successfully', 'PROJECTS_API', {
      projectId: id,
      userId: user.id,
      changes: Object.keys(updateData)
    });
    
    return NextResponse.json({
      success: true,
      message: 'Project updated successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({
        error: error.message,
        success: false
      }, { status: 401 });
    }
    
    logger.error('Project update error', 'PROJECTS_API', { projectId: (await params).id }, error as Error);
    return NextResponse.json({
      error: 'Failed to update project',
      success: false
    }, { status: 500 });
  }
}

// DELETE /api/projects/[id] - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check authentication and project management permission
    const user = authService.extractUserFromRequest(request);
    if (!user || !authService.canManageData(user)) {
      return NextResponse.json({
        error: 'Unauthorized access - Project management permission required',
        success: false
      }, { status: 401 });
    }
    
    // Get project details before deletion
    const project = await db.getProjectById(id);
    if (!project) {
      return NextResponse.json({
        error: 'Project not found',
        success: false
      }, { status: 404 });
    }
    
    // Delete the project (tasks and subtasks will be cascade deleted)
    const success = await db.deleteProject(id);
    
    if (!success) {
      return NextResponse.json({
        error: 'Failed to delete project',
        success: false
      }, { status: 500 });
    }
    
    // Clear caches
    db.clearAllCaches();
    
    // Log the action
    await db.logAction({
      userId: user.id,
      username: user.username,
      userRole: user.role,
      action: `מחק פרויקט: ${project.name}`,
      category: 'project',
      target: {
        id: id,
        type: 'project',
        name: project.name
      },
      severity: 'warning'
    });
    
    logger.info('Project deleted successfully', 'PROJECTS_API', {
      projectId: id,
      projectName: project.name,
      deletedBy: user.id
    });
    
    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({
        error: error.message,
        success: false
      }, { status: 401 });
    }
    
    logger.error('Project deletion error', 'PROJECTS_API', { projectId: (await params).id }, error as Error);
    return NextResponse.json({
      error: 'Failed to delete project',
      success: false
    }, { status: 500 });
  }
} 