import { NextRequest, NextResponse } from 'next/server';
import { getAnalytics, updateAnalytics } from '@/lib/data';
import { extractTokenFromHeader, requireAuth, isAdmin } from '@/lib/auth';

// GET /api/analytics - Fetch usage statistics (admin only)
export async function GET(request: NextRequest) {
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
    
    const analytics = await getAnalytics();
    
    return NextResponse.json({
      success: true,
      data: analytics
    });
  } catch (error: any) {
    console.error('❌ Analytics GET failed:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch analytics', success: false },
      { status: 500 }
    );
  }
}

// POST /api/analytics - Log a visit (public endpoint)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, isUniqueVisitor } = body;
    
    // Get current analytics
    const current = await getAnalytics();
    
    // Calculate new values
    const newTotalVisits = current.totalVisits + 1;
    const newUniqueVisitors = isUniqueVisitor ? current.uniqueVisitors + 1 : current.uniqueVisitors;
    
    // Update daily stats
    const today = date || new Date().toISOString().split('T')[0];
    const dailyStats = current.dailyStats || {};
    const newTodayStats = (dailyStats[today] || 0) + 1;
    
    // Update analytics
    await updateAnalytics({
      totalVisits: newTotalVisits,
      uniqueVisitors: newUniqueVisitors,
      dailyStats: {
        ...dailyStats,
        [today]: newTodayStats
      }
    });
    
    return NextResponse.json({
      success: true,
      data: { totalVisits: newTotalVisits, uniqueVisitors: newUniqueVisitors, todayStats: newTodayStats }
    });
  } catch (error: any) {
    console.error('❌ Analytics POST failed:', error.message);
    return NextResponse.json(
      { error: 'Failed to log visit', success: false },
      { status: 500 }
    );
  }
} 