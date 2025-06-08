import { mongodb } from './mongodb';
import { logger } from './logger';
import { NextRequest } from 'next/server';

export interface ActivityEvent {
  _id?: string;
  timestamp: Date;
  userId?: string;
  userType: 'admin' | 'user' | 'system';
  action: string;
  category: 'task' | 'project' | 'subtask' | 'user' | 'system' | 'auth' | 'view' | 'daily_update';
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
   * Log an activity event
   */
  async logActivity(activity: Omit<ActivityEvent, '_id' | 'timestamp'>): Promise<void> {
    try {
      const { activities } = await mongodb.getCollections();
      
      const activityEvent: ActivityEvent = {
        ...activity,
        timestamp: new Date(),
      };

      await activities.insertOne(activityEvent);
      
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
   */
  async getActivityStats(timeRange?: { start: Date; end: Date }): Promise<ActivityStats> {
    try {
      const { activities } = await mongodb.getCollections();
      
      const matchCondition = timeRange ? {
        timestamp: { $gte: timeRange.start, $lte: timeRange.end }
      } : {};

      const [totalStats, actionsByType, actionsByCategory, recentActions, topUsers] = await Promise.all([
        // Total actions count
        activities.countDocuments(matchCondition),
        
        // Actions by type
        activities.aggregate([
          { $match: matchCondition },
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]).toArray(),
        
        // Actions by category
        activities.aggregate([
          { $match: matchCondition },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]).toArray(),
        
        // Recent actions (last 50)
        activities.find(matchCondition)
          .sort({ timestamp: -1 })
          .limit(50)
          .toArray(),
        
        // Top users by activity
        activities.aggregate([
          { $match: { ...matchCondition, userId: { $exists: true } } },
          { $group: { _id: '$userId', actionCount: { $sum: 1 } } },
          { $sort: { actionCount: -1 } },
          { $limit: 10 }
        ]).toArray()
      ]);

      return {
        totalActions: totalStats,
        actionsByType: Object.fromEntries(actionsByType.map(item => [item._id, item.count])),
        actionsByCategory: Object.fromEntries(actionsByCategory.map(item => [item._id, item.count])),
        recentActions: recentActions as ActivityEvent[],
        topUsers: topUsers.map(user => ({
          userId: user._id,
          actionCount: user.actionCount
        }))
      };
      
    } catch (error) {
      logger.error('Failed to get activity stats', 'ACTIVITY_LOGGER', undefined, error as Error);
      return {
        totalActions: 0,
        actionsByType: {},
        actionsByCategory: {},
        recentActions: [],
        topUsers: []
      };
    }
  }

  /**
   * Get recent activities for public display
   */
  async getRecentActivities(limit: number = 20, includeViews: boolean = false): Promise<ActivityEvent[]> {
    try {
      const { activities } = await mongodb.getCollections();
      
      const filter = includeViews ? { isVisible: true } : { 
        isVisible: true,
        action: { $not: /צפה ב/ } // Exclude view actions
      };

      const result = await activities.find(filter)
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      return result as ActivityEvent[];
      
    } catch (error) {
      logger.error('Failed to get recent activities', 'ACTIVITY_LOGGER', undefined, error as Error);
      return [];
    }
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