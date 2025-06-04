'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Users, 
  FolderPlus, 
  Activity,
  TrendingUp,
  Calendar,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Settings,
  Bell,
  BarChart3,
  CheckSquare,
  AlertCircle,
  Target,
  Layers,
  Filter,
  Search,
  SortAsc,
  MoreVertical,
  ExternalLink,
  LogOut,
  ArrowLeft,
  RotateCcw,
  Home,
  Zap,
  BookOpen,
  PieChart,
  Database,
  Cpu,
  Shield,
  Server,
  HardDrive
} from 'lucide-react';

// Temporary inline hooks to bypass import issue
const useHebrewFont = (element: string = 'body') => ({ fontClass: 'font-hebrew text-right', direction: 'rtl' as const });
const useMixedFont = (element: string = 'body') => ({ fontClass: 'font-mixed', direction: 'ltr' as const });
const useTasksRealtime = (callback: () => void) => { useEffect(() => { const interval = setInterval(callback, 30000); return () => clearInterval(interval); }, [callback]); };
const useProjectsRealtime = (callback: () => void) => { useEffect(() => { const interval = setInterval(callback, 30000); return () => clearInterval(interval); }, [callback]); };
const usePageRefresh = (callback: () => void) => { useEffect(() => { callback(); }, [callback]); };

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface Task {
  id: string;
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
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cacheLoading, setCacheLoading] = useState(false);
  
  const router = useRouter();
  
  // Font configurations
  const hebrewHeading = useHebrewFont('heading');
  const hebrewBody = useHebrewFont('body');
  const mixedHeading = useMixedFont('heading');
  const mixedBody = useMixedFont('body');

  // Load user data from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('adminUser');
      if (userData && userData !== 'undefined' && userData !== 'null') {
        try {
          setUser(JSON.parse(userData));
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    }
  }, []);

  // Fetch cache status
  const fetchCacheStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/cache?action=status');
      const data = await response.json();
      if (data.success) {
        setCacheStatus(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch cache status:', error);
    }
  }, []);

  // Clear cache function
  const clearCache = useCallback(async (type: 'soft' | 'full' = 'soft') => {
    setCacheLoading(true);
    try {
      const response = await fetch('/api/admin/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: type === 'full' ? 'clear-all' : 'soft-clear',
          reason: type === 'full' ? 'Manual cache clear from dashboard' : 'Soft update from dashboard'
        })
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchCacheStatus();
        // Show success notification
        alert(type === 'full' ? 'מטמון נוקה בהצלחה!' : 'עדכון רך בוצע בהצלחה!');
      }
    } catch (error) {
      console.error('Cache operation failed:', error);
      alert('שגיאה בפעולת מטמון');
    } finally {
      setCacheLoading(false);
    }
  }, [fetchCacheStatus]);

  const refreshData = useCallback(async () => {
    try {
      setRefreshing(true);
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
      setRefreshing(false);
    }
  }, []);

  // Set up realtime subscriptions
  useTasksRealtime(refreshData);
  useProjectsRealtime(refreshData);

  // Load initial data
  useEffect(() => {
    refreshData();
    fetchCacheStatus();
  }, [refreshData, fetchCacheStatus]);

  // Register this page's refresh function
  usePageRefresh(refreshData);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/admin');
  };

  // Calculate comprehensive statistics
  const stats = {
    totalProjects: projects.length,
    totalTasks: tasks.length,
    activeTasks: tasks.filter(task => task.isVisible).length,
    completedTasks: tasks.filter(task => !task.isVisible).length,
    highPriorityTasks: tasks.filter(task => task.priority >= 1 && task.priority <= 3).length,
    mediumPriorityTasks: tasks.filter(task => task.priority >= 4 && task.priority <= 6).length,
    lowPriorityTasks: tasks.filter(task => task.priority >= 7 && task.priority <= 10).length
  };

  const getTaskCountForProject = (projectId: string) => {
    return tasks.filter(task => task.projectId === projectId).length;
  };

  const getActiveTasksForProject = (projectId: string) => {
    return tasks.filter(task => task.projectId === projectId && task.isVisible).length;
  };

  const getHighPriorityTasksForProject = (projectId: string) => {
    return tasks.filter(task => 
      task.projectId === projectId && 
      task.priority >= 1 && 
      task.priority <= 3
    ).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">טוען נתוני לוח הבקרה...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Modern Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent ${hebrewHeading.fontClass}`}>
                    לוח בקרה מנהל
                  </h1>
                  {user && (
                    <p className={`text-sm text-slate-600 dark:text-slate-400 ${hebrewBody.fontClass}`}>
                      שלום, {user.username}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Quick Refresh Button */}
              <button
                onClick={refreshData}
                disabled={refreshing}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="רענן נתונים"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''} text-slate-600 dark:text-slate-400`} />
              </button>
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className={`text-sm ${hebrewBody.fontClass}`}>יציאה</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Statistics Cards - Modern Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Projects */}
          <div className="group bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-all border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium text-slate-600 dark:text-slate-400 ${hebrewBody.fontClass}`}>
                  סך הפרויקטים
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                  {stats.totalProjects}
                </p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg group-hover:scale-110 transition-transform">
                <FolderPlus className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Active Tasks */}
          <div className="group bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-all border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium text-slate-600 dark:text-slate-400 ${hebrewBody.fontClass}`}>
                  משימות פעילות
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                  {stats.activeTasks}
                </p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg group-hover:scale-110 transition-transform">
                <CheckSquare className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* High Priority */}
          <div className="group bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-all border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium text-slate-600 dark:text-slate-400 ${hebrewBody.fontClass}`}>
                  עדיפות גבוהה
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                  {stats.highPriorityTasks}
                </p>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg group-hover:scale-110 transition-transform">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          {/* Cache Status */}
          <div className="group bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-all border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium text-slate-600 dark:text-slate-400 ${hebrewBody.fontClass}`}>
                  מצב מטמון
                </p>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-2">
                  {cacheStatus ? (
                    <span className="text-green-600 dark:text-green-400">פעיל</span>
                  ) : (
                    <span className="text-yellow-600 dark:text-yellow-400">טוען...</span>
                  )}
                </p>
                {cacheStatus && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    גרסה: {cacheStatus.currentVersion}
                  </p>
                )}
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg group-hover:scale-110 transition-transform">
                <Database className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Modern Cards */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className={`text-xl font-bold text-slate-900 dark:text-white mb-6 ${hebrewHeading.fontClass}`}>
            פעולות מהירות
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Project Management */}
            <Link href="/admin/projects" 
              className="group p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900/30 dark:hover:to-blue-800/30 transition-all border border-blue-200 dark:border-blue-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg group-hover:scale-110 transition-transform">
                  <Layers className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className={`font-semibold text-blue-900 dark:text-blue-100 ${hebrewBody.fontClass}`}>
                    ניהול פרויקטים
                  </h3>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    עריכה, הוספה ומחיקה
                  </p>
                </div>
              </div>
            </Link>

            {/* New Task */}
            <Link href="/admin/tasks/new" 
              className="group p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 hover:from-green-100 hover:to-green-200 dark:hover:from-green-900/30 dark:hover:to-green-800/30 transition-all border border-green-200 dark:border-green-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg group-hover:scale-110 transition-transform">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className={`font-semibold text-green-900 dark:text-green-100 ${hebrewBody.fontClass}`}>
                    משימה חדשה
                  </h3>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    הוסף משימה חדשה
                  </p>
                </div>
              </div>
            </Link>

            {/* Cache Management */}
            <div className="group p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-900/30 dark:hover:to-purple-800/30 transition-all border border-purple-200 dark:border-purple-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-500 rounded-lg group-hover:scale-110 transition-transform">
                  <HardDrive className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className={`font-semibold text-purple-900 dark:text-purple-100 ${hebrewBody.fontClass}`}>
                    ניהול מטמון
                  </h3>
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    עדכן וניקה מטמון
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => clearCache('soft')}
                  disabled={cacheLoading}
                  className="flex-1 px-3 py-1 bg-purple-200 dark:bg-purple-700 text-purple-900 dark:text-purple-100 rounded text-xs hover:bg-purple-300 dark:hover:bg-purple-600 transition-colors disabled:opacity-50"
                >
                  עדכון רך
                </button>
                <Link href="/admin/cache"
                  className="flex-1 px-3 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600 transition-colors text-center"
                >
                  ניהול מלא
                </Link>
              </div>
            </div>

            {/* Analytics */}
            <Link href="/admin/analytics" 
              className="group p-4 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 hover:from-orange-100 hover:to-orange-200 dark:hover:from-orange-900/30 dark:hover:to-orange-800/30 transition-all border border-orange-200 dark:border-orange-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500 rounded-lg group-hover:scale-110 transition-transform">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className={`font-semibold text-orange-900 dark:text-orange-100 ${hebrewBody.fontClass}`}>
                    אנליטיקה
                  </h3>
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    דוחות וסטטיסטיקות
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Projects */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-xl font-bold text-slate-900 dark:text-white ${hebrewHeading.fontClass}`}>
              פרויקטים אחרונים
            </h2>
            <Link href="/admin/projects" 
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 flex items-center gap-1 text-sm font-medium">
              <span className={hebrewBody.fontClass}>הצג הכל</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-12">
              <FolderPlus className="h-12 w-12 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
              <p className={`text-slate-600 dark:text-slate-400 ${hebrewBody.fontClass}`}>
                אין פרויקטים עדיין
              </p>
              <Link href="/admin/projects" 
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Plus className="h-4 w-4" />
                <span className={hebrewBody.fontClass}>צור פרויקט ראשון</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.slice(0, 6).map((project) => (
                <div key={project.id} className="group p-4 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-all border border-slate-200 dark:border-slate-600">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold text-slate-900 dark:text-white truncate ${hebrewBody.fontClass}`}>
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className={`text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 ${hebrewBody.fontClass}`}>
                          {project.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <CheckSquare className="h-3 w-3" />
                          {getTaskCountForProject(project.id)} משימות
                        </span>
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {getActiveTasksForProject(project.id)} פעילות
                        </span>
                        <span className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {getHighPriorityTasksForProject(project.id)} דחוף
                        </span>
                      </div>
                    </div>
                    
                    <Link href={`/admin/projects/${project.id}`}
                      className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-200 dark:hover:bg-blue-800">
                      <Eye className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Status */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className={`text-xl font-bold text-slate-900 dark:text-white mb-6 ${hebrewHeading.fontClass}`}>
            מצב המערכת
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                <Server className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className={`text-sm font-medium text-green-900 dark:text-green-100 ${hebrewBody.fontClass}`}>
                  שרת API
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">פעיל</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className={`text-sm font-medium text-blue-900 dark:text-blue-100 ${hebrewBody.fontClass}`}>
                  מסד נתונים
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">מחובר</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className={`text-sm font-medium text-purple-900 dark:text-purple-100 ${hebrewBody.fontClass}`}>
                  אבטחה
                </p>
                <p className="text-xs text-purple-700 dark:text-purple-300">מאובטח</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 