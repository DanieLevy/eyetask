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
import { debugNavigation, debugRouterCall } from '@/lib/navigation-debug';
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="p-3 md:p-6 space-y-4 md:space-y-6">
          {/* Header Section */}
          <div className="mb-6">
            <h1 className="text-2xl font-light text-slate-700 dark:text-slate-300">
              לוח בקרה מנהלים
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              סקירה כללית ופעולות מהירות
            </p>
          </div>

          {/* Statistics Cards */}
          {userRole !== 'driver_manager' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {/* Total Projects */}
              <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    PROJECTS
                  </span>
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <FolderPlus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    {stats.totalProjects}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">פרויקטים</p>
                </div>
              </div>

              {/* Active Tasks */}
              <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    ACTIVE
                  </span>
                  <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <CheckSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    {stats.activeTasks}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">משימות פעילות</p>
                </div>
              </div>

              {/* High Priority */}
              <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    URGENT
                  </span>
                  <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    {stats.highPriorityTasks}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">עדיפות גבוהה</p>
                </div>
              </div>

              {/* Cache Status - Admin Only */}
              {cacheStatus && canManageCache && (
                <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      CACHE
                    </span>
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                      <Database className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      <Badge variant="outline" className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                        פעיל
                      </Badge>
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      גרסה {cacheStatus.currentVersion}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Driver Manager View
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <div className="text-center">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-full inline-flex mb-4">
                  <Car className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                  ברוך הבא, {username || 'משתמש'}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  ההרשאות שלך:
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {canViewAnalytics && (
                    <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">אנליטיקה</Badge>
                  )}
                  {canViewFeedback && (
                    <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">משוב</Badge>
                  )}
                  {canManageProjects && (
                    <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">פרויקטים</Badge>
                  )}
                  {canManageTasks && (
                    <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">משימות</Badge>
                  )}
                  {canManageUsers && (
                    <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">משתמשים</Badge>
                  )}
                  {canManageCache && (
                    <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">מטמון</Badge>
                  )}
                  {canManagePushNotifications && (
                    <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">התראות</Badge>
                  )}
                  <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">עדכונים יומיים</Badge>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">פעולות מהירות</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">גישה מהירה לפעולות נפוצות</p>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Project Management */}
                {canManageProjects && (
                  <div 
                    className="cursor-pointer"
                    onClick={() => router.push('/admin/projects')}
                  >
                    <div className="group p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all hover:shadow-md bg-slate-50/50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex-shrink-0">
                          <Layers className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                            ניהול פרויקטים
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            עריכה, הוספה ומחיקה
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* New Task */}
                {canManageTasks && (
                  <div 
                    className="cursor-pointer"
                    onClick={() => router.push('/admin/tasks/new')}
                  >
                    <div className="group p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-600 transition-all hover:shadow-md bg-slate-50/50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg flex-shrink-0">
                          <Plus className="h-4 w-4 text-green-700 dark:text-green-400" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                            משימה חדשה
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            הוסף משימה לפרויקט
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              
                {/* Bulk Import */}
                {canManageTasks && (
                  <div 
                    className="cursor-pointer"
                    onClick={() => router.push('/admin/tasks/bulk-import')}
                  >
                    <div className="group p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600 transition-all hover:shadow-md bg-slate-50/50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex-shrink-0">
                          <Upload className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                            ייבוא המוני
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            ייבא תת-משימות מ-JIRA
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Analytics */}
                {canViewAnalytics && (
                  <div 
                    className="cursor-pointer"
                    onClick={() => router.push('/admin/analytics')}
                  >
                    <div className="group p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600 transition-all hover:shadow-md bg-slate-50/50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex-shrink-0">
                          <BarChart3 className="h-4 w-4 text-purple-700 dark:text-purple-400" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                            אנליטיקס
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            דוחות ונתונים
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Feedback Management */}
                {canViewFeedback && (
                  <div 
                    className="cursor-pointer"
                    onClick={() => router.push('/admin/feedback')}
                  >
                    <div className="group p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-600 transition-all hover:shadow-md bg-slate-50/50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex-shrink-0">
                          <MessageCircle className="h-4 w-4 text-orange-700 dark:text-orange-400" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                            ניהול פניות
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            תמיכה ודיווחים
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Daily Updates */}
                <div 
                  className="cursor-pointer"
                  onClick={() => router.push('/admin/daily-updates')}
                >
                  <div className="group p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all hover:shadow-md bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex-shrink-0">
                        <Eye className="h-4 w-4 text-indigo-700 dark:text-indigo-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                          עדכונים יומיים
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                          הודעות ועדכונים
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cache Management */}
                {canManageCache && (
                  <div 
                    className="cursor-pointer"
                    onClick={() => router.push('/admin/cache')}
                  >
                    <div className="group p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-all hover:shadow-md bg-slate-50/50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg flex-shrink-0">
                          <Server className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                            ניהול מטמון
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            ביצועים ומטמון
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* User Management */}
                {canManageUsers && (
                  <div 
                    className="cursor-pointer"
                    onClick={() => router.push('/admin/users')}
                  >
                    <div className="group p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-600 transition-all hover:shadow-md bg-slate-50/50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-100 dark:bg-rose-900/50 rounded-lg flex-shrink-0">
                          <Users className="h-4 w-4 text-rose-700 dark:text-rose-400" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                            ניהול משתמשים
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            הוספה ועריכת משתמשים
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Push Notifications */}
                {canManagePushNotifications && (
                  <div 
                    className="cursor-pointer"
                    onClick={() => router.push('/admin/push-notifications')}
                  >
                    <div className="group p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-pink-300 dark:hover:border-pink-600 transition-all hover:shadow-md bg-slate-50/50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-100 dark:bg-pink-900/50 rounded-lg">
                          <Bell className="h-4 w-4 text-pink-700 dark:text-pink-400" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                            התראות Push
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            ניהול התראות
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Items and System Status */}
          <div className="space-y-4">

          {/* Recent Projects */}
          {canManageProjects && (
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">פרויקטים אחרונים</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">ניהול מהיר של הפרויקטים הפעילים</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      console.log('[Dashboard] הצג הכל (View All Projects) button clicked');
                      debugNavigation('Dashboard Button', 'click', '/admin/projects', router);
                      debugRouterCall('Dashboard Button', 'push', '/admin/projects');
                      router.push('/admin/projects');
                      console.log('[Dashboard] router.push called - waiting for navigation...');
                    }}
                    className="hidden sm:flex text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    הצג הכל →
                  </Button>
                </div>
              </div>
              <div className="p-4">
                {projects.length === 0 ? (
                  <div className="text-center py-8">
                    <FolderPlus className="h-10 w-10 text-slate-400 dark:text-slate-600 mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">אין פרויקטים עדיין</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => router.push('/admin/projects/new')}
                      className="border-slate-200 dark:border-slate-700"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      צור פרויקט ראשון
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
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
                              console.log('[Dashboard] Project card clicked:', project.name);
                              console.log('[Dashboard] Navigating to /admin/projects/' + project._id);
                              router.push(`/admin/projects/${project._id}`);
                              console.log('[Dashboard] router.push called');
                            }}
                            className="block"
                          >
                            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all hover:shadow-md bg-slate-50/50 dark:bg-slate-800/50">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-medium text-slate-900 dark:text-slate-100 text-base truncate">
                                    {project.name}
                                  </h4>
                                  {project.description && (
                                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1 mt-1">
                                      {project.description}
                                    </p>
                                  )}
                                  
                                  <div className="flex flex-wrap items-center gap-4 mt-3">
                                    <div className="flex items-center gap-1.5">
                                      <Layers className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                                      <span className="text-sm text-slate-700 dark:text-slate-300">{taskCount} משימות</span>
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
                                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                                        <span>התקדמות</span>
                                        <span className="font-semibold">{completionRate}%</span>
                                      </div>
                                      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5">
                                        <div 
                                          className="h-full bg-slate-700 dark:bg-slate-400 rounded-full transition-all duration-500"
                                          style={{ width: `${completionRate}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex-shrink-0">
                                  <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                    <Eye className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                    
                    {/* Mobile show all button */}
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-3 sm:hidden">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => router.push('/admin/projects')}
                        className="w-full border-slate-200 dark:border-slate-700"
                      >
                        הצג את כל הפרויקטים
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* System Status */}
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">מצב המערכת</h2>
            </div>
            <div className="p-4">
              {canManageTasks ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">{stats.totalTasks}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">סה&quot;כ משימות</div>
                  </div>
                  
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">{stats.activeTasks}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">משימות פעילות</div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-4">
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
                    לניהול עדכונים יומיים, עבור לדף העדכונים
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => router.push('/admin/daily-updates')}
                    className="border-slate-200 dark:border-slate-700"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    עדכונים יומיים
                  </Button>
                </div>
              )}

              {cacheStatus && canManageCache && (
                <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">מצב מטמון</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">גרסה {cacheStatus.currentVersion}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => clearCache('soft')}
                        disabled={cacheLoading}
                        className="text-xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        עדכון
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => clearCache('full')}
                        disabled={cacheLoading}
                        className="text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 border-red-200 dark:border-red-800"
                      >
                        נקה
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div> {/* Close "Recent Items and System Status" div */}
        </div>
      </div>
    </AdminClientLayout>
  );
} 