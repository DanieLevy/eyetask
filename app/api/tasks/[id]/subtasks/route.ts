import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { createObjectId } from '@/lib/mongodb';
import { updateTaskAmount } from '@/lib/taskUtils';

const subtaskSchema = {
  title: { required: true, type: 'string', minLength: 1, maxLength: 200 },
  subtitle: { required: false, type: 'string', maxLength: 200 },
  datacoNumber: { required: true, type: 'string', minLength: 1, maxLength: 50 },
  type: { required: true, type: 'string' },
  amountNeeded: { required: true, type: 'number' },
  labels: { required: true, type: 'object' },
  weather: { required: true, type: 'string' },
  scene: { required: true, type: 'string' },
  dayTime: { required: false, type: 'object' }
};

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Simple analytics tracking function
async function trackPageView(page: string) {
  try {
    // Use the properly typed incrementPageView function
    await db.incrementPageView(page);
  } catch (error) {
    // Non-critical error, just log it
    logger.warn('Failed to track page view', 'ANALYTICS', { page, error: (error as Error).message });
  }
}

// GET /api/tasks/[id]/subtasks - Get all subtasks for a task (PUBLIC ACCESS)
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  let taskId: string | undefined;
  
  try {
    // Await params to fix Next.js 15 requirement
    const { id } = await params;
    taskId = id;
    
    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid task ID', success: false },
        { status: 400 }
      );
    }
    
    // Check if task exists and is visible (no authentication required for public access)
    const task = await db.getTaskById(taskId);
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found', success: false },
        { status: 404 }
      );
    }
    
    // For public access, only show subtasks if the parent task is visible
    // For admin access, show all subtasks regardless of visibility
    const user = auth.extractUserFromRequest(request);
    const isAdmin = user && user.role === 'admin';
    
    if (!task.isVisible && !isAdmin) {
      return NextResponse.json(
        { error: 'Task not found', success: false },
        { status: 404 }
      );
    }
    
    // Track page view
    await trackPageView(`task-${taskId}-subtasks`);
    
    const subtasks = await db.getSubtasksByTask(taskId, !!isAdmin);
    
    logger.info('Subtasks fetched successfully', 'SUBTASKS_API', { 
      taskId, 
      count: subtasks.length,
      isAdmin 
    });
    
    return NextResponse.json({
      success: true,
      data: {
        taskId: taskId,
        subtasks
      },
      message: 'Subtasks retrieved successfully',
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    logger.error('Error fetching subtasks', 'SUBTASKS_API', { taskId }, error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch subtasks', success: false },
      { status: 500 }
    );
  }
}

// POST /api/tasks/[id]/subtasks - Create a new subtask for a task
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  let taskId: string | undefined;
  let user: any;
  
  try {
    // Await params to fix Next.js 15 requirement
    const { id } = await params;
    taskId = id;
    
    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid task ID', success: false },
        { status: 400 }
      );
    }
    
    // Check authentication and admin status
    user = auth.extractUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized access - Admin required', success: false },
        { status: 401 }
      );
    }
    
    const requestBody = await request.json();
    
    // Validate required fields
    if (!requestBody.title || !requestBody.datacoNumber) {
      return NextResponse.json(
        { error: 'Title and dataco number are required', success: false },
        { status: 400 }
      );
    }
    
    const task = await db.getTaskById(taskId);
    
    if (!task) {
      return NextResponse.json(
        { error: 'Parent task not found', success: false },
        { status: 404 }
      );
    }
    
    // Additional validation for specific fields
    if (requestBody.type && !['events', 'hours'].includes(requestBody.type)) {
      return NextResponse.json(
        { error: 'Invalid subtask type. Must be "events" or "hours"', success: false },
        { status: 400 }
      );
    }
    
    if (requestBody.amountNeeded && requestBody.amountNeeded <= 0) {
      return NextResponse.json(
        { error: 'Amount needed must be greater than 0', success: false },
        { status: 400 }
      );
    }
    
    if (requestBody.labels && !Array.isArray(requestBody.labels)) {
      return NextResponse.json(
        { error: 'Labels must be an array', success: false },
        { status: 400 }
      );
    }

    if (requestBody.dayTime && !Array.isArray(requestBody.dayTime)) {
      return NextResponse.json(
        { error: 'Day time must be an array', success: false },
        { status: 400 }
      );
    }

    const validDayTimeTypes = ['day', 'night', 'dusk', 'dawn'];
    if (requestBody.dayTime && requestBody.dayTime.some((dt: string) => !validDayTimeTypes.includes(dt))) {
      return NextResponse.json(
        { error: `Invalid day time type. Must be one of: ${validDayTimeTypes.join(', ')}`, success: false },
        { status: 400 }
      );
    }
    
    const validWeatherTypes = ['Clear', 'Fog', 'Overcast', 'Rain', 'Snow', 'Mixed'];
    if (requestBody.weather && !validWeatherTypes.includes(requestBody.weather)) {
      return NextResponse.json(
        { error: `Invalid weather type. Must be one of: ${validWeatherTypes.join(', ')}`, success: false },
        { status: 400 }
      );
    }
    
    const validSceneTypes = ['Highway', 'Urban', 'Rural', 'Sub-Urban', 'Test Track', 'Mixed'];
    if (requestBody.scene && !validSceneTypes.includes(requestBody.scene)) {
      return NextResponse.json(
        { error: `Invalid scene type. Must be one of: ${validSceneTypes.join(', ')}`, success: false },
        { status: 400 }
      );
    }
    
    // Create subtask with taskId - convert to ObjectId format for MongoDB
    const subtaskData = {
      title: requestBody.title,
      subtitle: requestBody.subtitle || '',
      images: requestBody.images || [],
      datacoNumber: requestBody.datacoNumber,
      type: requestBody.type || 'events',
      amountNeeded: requestBody.amountNeeded || 1,
      labels: Array.isArray(requestBody.labels) ? requestBody.labels : [],
      targetCar: Array.isArray(requestBody.targetCar) ? requestBody.targetCar : [],
      weather: requestBody.weather || 'Clear',
      scene: requestBody.scene || 'Urban',
      dayTime: Array.isArray(requestBody.dayTime) ? requestBody.dayTime : [],
      taskId: createObjectId(taskId)
    };
    
    const newSubtaskId = await db.createSubtask(subtaskData);
    
    // Automatically recalculate task amount after creating subtask
    await updateTaskAmount(taskId);
    
    // Fetch the created subtask to return it
    const subtasks = await db.getSubtasksByTask(taskId);
    const newSubtask = subtasks.find(s => s._id!.toString() === newSubtaskId);
    
    logger.info('Subtask created successfully', 'SUBTASKS_API', {
      subtaskId: newSubtaskId,
      taskId: taskId,
      title: requestBody.title,
      type: requestBody.type || 'events',
      amountNeeded: requestBody.amountNeeded,
      userId: user?.id
    });
    
    return NextResponse.json({
      success: true,
      data: {
        subtask: newSubtask,
        message: 'Subtask created successfully'
      },
      message: 'Subtask created successfully',
      timestamp: new Date().toISOString()
    }, { 
      status: 201,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    logger.error('Error creating subtask', 'SUBTASKS_API', { 
      taskId,
      userId: user?.id 
    }, error as Error);
    return NextResponse.json(
      { error: 'Failed to create subtask', success: false },
      { status: 500 }
    );
  }
} 