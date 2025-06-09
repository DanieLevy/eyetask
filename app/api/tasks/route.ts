import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { auth, requireAdmin } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { activityLogger } from '@/lib/activityLogger';

// GET /api/tasks - Fetch all tasks (admin) or visible tasks (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    const user = auth.extractUserFromRequest(request);
    const isAdmin = auth.isAdmin(user);
    
    let tasks;
    
    if (projectId) {
      // If a projectId is provided, fetch tasks for that project
      tasks = await db.getTasksByProject(projectId);
      if (!isAdmin) {
        // If user is not admin, filter out hidden tasks
        tasks = tasks.filter(task => task.isVisible);
      }
    } else {
      // If no projectId, fetch all tasks based on admin status
      tasks = await db.getAllTasks(isAdmin);
    }
    
    logger.info('Tasks fetched successfully', 'TASKS_API', { 
      count: tasks.length,
      isAdmin,
      userId: user?.id 
    });
    
    return NextResponse.json({
      tasks: tasks.map(task => ({
        _id: task._id?.toString(),
        title: task.title,
        subtitle: task.subtitle,
        images: task.images || [],
        datacoNumber: task.datacoNumber,
        description: task.description,
        projectId: task.projectId.toString(),
        type: task.type,
        locations: task.locations,
        amountNeeded: task.amountNeeded,
        targetCar: task.targetCar,
        lidar: task.lidar,
        dayTime: task.dayTime,
        priority: task.priority,
        isVisible: task.isVisible,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString()
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

// POST /api/tasks - Create new task (admin only)
export async function POST(request: NextRequest) {
  try {
    // Extract and verify user authentication
    const user = auth.extractUserFromRequest(request);
    requireAdmin(user);
    
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
    
    logger.info('Task created successfully', 'TASKS_API', { 
      taskId,
      title: body.title,
      userId: user?.id 
    });
    
    return NextResponse.json({ 
      task: {
        _id: newTask?._id?.toString(),
        title: newTask?.title,
        subtitle: newTask?.subtitle,
        images: newTask?.images || [],
        datacoNumber: newTask?.datacoNumber,
        description: newTask?.description,
        projectId: newTask?.projectId.toString(),
        type: newTask?.type,
        locations: newTask?.locations,
        amountNeeded: newTask?.amountNeeded,
        targetCar: newTask?.targetCar,
        lidar: newTask?.lidar,
        dayTime: newTask?.dayTime,
        priority: newTask?.priority,
        isVisible: newTask?.isVisible,
        createdAt: newTask?.createdAt.toISOString(),
        updatedAt: newTask?.updatedAt.toISOString()
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
    
    logger.error('Error creating task', 'TASKS_API', undefined, error as Error);
    return NextResponse.json(
      { error: 'Failed to create task', success: false },
      { status: 500 }
    );
  }
} 