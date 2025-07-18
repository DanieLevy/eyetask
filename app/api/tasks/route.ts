import { NextRequest, NextResponse } from 'next/server';
import { supabaseDb as db } from '@/lib/supabase-database';
import { authSupabase as authService } from '@/lib/auth-supabase';

import { logger } from '@/lib/logger';
import { activityLogger } from '@/lib/activityLogger';

// GET /api/tasks - Fetch all tasks (admin) or visible tasks (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    const user = authService.extractUserFromRequest(request);
    const canManageData = authService.canManageData(user);
    
    let tasks;
    
    if (projectId) {
      // If a projectId is provided, fetch tasks for that project
      tasks = await db.getTasksByProject(projectId);
      if (!canManageData) {
        // If user cannot manage data, filter out hidden tasks
        tasks = tasks.filter(task => task.isVisible);
      }
    } else {
      // If no projectId, fetch all tasks based on access level
      tasks = await db.getAllTasks(canManageData);
    }
    
    return NextResponse.json({
      tasks: tasks.map(task => ({
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
      })),
      total: tasks.length,
      success: true,
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    logger.error('Error fetching tasks', 'TASKS_API', undefined, error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks', success: false },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create new task (admin and data managers)
export async function POST(request: NextRequest) {
  try {
    // Extract and verify user authentication
    const user = authService.extractUserFromRequest(request);
    
    // Check if user can manage data (admin or data_manager)
    if (!user || !authService.canManageData(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin or Data Manager access required', success: false },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['title', 'datacoNumber', 'description', 'projectId', 'type', 'locations', 'targetCar', 'dayTime', 'priority'];
    
    for (const field of requiredFields) {
      if (!(field in body)) {
        return NextResponse.json(
          { error: `Missing required field: ${field}`, success: false },
          { status: 400 }
        );
      }
    }
    
    // Convert priority to number if it's a string
    let priority = body.priority;
    if (typeof priority === 'string') {
      if (priority === 'high') priority = 2;
      else if (priority === 'medium') priority = 5;
      else if (priority === 'low') priority = 8;
      else priority = parseInt(priority) || 5;
    }
    
    // Ensure priority is within valid range
    if (typeof priority !== 'number' || priority < 0 || priority > 10) {
      priority = 5; // Default to medium priority
    }
    
    // Create task with default visibility and converted priority
    const taskData = {
      title: body.title,
      subtitle: body.subtitle,
      images: body.images || [],
      datacoNumber: body.datacoNumber,
      description: body.description,
      projectId: body.projectId,
      type: body.type,
      locations: body.locations,
      amountNeeded: body.amountNeeded,
      targetCar: body.targetCar,
      lidar: body.lidar ?? false,
      dayTime: body.dayTime,
      priority,
      isVisible: body.isVisible ?? true,
    };
    
    const taskId = await db.createTask(taskData);
    const newTask = await db.getTaskById(taskId);
    
    // Log the activity
    await activityLogger.logTaskActivity(
      'created',
      taskId,
      body.title,
      user?.id,
      'admin',
      {
        projectId: body.projectId,
        type: body.type,
        priority: priority,
        datacoNumber: body.datacoNumber
      },
      request
    );
    
    return NextResponse.json({ 
      task: newTask ? {
        _id: newTask.id || newTask._id?.toString(),
        title: newTask.title,
        subtitle: newTask.subtitle,
        images: newTask.images || [],
        datacoNumber: newTask.datacoNumber,
        description: newTask.description,
        projectId: newTask.projectId,
        type: newTask.type,
        locations: newTask.locations,
        amountNeeded: newTask.amountNeeded,
        targetCar: newTask.targetCar,
        lidar: newTask.lidar,
        dayTime: newTask.dayTime,
        priority: newTask.priority,
        isVisible: newTask.isVisible,
        createdAt: newTask.createdAt,
        updatedAt: newTask.updatedAt
      } : null, 
      success: true 
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json(
        { error: error.message, success: false },
        { status: 401 }
      );
    }
    
    logger.error('Error creating task', 'TASKS_API', undefined, error as Error);
    return NextResponse.json(
      { error: 'Failed to create task', success: false },
      { status: 500 }
    );
  }
} 