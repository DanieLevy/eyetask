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
  HardDrive,
  FolderOpen,
  MessageCircle,
  Menu,
  X
} from 'lucide-react';
import MobileyeLogoIcon from '@/components/icons/MobileyeLogoIcon';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
    lowPriorityTasks: tasks.filter(task => task.priority >= 7 && task.priority <= 10).length,
    totalAmount: tasks.reduce((sum, task) => sum + (task.amountNeeded || 0), 0)
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">טוען נתוני לוח הבקרה...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="px-3 md:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Logo and Title */}
            <div className="flex items-center gap-2 md:gap-3">
              <MobileyeLogoIcon className="h-6 md:h-8 w-auto text-gray-800" /> 
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gray-900">
                  פאנל ניהול
                </h1>
                {user && (
                  <p className="text-xs text-gray-500 hidden sm:block">
                    שלום, {user.username}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5 text-gray-600" />
                ) : (
                  <Menu className="h-5 w-5 text-gray-600" />
                )}
              </button>

              {/* Desktop Actions */}
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={refreshData}
                  disabled={refreshing}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="רענן נתונים"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''} text-gray-600`} />
                </button>
                
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2 text-sm"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden lg:inline">יציאה</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-3 pt-3 border-t border-gray-200">
              <div className="flex flex-col gap-2">
                <button
                  onClick={refreshData}
                  disabled={refreshing}
                  className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-100 transition-colors w-full text-right"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''} text-gray-600`} />
                  <span className="text-sm text-gray-700">רענן נתונים</span>
                </button>
                
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors w-full text-right"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm">יציאה</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="p-3 md:p-6 space-y-4 md:space-y-6">
        {/* Compact Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {/* Total Projects */}
          <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600">
                  פרויקטים
                </p>
                <p className="text-lg md:text-2xl font-bold text-gray-900 mt-1">
                  {stats.totalProjects}
                </p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <FolderPlus className="h-4 md:h-5 w-4 md:w-5 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Active Tasks */}
          <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600">
                  משימות פעילות
                </p>
                <p className="text-lg md:text-2xl font-bold text-gray-900 mt-1">
                  {stats.activeTasks}
                </p>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckSquare className="h-4 md:h-5 w-4 md:w-5 text-green-600" />
              </div>
            </div>
          </div>

          {/* High Priority */}
          <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600">
                  עדיפות גבוהה
                </p>
                <p className="text-lg md:text-2xl font-bold text-gray-900 mt-1">
                  {stats.highPriorityTasks}
                </p>
              </div>
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertCircle className="h-4 md:h-5 w-4 md:w-5 text-red-600" />
              </div>
            </div>
          </div>

          {/* Cache Status */}
          <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600">
                  מטמון
                </p>
                <p className="text-sm md:text-lg font-bold text-gray-900 mt-1">
                  {cacheStatus ? (
                    <span className="text-green-600">פעיל</span>
                  ) : (
                    <span className="text-yellow-600">טוען...</span>
                  )}
                </p>
                {cacheStatus && (
                  <p className="text-xs text-gray-500">
                    גרסה: {cacheStatus.currentVersion}
                  </p>
                )}
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <Database className="h-4 md:h-5 w-4 md:w-5 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile-First Quick Actions */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            פעולות מהירות
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Project Management */}
            <Link href="/admin/projects" 
              className="group p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all border border-blue-200 active:scale-95">
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
            </Link>

            {/* New Task */}
            <Link href="/admin/tasks/new" 
              className="group p-4 rounded-lg bg-green-50 hover:bg-green-100 transition-all border border-green-200 active:scale-95">
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
            </Link>

            {/* Analytics */}
            <Link href="/admin/analytics" 
              className="group p-4 rounded-lg bg-purple-50 hover:bg-purple-100 transition-all border border-purple-200 active:scale-95">
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
            </Link>

            {/* Feedback Management */}
            <Link href="/admin/feedback" 
              className="group p-4 rounded-lg bg-orange-50 hover:bg-orange-100 transition-all border border-orange-200 active:scale-95">
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
            </Link>

            {/* Daily Updates */}
            <Link href="/admin/daily-updates" 
              className="group p-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-all border border-indigo-200 active:scale-95">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500 rounded-lg flex-shrink-0">
                  <Calendar className="h-4 w-4 text-white" />
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
            </Link>

            {/* Cache Management */}
            <Link href="/admin/cache" 
              className="group p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all border border-gray-200 active:scale-95">
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
            </Link>
          </div>
        </div>

        {/* Mobile-Optimized Recent Items */}
        <div className="space-y-4">
          {/* Recent Projects */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">פרויקטים אחרונים</h3>
              <Link href="/admin/projects" className="text-blue-600 hover:text-blue-700 text-sm">
                הצג הכל
              </Link>
            </div>
            
            {projects.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">אין פרויקטים עדיין</p>
            ) : (
              <div className="space-y-2">
                {projects.slice(0, 3).map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-gray-900 text-sm truncate">{project.name}</h4>
                      <p className="text-xs text-gray-500">
                        {getTaskCountForProject(project.id)} משימות • 
                        {getActiveTasksForProject(project.id)} פעילות
                      </p>
                    </div>
                    <div className="flex items-center gap-1 mr-3">
                      <Link 
                        href={`/admin/projects/${project.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* System Status */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">מצב המערכת</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-lg font-bold text-green-600">{stats.totalTasks}</div>
                <div className="text-xs text-green-700">סה"כ משימות</div>
              </div>
              
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-lg font-bold text-blue-600">{stats.activeTasks}</div>
                <div className="text-xs text-blue-700">משימות פעילות</div>
              </div>
            </div>

            {cacheStatus && (
              <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-purple-900">מצב מטמון</div>
                    <div className="text-xs text-purple-700">גרסה {cacheStatus.currentVersion}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => clearCache('soft')}
                      disabled={cacheLoading}
                      className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200 disabled:opacity-50"
                    >
                      עדכון
                    </button>
                    <button
                      onClick={() => clearCache('full')}
                      disabled={cacheLoading}
                      className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 disabled:opacity-50"
                    >
                      נקה
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 