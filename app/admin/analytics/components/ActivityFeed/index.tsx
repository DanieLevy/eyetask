'use client';

import React, { useState, useMemo } from 'react';
import { Clock, User, Eye, LogIn, Edit, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Activity } from '../../types/analytics';

interface ActivityFeedProps {
  activities: Activity[];
  className?: string;
}

export const ActivityFeed = React.memo(function ActivityFeed({ 
  activities, 
  className 
}: ActivityFeedProps) {
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'auth':
        return <LogIn className="h-4 w-4" />;
      case 'view':
        return <Eye className="h-4 w-4" />;
      case 'edit':
        return <Edit className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'auth':
        return 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-950/30';
      case 'project':
        return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30';
      case 'task':
        return 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30';
      case 'user':
        return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950/30';
      case 'view':
        return 'text-pink-600 bg-pink-50 dark:text-pink-400 dark:bg-pink-950/30';
      default:
        return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950/30';
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

  const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString('he-IL', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const recentActivities = useMemo(() => activities.slice(0, 10), [activities]);

  return (
    <Card className={cn("border-0 shadow-sm", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">פעילות אחרונה</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {activities.length} פעולות
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {recentActivities.map((activity) => {
            const isExpanded = expandedActivity === activity._id;

            return (
              <div
                key={activity._id}
                className={cn(
                  "rounded-lg border p-3 transition-all duration-200 cursor-pointer",
                  isExpanded ? "bg-accent/50" : "hover:bg-accent/30"
                )}
                onClick={() => setExpandedActivity(isExpanded ? null : activity._id)}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    getCategoryColor(activity.category)
                  )}>
                    {getCategoryIcon(activity.category)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground line-clamp-2">
                          {activity.action}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {activity.username || activity.visitorName}
                          </span>
                          {activity.visitorId && (
                            <Badge variant="outline" className="text-xs">
                              מבקר
                            </Badge>
                          )}
                          <span>•</span>
                          <span>{formatTimeAgo(activity.timestamp)}</span>
                        </div>
                      </div>
                      <ChevronRight className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform duration-200",
                        isExpanded && "rotate-90"
                      )} />
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-3 pl-0 space-y-2 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs text-muted-foreground">קטגוריה</p>
                            <p className="font-medium capitalize">{activity.category}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">תאריך ושעה</p>
                            <p className="font-medium">{formatDateTime(activity.timestamp)}</p>
                          </div>
                          {activity.target && (
                            <>
                              <div>
                                <p className="text-xs text-muted-foreground">יעד</p>
                                <p className="font-medium">{activity.target.type}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">מזהה</p>
                                <p className="font-medium text-xs font-mono">
                                  {activity.target.name || activity.target.id}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}); 