import { NextRequest, NextResponse } from 'next/server';
import { getTaskById, updateTask } from '@/lib/data';
import { extractTokenFromHeader, requireAuth, isAdmin } from '@/lib/auth';

// PATCH /api/tasks/[id]/visibility - Toggle task visibility (admin only)
export async function PATCH(
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
    const task = await getTaskById(id);
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found', success: false },
        { status: 404 }
      );
    }
    
    // Toggle visibility
    const updatedTask = await updateTask(id, {
      isVisible: !task.isVisible,
    });
    
    if (!updatedTask) {
      return NextResponse.json(
        { error: 'Failed to update task visibility', success: false },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      task: updatedTask,
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