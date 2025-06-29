import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { auth, requireAdmin } from '@/lib/auth';
import { logger } from '@/lib/logger';

// GET /api/analytics - Get analytics dashboard data
export async function GET(request: NextRequest) {
  try {
    // Check authentication - Only admins can access analytics
    const user = auth.extractUserFromRequest(request);
    requireAdmin(user);
    
    // Additional check to ensure only admins can access analytics
    if (!auth.hasRestrictedAccess(user)) {
      return NextResponse.json({
        error: 'Access denied - Admin only feature',
        success: false
      }, { status: 403 });
    }

    // Get time range from query params
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') as '1d' | '7d' | '30d' || '7d';
    
    // Get analytics data
    const analyticsData = await db.getAnalyticsDashboard(range);
    
    // Update counters
    await db.updateAnalyticsCounters();
    
    return NextResponse.json({
      success: true,
      data: analyticsData,
      range,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({
        error: error.message,
        success: false
      }, { status: 401 });
    }

    logger.error('Analytics API error', 'ANALYTICS_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to fetch analytics data',
      success: false
    }, { status: 500 });
  }
}

// POST /api/analytics/track - Track user visits (called on page loads)
export async function POST(request: NextRequest) {
  try {
    const user = auth.extractUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({
        error: 'Authentication required',
        success: false
      }, { status: 401 });
    }
    
    // Skip tracking for admin users
    if (user.role === 'admin') {
      return NextResponse.json({ 
        success: true,
        message: 'Admin activity not tracked'
      });
    }
    
    // Track the visit
    await db.trackVisit(user.id, user.username, user.email || '', user.role || 'user');
    
    // Log page view activity
    const requestData = await request.json();
    const { page = 'unknown', action = 'page_view' } = requestData;
    
    await db.logAction({
      userId: user.id,
      username: user.username,
      userRole: user.role || 'user',
      action: `צפה בעמוד ${page}`,
      category: 'view',
      metadata: { page, action }
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Visit tracked successfully'
    });
  } catch (error) {
    logger.error('Analytics tracking error', 'ANALYTICS_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to track visit',
      success: false
    }, { status: 500 });
  }
} 