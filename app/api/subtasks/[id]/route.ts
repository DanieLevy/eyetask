import { NextRequest, NextResponse } from 'next/server';
import { supabaseDb as db } from '@/lib/supabase-database';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { logger } from '@/lib/logger';
import { activityLogger } from '@/lib/activityLogger';

// GET /api/subtasks/[id] - Get a single subtask
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const subtask = await db.getSubtaskById(id);
    
    if (!subtask) {
      return NextResponse.json({
        error: 'Subtask not found',
        success: false
      }, { status: 404 });
    }

    // Check if user can view hidden tasks
    const user = authService.extractUserFromRequest(request);
    const canManageData = authService.canManageData(user);
    
    // If subtask is hidden and user cannot manage data, return 404
    if (!subtask.isVisible && !canManageData) {
      return NextResponse.json({
        error: 'Subtask not found',
        success: false
      }, { status: 404 });
    }
    
    return NextResponse.json({
      subtask: {
        _id: subtask.id || subtask._id?.toString(),
        taskId: subtask.taskId,
        title: subtask.title,
        subtitle: subtask.subtitle,
        images: subtask.images || [],
        datacoNumber: subtask.datacoNumber,
        type: subtask.type,
        amountNeeded: subtask.amountNeeded,
        labels: subtask.labels,
        targetCar: subtask.targetCar,
        weather: subtask.weather,
        scene: subtask.scene,
        dayTime: subtask.dayTime,
        isVisible: subtask.isVisible,
        createdAt: subtask.createdAt,
        updatedAt: subtask.updatedAt
      },
      success: true
    });
  } catch (error) {
    logger.error('Error fetching subtask', 'SUBTASKS_API', { subtaskId: (await params).id }, error as Error);
    return NextResponse.json({
      error: 'Failed to fetch subtask',
      success: false
    }, { status: 500 });
  }
}

// PUT /api/subtasks/[id] - Update a subtask
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
    
    // Get existing subtask to verify it exists
    const existingSubtask = await db.getSubtaskById(id);
    if (!existingSubtask) {
      return NextResponse.json({
        error: 'Subtask not found',
        success: false
      }, { status: 404 });
    }
    
    // Create update object with only the fields that are provided
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.subtitle !== undefined) updateData.subtitle = data.subtitle;
    if (data.images !== undefined) updateData.images = data.images;
    if (data.datacoNumber !== undefined) updateData.datacoNumber = data.datacoNumber;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.amountNeeded !== undefined) updateData.amountNeeded = data.amountNeeded;
    if (data.labels !== undefined) updateData.labels = data.labels;
    if (data.targetCar !== undefined) updateData.targetCar = data.targetCar;
    if (data.weather !== undefined) updateData.weather = data.weather;
    if (data.scene !== undefined) updateData.scene = data.scene;
    if (data.dayTime !== undefined) updateData.dayTime = data.dayTime;
    if (data.isVisible !== undefined) updateData.isVisible = data.isVisible;
    
    const success = await db.updateSubtask(id, updateData);
    
    if (!success) {
      return NextResponse.json({
        error: 'Failed to update subtask',
        success: false
      }, { status: 500 });
    }
    
    // Log the activity
    await activityLogger.logSubtaskActivity(
      'updated',
      id,
      existingSubtask.title,
      existingSubtask.taskId?.toString() || '',
      user.id,
      user.role as 'admin' | 'user',
      {
        changes: Object.keys(updateData)
      },
      request
    );
    
    logger.info('Subtask updated successfully', 'SUBTASKS_API', {
      subtaskId: id,
      userId: user.id,
      changes: Object.keys(updateData)
    });
    
    return NextResponse.json({
      success: true,
      message: 'Subtask updated successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({
        error: error.message,
        success: false
      }, { status: 401 });
    }
    
    logger.error('Subtask update error', 'SUBTASKS_API', { subtaskId: (await params).id }, error as Error);
    return NextResponse.json({
      error: 'Failed to update subtask',
      success: false
    }, { status: 500 });
  }
}

// DELETE /api/subtasks/[id] - Delete a subtask
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
    
    // Get subtask details before deletion
    const subtask = await db.getSubtaskById(id);
    if (!subtask) {
      return NextResponse.json({
        error: 'Subtask not found',
        success: false
      }, { status: 404 });
    }
    
    // Delete the subtask
    const success = await db.deleteSubtask(id);
    
    if (!success) {
      return NextResponse.json({
        error: 'Failed to delete subtask',
        success: false
      }, { status: 500 });
    }
    
    // Log the activity
    await activityLogger.logSubtaskActivity(
      'deleted',
      id,
      subtask.title,
      subtask.taskId?.toString() || '',
      user.id,
      user.role as 'admin' | 'user',
      {
        datacoNumber: subtask.datacoNumber
      },
      request
    );
    
    logger.info('Subtask deleted successfully', 'SUBTASKS_API', {
      subtaskId: id,
      subtaskTitle: subtask.title,
      userId: user.id
    });
    
    return NextResponse.json({
      success: true,
      message: 'Subtask deleted successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({
        error: error.message,
        success: false
      }, { status: 401 });
    }
    
    logger.error('Subtask deletion error', 'SUBTASKS_API', { subtaskId: (await params).id }, error as Error);
    return NextResponse.json({
      error: 'Failed to delete subtask',
      success: false
    }, { status: 500 });
  }
} 