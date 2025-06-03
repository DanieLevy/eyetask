import { NextRequest, NextResponse } from 'next/server';
import { getTaskById, updateTask, deleteTask, incrementPageView } from '@/lib/data';
import { extractTokenFromHeader, requireAuth, isAdmin } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/tasks/[id] - Get a specific task by ID
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Await params to fix Next.js 15 requirement
    const { id } = await params;
    
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid task ID', success: false },
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

    // Check authentication and visibility
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    const { authorized, user } = requireAuth(token);

    // If task is hidden and user is not admin, return 404
    if (!task.isVisible && (!authorized || !isAdmin(user))) {
      return NextResponse.json(
        { error: 'Task not found', success: false },
        { status: 404 }
      );
    }

    // Track page view
    await incrementPageView(`task-${id}`);

    return NextResponse.json({
      task,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task', success: false },
      { status: 500 }
    );
  }
}

// PUT /api/tasks/[id] - Update a task (admin only)
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
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
    const body = await request.json();
    const updatedTask = await updateTask(id, body);
    
    if (!updatedTask) {
      return NextResponse.json(
        { error: 'Task not found', success: false },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ task: updatedTask, success: true });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task', success: false },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete a task (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
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
    const deleted = await deleteTask(id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Task not found', success: false },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      message: 'Task deleted successfully', 
      success: true 
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task', success: false },
      { status: 500 }
    );
  }
} 