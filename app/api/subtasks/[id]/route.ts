import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { extractTokenFromHeader, requireAuthEnhanced, isAdminEnhanced } from '@/lib/auth';
import { fromObjectId } from '@/lib/mongodb';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/subtasks/[id] - Get a specific subtask by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params to fix Next.js 15 requirement
    const { id } = await params;
    const subtaskResult = await db.getSubtaskById(id);
    
    if (!subtaskResult) {
      return NextResponse.json(
        { error: 'Subtask not found', success: false },
        { status: 404 }
      );
    }

    // Convert MongoDB result to API format
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

    return NextResponse.json({
      subtask,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching subtask:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subtask', success: false },
      { status: 500 }
    );
  }
}

// PUT /api/subtasks/[id] - Update a subtask (admin only)
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
    const updated = await db.updateSubtask(id, body);
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update subtask', success: false },
        { status: 500 }
      );
    }

    // Get the updated subtask to return
    const subtaskResult = await db.getSubtaskById(id);
    if (!subtaskResult) {
      return NextResponse.json(
        { error: 'Subtask not found after update', success: false },
        { status: 404 }
      );
    }

    // Convert MongoDB result to API format
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

    return NextResponse.json({
      subtask,
      message: 'Subtask updated successfully',
      success: true,
    });
  } catch (error) {
    console.error('Error updating subtask:', error);
    return NextResponse.json(
      { error: 'Failed to update subtask', success: false },
      { status: 500 }
    );
  }
}

// DELETE /api/subtasks/[id] - Delete a subtask (admin only)
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
    const deleted = await db.deleteSubtask(id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Subtask not found', success: false },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      message: 'Subtask deleted successfully', 
      success: true 
    });
  } catch (error) {
    console.error('Error deleting subtask:', error);
    return NextResponse.json(
      { error: 'Failed to delete subtask', success: false },
      { status: 500 }
    );
  }
} 