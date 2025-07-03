import { NextRequest, NextResponse } from 'next/server';
import { supabaseDb as db } from '@/lib/supabase-database';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { logger } from '@/lib/logger';
import { getSupabaseClient } from '@/lib/supabase';

interface ActivityLog {
  id: string;
  timestamp: string;
  user_id: string;
  username: string;
  user_role: string;
  action: string;
  category: string;
  target?: {
    id: string;
    type: string;
    name?: string;
  };
  metadata?: Record<string, any>;
  severity: string;
}

// GET /api/analytics - Get analytics dashboard data
export async function GET(request: NextRequest) {
  try {
    // Check if user has admin access
    const user = authService.extractUserFromRequest(request);
    
    if (!user || !authService.hasRestrictedAccess(user)) {
      return NextResponse.json({
        error: 'Unauthorized - Admin access required',
        success: false
      }, { status: 401 });
    }
    
    // Get time range from query params
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';
    
    // Get analytics data
    const analytics = await db.getAnalytics();
    
    if (!analytics) {
      return NextResponse.json({
        error: 'Analytics data not found',
        success: false
      }, { status: 404 });
    }
    
    // Get activity logs
    const supabase = getSupabaseClient(true);
    
    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    if (range === '1d') {
      startDate.setDate(startDate.getDate() - 1);
    } else if (range === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (range === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    }
    
    // Fetch recent activity logs
    const { data: activityLogs, error: logsError } = await supabase
      .from('activity_logs')
      .select('*')
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: false })
      .limit(100);
    
    if (logsError) {
      logger.error('Error fetching activity logs', 'ANALYTICS_API', undefined, logsError);
    }
    
    // Process activity logs for analytics
    const recentActivities = (activityLogs || []).map((log: any) => ({
      _id: log.id,
      timestamp: log.timestamp,
      userId: log.user_id,
      username: log.username,
      userRole: log.user_role,
      action: log.action,
      category: log.category,
      target: log.target,
      severity: log.severity || 'info'
    }));
    
    // Calculate activity by category
    const activityByCategory: Record<string, number> = {};
    recentActivities.forEach(activity => {
      if (!activityByCategory[activity.category]) {
        activityByCategory[activity.category] = 0;
      }
      activityByCategory[activity.category]++;
    });
    
    // Calculate top users
    const userActivityMap: Record<string, { count: number; username: string; role: string; userId: string }> = {};
    recentActivities.forEach(activity => {
      if (activity.userId) {
        if (!userActivityMap[activity.userId]) {
          userActivityMap[activity.userId] = {
            count: 0,
            username: activity.username,
            role: activity.userRole,
            userId: activity.userId
          };
        }
        userActivityMap[activity.userId].count++;
      }
    });
    
    const topUsers = Object.values(userActivityMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(user => ({
        userId: user.userId,
        username: user.username,
        role: user.role,
        actionCount: user.count
      }));
    
    // Calculate visits and unique visitors for the time range
    let periodVisits = 0;
    let periodUniqueVisitors = new Set<string>();
    
    Object.entries(analytics.dailyStats || {}).forEach(([date, stats]) => {
      const dateObj = new Date(date);
      if (dateObj >= startDate && dateObj <= now) {
        periodVisits += stats.visits || 0;
        (stats.uniqueVisitors || []).forEach(v => periodUniqueVisitors.add(v));
      }
    });
    
    // Get active sessions (users active in last 30 minutes)
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const { data: activeSessions } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('is_active', true)
      .gte('last_activity', thirtyMinutesAgo.toISOString());
    
    const activeSessionsCount = activeSessions?.length || 0;
    
    return NextResponse.json({
      data: {
        visits: periodVisits,
        uniqueVisitors: periodUniqueVisitors.size,
        activeSessions: activeSessionsCount,
        counters: analytics.counters || {
          projects: 0,
          tasks: 0,
          subtasks: 0,
          users: 0,
          activeUsers: 0
        },
        recentActivities: recentActivities.slice(0, 20),
        activityByCategory,
        topUsers,
        dailyStats: analytics.dailyStats || {}
      },
      success: true
    });
  } catch (error) {
    logger.error('Error fetching analytics', 'ANALYTICS_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to fetch analytics',
      success: false
    }, { status: 500 });
  }
}

// POST /api/analytics - Update analytics counters (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check if user has admin access
    const user = authService.extractUserFromRequest(request);
    
    if (!user || !authService.hasRestrictedAccess(user)) {
      return NextResponse.json({
        error: 'Unauthorized - Admin access required',
        success: false
      }, { status: 401 });
    }
    
    // Update analytics counters
    await db.updateAnalyticsCounters();
    
    logger.info('Analytics counters updated', 'ANALYTICS_API', { 
      updatedBy: user.id 
    });
    
    return NextResponse.json({
      message: 'Analytics counters updated successfully',
      success: true
    });
  } catch (error) {
    logger.error('Error updating analytics', 'ANALYTICS_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to update analytics',
      success: false
    }, { status: 500 });
  }
} 