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
  PieChart
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

interface NewProjectData {
  name: string;
  description: string;
}

export default function AdminDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  
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
  }, [refreshData]);

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
    <div className="min-h-screen bg-background">
      {/* Simplified Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Target className="h-6 w-6 text-primary" />
                <div>
                  <h1 className={`text-xl font-bold text-foreground ${hebrewHeading.fontClass}`}>
                    לוח בקרה מנהל
                  </h1>
                  {user && (
                    <p className={`text-sm text-muted-foreground ${mixedBody.fontClass}`}>
                      {user.username} | EyeTask Management
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                title="דף הבית"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">דף הבית</span>
              </Link>
              
              <button
                onClick={refreshData}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
                title="רענן נתונים"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">רענן</span>
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                title="התנתק"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">יציאה</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Statistics Overview */}
        <section className="mb-8">
          <h2 className={`text-lg font-semibold text-foreground mb-6 ${hebrewHeading.fontClass}`}>
            סקירה כללית
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Total Projects */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">פרויקטים</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalProjects}</p>
                </div>
                <FolderPlus className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            {/* Active Tasks */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 dark:text-green-400 text-sm font-medium">משימות פעילות</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.activeTasks}</p>
                </div>
                <CheckSquare className="h-8 w-8 text-green-500" />
              </div>
            </div>

            {/* High Priority Tasks */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-600 dark:text-red-400 text-sm font-medium">עדיפות גבוהה</p>
                  <p className="text-2xl font-bold text-red-900 dark:text-red-100">{stats.highPriorityTasks}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </div>

            {/* Completed Tasks */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/30 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">הושלמו</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.completedTasks}</p>
                </div>
                <CheckSquare className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Priority Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium">עדיפות גבוהה</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{stats.highPriorityTasks}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm font-medium">עדיפות בינונית</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{stats.mediumPriorityTasks}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">עדיפות נמוכה</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.lowPriorityTasks}</p>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mb-8">
          <h2 className={`text-lg font-semibold text-foreground mb-4 ${hebrewHeading.fontClass}`}>
            פעולות מהירות
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/admin/projects"
              className="bg-primary text-primary-foreground p-4 rounded-lg hover:bg-primary/90 transition-colors text-center group"
            >
              <FolderPlus className="h-8 w-8 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-sm">ניהול פרויקטים</h3>
              <p className="text-xs opacity-90 mt-1">צור, ערוך ומחק פרויקטים</p>
            </Link>
            
            <Link
              href="/admin/tasks/new"
              className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors text-center group"
            >
              <Plus className="h-8 w-8 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-sm">משימה חדשה</h3>
              <p className="text-xs opacity-90 mt-1">הוסף משימה חדשה למערכת</p>
            </Link>
            
            <Link
              href="/admin/daily-updates"
              className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors text-center group"
            >
              <Bell className="h-8 w-8 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-sm">עדכונים יומיים</h3>
              <p className="text-xs opacity-90 mt-1">נהל הודעות יומיות</p>
            </Link>
            
            <Link
              href="/admin/analytics"
              className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition-colors text-center group"
            >
              <BarChart3 className="h-8 w-8 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-sm">דוחות ואנליטיקה</h3>
              <p className="text-xs opacity-90 mt-1">צפה בסטטיסטיקות</p>
            </Link>
          </div>
        </section>

        {/* Projects Overview */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-lg font-semibold text-foreground ${hebrewHeading.fontClass}`}>
              פרויקטים ({projects.length})
            </h2>
            <Link
              href="/admin/projects"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm"
            >
              <Settings className="h-4 w-4" />
              נהל כל הפרויקטים
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/25">
              <FolderPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">אין פרויקטים עדיין</h3>
              <p className="text-muted-foreground mb-4">צור את הפרויקט הראשון שלך כדי להתחיל</p>
              <Link 
                href="/admin/projects"
                className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                צור פרויקט חדש
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.slice(0, 6).map((project) => {
                const taskCount = getTaskCountForProject(project.id);
                const activeTasks = getActiveTasksForProject(project.id);
                const highPriorityTasks = getHighPriorityTasksForProject(project.id);
                
                return (
                  <div key={project.id} className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-all group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className={`text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors ${hebrewHeading.fontClass}`}>
                          {project.name}
                        </h3>
                        {project.description && (
                          <p className={`text-sm text-muted-foreground line-clamp-2 ${mixedBody.fontClass}`}>
                            {project.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/admin/projects/${project.id}`}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                          title="נהל פרויקט"
                        >
                          <Settings className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/project/${encodeURIComponent(project.name)}`}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                          title="צפייה ציבורית"
                          target="_blank"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>

                    {/* Project Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-3 bg-primary/5 rounded-lg">
                        <div className="text-lg font-bold text-primary">{taskCount}</div>
                        <div className="text-xs text-muted-foreground">סה"כ משימות</div>
                      </div>
                      <div className="text-center p-3 bg-green-500/5 rounded-lg">
                        <div className="text-lg font-bold text-green-600">{activeTasks}</div>
                        <div className="text-xs text-muted-foreground">פעילות</div>
                      </div>
                      <div className="text-center p-3 bg-red-500/5 rounded-lg">
                        <div className="text-lg font-bold text-red-600">{highPriorityTasks}</div>
                        <div className="text-xs text-muted-foreground">דחוף</div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={`/admin/projects/${project.id}`}
                        className="bg-primary text-primary-foreground px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors text-center text-xs flex items-center justify-center gap-1"
                      >
                        <Target className="h-3 w-3" />
                        נהל משימות
                      </Link>
                      <Link
                        href={`/admin/tasks/new?projectId=${project.id}`}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-center text-xs flex items-center justify-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        משימה חדשה
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {projects.length > 6 && (
            <div className="text-center mt-6">
              <Link
                href="/admin/projects"
                className="text-primary hover:text-primary/80 font-medium flex items-center justify-center gap-2"
              >
                צפה בכל הפרויקטים ({projects.length})
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
} 