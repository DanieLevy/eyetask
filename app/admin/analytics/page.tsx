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
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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

export default function AnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'1d' | '7d' | '30d'>('7d');
  
  // Font configurations
  const hebrewHeading = useHebrewFont('heading');
  const mixedBody = useMixedFont('body');

  // Check permission
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
        return <LogIn className="h-3.5 w-3.5" />;
      case 'project':
        return <Target className="h-3.5 w-3.5" />;
      case 'task':
        return <Activity className="h-3.5 w-3.5" />;
      case 'user':
        return <User className="h-3.5 w-3.5" />;
      case 'view':
        return <Eye className="h-3.5 w-3.5" />;
      default:
        return <Edit className="h-3.5 w-3.5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'auth':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'project':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'task':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'user':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-4 md:p-6 space-y-4">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <AdminClientLayout>
      <div className="min-h-screen bg-background">
        {/* Mobile-Optimized Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container mx-auto px-4">
            <div className="flex h-16 items-center justify-between">
              {/* Left Section */}
              <div className="flex items-center gap-2 md:gap-4">
                <Link href="/admin/dashboard" className="md:hidden">
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/admin/dashboard" className="hidden md:inline-flex">
                  <Button variant="ghost" size="sm">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    חזרה
                  </Button>
                </Link>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary hidden sm:block" />
                  <div>
                    <h1 className="text-base md:text-lg font-bold">אנליטיקה</h1>
                    <p className="text-xs text-muted-foreground hidden md:block">ניתוח נתוני המערכת</p>
                  </div>
                </div>
              </div>

              {/* Right Section - Mobile Optimized */}
              <div className="flex items-center gap-2">
                {/* Desktop Controls */}
                <div className="hidden md:flex items-center gap-2">
                  <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                    <SelectTrigger className="w-32 h-9">
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
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                {/* Mobile Controls */}
                <Sheet>
                  <SheetTrigger asChild className="md:hidden">
                    <Button variant="outline" size="icon" className="h-9 w-9">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-64">
                    <div className="space-y-4 mt-6">
                      <div>
                        <label className="text-sm font-medium mb-2 block">תקופת זמן</label>
                        <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1d">היום</SelectItem>
                            <SelectItem value="7d">7 ימים</SelectItem>
                            <SelectItem value="30d">30 ימים</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={fetchAnalytics}
                        disabled={refreshing}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        רענן נתונים
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-4 md:py-6">
          {analytics && (
            <div className="space-y-4 md:space-y-6">
              {/* Today's Visits - Big Featured Card */}
              <Card className="mb-4 p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500 text-white rounded-lg">
                      <Activity className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">ביקורים היום</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {new Date().toLocaleDateString('he-IL')}
                      </p>
                    </div>
                  </div>
                  <Badge variant="default" className="bg-blue-500 text-white">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    חי
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4">
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                      {formatNumber(analytics.dailyStats[new Date().toISOString().split('T')[0]]?.visits || 0)}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">סה"כ ביקורים</p>
                  </div>
                  <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4">
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                      {formatNumber(analytics.dailyStats[new Date().toISOString().split('T')[0]]?.uniqueVisitors?.length || 0)}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">משתמשים ייחודיים</p>
                  </div>
                </div>
                
                {/* Visit Stats by Period */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-white/30 dark:bg-black/10 rounded">
                    <p className="text-xs text-blue-700 dark:text-blue-300">היום</p>
                    <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                      {formatNumber(analytics.dailyStats[new Date().toISOString().split('T')[0]]?.visits || 0)}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-white/30 dark:bg-black/10 rounded">
                    <p className="text-xs text-blue-700 dark:text-blue-300">7 ימים</p>
                    <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                      {formatNumber((() => {
                        let count = 0;
                        const endDate = new Date();
                        const startDate = new Date();
                        startDate.setDate(startDate.getDate() - 7);
                        
                        Object.entries(analytics.dailyStats).forEach(([date, stats]) => {
                          const dateObj = new Date(date);
                          if (dateObj >= startDate && dateObj <= endDate) {
                            count += stats.visits || 0;
                          }
                        });
                        return count;
                      })())}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-white/30 dark:bg-black/10 rounded">
                    <p className="text-xs text-blue-700 dark:text-blue-300">30 יום</p>
                    <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                      {formatNumber((() => {
                        let count = 0;
                        const endDate = new Date();
                        const startDate = new Date();
                        startDate.setDate(startDate.getDate() - 30);
                        
                        Object.entries(analytics.dailyStats).forEach(([date, stats]) => {
                          const dateObj = new Date(date);
                          if (dateObj >= startDate && dateObj <= endDate) {
                            count += stats.visits || 0;
                          }
                        });
                        return count;
                      })())}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Compact Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Period Visits */}
                <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-between mb-2">
                    <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs text-purple-700 dark:text-purple-300">
                      {timeRange === '1d' ? 'היום' : timeRange === '7d' ? '7 ימים' : '30 יום'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{formatNumber(analytics.visits)}</p>
                    <p className="text-xs text-purple-700 dark:text-purple-300">ביקורים</p>
                  </div>
                </Card>

                {/* Unique Visitors */}
                <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <Badge variant="secondary" className="text-xs bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200">
                      {analytics.activeSessions} פעילים
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">{formatNumber(analytics.uniqueVisitors)}</p>
                    <p className="text-xs text-green-700 dark:text-green-300">משתמשים ייחודיים</p>
                  </div>
                </Card>

                {/* Projects */}
                <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
                  <div className="flex items-center justify-between mb-2">
                    <Layers className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{formatNumber(analytics.counters?.projects || 0)}</p>
                    <p className="text-xs text-orange-700 dark:text-orange-300">פרויקטים</p>
                  </div>
                </Card>

                {/* Tasks */}
                <Card className="p-4 bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950 dark:to-cyan-900 border-cyan-200 dark:border-cyan-800">
                  <div className="flex items-center justify-between mb-2">
                    <CheckSquare className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-cyan-900 dark:text-cyan-100">{formatNumber(analytics.counters?.tasks || 0)}</p>
                    <p className="text-xs text-cyan-700 dark:text-cyan-300">משימות</p>
                  </div>
                </Card>

                {/* Subtasks */}
                <Card className="p-4 bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950 dark:to-pink-900 border-pink-200 dark:border-pink-800">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-pink-900 dark:text-pink-100">{formatNumber(analytics.counters?.subtasks || 0)}</p>
                    <p className="text-xs text-pink-700 dark:text-pink-300">תת-משימות</p>
                  </div>
                </Card>

                {/* Users */}
                <Card className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900 border-indigo-200 dark:border-indigo-800">
                  <div className="flex items-center justify-between mb-2">
                    <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{formatNumber(analytics.counters?.users || 0)}</p>
                    <p className="text-xs text-indigo-700 dark:text-indigo-300">משתמשים</p>
                  </div>
                </Card>

                {/* Active Users */}
                <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center justify-between mb-2">
                    <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{formatNumber(analytics.counters?.activeUsers || 0)}</p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">משתמשים פעילים</p>
                  </div>
                </Card>

                {/* Total Actions */}
                <Card className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center justify-between mb-2">
                    <Activity className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                      {formatNumber(analytics.recentActivities?.length || 0)}
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">פעולות אחרונות</p>
                  </div>
                </Card>
              </div>

              {/* Main Content Tabs */}
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                  <TabsTrigger value="overview">סקירה</TabsTrigger>
                  <TabsTrigger value="activities">פעילות</TabsTrigger>
                  <TabsTrigger value="users">משתמשים</TabsTrigger>
                  <TabsTrigger value="daily">יומי</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
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
                                <div key={category} className="flex items-center gap-3">
                                  <div className={`p-1.5 rounded ${getCategoryColor(category)}`}>
                                    {getCategoryIcon(category)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="font-medium capitalize">{category}</span>
                                      <span className="text-muted-foreground">{count}</span>
                                    </div>
                                    <div className="mt-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-primary transition-all"
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Top Users */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">משתמשים מובילים</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {analytics.topUsers && analytics.topUsers.slice(0, 5).map((user, index) => (
                            <div
                              key={user.userId}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="font-medium">{user.username}</p>
                                  <p className="text-sm text-muted-foreground">{user.role}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-lg">{formatNumber(user.actionCount)}</p>
                                <p className="text-xs text-muted-foreground">פעולות</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Activities Tab */}
                <TabsContent value="activities" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">פעילות אחרונה</CardTitle>
                      <CardDescription>20 הפעולות האחרונות במערכת</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {analytics.recentActivities && analytics.recentActivities.slice(0, 20).map((activity) => (
                          <div
                            key={activity._id}
                            className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className={`p-1.5 rounded ${getCategoryColor(activity.category)} flex-shrink-0`}>
                              {getCategoryIcon(activity.category)}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <p className="text-sm">{activity.action}</p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {activity.username}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDateTime(activity.timestamp)}
                                </span>
                                {activity.target && (
                                  <span className="truncate max-w-[200px]">
                                    {activity.target.type}: {activity.target.name || activity.target.id}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge 
                              variant={activity.severity === 'success' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {activity.severity}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Users Tab */}
                <TabsContent value="users" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">רשימת משתמשים פעילים</CardTitle>
                      <CardDescription>דירוג לפי מספר פעולות</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.topUsers && analytics.topUsers.map((user, index) => (
                          <div
                            key={user.userId}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium">{user.username}</p>
                                <p className="text-sm text-muted-foreground">{user.role}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">{formatNumber(user.actionCount)}</p>
                              <p className="text-xs text-muted-foreground">פעולות</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Daily Stats Tab */}
                <TabsContent value="daily" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">סטטיסטיקה יומית</CardTitle>
                      <CardDescription>נתונים מצטברים לפי יום</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Daily Visits Chart */}
                      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                        <h3 className="text-sm font-medium mb-4">ביקורים יומיים</h3>
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
                              
                              return (
                                <div key={date} className="flex items-center gap-3">
                                  <div className="w-20 text-xs text-muted-foreground text-left">
                                    {new Date(date).toLocaleDateString('he-IL', { 
                                      month: 'numeric', 
                                      day: 'numeric' 
                                    })}
                                  </div>
                                  <div className="flex-1">
                                    <div className="relative h-6 bg-secondary rounded-full overflow-hidden">
                                      <div
                                        className="absolute inset-y-0 left-0 bg-primary transition-all duration-500"
                                        style={{ width: `${percentage}%` }}
                                      />
                                      <span className="absolute inset-0 flex items-center px-2 text-xs font-medium">
                                        {stats.visits || 0}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      {/* Daily Stats List */}
                      <div className="space-y-3">
                        {analytics.dailyStats && Object.entries(analytics.dailyStats)
                          .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
                          .slice(0, 10)
                          .map(([date, stats]) => (
                            <div
                              key={date}
                              className="p-3 rounded-lg bg-muted/50 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium text-sm">
                                    {new Date(date).toLocaleDateString('he-IL')}
                                  </span>
                                </div>
                                {date === new Date().toISOString().split('T')[0] && (
                                  <Badge variant="default" className="text-xs">היום</Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                                <div>
                                  <p className="text-lg font-bold">{stats?.visits || 0}</p>
                                  <p className="text-xs text-muted-foreground">ביקורים</p>
                                </div>
                                <div>
                                  <p className="text-lg font-bold">
                                    {Array.isArray(stats?.uniqueVisitors) ? stats.uniqueVisitors.length : 0}
                                  </p>
                                  <p className="text-xs text-muted-foreground">ייחודיים</p>
                                </div>
                                <div>
                                  <p className="text-lg font-bold">{stats?.actions || 0}</p>
                                  <p className="text-xs text-muted-foreground">פעולות</p>
                                </div>
                                <div>
                                  <p className="text-lg font-bold">{stats?.loginCount || 0}</p>
                                  <p className="text-xs text-muted-foreground">התחברויות</p>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </main>
      </div>
    </AdminClientLayout>
  );
} 