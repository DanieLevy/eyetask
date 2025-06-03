import { NextRequest, NextResponse } from 'next/server';
import { getSubtaskById, updateSubtask, deleteSubtask } from '@/lib/data';
import { extractTokenFromHeader, requireAuth, isAdmin } from '@/lib/auth';

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
    const subtask = await getSubtaskById(id);
    
    if (!subtask) {
      return NextResponse.json(
        { error: 'Subtask not found', success: false },
        { status: 404 }
      );
    }

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
    const updatedSubtask = await updateSubtask(id, body);
    
    if (!updatedSubtask) {
      return NextResponse.json(
        { error: 'Failed to update subtask', success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({
      subtask: updatedSubtask,
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
    const { authorized, user } = requireAuth(token);

    if (!authorized || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized access', success: false },
        { status: 401 }
      );
    }

    // Await params to fix Next.js 15 requirement
    const { id } = await params;
    const deleted = await deleteSubtask(id);
    
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