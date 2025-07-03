import { NextRequest, NextResponse } from 'next/server';
import { supabaseDb as db } from '@/lib/supabase-database';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { logger } from '@/lib/logger';
import { activityLogger } from '@/lib/activityLogger';

// GET /api/tasks/[id] - Get a single task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = await db.getTaskById(id);
    
    if (!task) {
      return NextResponse.json({
        error: 'Task not found',
        success: false
      }, { status: 404 });
    }

    // Check if user can view hidden tasks
    const user = authService.extractUserFromRequest(request);
    const canManageData = authService.canManageData(user);
    
    // If task is hidden and user cannot manage data, return 404
    if (!task.isVisible && !canManageData) {
      return NextResponse.json({
        error: 'Task not found',
        success: false
      }, { status: 404 });
    }
    
    return NextResponse.json({
      task: {
        _id: task.id || task._id?.toString(),
        title: task.title,
        subtitle: task.subtitle,
        images: task.images || [],
        datacoNumber: task.datacoNumber,
        description: task.description,
        projectId: task.projectId,
        type: task.type,
        locations: task.locations,
        amountNeeded: task.amountNeeded,
        targetCar: task.targetCar,
        lidar: task.lidar,
        dayTime: task.dayTime,
        priority: task.priority,
        isVisible: task.isVisible,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      },
      success: true
    });
  } catch (error) {
    logger.error('Error fetching task', 'TASKS_API', { taskId: (await params).id }, error as Error);
    return NextResponse.json({
      error: 'Failed to fetch task',
      success: false
    }, { status: 500 });
  }
}

// PUT /api/tasks/[id] - Update a task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check authentication
    const user = authService.extractUserFromRequest(request);
    
    // Check if user can manage data (admin or data_manager)
    if (!user || !authService.canManageData(user)) {
      return NextResponse.json({
        error: 'Unauthorized - Admin or Data Manager access required',
        success: false
      }, { status: 401 });
    }
    
    const data = await request.json();
    
    // Get existing task to verify it exists
    const existingTask = await db.getTaskById(id);
    if (!existingTask) {
      return NextResponse.json({
        error: 'Task not found',
        success: false
      }, { status: 404 });
    }
    
    // Handle priority conversion if needed
    if (data.priority !== undefined && typeof data.priority === 'string') {
      if (data.priority === 'high') data.priority = 2;
      else if (data.priority === 'medium') data.priority = 5;
      else if (data.priority === 'low') data.priority = 8;
      else data.priority = parseInt(data.priority) || 5;
    }
    
    // Create update object with only the fields that are provided
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.subtitle !== undefined) updateData.subtitle = data.subtitle;
    if (data.images !== undefined) updateData.images = data.images;
    if (data.datacoNumber !== undefined) updateData.datacoNumber = data.datacoNumber;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.locations !== undefined) updateData.locations = data.locations;
    if (data.amountNeeded !== undefined) updateData.amountNeeded = data.amountNeeded;
    if (data.targetCar !== undefined) updateData.targetCar = data.targetCar;
    if (data.lidar !== undefined) updateData.lidar = data.lidar;
    if (data.dayTime !== undefined) updateData.dayTime = data.dayTime;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.isVisible !== undefined) updateData.isVisible = data.isVisible;
    
    const success = await db.updateTask(id, updateData);
    
    if (!success) {
      return NextResponse.json({
        error: 'Failed to update task',
        success: false
      }, { status: 500 });
    }
    
    // Clear caches
    db.clearAllCaches();
    
    // Log the activity
    await activityLogger.logTaskActivity(
      'updated',
      id,
      existingTask.title,
      user.id,
      user.role as 'admin' | 'user',
      {
        changes: Object.keys(updateData)
      },
      request
    );
    
    logger.info('Task updated successfully', 'TASKS_API', {
      taskId: id,
      userId: user.id,
      changes: Object.keys(updateData)
    });
    
    return NextResponse.json({
      success: true,
      message: 'Task updated successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({
        error: error.message,
        success: false
      }, { status: 401 });
    }
    
    logger.error('Task update error', 'TASKS_API', { taskId: (await params).id }, error as Error);
    return NextResponse.json({
      error: 'Failed to update task',
      success: false
    }, { status: 500 });
  }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check authentication
    const user = authService.extractUserFromRequest(request);
    
    // Check if user can manage data (admin or data_manager)
    if (!user || !authService.canManageData(user)) {
      return NextResponse.json({
        error: 'Unauthorized - Admin or Data Manager access required',
        success: false
      }, { status: 401 });
    }
    
    // Get task details before deletion
    const task = await db.getTaskById(id);
    if (!task) {
      return NextResponse.json({
        error: 'Task not found',
        success: false
      }, { status: 404 });
    }
    
    // Delete the task (subtasks will be cascade deleted)
    const success = await db.deleteTask(id);
    
    if (!success) {
      return NextResponse.json({
        error: 'Failed to delete task',
        success: false
      }, { status: 500 });
    }
    
    // Clear caches
    db.clearAllCaches();
    
    // Log the activity
    await activityLogger.logTaskActivity(
      'deleted',
      id,
      task.title,
      user.id,
      user.role as 'admin' | 'user',
      {
        datacoNumber: task.datacoNumber,
        projectId: task.projectId
      },
      request
    );
    
    logger.info('Task deleted successfully', 'TASKS_API', {
      taskId: id,
      taskTitle: task.title,
      userId: user.id
    });
    
    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({
        error: error.message,
        success: false
      }, { status: 401 });
    }
    
    logger.error('Task deletion error', 'TASKS_API', { taskId: (await params).id }, error as Error);
    return NextResponse.json({
      error: 'Failed to delete task',
      success: false
    }, { status: 500 });
  }
} 