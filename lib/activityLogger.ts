import { supabaseDb as db } from './supabase-database';
import { logger } from './logger';
import { NextRequest } from 'next/server';

export interface ActivityEvent {
  _id?: string;
  timestamp: Date;
  userId?: string;
  userType: 'admin' | 'user' | 'system';
  action: string;
  category: 'task' | 'project' | 'subtask' | 'user' | 'system' | 'auth' | 'view' | 'daily_update' | 'feedback';
  target?: {
    id: string;
    type: string;
    title?: string;
  };
  details?: Record<string, any>;
  metadata?: {
    ip?: string;
    userAgent?: string;
    device?: string;
    location?: string;
  };
  severity: 'info' | 'warning' | 'error' | 'success';
  isVisible: boolean; // Whether to show in public activity feeds
}

export interface ActivityStats {
  totalActions: number;
  actionsByType: Record<string, number>;
  actionsByCategory: Record<string, number>;
  recentActions: ActivityEvent[];
  topUsers: Array<{
    userId: string;
    username?: string;
    actionCount: number;
  }>;
}

class ActivityLogger {
  /**
   * Log an activity event using database selector
   */
  async logActivity(activity: Omit<ActivityEvent, '_id' | 'timestamp'>): Promise<void> {
    try {
      // Skip logging for admin users
      if (activity.userType === 'admin') {
        return;
      }
      
      // Use the database selector's logAction method
      if (activity.userId) {
        await db.logAction({
          userId: activity.userId,
          username: activity.target?.title || 'Unknown',
          userRole: activity.userType,
          action: activity.action,
          category: activity.category as any,
          target: activity.target,
          metadata: {
            ...activity.details,
            ...activity.metadata
          },
          severity: activity.severity
        });
      }
      
      // Also log to system logger for debugging
      logger.info(`Activity: ${activity.action}`, 'ACTIVITY_LOGGER', {
        userId: activity.userId,
        category: activity.category,
        target: activity.target,
        severity: activity.severity
      });
      
    } catch (error) {
      logger.error('Failed to log activity', 'ACTIVITY_LOGGER', undefined, error as Error);
    }
  }

  /**
   * Log task-related activities
   */
  async logTaskActivity(
    action: 'created' | 'updated' | 'deleted' | 'viewed' | 'visibility_changed',
    taskId: string,
    taskTitle: string,
    userId?: string,
    userType: 'admin' | 'user' = 'user',
    details?: Record<string, any>,
    request?: NextRequest
  ): Promise<void> {
    const actionMessages = {
      created: 'יצר משימה חדשה',
      updated: 'עדכן משימה',
      deleted: 'מחק משימה',
      viewed: 'צפה במשימה',
      visibility_changed: 'שינה נראות משימה'
    };

    await this.logActivity({
      userId,
      userType,
      action: actionMessages[action],
      category: 'task',
      target: {
        id: taskId,
        type: 'task',
        title: taskTitle
      },
      details,
      metadata: this.extractRequestMetadata(request),
      severity: action === 'deleted' ? 'warning' : action === 'created' ? 'success' : 'info',
      isVisible: action !== 'viewed' // Don't show view actions in public feed
    });
  }

  /**
   * Log project-related activities
   */
  async logProjectActivity(
    action: 'created' | 'updated' | 'deleted' | 'viewed',
    projectId: string,
    projectName: string,
    userId?: string,
    userType: 'admin' | 'user' = 'admin',
    details?: Record<string, any>,
    request?: NextRequest
  ): Promise<void> {
    const actionMessages = {
      created: 'יצר פרויקט חדש',
      updated: 'עדכן פרויקט',
      deleted: 'מחק פרויקט',
      viewed: 'צפה בפרויקט'
    };

    await this.logActivity({
      userId,
      userType,
      action: actionMessages[action],
      category: 'project',
      target: {
        id: projectId,
        type: 'project',
        title: projectName
      },
      details,
      metadata: this.extractRequestMetadata(request),
      severity: action === 'deleted' ? 'warning' : action === 'created' ? 'success' : 'info',
      isVisible: action !== 'viewed'
    });
  }

