'use client';

import { 
  Plus, 
  Eye, 
  FolderPlus, 
  BarChart3,
  CheckSquare,
  AlertCircle,
  Layers,
  Database,
  Server,
  MessageCircle,
  Upload,
  Users,
  Car,
  Bell
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import AdminClientLayout from '@/components/AdminClientLayout';
import { LoadingSpinner } from '@/components/LoadingSystem';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  useCanViewAnalytics,
  useCanViewFeedback,
  useCanManageCache,
  useCanManageUsers,
  useCanManageProjects,
  useCanManageTasks,
  useCanManagePushNotifications
} from '@/hooks/usePermission';

// Temporary inline hooks to bypass import issue
const _useHebrewFont = (_element: string = 'body') => ({ fontClass: 'font-hebrew text-right', direction: 'rtl' as const });
const useTasksRealtime = (callback: () => void) => { useEffect(() => { const interval = setInterval(callback, 30000); return () => clearInterval(interval); }, [callback]); };
const useProjectsRealtime = (callback: () => void) => { useEffect(() => { const interval = setInterval(callback, 30000); return () => clearInterval(interval); }, [callback]); };
const usePageRefresh = (callback: () => void) => { useEffect(() => { callback(); }, [callback]); };

interface Project {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  taskCount?: number;
  highPriorityCount?: number;
}

interface Task {
  _id: string;
  title: string;
  projectId: string;
  priority: number;
  isVisible: boolean;
  amountNeeded: number;
}

interface CacheStatus {
  currentVersion: number;
  lastInvalidation: string | null;
  forceUpdate: boolean;
  timestamp: string;
}

