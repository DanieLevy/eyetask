'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Users,
  Activity,
  Target,
  ChevronRight,
  RefreshCw,
  Clock,
  Calendar,
  User,
  LogIn,
  Edit,
  Eye,
  TrendingUp,
  TrendingDown,
  Layers,
  CheckSquare,
  UserCheck,
  Menu,
  FileText,
  AlertCircle,
  MousePointerClick,
  UserCog,
  Shield,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/LoadingSystem';
import { EmptyState } from '@/components/EmptyState';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useRequirePermission } from '@/contexts/PermissionContext';
import { PERMISSIONS } from '@/lib/permissions';
import AdminClientLayout from '@/components/AdminClientLayout';

interface AnalyticsData {
  visits: number;
  uniqueVisitors: number;
  activeSessions: number;
  counters: {
    projects: number;
    tasks: number;
    subtasks: number;
    users: number;
    activeUsers: number;
  };
  recentActivities: Array<{
    _id: string;
    timestamp: Date;
    userId: string;
    username: string;
    userRole: string;
    action: string;
    category: string;
    target?: {
      id: string;
      type: string;
      name?: string;
    };
    severity: string;
  }>;
  activityByCategory: Record<string, number>;
  topUsers: Array<{
    userId: string;
    username: string;
    role: string;
    actionCount: number;
  }>;
  dailyStats: Record<string, {
    visits: number;
    uniqueVisitors: string[];
    actions: number;
    loginCount: number;
  }>;
}

