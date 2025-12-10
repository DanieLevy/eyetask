'use client';

import { 
  FileText, 
  Users, 
  Settings, 
  Activity as ActivityIcon,
  Eye,
  Zap
} from 'lucide-react';
import React from 'react';
import { cn } from '@/lib/utils';
import { Activity } from '../../types/analytics';

interface ActivityFeedProps {
  activities: Activity[];
  className?: string;
}

export const ActivityFeed = React.memo(function ActivityFeed({ activities, className }: ActivityFeedProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'task':
      case 'subtask':
        return <FileText className="h-4 w-4" />;
      case 'user':
        return <Users className="h-4 w-4" />;
      case 'system':
        return <Settings className="h-4 w-4" />;
      case 'view':
        return <Eye className="h-4 w-4" />;
      default:
        return <ActivityIcon className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'עכשיו';
    if (minutes < 60) return `לפני ${minutes} דקות`;
    if (hours < 24) return `לפני ${hours} שעות`;
    return `לפני ${days} ימים`;
  };

  return (
    <div className={cn("bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm", className)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700">פעילות אחרונה</h3>
        </div>
        <p className="text-xs text-slate-500 mt-1">עדכונים ופעולות בזמן אמת</p>
      </div>

      {/* Activity List */}
      <div className="p-4 space-y-2">
        {activities.length > 0 ? (
          activities.slice(0, 10).map((activity) => (
            <div
              key={activity._id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors duration-200"
            >
              <div className="flex-shrink-0 p-1.5 bg-slate-100 rounded-md">
                {getCategoryIcon(activity.category)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {activity.category}
                      </span>
                      <span className="text-xs font-medium text-slate-700 truncate">
                        {activity.username || activity.visitorName}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-700 mt-1">
                      {activity.action}
                    </p>
                    
                    {activity.target && (
                      <p className="text-xs text-slate-500 mt-1">
                        {activity.target.type}: {activity.target.name || activity.target.id}
                      </p>
                    )}
                  </div>
                  
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-slate-500">
            <ActivityIcon className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm">אין פעילות להצגה</p>
          </div>
        )}
      </div>
    </div>
  );
}); 