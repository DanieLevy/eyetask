import { NextRequest, NextResponse } from 'next/server';
import { hasPermission } from '@/lib/auth-permissions';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { logger } from '@/lib/logger';
import { PERMISSIONS } from '@/lib/permissions';
import { getSupabaseClient } from '@/lib/supabase';
import { supabaseDb as db } from '@/lib/supabase-database';

interface _ActivityLogMetadata {
  [key: string]: unknown;
}

interface ActivityLogRow {
  id: string;
  timestamp: string;
  user_id?: string | null;
  username?: string | null;
  user_role?: string | null;
  visitor_id?: string | null;
  visitor_name?: string | null;
  action: string;
  category: string;
  target?: Record<string, unknown> | null;
  severity?: string | null;
}

interface DailyStats {
  visits?: number;
  uniqueVisitors?: string[];
  [key: string]: unknown;
}

// GET /api/analytics - Get analytics dashboard data
export async function GET(request: NextRequest) {
  try {
    logger.info('Analytics request received', 'ANALYTICS_API');
    
    // Extract user from request
    const user = authService.extractUserFromRequest(request);
    
    if (!user) {
      logger.warn('Unauthorized analytics access attempt', 'ANALYTICS_API');
      return NextResponse.json({
        error: 'Unauthorized - Authentication required',
        success: false
      }, { status: 401 });
    }

    // Check if user has analytics permission
    const canViewAnalytics = await hasPermission(user, PERMISSIONS.ACCESS_ANALYTICS);
    
    if (!canViewAnalytics) {
      logger.warn('User attempted to access analytics without permission', 'ANALYTICS_API', {
        userId: user.id,
        username: user.username,
        role: user.role
      });
      
      return NextResponse.json({
        error: 'Forbidden - You do not have permission to view analytics',
        success: false
      }, { status: 403 });
    }

    const isAdmin = user.role === 'admin';

    logger.info('Analytics access granted', 'ANALYTICS_API', {
      userId: user.id,
      username: user.username,
      role: user.role,
      isAdmin
    });

    // Get time range from query params
    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get('range');
    
    let rangeDays = 30; // Default to 30 days
    if (rangeParam === '1' || rangeParam === '1d') {
      rangeDays = 1;
    } else if (rangeParam === '7' || rangeParam === '7d') {
      rangeDays = 7;
    } else if (rangeParam === '30' || rangeParam === '30d') {
      rangeDays = 30;
    }
    
    // Get analytics data
    const analytics = await db.getAnalytics();
    
    if (!analytics) {
      logger.error('Analytics data not found in database', 'ANALYTICS_API');
      return NextResponse.json({
        error: 'Analytics data not found',
        success: false
      }, { status: 404 });
    }
    
    logger.info('Analytics data retrieved successfully', 'ANALYTICS_API', {
      hasCounters: !!analytics.counters,
      hasDailyStats: !!analytics.dailyStats
    });
    
    // Get activity logs
    const supabase = getSupabaseClient(true);
    
    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - rangeDays);
    
    // Get hidden users if not admin
    let hiddenUserIds: string[] = [];
    if (!isAdmin) {
      const { data: hiddenUsers } = await supabase
        .from('app_users')
        .select('id')
        .eq('hide_from_analytics', true);
      
      hiddenUserIds = (hiddenUsers || []).map(u => u.id);
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
    
    // Fetch visitor profiles
    const { data: visitorProfiles } = await supabase
      .from('visitor_profiles')
      .select('*')
      .order('last_seen', { ascending: false })
      .limit(50);
    
    // Process activity logs for analytics
    const recentActivities = (activityLogs || [])
      .filter((log: ActivityLogRow) => {
        // Filter out hidden users for non-admin users
        if (!isAdmin && log.user_id && hiddenUserIds.includes(log.user_id)) {
          return false;
        }
        return true;
      })
      .map((log: ActivityLogRow) => ({
      _id: log.id,
      timestamp: log.timestamp,
      userId: log.user_id,
      username: log.username,
      userRole: log.user_role,
      visitorId: log.visitor_id,
      visitorName: log.visitor_name,
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
    
    // Calculate top users (including visitors)
    const userActivityMap: Record<string, { count: number; username: string; role: string; userId: string; isVisitor?: boolean }> = {};
    
    recentActivities.forEach(activity => {
      const key = activity.userId || activity.visitorId;
      const name = activity.username || activity.visitorName;
      
      if (key && name) {
        if (!userActivityMap[key]) {
          userActivityMap[key] = {
            count: 0,
            username: name,
            role: activity.userRole || 'visitor',
            userId: key,
            isVisitor: !activity.userId
          };
        }
        userActivityMap[key].count++;
      }
    });
    
    const topUsers = Object.values(userActivityMap)
      .filter(user => {
        // Filter out hidden users for non-admin users (only for registered users, not visitors)
        if (!isAdmin && !user.isVisitor && hiddenUserIds.includes(user.userId)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(user => ({
        userId: user.userId,
        username: user.username,
        role: user.role,
        actionCount: user.count,
        isVisitor: user.isVisitor
      }));
    
    // Calculate visitor statistics
    const visitorStats = {
      totalVisitors: visitorProfiles?.length || 0,
      activeVisitors: visitorProfiles?.filter((v: { last_seen: string }) => {
        const lastSeen = new Date(v.last_seen);
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return lastSeen > dayAgo;
      }).length || 0,
      newVisitors: visitorProfiles?.filter((v: { first_seen: string }) => {
        const firstSeen = new Date(v.first_seen);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return firstSeen > weekAgo;
      }).length || 0
    };
    
    // Calculate visits and unique visitors for the time range
    let periodVisits = 0;
    const periodUniqueVisitors = new Set<string>();
    
    Object.entries(analytics.dailyStats || {}).forEach(([date, stats]: [string, DailyStats]) => {
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
    
    logger.info('Analytics data prepared successfully', 'ANALYTICS_API', {
      periodVisits,
      uniqueVisitors: periodUniqueVisitors.size,
      activeSessions: activeSessionsCount,
      topUsersCount: topUsers.length,
      recentActivitiesCount: recentActivities.length,
      rangeDays
    });
    
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
        dailyStats: analytics.dailyStats || {},
        visitorStats,
        visitorProfiles: visitorProfiles?.slice(0, 10) || []
      },
      success: true
    });
  } catch (error) {
    logger.error('Error fetching analytics', 'ANALYTICS_API', {
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    return NextResponse.json({
      error: 'Failed to fetch analytics',
      success: false
    }, { status: 500 });
  }
}

// POST /api/analytics - Update analytics counters  
export async function POST(request: NextRequest) {
  try {
    // Check if user has permission to update analytics
    const user = authService.extractUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({
        error: 'Unauthorized - Authentication required',
        success: false
      }, { status: 401 });
    }

    // Check if user has analytics permission (admin users can always update)
    const canUpdateAnalytics = user.role === 'admin' || await hasPermission(user, PERMISSIONS.ACCESS_ANALYTICS);
    
    if (!canUpdateAnalytics) {
      logger.warn('User attempted to update analytics without permission', 'ANALYTICS_API', {
        userId: user.id,
        username: user.username,
        role: user.role
      });
      
      return NextResponse.json({
        error: 'Forbidden - You do not have permission to update analytics',
        success: false
      }, { status: 403 });
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