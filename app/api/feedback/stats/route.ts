import { NextRequest, NextResponse } from 'next/server';
import { feedbackService } from '@/lib/services/feedbackService';
import { logger } from '@/lib/logger';
import { auth, requireAdmin } from '@/lib/auth';

// GET - Get feedback statistics (Admin only)
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const user = auth.extractUserFromRequest(request);
    requireAdmin(user);
    
    const searchParams = request.nextUrl.searchParams;
    
    // Parse date range if provided
    let dateRange = undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    }

    const stats = await feedbackService.getStats(dateRange);

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    logger.error('Failed to get feedback stats', 'FEEDBACK_API', undefined, error as Error);
    return NextResponse.json(
      { error: 'Failed to retrieve statistics' },
      { status: 500 }
    );
  }
} 