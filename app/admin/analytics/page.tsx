'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowRight, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Target, 
  Activity,
  Calendar,
  Clock,
  Eye,
  MessageSquare,
  Zap,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Filter,
  Search,
  ChevronRight
} from 'lucide-react';

// Temporary inline hooks to bypass import issue
const useHebrewFont = (element: string = 'body') => ({ fontClass: 'font-hebrew text-right', direction: 'rtl' as const });
const useMixedFont = (element: string = 'body') => ({ fontClass: 'font-mixed', direction: 'ltr' as const });
const usePageRefresh = (callback: () => void) => { useEffect(() => { callback(); }, [callback]); };

interface AnalyticsData {
  // Overview Stats
  totalTasks: number;
  visibleTasks: number;
  hiddenTasks: number;
  totalSubtasks: number;
  totalProjects: number;
  totalVisits: number;
  uniqueVisitors: number;
  
  // Performance Metrics
  tasksByPriority: {
    high: number;
    medium: number;
    low: number;
    none: number;
  };
  
  tasksByType: {
    events: number;
    hours: number;
  };
  
  tasksByProject: Array<{
    projectName: string;
    taskCount: number;
    subtaskCount: number;
    highPriorityCount: number;
  }>;
  
  // Time-based Analytics
  recentActivity: Array<{
    date: string;
    visits: number;
    tasksCreated: number;
    subtasksCreated: number;
  }>;
  
  // User Engagement
  mostViewedTasks: Array<{
    taskId: string;
    taskTitle: string;
    projectName: string;
    views: number;
  }>;
  
  // Performance Indicators
  completionRate: number;
  averageTasksPerProject: number;
  averageSubtasksPerTask: number;
  
  // Productivity Metrics
  tasksCreatedThisWeek: number;
  tasksCreatedLastWeek: number;
  visitsThisWeek: number;
  visitsLastWeek: number;
  
  // System Health
  systemHealth: {
    score: number;
    uptime: number;
    responseTime: number;
    errorRate: number;
  };

  // Activity Stats
  activityStats?: {
    totalActions: number;
    actionsByCategory: Record<string, number>;
    actionsByType: Record<string, number>;
    topUsers: Array<{
      userId: string;
      username?: string;
      actionCount: number;
    }>;
  };

  // Last Actions - Real activity log
  lastActions?: Array<{
    id: string;
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
    severity: 'info' | 'warning' | 'error' | 'success';
    metadata?: Record<string, any>;
  }>;
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [refreshing, setRefreshing] = useState(false);
  
  const router = useRouter();
  
  // Font configurations
  const hebrewHeading = useHebrewFont('heading');
  const mixedBody = useMixedFont('body');

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('adminToken');
      const timestamp = Date.now();
      
