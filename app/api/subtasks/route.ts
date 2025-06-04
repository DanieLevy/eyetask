import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { extractTokenFromHeader, requireAuthEnhanced, isAdminEnhanced } from '@/lib/auth';
import { fromObjectId } from '@/lib/mongodb';

// GET /api/subtasks - Fetch all subtasks (PUBLIC ACCESS - filtered by visible tasks only)
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated admin
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    const { authorized, user } = await requireAuthEnhanced(token);
    const isAdmin = authorized && isAdminEnhanced(user);
    
    // Check for taskId query parameter
    const { searchParams } = new URL(request.url);
    const taskIdFilter = searchParams.get('taskId');
    
    let subtasks;
    if (taskIdFilter) {
      // Get subtasks for a specific task
      const subtaskResults = await db.getSubtasksByTask(taskIdFilter);
      subtasks = subtaskResults.map(subtask => ({
        id: fromObjectId(subtask._id!),
        taskId: fromObjectId(subtask.taskId),
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
        createdAt: subtask.createdAt.toISOString(),
        updatedAt: subtask.updatedAt.toISOString()
      }));
    } else {
      // Get all subtasks (we need to implement this or return error)
      return NextResponse.json(
        { error: 'taskId parameter is required', success: false },
        { status: 400 }
      );
    }
    
    // If not admin, filter to only show subtasks from visible tasks
    if (!isAdmin) {
      // Get the task to check if it's visible
      const task = await db.getTaskById(taskIdFilter!);
      if (!task || !task.isVisible) {
        return NextResponse.json({
          subtasks: [],
          total: 0,
          success: true
        });
      }
    }
    
    return NextResponse.json({
      subtasks,
      total: subtasks.length,
      success: true
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error fetching subtasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subtasks', success: false },
      { status: 500 }
    );
  }
}

// POST /api/subtasks - Create new subtask (admin only)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    const { authorized, user } = await requireAuthEnhanced(token);
    
    if (!authorized || !isAdminEnhanced(user)) {
      return NextResponse.json(
        { error: 'Unauthorized access', success: false },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    // Validate required fields (image is optional)
    const requiredFields = ['taskId', 'title', 'datacoNumber', 'type', 'amountNeeded', 'labels', 'targetCar', 'weather', 'scene'];
    
    for (const field of requiredFields) {
      if (!(field in body)) {
        return NextResponse.json(
          { error: `Missing required field: ${field}`, success: false },
          { status: 400 }
        );
      }
    }
    
    // Validate field types and values
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title must be a non-empty string', success: false },
        { status: 400 }
      );
    }
    
    if (body.subtitle && typeof body.subtitle !== 'string') {
      return NextResponse.json(
        { error: 'Subtitle must be a string', success: false },
        { status: 400 }
      );
    }
    
    if (body.images && !Array.isArray(body.images)) {
      return NextResponse.json(
        { error: 'Images must be an array', success: false },
        { status: 400 }
      );
    }
    
    const validWeatherTypes = ['Clear', 'Fog', 'Overcast', 'Rain', 'Snow', 'Mixed'];
    if (!validWeatherTypes.includes(body.weather)) {
      return NextResponse.json(
        { error: `Invalid weather type. Must be one of: ${validWeatherTypes.join(', ')}`, success: false },
        { status: 400 }
      );
    }
    
    const validSceneTypes = ['Highway', 'Urban', 'Rural', 'Sub-Urban', 'Test Track', 'Mixed'];
    if (!validSceneTypes.includes(body.scene)) {
      return NextResponse.json(
        { error: `Invalid scene type. Must be one of: ${validSceneTypes.join(', ')}`, success: false },
        { status: 400 }
      );
    }
    
    // Create the subtask
    const subtaskId = await db.createSubtask(body);
    
    // Get the created subtask to return
    const subtaskResult = await db.getSubtaskById(subtaskId);
    if (!subtaskResult) {
      return NextResponse.json(
        { error: 'Failed to retrieve created subtask', success: false },
        { status: 500 }
      );
    }

    // Convert to API format
    const subtask = {
      id: fromObjectId(subtaskResult._id!),
      taskId: fromObjectId(subtaskResult.taskId),
      title: subtaskResult.title,
      subtitle: subtaskResult.subtitle,
      images: subtaskResult.images || [],
      datacoNumber: subtaskResult.datacoNumber,
      type: subtaskResult.type,
      amountNeeded: subtaskResult.amountNeeded,
      labels: subtaskResult.labels,
      targetCar: subtaskResult.targetCar,
      weather: subtaskResult.weather,
      scene: subtaskResult.scene,
      createdAt: subtaskResult.createdAt.toISOString(),
      updatedAt: subtaskResult.updatedAt.toISOString()
    };
    
    return NextResponse.json({ subtask, success: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating subtask:', error);
    
    // Handle specific error types
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        { error: error.message, success: false },
        { status: 409 }
      );
    }
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message, success: false },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create subtask', success: false },
      { status: 500 }
    );
  }
} 