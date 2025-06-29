import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { extractTokenFromHeader, requireAuthEnhanced, isAdminEnhanced } from '@/lib/auth';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id] - Get single project
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const includeDetails = searchParams.get('includeDetails') === 'true';
  const { id } = await params;

  try {
    const project = await db.getProjectById(id);
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found', success: false },
        { status: 404 }
      );
    }

    // If details are requested, include tasks and subtasks count
    if (includeDetails) {
      const tasks = await db.getTasksByProject(id);
      const subtasksCount = await Promise.all(
        tasks.map(async (task) => {
          const subtasks = await db.getSubtasksByTask(task._id!.toString());
          return subtasks.length;
        })
      );

      return NextResponse.json({
        project: {
          ...project,
          _id: project._id?.toString(),
          taskCount: tasks.length,
          subtaskCount: subtasksCount.reduce((a, b) => a + b, 0)
        },
        success: true
      });
    }

    return NextResponse.json({ 
      project: {
        ...project,
        _id: project._id?.toString()
      }, 
      success: true 
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project', success: false },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id] - Update project
export async function PUT(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = auth.extractUserFromRequest(request);
    
    // Check if user can manage data (admin or data_manager)
    if (!user || !auth.canManageData(user)) {
      return NextResponse.json({
        error: 'Unauthorized - Admin or Data Manager access required',
        success: false
      }, { status: 401 });
    }

    const data = await request.json();
    const { id: projectId } = await params;

    // Get current project for comparison
    const currentProject = await db.getProjectById(projectId);
    if (!currentProject) {
      return NextResponse.json({
        error: 'Project not found',
        success: false
      }, { status: 404 });
    }

    const success = await db.updateProject(projectId, data);
    
    if (success) {
      // Clear caches
      db.invalidateHomepageCache();
      db.invalidateProjectCache(currentProject.name);
      db.clearAllCaches();
      
      // Log the action
      await db.logAction({
        userId: user.id,
        username: user.username,
        userRole: user.role,
        action: `עדכן פרויקט: ${currentProject.name}`,
        category: 'project',
        target: {
          id: projectId,
          type: 'project',
          name: currentProject.name
        },
        metadata: {
          updatedFields: Object.keys(data)
        },
        severity: 'success'
      });

      logger.info('Project updated successfully', 'PROJECTS_API', { 
        projectId, 
        userId: user.id,
        updatedFields: Object.keys(data)
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({
        error: 'Failed to update project',
        success: false
      }, { status: 500 });
    }
  } catch (error) {
    logger.error('Project update error', 'PROJECTS_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to update project',
      success: false
    }, { status: 500 });
  }
}

// DELETE /api/projects/[id] - Delete project
export async function DELETE(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = auth.extractUserFromRequest(request);
    
    // Check if user can manage data (admin or data_manager)
    if (!user || !auth.canManageData(user)) {
      return NextResponse.json({
        error: 'Unauthorized - Admin or Data Manager access required',
        success: false
      }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Get project details before deletion
    const project = await db.getProjectById(projectId);
    if (!project) {
      return NextResponse.json({
        error: 'Project not found',
        success: false
      }, { status: 404 });
    }

    const success = await db.deleteProject(projectId);
    
    if (success) {
      // Clear caches
      db.invalidateHomepageCache();
      db.invalidateProjectCache(project.name);
      db.clearAllCaches();
      
      // Log the action
      await db.logAction({
        userId: user.id,
        username: user.username,
        userRole: user.role,
        action: `מחק פרויקט: ${project.name}`,
        category: 'project',
        target: {
          id: projectId,
          type: 'project',
          name: project.name
        },
        severity: 'warning'
      });

      logger.info('Project deleted successfully', 'PROJECTS_API', { 
        projectId, 
        projectName: project.name,
        userId: user.id
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({
        error: 'Failed to delete project',
        success: false
      }, { status: 500 });
    }
  } catch (error) {
    logger.error('Project deletion error', 'PROJECTS_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to delete project',
      success: false
    }, { status: 500 });
  }
} 