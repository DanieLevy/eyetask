'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Activity } from '../../types/analytics';
import { 
  FileText, 
  Users, 
  Settings, 
  Activity as ActivityIcon,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Zap
} from 'lucide-react';

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
      default:
        return <ActivityIcon className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'task':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'subtask':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'user':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'system':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-orange-100 text-orange-700 border-orange-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
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
    <Card className={cn("border-0 shadow-lg hover:shadow-xl transition-all duration-300", className)}>
      <CardHeader className="pb-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-orange-500" />
          <CardTitle className="text-lg font-medium">פעילות אחרונה</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-6">
        {activities.length > 0 ? (
          activities.slice(0, 10).map((activity, index) => (
            <div
              key={activity._id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg",
                "border border-transparent hover:border-gray-200 dark:hover:border-gray-700",
                "transition-all duration-300 hover:shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800/50",
                "animate-slide-up transform hover:scale-[1.01]"
              )}
              style={{
                animationDelay: `${index * 50}ms`
              }}
            >
              <div className="mt-0.5">
                {getSeverityIcon(activity.severity)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs border transition-all duration-200",
                          getCategoryColor(activity.category)
                        )}
                      >
                        <span className="mr-1">{getCategoryIcon(activity.category)}</span>
                        {activity.category}
                      </Badge>
                      <span className="text-sm font-medium text-foreground">
                        {activity.username || activity.visitorName}
                      </span>
                    </div>
                    
                    <p className="text-sm text-foreground mt-1">
                      {activity.action}
                    </p>
                    
                    {activity.target && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.target.type}: {activity.target.name || activity.target.id}
                      </p>
                    )}
                  </div>
                  
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <ActivityIcon className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>אין פעילות להצגה</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}); 