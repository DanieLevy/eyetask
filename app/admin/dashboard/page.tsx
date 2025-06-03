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
  Settings,
  Plus,
  Edit,
  Trash2,
  EyeOff,
  RefreshCw,
  FolderPlus
} from 'lucide-react';

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

interface Task {
  id: string;
  title: string;
  datacoNumber: string;
  projectId: string;
  priority: number;
  isVisible: boolean;
  amountNeeded: number;
  description?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface EditTaskData {
  title: string;
  description: string;
  projectId: string;
  priority: number;
  amountNeeded: number;
}

interface NewTaskData {
  title: string;
  datacoNumber: string;
  description: string;
  projectId: string;
  type: string[];
  locations: string[];
  amountNeeded: number;
  targetCar: string[];
  lidar: boolean;
  dayTime: string[];
  priority: number;
}

interface NewProjectData {
  name: string;
  description: string;
}

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editFormData, setEditFormData] = useState<EditTaskData>({
    title: '',
    description: '',
    projectId: '',
    priority: 1,
    amountNeeded: 0
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  
  // New states for creating tasks and projects
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [newTaskData, setNewTaskData] = useState<NewTaskData>({
    title: '',
    datacoNumber: '',
    description: '',
    projectId: '',
    type: ['events'],
    locations: ['Urban'],
    amountNeeded: 1,
    targetCar: ['EQ'],
    lidar: false,
    dayTime: ['day'],
    priority: 5
  });
  const [newProjectData, setNewProjectData] = useState<NewProjectData>({
    name: '',
    description: ''
  });
  
  const router = useRouter();

  // Cache invalidation utility
  const clearCaches = async () => {
    try {
      // Clear browser cache for this domain
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          if (cacheName.includes('eyetask')) {
            await caches.delete(cacheName);
            console.log('Deleted cache:', cacheName);
          }
        }
      }
      
      // Clear service worker cache
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
    // Clear caches on component mount to ensure fresh data
    clearCaches();
    
    // Check authentication
    const token = localStorage.getItem('adminToken');
    const userData = localStorage.getItem('adminUser');
    
    console.log('Debug - token:', token);
    console.log('Debug - userData:', userData);
    console.log('Debug - userData type:', typeof userData);
    
    // Handle cases where localStorage might contain the string "undefined"
    if (!token || !userData || userData === 'undefined' || userData === 'null') {
      console.log('Debug - Invalid auth data, redirecting to login');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      router.push('/admin');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      console.log('Debug - Parsed user:', parsedUser);
      
      // Validate that the parsed user has required properties
      if (!parsedUser || !parsedUser.id || !parsedUser.username) {
        throw new Error('Invalid user data structure');
      }
      
      setUser(parsedUser);
    } catch (error) {
      console.error('Error parsing user data:', error);
      console.error('Raw userData that failed to parse:', userData);
      
      // Clear invalid data and redirect to login
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
      }).then(res => {
        if (!res.ok) {
          throw new Error(`Dashboard API error: ${res.status}`);
        }
        return res.json();
      }),
      fetch(`/api/tasks?_t=${Date.now()}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      }).then(res => {
        if (!res.ok) {
          throw new Error(`Tasks API error: ${res.status}`);
        }
        return res.json();
      }),
      fetch(`/api/projects?_t=${Date.now()}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      }).then(res => {
        if (!res.ok) {
          throw new Error(`Projects API error: ${res.status}`);
        }
        return res.json();
      })
    ])
    .then(([dashboardRes, tasksRes, projectsRes]) => {
      console.log('Debug - Dashboard response:', dashboardRes);
      console.log('Debug - Tasks response:', tasksRes);
      console.log('Debug - Projects response:', projectsRes);
      
      if (dashboardRes.success) {
        setDashboardData(dashboardRes.dashboard);
      } else {
        console.error('Dashboard API returned error:', dashboardRes.error);
      }
      if (tasksRes.success) {
        setTasks(tasksRes.tasks);
      } else {
        console.error('Tasks API returned error:', tasksRes.error);
      }
      if (projectsRes.success) {
        setProjects(projectsRes.projects);
      } else {
        console.error('Projects API returned error:', projectsRes.error);
      }
      setLoading(false);
    })
    .catch(error => {
      console.error('Error fetching dashboard data:', error);
      // If authentication error, redirect to login
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

  const handleToggleVisibility = async (taskId: string, currentVisibility: boolean) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/tasks/${taskId}/visibility?_t=${Date.now()}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({ isVisible: !currentVisibility })
      });

      if (response.ok) {
        // Refresh tasks with cache busting
        await refreshData();
      }
    } catch (error) {
      console.error('Error toggling task visibility:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setOperationLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/tasks/${taskId}?_t=${Date.now()}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });

      if (response.ok) {
        await refreshData();
        setDeleteConfirm(null);
        console.log('Task deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;
    
    setOperationLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/tasks/${editingTask.id}?_t=${Date.now()}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify(editFormData)
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('Task updated successfully');
        // Refresh tasks
        await refreshData();
        setEditingTask(null);
      } else {
        console.error('Failed to update task:', result.error);
        alert('Failed to update task: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Error updating task');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleCreateTask = async () => {
    setOperationLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const taskPayload = {
        title: newTaskData.title,
        datacoNumber: newTaskData.datacoNumber,
        description: {
          main: newTaskData.description,
          howToExecute: "יש לעקוב אחר הוראות המשימה"
        },
        projectId: newTaskData.projectId,
        type: newTaskData.type,
        locations: newTaskData.locations,
        amountNeeded: newTaskData.amountNeeded,
        targetCar: newTaskData.targetCar,
        lidar: newTaskData.lidar,
        dayTime: newTaskData.dayTime,
        priority: newTaskData.priority,
        isVisible: true
      };

      const response = await fetch(`/api/tasks?_t=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify(taskPayload)
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('Task created successfully');
        // Reset form
        setNewTaskData({
          title: '',
          datacoNumber: '',
          description: '',
          projectId: '',
          type: ['events'],
          locations: ['Urban'],
          amountNeeded: 1,
          targetCar: ['EQ'],
          lidar: false,
          dayTime: ['day'],
          priority: 5
        });
        setShowNewTaskForm(false);
        // Refresh data
        await refreshData();
      } else {
        console.error('Failed to create task:', result.error);
        alert('Failed to create task: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Error creating task');
    } finally {
      setOperationLoading(false);
    }
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
        // Reset form
        setNewProjectData({
          name: '',
          description: ''
        });
        setShowNewProjectForm(false);
        // Refresh data
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
      
      const [dashboardRes, tasksRes, projectsRes] = await Promise.all([
        fetch(`/api/admin/dashboard?_t=${timestamp}`, {
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
        }).then(res => res.json()),
        fetch(`/api/projects?_t=${timestamp}`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }).then(res => res.json())
      ]);

      if (dashboardRes.success) setDashboardData(dashboardRes.dashboard);
      if (tasksRes.success) setTasks(tasksRes.tasks);
      if (projectsRes.success) setProjects(projectsRes.projects);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const getProjectName = (projectId: string): string => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 1 && priority <= 3) return 'text-red-500';
    if (priority >= 4 && priority <= 6) return 'text-yellow-500';
    if (priority >= 7 && priority <= 10) return 'text-green-500';
    return 'text-gray-500';
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
                <h1 className="text-xl font-bold text-foreground">EyeTask - לוח בקרה</h1>
                <p className="text-sm text-muted-foreground">
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
          <h2 className="text-lg font-semibold text-foreground mb-4">פעולות מהירות</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => setShowNewTaskForm(true)}
              className="bg-primary text-primary-foreground p-4 rounded-lg hover:bg-primary/90 transition-colors text-right"
            >
              <Plus className="h-6 w-6 mb-2" />
              <h3 className="font-semibold">הוסף משימה חדשה</h3>
              <p className="text-sm opacity-90">צור משימה חדשה במערכת</p>
            </button>
            <button 
              onClick={() => setShowNewProjectForm(true)}
              className="bg-secondary text-secondary-foreground p-4 rounded-lg hover:bg-secondary/90 transition-colors text-right"
            >
              <FolderPlus className="h-6 w-6 mb-2" />
              <h3 className="font-semibold">צור פרויקט חדש</h3>
              <p className="text-sm opacity-90">הוסף פרויקט חדש לניהול</p>
            </button>
            <button 
              onClick={() => setShowAnalytics(true)}
              className="bg-accent text-accent-foreground p-4 rounded-lg hover:bg-accent/90 transition-colors text-right"
            >
              <BarChart3 className="h-6 w-6 mb-2" />
              <h3 className="font-semibold">צפה באנליטיקה</h3>
              <p className="text-sm opacity-90">נתונים והחוות על המערכת</p>
            </button>
          </div>
        </div>

        {/* Tasks Management */}
        <section className="mb-8">
          <div className="bg-card rounded-lg border border-border">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">ניהול משימות</h2>
              <p className="text-sm text-muted-foreground mt-1">נהל את כל המשימות במערכת</p>
            </div>
            
            <div className="p-6">
              {tasks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">אין משימות במערכת</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground">{task.title}</h3>
                          <span className="text-xs text-muted-foreground px-2 py-1 bg-background rounded">
                            {task.datacoNumber}
                          </span>
                          {!task.isVisible && (
                            <span className="text-xs text-red-500 px-2 py-1 bg-red-50 rounded flex items-center gap-1">
                              <EyeOff className="h-3 w-3" />
                              מוסתר
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>פרויקט: {getProjectName(task.projectId)}</span>
                          <span>עדיפות: {task.priority}</span>
                          <span>כמות: {task.amountNeeded}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingTask(task);
                            setEditFormData({
                              title: task.title,
                              description: task.description || '',
                              projectId: task.projectId,
                              priority: task.priority,
                              amountNeeded: task.amountNeeded
                            });
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="ערוך משימה"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleVisibility(task.id, task.isVisible)}
                          className={`p-2 rounded transition-colors ${
                            task.isVisible 
                              ? 'text-orange-600 hover:bg-orange-50' 
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={task.isVisible ? 'הסתר משימה' : 'הצג משימה'}
                        >
                          {task.isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(task.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="מחק משימה"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Projects Management */}
        <section className="mb-8">
          <div className="bg-card rounded-lg border border-border">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">ניהול פרויקטים</h2>
              <p className="text-sm text-muted-foreground mt-1">נהל את כל הפרויקטים במערכת</p>
            </div>
            
            <div className="p-6">
              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">אין פרויקטים במערכת</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground mb-1">{project.name}</h3>
                        <p className="text-sm text-muted-foreground">{project.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                          <span>נוצר: {new Date(project.createdAt).toLocaleDateString('he-IL')}</span>
                          <span>עודכן: {new Date(project.updatedAt).toLocaleDateString('he-IL')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="ערוך פרויקט"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="מחק פרויקט"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-border w-full max-w-md">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">ערוך משימה</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">כותרת</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">תיאור</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 border border-border rounded-lg bg-background text-foreground h-20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">פרויקט</label>
                <select
                  value={editFormData.projectId}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, projectId: e.target.value }))}
                  className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                >
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">עדיפות</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={editFormData.priority}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                  className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">כמות נדרשת</label>
                <input
                  type="number"
                  min="1"
                  value={editFormData.amountNeeded}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, amountNeeded: parseInt(e.target.value) }))}
                  className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <button
                onClick={handleUpdateTask}
                disabled={operationLoading}
                className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {operationLoading ? 'שומר...' : 'שמור'}
              </button>
              <button
                onClick={() => setEditingTask(null)}
                disabled={operationLoading}
                className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {showNewTaskForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">הוסף משימה חדשה</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">כותרת</label>
                <input
                  type="text"
                  value={newTaskData.title}
                  onChange={(e) => setNewTaskData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">מספר Dataco</label>
                <input
                  type="text"
                  value={newTaskData.datacoNumber}
                  onChange={(e) => setNewTaskData(prev => ({ ...prev, datacoNumber: e.target.value }))}
                  className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">תיאור</label>
                <textarea
                  value={newTaskData.description}
                  onChange={(e) => setNewTaskData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 border border-border rounded-lg bg-background text-foreground h-20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">פרויקט</label>
                <select
                  value={newTaskData.projectId}
                  onChange={(e) => setNewTaskData(prev => ({ ...prev, projectId: e.target.value }))}
                  className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                >
                  <option value="">בחר פרויקט</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">עדיפות</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newTaskData.priority}
                  onChange={(e) => setNewTaskData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                  className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <button
                onClick={handleCreateTask}
                disabled={operationLoading || !newTaskData.title || !newTaskData.projectId}
                className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {operationLoading ? 'יוצר...' : 'צור משימה'}
              </button>
              <button
                onClick={() => setShowNewTaskForm(false)}
                disabled={operationLoading}
                className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

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
                <label className="block text-sm font-medium text-foreground mb-1">תיאור</label>
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
                  <p className="text-2xl font-bold text-primary">{dashboardData.tasksCount}</p>
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
                  <p className="text-2xl font-bold text-purple-600">{dashboardData.totalPageViews}</p>
                </div>
              </div>
              
              <div className="bg-muted/30 p-4 rounded-lg">
                <h4 className="font-semibold text-foreground mb-3">פרוייקטים פופולריים</h4>
                <div className="space-y-2">
                  {dashboardData.topProjects?.map((project, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-foreground">{project.name}</span>
                      <span className="text-muted-foreground">{project.count} משימות</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-border w-full max-w-sm">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">אישור מחיקה</h3>
              <p className="text-muted-foreground mb-4">האם אתה בטוח שברצונך למחוק את המשימה? פעולה זו לא ניתנת לביטול.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDeleteTask(deleteConfirm)}
                  disabled={operationLoading}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {operationLoading ? 'מוחק...' : 'מחק'}
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={operationLoading}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 