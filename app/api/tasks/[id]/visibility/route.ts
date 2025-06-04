import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { extractTokenFromHeader, requireAuthEnhanced, isAdminEnhanced } from '@/lib/auth';
import { fromObjectId } from '@/lib/mongodb';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function handleVisibilityToggle(
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
    const task = await db.getTaskById(id);
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found', success: false },
        { status: 404 }
      );
    }
    
    // Toggle visibility
    const updated = await db.updateTask(id, {
      isVisible: !task.isVisible,
    });
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update task visibility', success: false },
        { status: 500 }
      );
    }
    
    // Get the updated task to return
    const updatedTask = await db.getTaskById(id);
    if (!updatedTask) {
      return NextResponse.json(
        { error: 'Task not found after update', success: false },
        { status: 404 }
      );
    }

    // Convert MongoDB result to API format
    const taskResponse = {
      id: fromObjectId(updatedTask._id!),
      title: updatedTask.title,
      subtitle: updatedTask.subtitle,
      images: updatedTask.images || [],
      datacoNumber: updatedTask.datacoNumber,
      description: updatedTask.description,
      projectId: fromObjectId(updatedTask.projectId),
      type: updatedTask.type,
      locations: updatedTask.locations,
      amountNeeded: updatedTask.amountNeeded,
      targetCar: updatedTask.targetCar,
      lidar: updatedTask.lidar,
      dayTime: updatedTask.dayTime,
      priority: updatedTask.priority,
      isVisible: updatedTask.isVisible,
      createdAt: updatedTask.createdAt.toISOString(),
      updatedAt: updatedTask.updatedAt.toISOString()
    };
    
    return NextResponse.json({
      task: taskResponse,
      message: `Task ${updatedTask.isVisible ? 'shown' : 'hidden'} successfully`,
      success: true,
    });
  } catch (error) {
    console.error('Error toggling task visibility:', error);
    return NextResponse.json(
      { error: 'Failed to toggle task visibility', success: false },
      { status: 500 }
    );
  }
}

// PATCH /api/tasks/[id]/visibility - Toggle task visibility (admin only)
export async function PATCH(
  request: NextRequest,
  context: RouteParams
) {
  return handleVisibilityToggle(request, context);
}

// PUT /api/tasks/[id]/visibility - Toggle task visibility (admin only) - alias for PATCH
export async function PUT(
  request: NextRequest,
  context: RouteParams
) {
  return handleVisibilityToggle(request, context);
} 