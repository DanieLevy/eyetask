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
  EyeOff
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
}

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('adminToken');
    const userData = localStorage.getItem('adminUser');
    
    if (!token || !userData) {
      router.push('/admin');
      return;
    }

    setUser(JSON.parse(userData));

    // Fetch dashboard data
    Promise.all([
      fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => res.json()),
      fetch('/api/tasks', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => res.json())
    ])
    .then(([dashboardRes, tasksRes]) => {
      if (dashboardRes.success) {
        setDashboardData(dashboardRes.dashboard);
      }
      if (tasksRes.success) {
        setTasks(tasksRes.tasks);
      }
      setLoading(false);
    })
    .catch(error => {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
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
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        // Refresh tasks
        const tasksRes = await fetch('/api/tasks', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const tasksData = await tasksRes.json();
        if (tasksData.success) {
          setTasks(tasksData.tasks);
        }
      }
    } catch (error) {
      console.error('Error toggling task visibility:', error);
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
                  <button className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">
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
    </div>
  );
} 