// Inner component that uses the permission hook
function AnalyticsContent() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'1d' | '7d' | '30d'>('7d');
  
  // Font configurations
  const hebrewHeading = useHebrewFont('heading');
  const mixedBody = useMixedFont('body');

  // Check permission - now this is inside the PermissionProvider
  const { hasPermission, loading: permissionLoading } = useRequirePermission(
    PERMISSIONS.ACCESS_ANALYTICS,
    '/admin/dashboard'
  );

  const fetchAnalytics = useCallback(async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/admin');
        return;
      }

      const response = await fetch(`/api/analytics?range=${timeRange}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange, router]);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'auth':
        return <LogIn className="h-3 w-3" />;
      case 'project':
        return <Layers className="h-3 w-3" />;
      case 'task':
        return <CheckSquare className="h-3 w-3" />;
      case 'user':
        return <User className="h-3 w-3" />;
      case 'view':
        return <Eye className="h-3 w-3" />;
      default:
        return <Activity className="h-3 w-3" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'auth':
        return 'from-violet-500 to-purple-600';
      case 'project':
        return 'from-blue-500 to-cyan-600';
      case 'task':
        return 'from-emerald-500 to-green-600';
      case 'user':
        return 'from-orange-500 to-red-600';
      case 'view':
        return 'from-pink-500 to-rose-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'auth':
        return 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300';
      case 'project':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'task':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'user':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'view':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('he-IL').format(num);
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

  if (loading || permissionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-4 space-y-4 max-w-7xl mx-auto">
          <Skeleton className="h-16 w-full rounded-lg" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { percentage: 0, isUp: true };
    const percentage = Math.round(((current - previous) / previous) * 100);
    return { percentage: Math.abs(percentage), isUp: percentage >= 0 };
  };

  // Calculate today's trend
  const todayStats = analytics?.dailyStats[new Date().toISOString().split('T')[0]] || { visits: 0 };
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStats = analytics?.dailyStats[yesterdayDate.toISOString().split('T')[0]] || { visits: 0 };
  const trend = calculateTrend(todayStats.visits, yesterdayStats.visits);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        {/* Page Header - Compact */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">ניתוח נתונים</h1>
            <p className="text-sm text-muted-foreground">מעקב אחר פעילות המערכת</p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="w-28 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">היום</SelectItem>
                <SelectItem value="7d">7 ימים</SelectItem>
                <SelectItem value="30d">30 ימים</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAnalytics}
              disabled={refreshing}
              className="h-9"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          </div>
        </div>

        {analytics && (
          <>
            {/* Main Stats Cards - Compact */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {/* Visits Card */}
              <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Activity className="h-4 w-4 opacity-80" />
                    <Badge className="bg-white/20 text-white border-0 text-xs">
                      {timeRange === '1d' ? 'היום' : timeRange === '7d' ? '7 ימים' : '30 יום'}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold">{formatNumber(analytics.visits)}</p>
                  <p className="text-xs opacity-90">ביקורים</p>
                  {timeRange === '1d' && trend.percentage > 0 && (
                    <div className="flex items-center gap-1 text-xs mt-1">
                      {trend.isUp ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span>{trend.percentage}%</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Unique Users Card */}
              <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="h-4 w-4 opacity-80" />
                    <span className="text-xs opacity-90">{analytics.activeSessions} פעילים</span>
                  </div>
                  <p className="text-2xl font-bold">{formatNumber(analytics.uniqueVisitors)}</p>
                  <p className="text-xs opacity-90">משתמשים ייחודיים</p>
                </CardContent>
              </Card>

              {/* Active Users Card */}
              <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-500 to-green-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <UserCheck className="h-4 w-4 opacity-80" />
                  </div>
                  <p className="text-2xl font-bold">{formatNumber(analytics.counters?.activeUsers || 0)}</p>
                  <p className="text-xs opacity-90">משתמשים פעילים</p>
                </CardContent>
              </Card>

              {/* Actions Card */}
              <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-500 to-red-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <MousePointerClick className="h-4 w-4 opacity-80" />
                  </div>
                  <p className="text-2xl font-bold">{formatNumber(analytics.recentActivities?.length || 0)}</p>
                  <p className="text-xs opacity-90">פעולות אחרונות</p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="activities" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-10 relative z-10 bg-background">
                <TabsTrigger value="activities" className="text-sm">
                  <Activity className="h-3 w-3 mr-1" />
                  פעילות
                </TabsTrigger>
                <TabsTrigger value="users" className="text-sm">
                  <Users className="h-3 w-3 mr-1" />
                  משתמשים
                </TabsTrigger>
                <TabsTrigger value="daily" className="text-sm">
                  <Calendar className="h-3 w-3 mr-1" />
                  יומי
                </TabsTrigger>
                <TabsTrigger value="overview" className="text-sm">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  סקירה
                </TabsTrigger>
              </TabsList>

              {/* Activities Tab */}
              <TabsContent value="activities" className="relative">
                <Card className="relative z-0">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">פעילות אחרונה</CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {analytics.recentActivities?.length || 0} פעולות
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="relative overflow-hidden">
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {analytics.recentActivities && analytics.recentActivities.slice(0, 10).map((activity) => (
                        <div
                          key={activity._id}
                          className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className={cn(
                            "p-1.5 rounded-md bg-gradient-to-br text-white",
                            getCategoryColor(activity.category)
                          )}>
                            {getCategoryIcon(activity.category)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">{activity.action}</p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {activity.username}
                              </span>
                              <span>{formatTimeAgo(activity.timestamp)}</span>
                              {activity.target && (
                                <Badge variant="outline" className="text-xs">
                                  {activity.target.name || activity.target.id}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Users Tab */}
              <TabsContent value="users">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">משתמשים מובילים</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analytics.topUsers && analytics.topUsers.map((user, index) => {
                        const medals = ['🥇', '🥈', '🥉'];
                        const isTop3 = index < 3;
                        
                        return (
                          <div
                            key={user.userId}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg",
                              isTop3 ? "bg-muted/50" : "hover:bg-muted/30"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                                isTop3
                                  ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white"
                                  : "bg-muted text-muted-foreground"
                              )}>
                                {isTop3 ? medals[index] : index + 1}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{user.username}</p>
                                <Badge variant="outline" className="text-xs">
                                  {user.role === 'admin' ? 'מנהל' : user.role === 'data_manager' ? 'מנהל נתונים' : 'משתמש'}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-foreground">
                                {formatNumber(user.actionCount)}
                              </p>
                              <p className="text-xs text-muted-foreground">פעולות</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Daily Stats Tab */}
              <TabsContent value="daily">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">סטטיסטיקה יומית</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Chart-like visualization */}
                    <div className="space-y-2">
                      {analytics.dailyStats && Object.entries(analytics.dailyStats)
                        .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
                        .slice(0, 7)
                        .reverse()
                        .map(([date, stats]) => {
                          const maxVisits = Math.max(
                            ...Object.values(analytics.dailyStats).map(s => s.visits || 0)
                          );
                          const percentage = maxVisits > 0 ? ((stats.visits || 0) / maxVisits) * 100 : 0;
                          const isToday = date === new Date().toISOString().split('T')[0];
                          
                          return (
                            <div key={date} className="flex items-center gap-2">
                              <div className="w-16 text-xs text-muted-foreground">
                                {new Date(date).toLocaleDateString('he-IL', { 
                                  day: 'numeric',
                                  month: 'numeric' 
                                })}
                              </div>
                              <div className="flex-1">
                                <div className="relative h-6 bg-muted rounded overflow-hidden">
                                  <div
                                    className={cn(
                                      "absolute inset-y-0 left-0 transition-all duration-500",
                                      isToday 
                                        ? "bg-gradient-to-r from-emerald-500 to-green-600" 
                                        : "bg-gradient-to-r from-gray-400 to-gray-500"
                                    )}
                                    style={{ width: `${percentage}%` }}
                                  />
                                  <span className="absolute inset-0 flex items-center px-2 text-xs font-medium">
                                    {stats.visits || 0}
                                  </span>
                                </div>
                              </div>
                              {isToday && (
                                <Badge variant="secondary" className="text-xs">
                                  היום
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                    </div>

                    {/* Daily Stats Summary */}
                    <div className="grid grid-cols-2 gap-3">
                      {analytics.dailyStats && Object.entries(analytics.dailyStats)
                        .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
                        .slice(0, 2)
                        .map(([date, stats]) => {
                          const isToday = date === new Date().toISOString().split('T')[0];
                          
                          return (
                            <div
                              key={date}
                              className={cn(
                                "p-3 rounded-lg space-y-2",
                                isToday ? "bg-primary/10 border border-primary/20" : "bg-muted/50"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium">
                                  {new Date(date).toLocaleDateString('he-IL')}
                                </span>
                                {isToday && (
                                  <Badge variant="default" className="text-xs">היום</Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-center">
                                <div>
                                  <p className="text-base font-bold text-foreground">{stats?.visits || 0}</p>
                                  <p className="text-xs text-muted-foreground">ביקורים</p>
                                </div>
                                <div>
                                  <p className="text-base font-bold text-foreground">
                                    {Array.isArray(stats?.uniqueVisitors) ? stats.uniqueVisitors.length : 0}
                                  </p>
                                  <p className="text-xs text-muted-foreground">ייחודיים</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Overview Tab */}
              <TabsContent value="overview">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Activity by Category */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">פעילות לפי קטגוריה</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.activityByCategory && Object.entries(analytics.activityByCategory)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([category, count]) => {
                            const total = Object.values(analytics.activityByCategory).reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                            
                            return (
                              <div key={category} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className={cn(
                                      "p-1 rounded bg-gradient-to-br text-white",
                                      getCategoryColor(category)
                                    )}>
                                      {getCategoryIcon(category)}
                                    </div>
                                    <span className="text-sm capitalize">{category}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground">{count}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {percentage}%
                                    </Badge>
                                  </div>
                                </div>
                                <Progress value={percentage} className="h-1.5" />
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Login Activity Stats */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">סטטיסטיקת התחברויות</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">התחברויות היום</span>
                          <LogIn className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <p className="text-xl font-bold text-foreground">
                          {analytics.dailyStats[new Date().toISOString().split('T')[0]]?.loginCount || 0}
                        </p>
                      </div>
                      
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">ממוצע יומי</span>
                          <Activity className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <p className="text-xl font-bold text-foreground">
                          {(() => {
                            let total = 0;
                            let days = 0;
                            const endDate = new Date();
                            const startDate = new Date();
                            startDate.setDate(startDate.getDate() - 7);
                            
                            Object.entries(analytics.dailyStats).forEach(([date, stats]) => {
                              const dateObj = new Date(date);
                              if (dateObj >= startDate && dateObj <= endDate) {
                                total += stats.loginCount || 0;
                                days++;
                              }
                            });
                            return days > 0 ? Math.round(total / days) : 0;
                          })()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <AdminClientLayout>
      <AnalyticsContent />
    </AdminClientLayout>
  );
} 