      const response = await fetch(`/api/analytics?range=${timeRange}&_t=${timestamp}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setAnalyticsData(result.analytics);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  }, [timeRange]);

  // Register this page's refresh function
  usePageRefresh(fetchAnalyticsData);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('adminToken');
    const userData = localStorage.getItem('adminUser');
    
    if (!token || !userData || userData === 'undefined' || userData === 'null') {
      router.push('/admin');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (!parsedUser || !parsedUser.id || !parsedUser.username) {
        throw new Error('Invalid user data structure');
      }
      setUser(parsedUser);
    } catch (error) {
      router.push('/admin');
      return;
    }

    fetchAnalyticsData();
  }, [router, fetchAnalyticsData]);

  const getGrowthPercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getHealthBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-50 border-green-200';
    if (score >= 70) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">טוען נתוני אנליטיקה...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/dashboard"
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                aria-label="חזור ללוח הבקרה"
              >
                <ArrowRight className="h-5 w-5" />
              </Link>
              <div className="flex items-center gap-3">
                <BarChart3 className="h-6 w-6 text-primary" />
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>פאנל ניהול משימות</span>
                    <ChevronRight className="h-4 w-4" />
                    <span>אנליטיקה מתקדמת</span>
                  </div>
                  <h1 className={`text-lg font-bold text-foreground ${hebrewHeading.fontClass}`}>
                    דאשבורד אנליטיקה
                  </h1>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Time Range Selector */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="px-2 py-1.5 sm:px-3 sm:py-2 border border-border rounded-md sm:rounded-lg bg-background text-foreground text-xs sm:text-sm"
              >
                <option value="7d">7 ימים</option>
                <option value="30d">30 ימים</option>
                <option value="90d">90 ימים</option>
              </select>
              
              <button
                onClick={fetchAnalyticsData}
                disabled={refreshing}
                className="p-1.5 sm:p-2 rounded-md sm:rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
                title="רענן נתונים"
              >
                <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {analyticsData ? (
          <div className="space-y-8">
            {/* Key Performance Indicators */}
            <section>
              <h2 className={`text-2xl font-bold text-foreground mb-6 ${hebrewHeading.fontClass}`}>
                מדדי ביצועים עיקריים
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Tasks */}
                <div className="bg-card rounded-lg border border-border/40 p-6 shadow-md shadow-black/5 dark:shadow-black/20 hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-black/30 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <Target className="h-8 w-8 text-primary" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground">{analyticsData.totalTasks}</p>
                      <p className="text-sm text-muted-foreground">סה״כ משימות</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-600">{analyticsData.visibleTasks} גלויות</span>
                    <span className="text-muted-foreground">{analyticsData.hiddenTasks} מוסתרות</span>
                  </div>
                </div>

                {/* Projects */}
                <div className="bg-card rounded-lg border border-border/40 p-6 shadow-md shadow-black/5 dark:shadow-black/20 hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-black/30 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="h-8 w-8 text-blue-500" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground">{analyticsData.totalProjects}</p>
                      <p className="text-sm text-muted-foreground">פרויקטים פעילים</p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ממוצע {analyticsData.averageTasksPerProject.toFixed(1)} משימות לפרויקט
                  </div>
                </div>

                {/* Visits */}
                <div className="bg-card rounded-lg border border-border/40 p-6 shadow-md shadow-black/5 dark:shadow-black/20 hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-black/30 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <Activity className="h-8 w-8 text-green-500" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground">{analyticsData.totalVisits}</p>
                      <p className="text-sm text-muted-foreground">ביקורים</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {analyticsData.visitsThisWeek > analyticsData.visitsLastWeek ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`${analyticsData.visitsThisWeek > analyticsData.visitsLastWeek ? 'text-green-500' : 'text-red-500'}`}>
                      {getGrowthPercentage(analyticsData.visitsThisWeek, analyticsData.visitsLastWeek)}%
                    </span>
                    <span className="text-muted-foreground">מהשבוע הקודם</span>
                  </div>
                </div>

                {/* System Health */}
                <div className={`rounded-lg border border-border/40 p-6 shadow-md shadow-black/5 dark:shadow-black/20 hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-black/30 transition-all duration-300 ${getHealthBgColor(analyticsData.systemHealth.score)}`}>
                  <div className="flex items-center justify-between mb-4">
                    <Zap className={`h-8 w-8 ${getHealthColor(analyticsData.systemHealth.score)}`} />
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${getHealthColor(analyticsData.systemHealth.score)}`}>
                        {analyticsData.systemHealth.score}%
                      </p>
                      <p className="text-sm text-muted-foreground">בריאות המערכת</p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    זמן תגובה: {analyticsData.systemHealth.responseTime}ms
                  </div>
                </div>
              </div>
            </section>