  /**
   * Log subtask-related activities
   */
  async logSubtaskActivity(
    action: 'created' | 'updated' | 'deleted' | 'viewed',
    subtaskId: string,
    subtaskTitle: string,
    taskId: string,
    userId?: string,
    userType: 'admin' | 'user' = 'user',
    details?: Record<string, any>,
    request?: NextRequest
  ): Promise<void> {
    const actionMessages = {
      created: 'יצר תת-משימה חדשה',
      updated: 'עדכן תת-משימה',
      deleted: 'מחק תת-משימה',
      viewed: 'צפה בתת-משימה'
    };

    await this.logActivity({
      userId,
      userType,
      action: actionMessages[action],
      category: 'subtask',
      target: {
        id: subtaskId,
        type: 'subtask',
        title: subtaskTitle
      },
      details: {
        ...details,
        parentTaskId: taskId
      },
      metadata: this.extractRequestMetadata(request),
      severity: action === 'deleted' ? 'warning' : action === 'created' ? 'success' : 'info',
      isVisible: action !== 'viewed'
    });
  }

  /**
   * Log authentication activities
   */
  async logAuthActivity(
    action: 'login' | 'logout' | 'login_failed' | 'token_refresh',
    userId?: string,
    username?: string,
    details?: Record<string, any>,
    request?: NextRequest
  ): Promise<void> {
    const actionMessages = {
      login: 'התחבר למערכת',
      logout: 'התנתק מהמערכת',
      login_failed: 'ניסיון התחברות נכשל',
      token_refresh: 'רענן אסימון גישה'
    };

    await this.logActivity({
      userId,
      userType: 'admin',
      action: actionMessages[action],
      category: 'auth',
      target: userId ? {
        id: userId,
        type: 'user',
        title: username || 'משתמש'
      } : undefined,
      details,
      metadata: this.extractRequestMetadata(request),
      severity: action === 'login_failed' ? 'warning' : action === 'login' ? 'success' : 'info',
      isVisible: action !== 'token_refresh'
    });
  }

  /**
   * Log daily update activities
   */
  async logDailyUpdateActivity(
    action: 'created' | 'updated' | 'deleted' | 'hidden' | 'pinned' | 'unpinned',
    updateId: string,
    updateTitle: string,
    userId?: string,
    details?: Record<string, any>,
    request?: NextRequest
  ): Promise<void> {
    const actionMessages = {
      created: 'יצר עדכון יומי חדש',
      updated: 'עדכן עדכון יומי',
      deleted: 'מחק עדכון יומי',
      hidden: 'הסתיר עדכון יומי',
      pinned: 'הצמיד עדכון יומי',
      unpinned: 'ביטל הצמדת עדכון יומי'
    };

    await this.logActivity({
      userId,
      userType: 'admin',
      action: actionMessages[action],
      category: 'daily_update',
      target: {
        id: updateId,
        type: 'daily_update',
        title: updateTitle
      },
      details,
      metadata: this.extractRequestMetadata(request),
      severity: action === 'deleted' ? 'warning' : action === 'created' ? 'success' : 'info',
      isVisible: true
    });
  }

  /**
   * Log system activities
   */
  async logSystemActivity(
    action: string,
    details?: Record<string, any>,
    severity: 'info' | 'warning' | 'error' = 'info'
  ): Promise<void> {
    await this.logActivity({
      userType: 'system',
      action,
      category: 'system',
      details,
      severity,
      isVisible: severity !== 'info'
    });
  }

  /**
   * Get activity statistics
   * TODO: Implement with Supabase queries
   */
  async getActivityStats(timeRange?: { start: Date; end: Date }): Promise<ActivityStats> {
    // TODO: Implement activity stats with Supabase
    // This would require reimplementing the aggregation queries
    logger.warn('Activity stats not implemented for Supabase yet', 'ACTIVITY_LOGGER');
    return {
      totalActions: 0,
      actionsByType: {},
      actionsByCategory: {},
      recentActions: [],
      topUsers: []
    };
  }

  /**
   * Get recent activities for public display
   * TODO: Implement with Supabase
   */
  async getRecentActivities(limit: number = 20, includeViews: boolean = false): Promise<ActivityEvent[]> {
    // TODO: Implement with Supabase queries
    logger.warn('Recent activities not implemented for Supabase yet', 'ACTIVITY_LOGGER');
    return [];
  }

  /**
   * Extract metadata from request
   */
  private extractRequestMetadata(request?: NextRequest): ActivityEvent['metadata'] {
    if (!request) return {};

    const userAgent = request.headers.get('user-agent') || '';
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    return {
      ip,
      userAgent,
      device: this.parseDeviceFromUserAgent(userAgent)
    };
  }

  /**
   * Parse device type from user agent
   */
  private parseDeviceFromUserAgent(userAgent: string): string {
    if (/mobile/i.test(userAgent)) return 'mobile';
    if (/tablet/i.test(userAgent)) return 'tablet';
    if (/desktop/i.test(userAgent)) return 'desktop';
    return 'unknown';
  }
}

// Export singleton instance
export const activityLogger = new ActivityLogger(); 