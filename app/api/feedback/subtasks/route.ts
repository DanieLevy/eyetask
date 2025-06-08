import { NextRequest, NextResponse } from 'next/server';
import { feedbackService } from '@/lib/services/feedbackService';
import { logger } from '@/lib/logger';

// GET - Get available subtasks for feedback form (Public endpoint)
export async function GET(request: NextRequest) {
  try {
    const subtasks = await feedbackService.getAvailableSubtasks();

    return NextResponse.json({
      success: true,
      subtasks
    });

  } catch (error) {
    logger.error('Failed to get available subtasks', 'FEEDBACK_API', undefined, error as Error);
    return NextResponse.json(
      { error: 'Failed to retrieve subtasks' },
      { status: 500 }
    );
  }
} 