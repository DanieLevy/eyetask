import { NextRequest, NextResponse } from 'next/server';
import { getAllSubtasks, createSubtask } from '@/lib/data';
import { extractTokenFromHeader, requireAuthEnhanced, isAdminEnhanced } from '@/lib/auth';

// GET /api/subtasks - Fetch all subtasks (PUBLIC ACCESS - filtered by visible tasks only)
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated admin
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    const { authorized, user } = await requireAuthEnhanced(token);
    const isAdmin = authorized && isAdminEnhanced(user);
    
    const subtasks = await getAllSubtasks();
    
    // If not admin, filter to only show subtasks from visible tasks
    let filteredSubtasks = subtasks;
    if (!isAdmin) {
      // Get all tasks and filter subtasks by visible tasks only
      const { getAllTasks } = await import('@/lib/data');
      const allTasks = await getAllTasks();
      const visibleTaskIds = new Set(allTasks.filter(task => task.isVisible).map(task => task.id));
      filteredSubtasks = subtasks.filter(subtask => visibleTaskIds.has(subtask.taskId));
    }
    
    return NextResponse.json({
      subtasks: filteredSubtasks,
      total: filteredSubtasks.length,
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
    
    // Validate required fields
    const requiredFields = ['taskId', 'title', 'datacoNumber', 'type', 'amountNeeded', 'labels', 'targetCar', 'weather', 'scene'];
    
    for (const field of requiredFields) {
      if (!(field in body)) {
        return NextResponse.json(
          { error: `Missing required field: ${field}`, success: false },
          { status: 400 }
        );
      }
    }
    
    const newSubtask = await createSubtask(body);
    
    return NextResponse.json({ subtask: newSubtask, success: true }, { status: 201 });
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