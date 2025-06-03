import { NextRequest, NextResponse } from 'next/server';
import { getSubtaskById, updateSubtask, deleteSubtask } from '@/lib/data';
import { extractTokenFromHeader, requireAuth, isAdmin } from '@/lib/auth';

// GET /api/subtasks/[id] - Fetch specific subtask
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const subtask = await getSubtaskById(params.id);
    
    if (!subtask) {
      return NextResponse.json(
        { error: 'Subtask not found', success: false },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ subtask, success: true });
  } catch (error) {
    console.error('Error fetching subtask:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subtask', success: false },
      { status: 500 }
    );
  }
}

// PUT /api/subtasks/[id] - Update existing subtask (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    
    const body = await request.json();
    const updatedSubtask = await updateSubtask(params.id, body);
    
    if (!updatedSubtask) {
      return NextResponse.json(
        { error: 'Subtask not found', success: false },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ subtask: updatedSubtask, success: true });
  } catch (error) {
    console.error('Error updating subtask:', error);
    return NextResponse.json(
      { error: 'Failed to update subtask', success: false },
      { status: 500 }
    );
  }
}

// DELETE /api/subtasks/[id] - Delete subtask (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    
    const deleted = await deleteSubtask(params.id);
    
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