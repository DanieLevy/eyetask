'use client';

import { ChevronDown, ChevronUp, Trophy, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
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
  const router = useRouter();

  const getRankIcon = (index: number) => {
    if (index < 3) return <Trophy className="h-4 w-4 text-slate-600" />;
    return <Star className="h-4 w-4 text-slate-400" />;
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'מנהל';
      case 'data_manager':
        return 'מנהל נתונים';
      case 'visitor':
        return 'מבקר';
      default:
        return 'משתמש';
    }
  };

  const getUserActivities = useMemo(() => {
    return (userId: string) => {
      return activities
        .filter(activity => activity.userId === userId || activity.visitorId === userId)
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

  const topUsers = useMemo(() => users.slice(0, 10), [users]);

  return (
    <div className={cn("bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm", className)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">מבקרים פעילים</h3>
          </div>
          {users.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/admin/analytics/visitors')}
              className="text-xs text-slate-600 hover:text-slate-900"
            >
              צפה בכל →
            </Button>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1">משתמשים עם הכי הרבה פעילות</p>
      </div>

      {/* Users List */}
      <div className="p-4 space-y-2">
        {topUsers.length > 0 ? (
          topUsers.map((user, index) => {
            const isExpanded = expandedUser === user.userId;
            const userActivities = getUserActivities(user.userId);

            return (
              <div
                key={user.userId}
                className={cn(
                  "rounded-lg border border-slate-200 transition-all duration-200",
                  isExpanded && "bg-slate-50"
                )}
              >
                <div
                  className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedUser(isExpanded ? null : user.userId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-100">
                        <span className="text-xs font-semibold text-slate-700">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{user.username}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {getRoleLabel(user.role)}
                          </span>
                          {user.isVisitor && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              מבקר
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-base font-semibold text-slate-900">
                          {user.actionCount}
                        </p>
                        <p className="text-xs text-slate-500">פעולות</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedUser(isExpanded ? null : user.userId);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-600" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-600" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expandable activity list */}
                {isExpanded && userActivities.length > 0 && (
                  <div className="px-4 pb-4">
                    <div className="ml-10 space-y-2 border-t border-slate-200 pt-3">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">פעולות אחרונות</p>
                      {userActivities.map((activity) => (
                        <div
                          key={activity._id}
                          className="flex items-start gap-2"
                        >
                          <span className="text-slate-400 text-xs mt-0.5">•</span>
                          <div className="flex-1">
                            <p className="text-sm text-slate-700">{activity.action}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
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
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">אין משתמשים פעילים להצגה</p>
          </div>
        )}
      </div>
    </div>
  );
}); 