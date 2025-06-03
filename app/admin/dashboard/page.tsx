'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Eye, 
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
  ArrowLeft
} from 'lucide-react';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';

interface DashboardData {
  totalTasks: number;
  visibleTasks: number;
  hiddenTasks: number;
  totalSubtasks: number;
  totalProjects: number;
  totalVisits: number;
  uniqueVisitors: number;
  tasksByPriority: {
    high: number;
    medium: number;
    low: number;
    none: number;
  };
  tasksByProject: Array<{
    projectName: string;
    taskCount: number;
  }>;
  recentActivity: Array<{
    date: string;
    visits: number;
  }>;
  mostViewedTasks: Array<{
    taskId: string;
    taskTitle: string;
    views: number;
  }>;
}

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
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
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
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [newProjectData, setNewProjectData] = useState<NewProjectData>({
    name: '',
    description: ''
  });
  const [operationLoading, setOperationLoading] = useState(false);
  
  const router = useRouter();

  // Cache invalidation utility
  const clearCaches = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          if (cacheName.includes('eyetask')) {
            await caches.delete(cacheName);
          }
        }
      }
      
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          console.log('Service worker cache cleared:', event.data);
        };
        navigator.serviceWorker.controller.postMessage(
          { type: 'CLEAR_API_CACHE' }, 
          [messageChannel.port2]
        );
      }
    } catch (error) {
      console.error('Error clearing caches:', error);
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
      console.error('Error parsing user data:', error);
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      router.push('/admin');
      return;
    }

    // Fetch dashboard data
    Promise.all([
      fetch(`/api/admin/dashboard?_t=${Date.now()}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      }).then(res => res.json()),
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
    .then(([dashboardRes, projectsRes, tasksRes]) => {
      if (dashboardRes.success) setDashboardData(dashboardRes.dashboard);
      if (projectsRes.success) setProjects(projectsRes.projects);
      if (tasksRes.success) setTasks(tasksRes.tasks);
      setLoading(false);
    })
    .catch(error => {
      console.error('Error fetching dashboard data:', error);
      if (error.message.includes('401') || error.message.includes('403')) {
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
        console.log('Project created successfully');
        setNewProjectData({ name: '', description: '' });
        setShowNewProjectForm(false);
        await refreshData();
      } else {
        console.error('Failed to create project:', result.error);
        alert('Failed to create project: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Error creating project');
    } finally {
      setOperationLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const timestamp = Date.now();
      
      const [dashboardRes, projectsRes, tasksRes] = await Promise.all([
        fetch(`/api/admin/dashboard?_t=${timestamp}`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }).then(res => res.json()),
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

      if (dashboardRes.success) setDashboardData(dashboardRes.dashboard);
      if (projectsRes.success) setProjects(projectsRes.projects);
      if (tasksRes.success) setTasks(tasksRes.tasks);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const getTaskCountForProject = (projectId: string) => {
    return tasks.filter(task => task.projectId === projectId && task.isVisible).length;
  };

  const getHighPriorityTasksForProject = (projectId: string) => {
    return tasks.filter(task => 
      task.projectId === projectId && 
      task.isVisible && 
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
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="h-8 w-8 text-primary" />
              <div>
                <h1 className={`text-xl font-bold text-foreground ${hebrewHeading.fontClass}`}>EyeTask - לוח בקרה</h1>
                <p className={`text-sm text-muted-foreground ${mixedBody.fontClass}`}>
                  שלום {user?.username} | Mobileye Admin
                </p>
              </div>
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
              <Link
                href="/"
                className="px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
              >
                דף הבית
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                התנתק
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <Target className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">סה״כ משימות</p>
                <p className="text-2xl font-bold text-foreground">
                  {dashboardData?.totalTasks || 0}
                </p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {dashboardData?.visibleTasks || 0} גלויות • {dashboardData?.hiddenTasks || 0} מוסתרות
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-8 w-8 text-secondary-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">פרויקטים</p>
                <p className="text-2xl font-bold text-foreground">
                  {dashboardData?.totalProjects || 0}
                </p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {dashboardData?.totalSubtasks || 0} תת-משימות
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">ביקורים</p>
                <p className="text-2xl font-bold text-foreground">
                  {dashboardData?.totalVisits || 0}
                </p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {dashboardData?.uniqueVisitors || 0} משתמשים ייחודיים
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">עדיפות גבוהה</p>
                <p className="text-2xl font-bold text-foreground">
                  {dashboardData?.tasksByPriority?.high || 0}
                </p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              דורש תשומת לב מיידית
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card rounded-lg border border-border p-6 mb-8">
          <h2 className={`text-lg font-semibold text-foreground mb-4 ${hebrewHeading.fontClass}`}>פעולות מהירות</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <button 
              onClick={() => setShowAnalytics(true)}
              className="bg-accent text-accent-foreground p-4 rounded-lg hover:bg-accent/90 transition-colors text-right group"
            >
              <BarChart3 className="h-6 w-6 mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold">צפה באנליטיקה</h3>
              <p className="text-sm opacity-90">נתונים מפורטים על המערכת</p>
            </button>
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
                        <Eye className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
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

      {/* Analytics Modal */}
      {showAnalytics && dashboardData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">אנליטיקה מפורטת</h3>
                <button
                  onClick={() => setShowAnalytics(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">סה״כ משימות</h4>
                  <p className="text-2xl font-bold text-primary">{dashboardData.totalTasks}</p>
                </div>
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">משימות גלויות</h4>
                  <p className="text-2xl font-bold text-green-600">{dashboardData.visibleTasks}</p>
                </div>
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">סה״כ פרויקטים</h4>
                  <p className="text-2xl font-bold text-blue-600">{projects.length}</p>
                </div>
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">צפיות בעמודים</h4>
                  <p className="text-2xl font-bold text-purple-600">{dashboardData.totalVisits}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 