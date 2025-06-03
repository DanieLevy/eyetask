import { NextRequest, NextResponse } from 'next/server';
import { updateTaskAmount } from '@/lib/data';
import { extractTokenFromHeader, requireAuth, isAdmin } from '@/lib/auth';

// POST /api/tasks/[id]/calculate-amount - Recalculate task amount from subtasks (admin only)
export async function POST(
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
    
    // Update task amount based on subtasks
    await updateTaskAmount(id);
    
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