import { NextRequest, NextResponse } from 'next/server';
import { getSubtasksByTaskId, createSubtask, getTaskById, incrementPageView } from '@/lib/data';
import { extractTokenFromHeader, requireAuth, isAdmin } from '@/lib/auth';
import { createSuccessResponse } from '@/lib/middleware';
import { logger } from '@/lib/logger';

const subtaskSchema = {
  title: { required: true, type: 'string', minLength: 1, maxLength: 200 },
  subtitle: { required: false, type: 'string', maxLength: 200 },
  datacoNumber: { required: true, type: 'string', minLength: 1, maxLength: 50 },
  type: { required: true, type: 'string' },
  amountNeeded: { required: true, type: 'number' },
  labels: { required: true, type: 'object' },
  weather: { required: true, type: 'string' },
  scene: { required: true, type: 'string' }
};

// GET /api/tasks/[id]/subtasks - Get all subtasks for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    const { authorized } = requireAuth(token);
    
    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized access', success: false },
        { status: 401 }
      );
    }
    
    // Await params to fix Next.js 15 requirement
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Task ID is required', success: false },
        { status: 400 }
      );
    }
    
    const task = await getTaskById(id);
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found', success: false },
        { status: 404 }
      );
    }
    
    // Track page view
    await incrementPageView(`task-${id}-subtasks`);
    
    const subtasks = await getSubtasksByTaskId(id);
    
    return NextResponse.json({
      success: true,
      data: {
        taskId: id,
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
    logger.error('Error fetching subtasks', 'DATA', { taskId: id }, error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch subtasks', success: false },
      { status: 500 }
    );
  }
}

// POST /api/tasks/[id]/subtasks - Create a new subtask for a task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    const { authorized, user } = requireAuth(token);
    
    if (!authorized || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized access', success: false },
        { status: 401 }
      );
    }
    
    // Await params to fix Next.js 15 requirement
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Task ID is required', success: false },
        { status: 400 }
      );
    }
    
    const requestBody = await request.json();
    
    // Validate required fields
    if (!requestBody.title || !requestBody.description) {
      return NextResponse.json(
        { error: 'Title and description are required', success: false },
        { status: 400 }
      );
    }
    
    const task = await getTaskById(id);
    
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
    
    // Create subtask with taskId
    const subtaskData = {
      ...requestBody,
      taskId: id,
    };
    
    const newSubtask = await createSubtask(subtaskData);
    
    logger.info('Subtask created successfully', 'SUBTASKS', {
      subtaskId: newSubtask.id,
      taskId: id,
      title: newSubtask.title,
      type: newSubtask.type || 'events',
      amountNeeded: newSubtask.amountNeeded,
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
    logger.error('Error creating subtask', 'SUBTASKS', { 
      taskId: id,
      userId: user?.id 
    }, error as Error);
    return NextResponse.json(
      { error: 'Failed to create subtask', success: false },
      { status: 500 }
    );
  }
} 