            {/* Task Distribution */}
            <section>
              <h2 className={`text-xl font-bold text-foreground mb-6 ${hebrewHeading.fontClass}`}>
                פיזור משימות
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By Priority */}
                <div className="bg-card rounded-lg border border-border p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">לפי עדיפות</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-red-500"></div>
                        <span>עדיפות גבוהה</span>
                      </div>
                      <span className="font-semibold">{analyticsData.tasksByPriority.high}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                        <span>עדיפות בינונית</span>
                      </div>
                      <span className="font-semibold">{analyticsData.tasksByPriority.medium}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-green-500"></div>
                        <span>עדיפות נמוכה</span>
                      </div>
                      <span className="font-semibold">{analyticsData.tasksByPriority.low}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-muted"></div>
                        <span>ללא עדיפות</span>
                      </div>
                      <span className="font-semibold">{analyticsData.tasksByPriority.none}</span>
                    </div>
                  </div>
                </div>

                {/* By Type */}
                <div className="bg-card rounded-lg border border-border p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">לפי סוג</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <span>אירועים (Events)</span>
                      </div>
                      <span className="font-semibold">{analyticsData.tasksByType.events}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-green-500" />
                        <span>שעות (Hours)</span>
                      </div>
                      <span className="font-semibold">{analyticsData.tasksByType.hours}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>סה״כ תת-משימות:</span>
                        <span className="font-semibold">{analyticsData.totalSubtasks}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>ממוצע תת-משימות למשימה:</span>
                        <span className="font-semibold">{analyticsData.averageSubtasksPerTask.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Project Performance */}
            <section>
              <h2 className={`text-xl font-bold text-foreground mb-6 ${hebrewHeading.fontClass}`}>
                ביצועי פרויקטים
              </h2>
              <div className="bg-card rounded-lg border border-border overflow-hidden">
                <div className="p-6">
                  <div className="space-y-4">
                    {analyticsData.tasksByProject.map((project, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{project.projectName}</h4>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>{project.taskCount} משימות</span>
                            <span>{project.subtaskCount} תת-משימות</span>
                            {project.highPriorityCount > 0 && (
                              <span className="text-red-500 font-medium">
                                {project.highPriorityCount} עדיפות גבוהה
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-foreground">
                            {project.taskCount > 0 ? Math.round((project.subtaskCount / project.taskCount) * 100) / 100 : 0}
                          </div>
                          <div className="text-xs text-muted-foreground">ממוצע תת-משימות</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Most Viewed Tasks */}
            <section>
              <h2 className={`text-xl font-bold text-foreground mb-6 ${hebrewHeading.fontClass}`}>
                משימות נצפות ביותר
              </h2>
              <div className="bg-card rounded-lg border border-border overflow-hidden">
                <div className="p-6">
                  <div className="space-y-3">
                    {analyticsData.mostViewedTasks.slice(0, 10).map((task, index) => (
                      <div key={task.taskId} className="flex items-center gap-4 p-3 hover:bg-muted/50 rounded-lg transition-colors">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">{task.taskTitle}</h4>
                          <p className="text-sm text-muted-foreground">{task.projectName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{task.views}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Recent Activity */}
            <section>
              <h2 className={`text-xl font-bold text-foreground mb-6 ${hebrewHeading.fontClass}`}>
                פעילות אחרונה
              </h2>
              <div className="bg-card rounded-lg border border-border p-6">
                <div className="space-y-4">
                  {analyticsData.recentActivity.slice(0, 7).map((day, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{new Date(day.date).toLocaleDateString('he-IL')}</span>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-green-500" />
                          <span>{day.visits} ביקורים</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-blue-500" />
                          <span>{day.tasksCreated} משימות חדשות</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-purple-500" />
                          <span>{day.subtasksCreated} תת-משימות חדשות</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Last Actions - Real Activity Log */}
            {analyticsData.lastActions && analyticsData.lastActions.length > 0 && (
              <section>
                <h2 className={`text-xl font-bold text-foreground mb-6 ${hebrewHeading.fontClass}`}>
                  פעולות אחרונות (רישום פעילות)
                </h2>
                <div className="bg-card rounded-lg border border-border overflow-hidden">
                  <div className="p-6">
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {analyticsData.lastActions.map((action, index) => {
                        const getSeverityIcon = (severity: string) => {
                          switch (severity) {
                            case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
                            case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
                            case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
                            default: return <Activity className="h-4 w-4 text-blue-500" />;
                          }
                        };

                        const getCategoryIcon = (category: string) => {
                          switch (category) {
                            case 'task': return <Target className="h-4 w-4 text-blue-500" />;
                            case 'subtask': return <CheckCircle className="h-4 w-4 text-purple-500" />;
                            case 'project': return <BarChart3 className="h-4 w-4 text-green-500" />;
                            case 'auth': return <Users className="h-4 w-4 text-indigo-500" />;
                            case 'system': return <Zap className="h-4 w-4 text-orange-500" />;
                            case 'daily_update': return <MessageSquare className="h-4 w-4 text-cyan-500" />;
                            default: return <Activity className="h-4 w-4 text-gray-500" />;
                          }
                        };

                        const formatDateTime = (timestamp: Date) => {
                          const date = new Date(timestamp);
                          const now = new Date();
                          const diffMs = now.getTime() - date.getTime();
                          const diffMins = Math.floor(diffMs / (1000 * 60));
                          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                          if (diffMins < 1) return 'עכשיו';
                          if (diffMins < 60) return `לפני ${diffMins} דקות`;
                          if (diffHours < 24) return `לפני ${diffHours} שעות`;
                          if (diffDays < 7) return `לפני ${diffDays} ימים`;
                          
                          return date.toLocaleDateString('he-IL', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                        };

                        return (
                          <div key={action.id} className="flex items-start gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors">
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {getSeverityIcon(action.severity)}
                              {getCategoryIcon(action.category)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className="font-medium text-foreground leading-5">
                                    {action.action}
                                  </p>
                                  {action.target && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {action.target.title}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatDateTime(action.timestamp)}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                                      action.userType === 'admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                                      action.userType === 'system' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                                      'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                    }`}>
                                      {action.userType === 'admin' ? 'מנהל' : action.userType === 'system' ? 'מערכת' : 'משתמש'}
                                    </span>
                                    {action.metadata?.device && (
                                      <span className="text-xs opacity-75">
                                        {action.metadata.device}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {analyticsData.activityStats && analyticsData.activityStats.totalActions > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="text-center">
                            <div className="font-semibold text-foreground">{analyticsData.activityStats.totalActions}</div>
                            <div className="text-muted-foreground">סה״כ פעולות</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-foreground">
                              {Object.keys(analyticsData.activityStats.actionsByCategory).length}
                            </div>
                            <div className="text-muted-foreground">קטגוריות</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-foreground">
                              {analyticsData.activityStats.topUsers.length}
                            </div>
                            <div className="text-muted-foreground">משתמשים פעילים</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-foreground">
                              {Math.round(analyticsData.activityStats.totalActions / Math.max(1, Object.keys(analyticsData.activityStats.actionsByCategory).length))}
                            </div>
                            <div className="text-muted-foreground">ממוצע פעולות</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Activity Stats Summary */}
            {analyticsData.activityStats && (
              <section>
                <h2 className={`text-xl font-bold text-foreground mb-6 ${hebrewHeading.fontClass}`}>
                  סיכום פעילות מערכת
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Actions by Category */}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">פעולות לפי קטגוריה</h3>
                    <div className="space-y-3">
                      {Object.entries(analyticsData.activityStats.actionsByCategory).map(([category, count]) => {
                        const categoryNames: Record<string, string> = {
                          task: 'משימות',
                          subtask: 'תת-משימות', 
                          project: 'פרויקטים',
                          auth: 'אימות',
                          system: 'מערכת',
                          daily_update: 'עדכונים יומיים',
                          user: 'משתמשים',
                          view: 'צפיות'
                        };
                        
                        return (
                          <div key={category} className="flex items-center justify-between">
                            <span>{categoryNames[category] || category}</span>
                            <span className="font-semibold">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top Active Users */}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">משתמשים פעילים</h3>
                    <div className="space-y-3">
                      {analyticsData.activityStats.topUsers.slice(0, 5).map((user, index) => (
                        <div key={user.userId} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <span>{user.username || `משתמש ${user.userId.slice(-6)}`}</span>
                          </div>
                          <span className="font-semibold">{user.actionCount} פעולות</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertTriangle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">שגיאה בטעינת נתוני אנליטיקה</h3>
            <p className="text-muted-foreground mb-4">לא ניתן לטעון את נתוני האנליטיקה כרגע</p>
            <button
              onClick={fetchAnalyticsData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              נסה שוב
            </button>
          </div>
        )}
      </main>
    </div>
  );
} 