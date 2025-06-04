import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { extractTokenFromHeader, requireAuthEnhanced, isAdminEnhanced } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper function to calculate and update task amount from subtasks
async function updateTaskAmount(taskId: string): Promise<boolean> {
  try {
    // Get all subtasks for this task
    const subtasks = await db.getSubtasksByTask(taskId);
    
    // Calculate total amount needed from subtasks
    const totalAmount = subtasks.reduce((sum, subtask) => {
      return sum + (subtask.amountNeeded || 0);
    }, 0);
    
    // Update the task with the calculated amount
    return await db.updateTask(taskId, { amountNeeded: totalAmount });
  } catch (error) {
    console.error('Error updating task amount:', error);
    return false;
  }
}

// POST /api/tasks/[id]/calculate-amount - Recalculate task amount from subtasks (admin only)
export async function POST(
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
    
    // Update task amount based on subtasks
    const updated = await updateTaskAmount(id);
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to recalculate task amount', success: false },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: 'Task amount recalculated successfully',
      success: true,
    });
  } catch (error) {
    console.error('Error recalculating task amount:', error);
    return NextResponse.json(
      { error: 'Failed to recalculate task amount', success: false },
      { status: 500 }
    );
  }
} 