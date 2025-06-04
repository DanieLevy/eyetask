'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LogOut, 
  BarChart3, 
  Users, 
  Target, 
  Calendar,
  TrendingUp,
  Activity,
  Plus,
  FolderPlus,
  RefreshCw,
  ArrowLeft,
  Bell,
  RotateCcw
} from 'lucide-react';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';
import { useTasksRealtime, useProjectsRealtime } from '@/hooks/useRealtime';
import { usePageRefresh } from '@/hooks/usePageRefresh';

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
  
  // Font configurations
  const hebrewHeading = useHebrewFont('heading');
  const hebrewBody = useHebrewFont('body');
  const mixedHeading = useMixedFont('heading');
  const mixedBody = useMixedFont('body');
  
  // Quick action states
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectData, setNewProjectData] = useState<NewProjectData>({
    name: '',
    description: ''
  });
  const [operationLoading, setOperationLoading] = useState(false);
  
  const router = useRouter();

  // Realtime handlers
  const handleProjectChange = useCallback((payload: any) => {
    console.log('🔄 Project realtime update:', payload);
    
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    setProjects(current => {
      switch (eventType) {
        case 'INSERT':
          if (newRecord) {
            const exists = current.find(p => p.id === newRecord.id);
            return exists ? current : [...current, newRecord];
          }
          return current;
          
        case 'UPDATE':
          if (newRecord) {
            return current.map(project => 
              project.id === newRecord.id ? newRecord : project
            );
          }
          return current;
          
        case 'DELETE':
          if (oldRecord) {
            return current.filter(project => project.id !== oldRecord.id);
          }
          return current;
          
        default:
          return current;
      }
    });
  }, []);

  const handleTaskChange = useCallback((payload: any) => {
    console.log('🔄 Task realtime update:', payload);
    
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    setTasks(current => {
      switch (eventType) {
        case 'INSERT':
          if (newRecord) {
            const exists = current.find(t => t.id === newRecord.id);
            return exists ? current : [...current, newRecord];
          }
          return current;
          
        case 'UPDATE':
          if (newRecord) {
            return current.map(task => 
              task.id === newRecord.id ? newRecord : task
            );
          }
          return current;
          
        case 'DELETE':
          if (oldRecord) {
            return current.filter(task => task.id !== oldRecord.id);
          }
          return current;
          
        default:
          return current;
      }
    });
  }, []);

  // Set up realtime subscriptions
  useTasksRealtime(handleTaskChange);
  useProjectsRealtime(handleProjectChange);

  const refreshData = useCallback(async () => {
    try {
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
    }
  }, []);

  // Register this page's refresh function
  usePageRefresh(refreshData);

  // Cache invalidation utility
  const clearCaches = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      
      // Clear Next.js cache by fetching with cache-busting timestamp
      const timestamp = Date.now();
      
      await Promise.all([
        fetch(`/api/projects?_t=${timestamp}`, {
          method: 'GET',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }).then(res => res.json()),
        fetch(`/api/tasks?_t=${timestamp}`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }).then(res => res.json())
      ])
      .then(([projectsRes, tasksRes]) => {
        if (projectsRes.success) setProjects(projectsRes.projects);
        if (tasksRes.success) setTasks(tasksRes.tasks);
        setLoading(false);
      })
      .catch(error => {
        if (error.message?.includes('401') || error.message?.includes('403')) {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
          router.push('/admin');
        } else {
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  };

  useEffect(() => {
    clearCaches();
    
    // Check authentication
    const token = localStorage.getItem('adminToken');
    const userData = localStorage.getItem('adminUser');
    
    if (!token || !userData || userData === 'undefined' || userData === 'null') {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
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
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      router.push('/admin');
      return;
    }

    // Fetch data
    Promise.all([
      fetch(`/api/projects?_t=${Date.now()}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      }).then(res => res.json()),
      fetch(`/api/tasks?_t=${Date.now()}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      }).then(res => res.json())
    ])
    .then(([projectsRes, tasksRes]) => {
      if (projectsRes.success) setProjects(projectsRes.projects);
      if (tasksRes.success) setTasks(tasksRes.tasks);
      setLoading(false);
    })
    .catch(error => {
      if (error.message?.includes('401') || error.message?.includes('403')) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        router.push('/admin');
      } else {
        setLoading(false);
      }
    });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/admin');
  };

  const handleCreateProject = async () => {
    setOperationLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/projects?_t=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify(newProjectData)
      });

      const result = await response.json();
      
      if (result.success) {
        setNewProjectData({ name: '', description: '' });
        setShowNewProjectForm(false);
        await refreshData();
      } else {
        alert('Failed to create project: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Error creating project');
    } finally {
      setOperationLoading(false);
    }
  };

  const getTaskCountForProject = (projectId: string) => {
    return tasks.filter(task => task.projectId === projectId).length;
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
      {/* Top Action Bar */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className={`text-lg font-semibold text-foreground ${hebrewHeading.fontClass}`}>
                לוח בקרה מנהל
              </h2>
              {user && (
                <span className={`text-sm text-muted-foreground ${mixedBody.fontClass}`}>
                  | {user.username}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  setLoading(true);
                  await clearCaches();
                  window.location.reload();
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors"
                title="רענן נתונים"
              >
                <RefreshCw className="h-4 w-4" />
                רענן
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className={`text-3xl font-bold text-foreground ${hebrewHeading.fontClass}`}>
            לוח בקרה מנהל
          </h1>
          <div className="flex items-center gap-4">
            <button
              onClick={refreshData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              רענן נתונים
            </button>
            <button
              onClick={clearCaches}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              נקה Cache
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              התנתק
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card rounded-lg border border-border p-6 mb-8">
          <h2 className={`text-lg font-semibold text-foreground mb-4 ${hebrewHeading.fontClass}`}>פעולות מהירות</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/admin/tasks/new"
              className="bg-primary text-primary-foreground p-4 rounded-lg hover:bg-primary/90 transition-colors text-right group"
            >
              <Plus className="h-6 w-6 mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold">הוסף משימה חדשה</h3>
              <p className="text-sm opacity-90">צור משימה חדשה במערכת</p>
            </Link>
            <button 
              onClick={() => setShowNewProjectForm(true)}
              className="bg-secondary text-secondary-foreground p-4 rounded-lg hover:bg-secondary/90 transition-colors text-right group"
            >
              <FolderPlus className="h-6 w-6 mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold">צור פרויקט חדש</h3>
              <p className="text-sm opacity-90">הוסף פרויקט חדש לניהול</p>
            </button>
            <Link
              href="/admin/daily-updates"
              className="bg-blue-500 text-white p-4 rounded-lg hover:bg-blue-600 transition-colors text-right group"
            >
              <Bell className="h-6 w-6 mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold">עדכונים יומיים</h3>
              <p className="text-sm opacity-90">נהל הודעות ועדכונים</p>
            </Link>
            <Link
              href="/admin/analytics"
              className="bg-accent text-accent-foreground p-4 rounded-lg hover:bg-accent/90 transition-colors text-right group"
            >
              <BarChart3 className="h-6 w-6 mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold">אנליטיקה מתקדמת</h3>
              <p className="text-sm opacity-90">נתונים מפורטים ותובנות</p>
            </Link>
          </div>
        </div>

        {/* Project Management Section */}
        <section>
          <h2 className={`text-2xl font-bold text-foreground mb-6 ${hebrewHeading.fontClass}`}>ניהול פרויקטים</h2>
          
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <FolderPlus className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">אין פרויקטים במערכת</h3>
              <p className="text-muted-foreground">צור פרויקט ראשון כדי להתחיל לנהל משימות</p>
              <button
                onClick={() => setShowNewProjectForm(true)}
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <FolderPlus className="h-4 w-4" />
                צור פרויקט ראשון
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => {
                const taskCount = getTaskCountForProject(project.id);
                const highPriorityCount = getHighPriorityTasksForProject(project.id);
                
                return (
                  <Link
                    key={project.id}
                    href={`/admin/projects/${project.id}`}
                    className="group"
                  >
                    <div className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition-all duration-200 group-hover:border-primary/50">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                            {project.name}
                          </h3>
                          {project.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {project.description}
                            </p>
                          )}
                        </div>
                        <BarChart3 className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">
                            {taskCount} משימות
                          </span>
                          {highPriorityCount > 0 && (
                            <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium">
                              {highPriorityCount} עדיפות גבוהה
                            </span>
                          )}
                        </div>
                        <span className="text-primary group-hover:translate-x-1 transition-transform">
                          <ArrowLeft className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* New Project Modal */}
      {showNewProjectForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-border w-full max-w-md">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">צור פרויקט חדש</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">שם הפרויקט</label>
                <input
                  type="text"
                  value={newProjectData.name}
                  onChange={(e) => setNewProjectData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">תיאור (אופציונלי)</label>
                <textarea
                  value={newProjectData.description}
                  onChange={(e) => setNewProjectData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 border border-border rounded-lg bg-background text-foreground h-20"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <button
                onClick={handleCreateProject}
                disabled={operationLoading || !newProjectData.name}
                className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {operationLoading ? 'יוצר...' : 'צור פרויקט'}
              </button>
              <button
                onClick={() => setShowNewProjectForm(false)}
                disabled={operationLoading}
                className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 