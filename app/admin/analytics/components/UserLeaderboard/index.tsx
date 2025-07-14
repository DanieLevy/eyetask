'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Crown, Medal, ArrowLeft, Trophy, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { User, Activity } from '../../types/analytics';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="h-5 w-5 text-yellow-500 animate-pulse" />;
    if (index === 1) return <Trophy className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-orange-600" />;
    if (index < 5) return <Star className="h-5 w-5 text-gray-400" />;
    return null;
  };

  const getRankBackground = (index: number) => {
    if (index === 0) return 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200/50';
    if (index === 1) return 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 border-gray-200/50';
    if (index === 2) return 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200/50';
    return '';
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
    <Card className={cn("border-0 shadow-lg hover:shadow-xl transition-all duration-300", className)}>
      <CardHeader className="pb-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <CardTitle className="text-lg font-medium">מבקרים פעילים ביותר</CardTitle>
          </div>
          {users.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/admin/analytics/visitors')}
              className="gap-1 hover:gap-2 transition-all duration-200"
            >
              צפה בכל המבקרים
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-6">
        {topUsers.length > 0 ? (
          <>
            <p className="text-xs text-muted-foreground mb-3 animate-fade-in">לחץ על מבקר כדי לראות את הפעילות האחרונה שלו</p>
            {topUsers.map((user, index) => {
              const isExpanded = expandedUser === user.userId;
              const userActivities = getUserActivities(user.userId);

              return (
                <div
                  key={user.userId}
                  className={cn(
                    "rounded-lg border transition-all duration-300 transform hover:scale-[1.02]",
                    getRankBackground(index),
                    isExpanded ? "shadow-md" : "hover:shadow-sm",
                    "animate-slide-up"
                  )}
                  style={{
                    animationDelay: `${index * 50}ms`
                  }}
                >
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedUser(isExpanded ? null : user.userId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex items-center justify-center h-10 w-10 rounded-full transition-all duration-300",
                          index < 3 ? "bg-white dark:bg-gray-800 shadow-sm" : "bg-muted"
                        )}>
                          {getRankIcon(index) || (
                            <span className="text-sm font-semibold text-muted-foreground">
                              {index + 1}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{user.username}</p>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                "text-xs transition-all duration-200",
                                user.role === 'admin' && "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                              )}
                            >
                              {getRoleLabel(user.role)}
                            </Badge>
                            {user.isVisitor && (
                              <Badge variant="outline" className="text-xs animate-pulse">
                                מבקר
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={cn(
                            "text-lg font-semibold text-foreground transition-all duration-300",
                            index === 0 && "text-2xl bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent"
                          )}>
                            {user.actionCount}
                          </p>
                          <p className="text-xs text-muted-foreground">פעולות</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 transition-transform duration-200 hover:rotate-180"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedUser(isExpanded ? null : user.userId);
                          }}
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
            })}
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>אין משתמשים פעילים להצגה</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}); 