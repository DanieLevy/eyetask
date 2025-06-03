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
  RefreshCw
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
  project: string;
  priority: number;
  isVisible: boolean;
  amountNeeded: number;
  description?: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface EditTaskData {
  title: string;
  description: string;
  project: string;
  priority: number;
  amountNeeded: number;
}

interface NewTaskData {
  title: string;
  datacoNumber: string;
  description: string;
  project: string;
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
    project: '',
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
    project: '',
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

  const toggleTaskVisibility = async (taskId: string) => {
    const token = localStorage.getItem('adminToken');
    try {
      const response = await fetch(`/api/tasks/${taskId}/visibility`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      if (response.ok) {
        // Refresh tasks with cache busting
        await refreshTasks();
      }
    } catch (error) {
      console.error('Error toggling task visibility:', error);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setEditFormData({
      title: task.title,
      description: task.description || '',
      project: task.project,
      priority: task.priority,
      amountNeeded: task.amountNeeded
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTask) return;
    
    setOperationLoading(true);
    const token = localStorage.getItem('adminToken');
    
    try {
      const response = await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify(editFormData)
      });

      if (response.ok) {
        await refreshTasks();
        setEditingTask(null);
        console.log('Task updated successfully');
      } else {
        console.error('Failed to update task');
      }
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setOperationLoading(true);
    const token = localStorage.getItem('adminToken');
    
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });

      if (response.ok) {
        await refreshTasks();
        setDeleteConfirm(null);
        console.log('Task deleted successfully');
      } else {
        console.error('Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setOperationLoading(false);
    }
  };

  const refreshTasks = async () => {
    const token = localStorage.getItem('adminToken');
    try {
      // Clear API cache via service worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          console.log('Cache cleared:', event.data);
        };
        navigator.serviceWorker.controller.postMessage(
          { type: 'CLEAR_API_CACHE' }, 
          [messageChannel.port2]
        );
      }
      
      // Add cache busting parameter
      const timestamp = Date.now();
      const response = await fetch(`/api/tasks?_t=${timestamp}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('Error refreshing tasks:', error);
    }
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
            <button className="flex items-center gap-3 p-4 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
              <Plus className="h-5 w-5" />
              <span>הוסף משימה חדשה</span>
            </button>
            <button className="flex items-center gap-3 p-4 bg-secondary/10 text-secondary-foreground rounded-lg hover:bg-secondary/20 transition-colors">
              <Users className="h-5 w-5" />
              <span>צור פרויקט חדש</span>
            </button>
            <button className="flex items-center gap-3 p-4 bg-accent/10 text-accent-foreground rounded-lg hover:bg-accent/20 transition-colors">
              <BarChart3 className="h-5 w-5" />
              <span>צפה בדוחות</span>
            </button>
          </div>
        </div>

        {/* Recent Tasks Management */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">ניהול משימות</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {tasks.length} משימות
              </span>
            </div>
          </div>
          
          <div className="space-y-3">
            {tasks.slice(0, 10).map((task) => (
              <div key={task.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-medium text-foreground">{task.title}</h3>
                    <span className="text-xs text-muted-foreground font-mono">
                      {task.datacoNumber}
                    </span>
                    <span className={`text-xs ${getPriorityColor(task.priority)}`}>
                      עדיפות {task.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>פרויקט: {task.project}</span>
                    <span>כמות: {task.amountNeeded}</span>
                    <span className={task.isVisible ? 'text-green-600' : 'text-red-600'}>
                      {task.isVisible ? 'גלוי' : 'מוסתר'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleTaskVisibility(task.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      task.isVisible 
                        ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                        : 'bg-green-100 text-green-600 hover:bg-green-200'
                    }`}
                    title={task.isVisible ? 'הסתר משימה' : 'הצג משימה'}
                  >
                    {task.isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button 
                    onClick={() => handleEditTask(task)}
                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                    title="ערוך משימה"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => setDeleteConfirm(task.id)}
                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                    title="מחק משימה"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {tasks.length > 10 && (
            <div className="text-center mt-4">
              <button className="text-sm text-primary hover:underline">
                צפה בכל המשימות ({tasks.length})
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-border p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-foreground mb-4">ערוך משימה</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">כותרת</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">תיאור</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full p-2 border border-border rounded-lg bg-background text-foreground h-20"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">פרויקט</label>
                <input
                  type="text"
                  value={editFormData.project}
                  onChange={(e) => setEditFormData({ ...editFormData, project: e.target.value })}
                  className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">עדיפות</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editFormData.priority}
                    onChange={(e) => setEditFormData({ ...editFormData, priority: parseInt(e.target.value) })}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">כמות</label>
                  <input
                    type="number"
                    min="0"
                    value={editFormData.amountNeeded}
                    onChange={(e) => setEditFormData({ ...editFormData, amountNeeded: parseInt(e.target.value) })}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveEdit}
                disabled={operationLoading}
                className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {operationLoading ? 'שומר...' : 'שמור'}
              </button>
              <button
                onClick={() => setEditingTask(null)}
                className="flex-1 py-2 px-4 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-border p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4">מחק משימה</h3>
            <p className="text-muted-foreground mb-6">
              האם אתה בטוח שברצונך למחוק את המשימה? פעולה זו לא ניתנת לביטול.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => handleDeleteTask(deleteConfirm)}
                disabled={operationLoading}
                className="flex-1 py-2 px-4 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {operationLoading ? 'מוחק...' : 'מחק'}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 px-4 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
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