export default function AdminDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [_user, _setUser] = useState<null>(null);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'data_manager' | 'driver_manager' | null>(null);
  const [username, setUsername] = useState<string>('');
  const [authChecked, setAuthChecked] = useState(false);

  // Get permissions
  const canViewAnalytics = useCanViewAnalytics();
  const canViewFeedback = useCanViewFeedback();
  const canManageCache = useCanManageCache();
  const canManageUsers = useCanManageUsers();
  const canManageProjects = useCanManageProjects();
  const canManageTasks = useCanManageTasks();
  const canManagePushNotifications = useCanManagePushNotifications();
  
  const [showCachePanel, setShowCachePanel] = useState(false);
  const router = useRouter();

  const fetchCacheStatus = useCallback(async () => {
    // Only fetch cache status if user is actually an admin
    if (!canManageCache && userRole !== 'admin') {
      return;
    }
    
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return;

      const response = await fetch('/api/admin/cache?action=status', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCacheStatus(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch cache status:', error);
    }
  }, [canManageCache, userRole]);

  // Clear cache function
  const clearCache = async (type: 'soft' | 'full', reason?: string) => {
    setCacheLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/admin');
        return;
      }

      const response = await fetch('/api/admin/cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          action: type === 'soft' ? 'clear' : 'flush',
          reason 
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Unauthorized, redirect to login
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
          localStorage.removeItem('userPermissions');
          router.push('/admin');
          return;
        }
        throw new Error('Failed to clear cache');
      }

      const data = await response.json();
      if (data.success) {
        toast.success(`מטמון ${type === 'soft' ? 'עודכן' : 'נוקה'} בהצלחה`);
        fetchCacheStatus();
      } else {
        toast.error(data.error || 'שגיאה בניקוי המטמון');
      }
    } catch (error) {
      console.error('Cache clear error:', error);
      toast.error('שגיאה בניקוי המטמון');
    } finally {
      setCacheLoading(false);
    }
  };

  const refreshData = useCallback(async () => {
    try {
      // Refresh data without state tracking
      const token = localStorage.getItem('adminToken');
      const timestamp = Date.now();
      
      const [projectsRes, tasksRes] = await Promise.all([
        fetch(`/api/projects?_t=${timestamp}`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }).then(res => res.json()),
        fetch(`/api/tasks?_t=${timestamp}`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }).then(res => res.json())
      ]);

      if (projectsRes.success) setProjects(projectsRes.projects);
      if (tasksRes.success) setTasks(tasksRes.tasks);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    } finally {
      // Refresh complete
    }
  }, []);

  // Set up realtime subscriptions
  useTasksRealtime(refreshData);
  useProjectsRealtime(refreshData);

  // Check user role on mount
  useEffect(() => {
    const userData = localStorage.getItem('adminUser');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUserRole(user.role || 'admin');
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);
  
  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      await refreshData();
      // Only fetch cache status if userRole has been determined
      if (userRole !== null) {
        // Only fetch cache status if user has cache management permission
        if (canManageCache || userRole === 'admin') {
          await fetchCacheStatus();
        }
      }
    };
    
    // Only load data if userRole has been determined
    if (userRole !== null) {
      loadData();
    }
  }, [refreshData, fetchCacheStatus, userRole, canManageCache]);

  // Register this page's refresh function
  usePageRefresh(refreshData);

  // Update the checkAuth function to use permissions
  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminToken');
      
      if (!token) {
        // Clear any stale user data
        localStorage.removeItem('adminUser');
        localStorage.removeItem('userPermissions');
        router.push('/admin');
        return;
      }

      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        // Clear invalid token and user data
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        localStorage.removeItem('userPermissions');
        router.push('/admin');
        return;
      }

      const data = await response.json();
      if (data.success && data.user) {
        setUserRole(data.user.role || 'admin');
        setUsername(data.user.username || '');
        setAuthChecked(true);
        
        // Check if user has access to cache management for loading cache status
        if (data.user.role === 'admin' || (data.permissions && data.permissions['access.cache_management'])) {
          fetchCacheStatus();
        }
      } else {
        // Invalid response, redirect to login
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        localStorage.removeItem('userPermissions');
        router.push('/admin');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      // Clear data and redirect on error
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('userPermissions');
      router.push('/admin');
    }
  }, [router, fetchCacheStatus]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Early return if auth hasn't been checked yet
  if (!authChecked) {
    return (
      <AdminClientLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </AdminClientLayout>
    );
  }

  // Calculate comprehensive statistics
  const stats = {
    totalProjects: projects.length,
    totalTasks: tasks.length,
    activeTasks: tasks.filter(task => task.isVisible).length,
    completedTasks: tasks.filter(task => !task.isVisible).length,
    highPriorityTasks: tasks.filter(task => task.priority >= 1 && task.priority <= 3).length,
    mediumPriorityTasks: tasks.filter(task => task.priority >= 4 && task.priority <= 6).length,
    lowPriorityTasks: tasks.filter(task => task.priority >= 7 && task.priority <= 10).length,
    totalAmount: tasks.reduce((sum, task) => sum + (task.amountNeeded || 0), 0)
  };

  const getTaskCountForProject = (projectId: string) => {
    const project = projects.find(p => p._id === projectId);
    if (project && project.taskCount !== undefined) {
      return project.taskCount;
    }
    return tasks.filter(task => task.projectId === projectId).length;
  };

  const getActiveTasksForProject = (projectId: string) => {
    return getTaskCountForProject(projectId);
  };

  const getHighPriorityTasksForProject = (projectId: string) => {
    const project = projects.find(p => p._id === projectId);
    if (project && project.highPriorityCount !== undefined) {
      return project.highPriorityCount;
    }
    return tasks.filter(task => 
      task.projectId === projectId && 
      task.priority >= 1 && 
      task.priority <= 3
    ).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-muted-foreground text-sm">טוען נתוני לוח הבקרה...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminClientLayout>
      <div className="min-h-screen bg-background">
        <div className="p-3 md:p-6 space-y-4 md:space-y-6">
          {/* Statistics Cards */}
          {userRole !== 'driver_manager' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {/* Total Projects */}
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-muted-foreground">
                      פרויקטים
                    </p>
                    <p className="text-lg md:text-2xl font-bold mt-1">
                      {stats.totalProjects}
                    </p>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FolderPlus className="h-4 md:h-5 w-4 md:w-5 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              {/* Active Tasks */}
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-muted-foreground">
                      משימות פעילות
                    </p>
                    <p className="text-lg md:text-2xl font-bold mt-1">
                      {stats.activeTasks}
                    </p>
                  </div>
                  <div className="p-2 bg-green-50 rounded-lg">
                    <CheckSquare className="h-4 md:h-5 w-4 md:w-5 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              {/* High Priority */}
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-muted-foreground">
                      עדיפות גבוהה
                    </p>
                    <p className="text-lg md:text-2xl font-bold mt-1">
                      {stats.highPriorityTasks}
                    </p>
                  </div>
                  <div className="p-2 bg-red-50 rounded-lg">
                    <AlertCircle className="h-4 md:h-5 w-4 md:w-5 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              {/* Cache Status - Admin Only */}
              {cacheStatus && canManageCache && (
                <Card className="border-yellow-200 bg-yellow-50 shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-amber-500/10" />
                  <CardHeader className="relative">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Database className="h-5 w-5 text-yellow-600" />
                        סטטוס מטמון
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCachePanel(!showCachePanel)}
                        className="text-yellow-700 hover:bg-yellow-100"
                      >
                        {showCachePanel ? 'הסתר' : 'הצג פרטים'}
                      </Button>
                    </div>
                  </CardHeader>
                  {showCachePanel && (
                    <CardContent className="relative">
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm md:text-lg font-bold mt-1">
                            {cacheStatus ? (
                              <Badge variant="outline" className="bg-green-50 text-green-600 hover:bg-green-50">פעיל</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-600 hover:bg-yellow-50">טוען...</Badge>
                            )}
                          </p>
                          {cacheStatus && (
                            <p className="text-xs text-muted-foreground">
                              גרסה: {cacheStatus.currentVersion}
                            </p>
                          )}
                        </div>
                        <div className="p-2 bg-purple-50 rounded-lg">
                          <Database className="h-4 md:h-5 w-4 md:w-5 text-purple-600" />
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}
            </div>
          ) : (
            // Driver Manager View - Show welcome message with actual permissions
            <Card>
              <CardContent className="p-6 text-center">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-full inline-flex mb-4">
                  <Car className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">ברוך הבא, {username || 'משתמש'}</h3>
                <p className="text-muted-foreground mb-4">
                  ההרשאות שלך:
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {canViewAnalytics && (
                    <Badge variant="secondary">אנליטיקה</Badge>
                  )}
                  {canViewFeedback && (
                    <Badge variant="secondary">משוב</Badge>
                  )}
                  {canManageProjects && (
                    <Badge variant="secondary">פרויקטים</Badge>
                  )}
                  {canManageTasks && (
                    <Badge variant="secondary">משימות</Badge>
                  )}
                  {canManageUsers && (
                    <Badge variant="secondary">משתמשים</Badge>
                  )}
                  {canManageCache && (
                    <Badge variant="secondary">מטמון</Badge>
                  )}
                  {canManagePushNotifications && (
                    <Badge variant="secondary">התראות</Badge>
                  )}
                  {/* Always show daily updates for driver managers */}
                  <Badge variant="secondary">עדכונים יומיים</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>פעולות מהירות</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Project Management - Check permission */}
                {canManageProjects && (
                  <div 
                    className="block cursor-pointer"
                    onClick={() => router.push('/admin/projects')}
                  >
                    <div className="group p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all border border-blue-200 active:scale-95">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 rounded-lg flex-shrink-0">
                          <Layers className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-blue-900 text-sm">
                            ניהול פרויקטים
                          </h3>
                          <p className="text-xs text-blue-700 truncate">
                            עריכה, הוספה ומחיקה
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* New Task - Check permission */}
                {canManageTasks && (
                  <div 
                    className="block cursor-pointer"
                    onClick={() => router.push('/admin/tasks/new')}
                  >
                    <div className="group p-4 rounded-lg bg-green-50 hover:bg-green-100 transition-all border border-green-200 active:scale-95">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500 rounded-lg flex-shrink-0">
                          <Plus className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-green-900 text-sm">
                            משימה חדשה
                          </h3>
                          <p className="text-xs text-green-700 truncate">
                            הוסף משימה לפרויקט
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              
                {/* Bulk Import - Check permission */}
                {canManageTasks && (
                  <div 
                    className="block cursor-pointer"
                    onClick={() => router.push('/admin/tasks/bulk-import')}
                  >
                    <div className="group p-4 rounded-lg bg-amber-50 hover:bg-amber-100 transition-all border border-amber-200 active:scale-95">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500 rounded-lg flex-shrink-0">
                          <Upload className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-amber-900 text-sm">
                            ייבוא המוני
                          </h3>
                          <p className="text-xs text-amber-700 truncate">
                            ייבא תת-משימות מ-JIRA
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Analytics - Check permission */}
                {canViewAnalytics && (
                  <div 
                    className="block cursor-pointer"
                    onClick={() => router.push('/admin/analytics')}
                  >
                    <div className="group p-4 rounded-lg bg-purple-50 hover:bg-purple-100 transition-all border border-purple-200 active:scale-95">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500 rounded-lg flex-shrink-0">
                          <BarChart3 className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-purple-900 text-sm">
                            אנליטיקס
                          </h3>
                          <p className="text-xs text-purple-700 truncate">
                            דוחות ונתונים
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Feedback Management - Check permission */}
                {canViewFeedback && (
                  <div 
                    className="block cursor-pointer"
                    onClick={() => router.push('/admin/feedback')}
                  >
                    <div className="group p-4 rounded-lg bg-orange-50 hover:bg-orange-100 transition-all border border-orange-200 active:scale-95">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500 rounded-lg flex-shrink-0">
                          <MessageCircle className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-orange-900 text-sm">
                            ניהול פניות
                          </h3>
                          <p className="text-xs text-orange-700 truncate">
                            תמיכה ודיווחים
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Daily Updates */}
                <div 
                  className="block cursor-pointer"
                  onClick={() => router.push('/admin/daily-updates')}
                >
                  <div className="group p-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-all border border-indigo-200 active:scale-95">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500 rounded-lg flex-shrink-0">
                        <Eye className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-indigo-900 text-sm">
                          עדכונים יומיים
                        </h3>
                        <p className="text-xs text-indigo-700 truncate">
                          הודעות ועדכונים
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cache Management - Check permission */}
                {canManageCache && (
                  <div 
                    className="block cursor-pointer"
                    onClick={() => router.push('/admin/cache')}
                  >
                    <div className="group p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all border border-gray-200 active:scale-95">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-500 rounded-lg flex-shrink-0">
                          <Server className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm">
                            ניהול מטמון
                          </h3>
                          <p className="text-xs text-gray-700 truncate">
                            ביצועים ומטמון
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* User Management - Check permission */}
                {canManageUsers && (
                  <div 
                    className="block cursor-pointer"
                    onClick={() => router.push('/admin/users')}
                  >
                    <div className="group p-4 rounded-lg bg-rose-50 hover:bg-rose-100 transition-all border border-rose-200 active:scale-95">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-500 rounded-lg flex-shrink-0">
                          <Users className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-rose-900 text-sm">
                            ניהול משתמשים
                          </h3>
                          <p className="text-xs text-rose-700 truncate">
                            הוספה ועריכת משתמשים
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Push Notifications - Check permission */}
                {canManagePushNotifications && (
                  <div 
                    className="block cursor-pointer"
                    onClick={() => router.push('/admin/push-notifications')}
                  >
                    <div className="group p-4 rounded-lg bg-pink-50 hover:bg-pink-100 transition-all border border-pink-200 active:scale-95">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-500 rounded-lg">
                          <Bell className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-pink-900 text-sm">
                            התראות Push
                          </h3>
                          <p className="text-xs text-pink-700 truncate">
                            ניהול התראות
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}


              </div>
            </CardContent>
          </Card>

          {/* Recent Items and System Status */}
          <div className="space-y-4">

            {/* Recent Projects - Improved UI - Check permission */}
            {canManageProjects && (
              <Card className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">פרויקטים אחרונים</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">ניהול מהיר של הפרויקטים הפעילים</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.location.href = '/admin/projects'}
                    className="hidden sm:flex"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    הצג הכל
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pb-0">
                {projects.length === 0 ? (
                  <div className="text-center py-8 pb-6">
                    <FolderPlus className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">אין פרויקטים עדיין</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.location.href = '/admin/projects/new'}
                      className="mt-3"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      צור פרויקט ראשון
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 pb-4">
                      {projects.slice(0, 3).map((project) => {
                        const taskCount = getTaskCountForProject(project._id);
                        const activeCount = getActiveTasksForProject(project._id);
                        const highPriorityCount = getHighPriorityTasksForProject(project._id);
                        const completionRate = taskCount > 0 ? Math.round(((taskCount - activeCount) / taskCount) * 100) : 0;
                        
                        return (
                          <a 
                            key={project._id} 
                            href={`/admin/projects/${project._id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              window.location.href = `/admin/projects/${project._id}`;
                            }}
                            className="block group"
                          >
                            <div className="p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-100 dark:border-blue-900/50 hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:shadow-md">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-semibold text-foreground text-base truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {project.name}
                                  </h4>
                                  {project.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                      {project.description}
                                    </p>
                                  )}
                                  
                                  <div className="flex flex-wrap items-center gap-4 mt-3">
                                    <div className="flex items-center gap-1.5">
                                      <Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                      <span className="text-sm font-medium">{taskCount} משימות</span>
                                    </div>
                                    
                                    {activeCount > 0 && (
                                      <div className="flex items-center gap-1.5">
                                        <CheckSquare className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                        <span className="text-sm text-green-600 dark:text-green-400">{activeCount} פעילות</span>
                                      </div>
                                    )}
                                    
                                    {highPriorityCount > 0 && (
                                      <div className="flex items-center gap-1.5">
                                        <AlertCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                        <span className="text-sm text-red-600 dark:text-red-400">{highPriorityCount} דחופות</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Progress bar */}
                                  {taskCount > 0 && (
                                    <div className="mt-3">
                                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                        <span>התקדמות</span>
                                        <span>{completionRate}%</span>
                                      </div>
                                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
                                          style={{ width: `${completionRate}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex-shrink-0">
                                  <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm group-hover:shadow-md transition-all">
                                    <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                    
                    {/* Mobile show all button */}
                    <div className="border-t pt-3 pb-3 sm:hidden">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.location.href = '/admin/projects'}
                        className="w-full"
                      >
                        הצג את כל הפרויקטים
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            )}

            {/* System Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>מצב המערכת</CardTitle>
              </CardHeader>
              <CardContent>
                {canManageTasks ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-lg font-bold text-green-600">{stats.totalTasks}</div>
                      <div className="text-xs text-green-700">סה&quot;כ משימות</div>
                    </div>
                    
                    <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-lg font-bold text-blue-600">{stats.activeTasks}</div>
                      <div className="text-xs text-blue-700">משימות פעילות</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <p className="text-muted-foreground">לניהול עדכונים יומיים, עבור לדף העדכונים</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.location.href = '/admin/daily-updates'}
                      className="mt-3"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      עדכונים יומיים
                    </Button>
                  </div>
                )}

                {cacheStatus && canManageCache && (
                  <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-purple-900">מצב מטמון</div>
                        <div className="text-xs text-purple-700">גרסה {cacheStatus.currentVersion}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => clearCache('soft')}
                          disabled={cacheLoading}
                          className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 hover:text-purple-800 border-purple-200"
                        >
                          עדכון
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => clearCache('full')}
                          disabled={cacheLoading}
                          className="text-xs bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-800 border-red-200"
                        >
                          נקה
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminClientLayout>
  );
} 