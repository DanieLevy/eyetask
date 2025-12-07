import { NextRequest, NextResponse } from 'next/server';
import { requireAuthEnhanced, isAdminEnhanced } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import { updateTaskAmount } from '@/lib/taskUtils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/tasks/[id]/calculate-amount - Recalculate task amount from subtasks (admin only)
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const authHeader = request.headers.get('Authorization');
    const user = await requireAuthEnhanced(authHeader);

    if (!user || !isAdminEnhanced(user)) {
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
    logger.error('Error recalculating task amount', 'TASK_API', undefined, error as Error);
    return NextResponse.json(
      { error: 'Failed to recalculate task amount', success: false },
      { status: 500 }
    );
  }
} 