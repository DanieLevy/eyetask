import { NextRequest, NextResponse } from 'next/server';
import { supabaseDb as db } from '@/lib/supabase-database';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { logger } from '@/lib/logger';
import { activityLogger } from '@/lib/activityLogger';

// GET /api/subtasks - Get all subtasks (admin) or visible subtasks (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const taskIds = searchParams.get('taskIds');
    const countOnly = searchParams.get('countOnly') === 'true';
    
    // Handle single taskId or multiple taskIds
    let taskIdList: string[] = [];
    if (taskId) {
      taskIdList = [taskId];
    } else if (taskIds) {
      taskIdList = taskIds.split(',').filter(id => id.trim());
    }
    
    if (taskIdList.length === 0) {
      return NextResponse.json({
        error: 'Task ID(s) required',
        success: false
      }, { status: 400 });
    }
    
    const user = authService.extractUserFromRequest(request);
    const canManageData = authService.canManageData(user);
    
    // If countOnly is requested, return counts for each task
    if (countOnly) {
      const counts: Record<string, number> = {};
      
      for (const tid of taskIdList) {
        try {
          const subtasks = await db.getSubtasksByTask(tid, canManageData);
          counts[tid] = subtasks.length;
        } catch (error) {
          // If task doesn't exist or error, count is 0
          counts[tid] = 0;
        }
      }
      
      return NextResponse.json({
        counts,
        success: true
      });
    }
    
    // For single task, return subtasks as before
    if (taskIdList.length === 1) {
      const subtasks = await db.getSubtasksByTask(taskIdList[0], canManageData);
      
      return NextResponse.json({
        subtasks: subtasks.map(subtask => ({
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
        })),
        total: subtasks.length,
        success: true
      });
    }
    
    // For multiple tasks, return grouped subtasks
    const allSubtasks: any[] = [];
    const subtasksByTask: Record<string, any[]> = {};
    
    for (const tid of taskIdList) {
      try {
        const subtasks = await db.getSubtasksByTask(tid, canManageData);
        const mappedSubtasks = subtasks.map(subtask => ({
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
        }));
        
        subtasksByTask[tid] = mappedSubtasks;
        allSubtasks.push(...mappedSubtasks);
      } catch (error) {
        // If task doesn't exist or error, skip it
        subtasksByTask[tid] = [];
      }
    }
    
    return NextResponse.json({
      subtasks: allSubtasks,
      subtasksByTask,
      total: allSubtasks.length,
      success: true
    });
  } catch (error) {
    logger.error('Error fetching subtasks', 'SUBTASKS_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to fetch subtasks',
      success: false
    }, { status: 500 });
  }
}

// POST /api/subtasks - Create new subtask (admin and data managers)
export async function POST(request: NextRequest) {
  try {
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
    
    // Validate required fields
    const requiredFields = ['taskId', 'title', 'datacoNumber', 'type', 'labels', 'targetCar', 'dayTime'];
    
    for (const field of requiredFields) {
      if (!(field in data)) {
        return NextResponse.json({
          error: `Missing required field: ${field}`,
          success: false
        }, { status: 400 });
      }
    }
    
    // Validate type
    if (!['events', 'hours', 'loops'].includes(data.type)) {
      return NextResponse.json({
        error: 'Invalid type. Must be either "events", "hours", or "loops"',
        success: false
      }, { status: 400 });
    }
    
    // Check if parent task exists
    const parentTask = await db.getTaskById(data.taskId);
    if (!parentTask) {
      return NextResponse.json({
        error: 'Parent task not found',
        success: false
      }, { status: 404 });
    }
    
    // Create subtask
    const subtaskData = {
      taskId: data.taskId,
      title: data.title,
      subtitle: data.subtitle,
      images: data.images || [],
      datacoNumber: data.datacoNumber,
      type: data.type,
      amountNeeded: data.amountNeeded,
      labels: data.labels || [],
      targetCar: data.targetCar || [],
      weather: data.weather,
      scene: data.scene,
      dayTime: data.dayTime || [],
      isVisible: data.isVisible ?? true
    };
    
    const subtaskId = await db.createSubtask(subtaskData);
    const newSubtask = await db.getSubtaskById(subtaskId);
    
    // Log the activity
    await activityLogger.logSubtaskActivity(
      'created',
      subtaskId,
      data.title,
      data.taskId,
      user.id,
      user.role as 'admin' | 'user',
      {
        datacoNumber: data.datacoNumber,
        type: data.type
      },
      request
    );
    
    logger.info('Subtask created successfully', 'SUBTASKS_API', {
      subtaskId,
      taskId: data.taskId,
      userId: user.id
    });
    
    return NextResponse.json({
      subtask: newSubtask ? {
        _id: newSubtask.id || newSubtask._id?.toString(),
        taskId: newSubtask.taskId,
        title: newSubtask.title,
        subtitle: newSubtask.subtitle,
        images: newSubtask.images || [],
        datacoNumber: newSubtask.datacoNumber,
        type: newSubtask.type,
        amountNeeded: newSubtask.amountNeeded,
        labels: newSubtask.labels,
        targetCar: newSubtask.targetCar,
        weather: newSubtask.weather,
        scene: newSubtask.scene,
        dayTime: newSubtask.dayTime,
        isVisible: newSubtask.isVisible,
        createdAt: newSubtask.createdAt,
        updatedAt: newSubtask.updatedAt
      } : null,
      success: true
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({
        error: error.message,
        success: false
      }, { status: 401 });
    }
    
    logger.error('Error creating subtask', 'SUBTASKS_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to create subtask',
      success: false
    }, { status: 500 });
  }
} 