'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Crown, Medal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { User, Activity } from '../../types/analytics';

interface UserLeaderboardProps {
  users: User[];
  activities: Activity[];
  className?: string;
}

export const UserLeaderboard = React.memo(function UserLeaderboard({ 
  users, 
  activities, 
  className 
}: UserLeaderboardProps) {
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (index < 3) return <Medal className="h-5 w-5 text-gray-400" />;
    return null;
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'מנהל';
      case 'data_manager':
        return 'מנהל נתונים';
      default:
        return 'משתמש';
    }
  };

  const getUserActivities = useMemo(() => {
    return (userId: string) => {
      return activities
        .filter(activity => activity.userId === userId)
        .slice(0, 5);
    };
  }, [activities]);

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

  const topUsers = useMemo(() => users.slice(0, 5), [users]);

  return (
    <Card className={cn("border-0 shadow-sm", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium">משתמשים פעילים ביותר</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {topUsers.length > 0 ? (
          topUsers.map((user, index) => {
            const isExpanded = expandedUser === user.userId;
            const userActivities = getUserActivities(user.userId);

            return (
              <div
                key={user.userId}
                className={cn(
                  "rounded-lg border transition-all duration-200",
                  isExpanded ? "bg-accent/50" : "hover:bg-accent/30"
                )}
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedUser(isExpanded ? null : user.userId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted">
                        {getRankIcon(index) || (
                          <span className="text-sm font-semibold text-muted-foreground">
                            {index + 1}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user.username}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {getRoleLabel(user.role)}
                          </Badge>
                          {user.isVisitor && (
                            <Badge variant="outline" className="text-xs">
                              מבקר
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-semibold text-foreground">
                          {user.actionCount}
                        </p>
                        <p className="text-xs text-muted-foreground">פעולות</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expandable activity list */}
                {isExpanded && userActivities.length > 0 && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="ml-12 space-y-2 border-t pt-3">
                      <p className="text-xs text-muted-foreground mb-2">פעולות אחרונות</p>
                      {userActivities.map((activity) => (
                        <div
                          key={activity._id}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span className="text-muted-foreground">•</span>
                          <div className="flex-1">
                            <p className="text-foreground">{activity.action}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatTimeAgo(activity.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>אין משתמשים פעילים להצגה</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}); 