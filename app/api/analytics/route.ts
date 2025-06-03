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
    
    return NextResponse.json({ analytics, success: true });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics', success: false },
      { status: 500 }
    );
  }
}

// POST /api/analytics - Log visitor data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const today = new Date().toISOString().split('T')[0];
    
    const analytics = await getAnalytics();
    
    // Update daily stats
    analytics.dailyStats[today] = (analytics.dailyStats[today] || 0) + 1;
    
    // Increment total visits
    analytics.totalVisits++;
    
    // If unique visitor tracking is requested
    if (body.isUniqueVisitor) {
      analytics.uniqueVisitors++;
    }
    
    await updateAnalytics(analytics);
    
    return NextResponse.json({ 
      message: 'Visit logged successfully', 
      success: true 
    });
  } catch (error) {
    console.error('Error logging visit:', error);
    return NextResponse.json(
      { error: 'Failed to log visit', success: false },
      { status: 500 }
    );
  }
} 