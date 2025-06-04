import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { extractTokenFromHeader, requireAuthEnhanced, isAdminEnhanced } from '@/lib/auth';
import { fromObjectId } from '@/lib/mongodb';

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
    
    const taskResult = await db.getTaskById(id);
    
    if (!taskResult) {
      return NextResponse.json(
        { error: 'Task not found', success: false },
        { status: 404 }
      );
    }

    // Check authentication and visibility
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    const { authorized, user } = await requireAuthEnhanced(token);

    // If task is hidden and user is not admin, return 404
    if (!taskResult.isVisible && (!authorized || !isAdminEnhanced(user))) {
      return NextResponse.json(
        { error: 'Task not found', success: false },
        { status: 404 }
      );
    }

    // Convert MongoDB result to API format
    const task = {
      id: fromObjectId(taskResult._id!),
      title: taskResult.title,
      subtitle: taskResult.subtitle,
      images: taskResult.images || [],
      datacoNumber: taskResult.datacoNumber,
      description: taskResult.description,
      projectId: fromObjectId(taskResult.projectId),
      type: taskResult.type,
      locations: taskResult.locations,
      amountNeeded: taskResult.amountNeeded,
      targetCar: taskResult.targetCar,
      lidar: taskResult.lidar,
      dayTime: taskResult.dayTime,
      priority: taskResult.priority,
      isVisible: taskResult.isVisible,
      createdAt: taskResult.createdAt.toISOString(),
      updatedAt: taskResult.updatedAt.toISOString()
    };

    // Track page view
    await db.incrementPageView(`tasks.${id}`);

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
    const { authorized, user } = await requireAuthEnhanced(token);

    if (!authorized || !isAdminEnhanced(user)) {
      return NextResponse.json(
        { error: 'Unauthorized access', success: false },
        { status: 401 }
      );
    }

    // Await params to fix Next.js 15 requirement
    const { id } = await params;
    const body = await request.json();
    const updated = await db.updateTask(id, body);
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Task not found or not updated', success: false },
        { status: 404 }
      );
    }
    
    // Get the updated task to return
    const taskResult = await db.getTaskById(id);
    if (!taskResult) {
      return NextResponse.json(
        { error: 'Task not found after update', success: false },
        { status: 404 }
      );
    }

    // Convert MongoDB result to API format
    const task = {
      id: fromObjectId(taskResult._id!),
      title: taskResult.title,
      subtitle: taskResult.subtitle,
      images: taskResult.images || [],
      datacoNumber: taskResult.datacoNumber,
      description: taskResult.description,
      projectId: fromObjectId(taskResult.projectId),
      type: taskResult.type,
      locations: taskResult.locations,
      amountNeeded: taskResult.amountNeeded,
      targetCar: taskResult.targetCar,
      lidar: taskResult.lidar,
      dayTime: taskResult.dayTime,
      priority: taskResult.priority,
      isVisible: taskResult.isVisible,
      createdAt: taskResult.createdAt.toISOString(),
      updatedAt: taskResult.updatedAt.toISOString()
    };
    
    return NextResponse.json({ task, success: true });
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
    const { authorized, user } = await requireAuthEnhanced(token);

    if (!authorized || !isAdminEnhanced(user)) {
      return NextResponse.json(
        { error: 'Unauthorized access', success: false },
        { status: 401 }
      );
    }

    // Await params to fix Next.js 15 requirement
    const { id } = await params;
    const deleted = await db.deleteTask(id);
    
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