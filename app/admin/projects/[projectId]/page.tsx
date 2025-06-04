'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowRight, 
  Eye, 
  Target, 
  Plus,
  EyeOff,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  Edit,
  Calendar,
  MapPin,
  Car,
  Zap,
  Clock,
  Building,
  FileText
} from 'lucide-react';
import { useTasksRealtime, useProjectsRealtime } from '@/hooks/useRealtime';
import { capitalizeEnglish, capitalizeEnglishArray } from '@/lib/utils';
import { usePageRefresh } from '@/hooks/usePageRefresh';
import { RealtimeNotification, useRealtimeNotification } from '@/components/RealtimeNotification';

interface Task {
  id: string;
  title: string;
  subtitle?: string;
  datacoNumber: string;
  description: {
    main: string;
    howToExecute: string;
  };
  projectId: string;
  type: ('events' | 'hours')[];
  locations: string[];
  amountNeeded: number;
  targetCar: string[];
  lidar: boolean;
  dayTime: ('day' | 'night' | 'dusk' | 'dawn')[];
  priority: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProjectManagement() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Realtime notifications
  const { notification, showNotification } = useRealtimeNotification();

  // Helper function to check if any operations are active
  const isUserInteracting = useCallback(() => {
    return operationLoading;
  }, [operationLoading]);

  // Realtime handlers
  const handleProjectChange = useCallback((payload: any) => {
    console.log('🔄 Project realtime update:', payload);
    
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    if (eventType === 'UPDATE' && newRecord && newRecord.id === projectId) {
      // Update the current project
      setProject(newRecord);
    } else if (eventType === 'DELETE' && oldRecord && oldRecord.id === projectId) {
      // Project was deleted, redirect to dashboard
      router.push('/admin/dashboard');
    }
  }, [projectId, router]);

  const handleTaskChange = useCallback((payload: any) => {
    console.log('🔄 Task realtime update:', payload);
    
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    setTasks(current => {
      switch (eventType) {
        case 'INSERT':
          if (newRecord && newRecord.project_id === projectId) {
            // Add new task
            const exists = current.find(t => t.id === newRecord.id);
            return exists ? current : [...current, newRecord];
          }
          return current;
          
        case 'UPDATE':
          if (newRecord && newRecord.project_id === projectId) {
            // Update existing task
            return current.map(task => 
              task.id === newRecord.id ? newRecord : task
            );
          } else if (newRecord && newRecord.project_id !== projectId) {
            // Task was moved to another project, remove it
            return current.filter(task => task.id !== newRecord.id);
          }
          return current;
          
        case 'DELETE':
          if (oldRecord) {
            // Remove deleted task
            return current.filter(task => task.id !== oldRecord.id);
          }
          return current;
          
        default:
          return current;
      }
    });
  }, [projectId]);

  const fetchProjectData = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const timestamp = Date.now();
      
      // Fetch project details and its tasks
      const [projectRes, tasksRes] = await Promise.all([
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

      if (projectRes.success) {
        const foundProject = projectRes.projects.find((p: Project) => p.id === projectId);
        if (!foundProject) {
          router.push('/admin/dashboard');
          return;
        }
        setProject(foundProject);
      }

      if (tasksRes.success) {
        const projectTasks = tasksRes.tasks.filter((task: Task) => task.projectId === projectId);
        setTasks(projectTasks);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching project data:', error);
      setLoading(false);
    }
  }, [projectId, router]);

  // Set up realtime subscriptions
  useTasksRealtime(fetchProjectData);
  useProjectsRealtime(fetchProjectData);

  // Register this page's refresh function
  usePageRefresh(fetchProjectData);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('adminToken');
    const userData = localStorage.getItem('adminUser');
    
    if (!token || !userData || userData === 'undefined' || userData === 'null') {
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
      router.push('/admin');
      return;
    }

    fetchProjectData();
  }, [projectId, router, fetchProjectData]);

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
        await fetchProjectData();
      }
    } catch (error) {
      console.error('Error toggling task visibility:', error);
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 1 && priority <= 3) return 'text-red-500 bg-red-50';
    if (priority >= 4 && priority <= 6) return 'text-yellow-500 bg-yellow-50';
    if (priority >= 7 && priority <= 10) return 'text-green-500 bg-green-50';
    return 'text-gray-500 bg-gray-50';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 1 && priority <= 3) return 'גבוהה';
    if (priority >= 4 && priority <= 6) return 'בינונית';
    if (priority >= 7 && priority <= 10) return 'נמוכה';
    return 'ללא';
  };

  // Format DATACO number for display
  const formatDatacoDisplay = (datacoNumber: string) => {
    if (!datacoNumber) return '';
    return `DATACO-${datacoNumber}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">טוען נתוני פרויקט...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">פרויקט לא נמצא</h3>
          <Link 
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            חזור ללוח הבקרה
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/dashboard"
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="חזור ללוח הבקרה"
            >
              <ArrowRight className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Eye className="h-6 w-6 text-primary" />
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>פאנל ניהול משימות</span>
                  <ChevronRight className="h-4 w-4" />
                  <span>ניהול פרויקטים</span>
                </div>
                <h1 className="text-lg font-bold text-foreground">{project.name}</h1>
              </div>
            </div>
            <div className="mr-auto">
              <button
                onClick={fetchProjectData}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors"
                title="רענן נתונים"
              >
                <RefreshCw className="h-4 w-4" />
                רענן
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Project Info */}
        <div className="bg-card rounded-lg border border-border p-6 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">{project.name}</h2>
              {project.description && (
                <p className="text-muted-foreground">{project.description}</p>
              )}
            </div>
            <div className="text-sm text-muted-foreground text-left">
              <p>נוצר: {new Date(project.createdAt).toLocaleDateString('he-IL')}</p>
              <p>עודכן: {new Date(project.updatedAt).toLocaleDateString('he-IL')}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-primary/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-primary" />
                <span className="font-semibold">סה״כ משימות</span>
              </div>
              <p className="text-2xl font-bold text-primary">{tasks.length}</p>
            </div>
            <div className="bg-green-500/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-5 w-5 text-green-600" />
                <span className="font-semibold">משימות גלויות</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {tasks.filter(task => task.isVisible).length}
              </p>
            </div>
            <div className="bg-red-500/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="font-semibold">עדיפות גבוהה</span>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {tasks.filter(task => task.priority >= 1 && task.priority <= 3).length}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card rounded-lg border border-border p-6 mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">פעולות מהירות</h3>
          <div className="flex gap-4">
            <Link
              href={`/admin/tasks/new?projectId=${projectId}`}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              הוסף משימה חדשה
            </Link>
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-card rounded-lg border border-border">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">משימות הפרויקט</h3>
            <p className="text-sm text-muted-foreground mt-1">נהל את כל המשימות בפרויקט זה</p>
          </div>
          
          <div className="p-6">
            {tasks.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-foreground mb-2">אין משימות בפרויקט</h4>
                <p className="text-muted-foreground mb-4">הוסף משימה ראשונה כדי להתחיל</p>
                <Link
                  href={`/admin/tasks/new?projectId=${projectId}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  הוסף משימה ראשונה
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks
                  .sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title))
                  .map((task) => (
                    <div key={task.id} className="relative bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50">
                      {/* Main clickable card area */}
                      <Link
                        href={`/admin/tasks/${task.id}`}
                        className="block p-3 pr-14 cursor-pointer"
                      >
                        <div className="flex flex-col gap-2">
                          {/* Title row with badges */}
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-medium text-foreground truncate flex-1 min-w-0">{task.title}</h4>
                            <span className="text-xs text-muted-foreground px-2 py-1 bg-background rounded font-mono flex-shrink-0">
                            {task.datacoNumber}
                          </span>
                          {task.priority > 0 && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getPriorityColor(task.priority)}`}>
                              {getPriorityLabel(task.priority)}
                            </span>
                          )}
                          {!task.isVisible && (
                              <span className="text-xs text-red-500 px-2 py-1 bg-red-50 rounded flex items-center gap-1 flex-shrink-0">
                              <EyeOff className="h-3 w-3" />
                              מוסתר
                            </span>
                          )}
                        </div>
                          
                          {/* Subtitle */}
                        {task.subtitle && (
                            <p className="text-sm text-muted-foreground line-clamp-1">{task.subtitle}</p>
                          )}
                        </div>
                        </Link>
                      
                      {/* Action buttons - positioned on the right side */}
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleToggleVisibility(task.id, task.isVisible);
                          }}
                          className={`p-1.5 rounded-full transition-colors ${
                            task.isVisible 
                              ? 'text-orange-600 hover:bg-orange-50 bg-white/80' 
                              : 'text-green-600 hover:bg-green-50 bg-white/80'
                          }`}
                          title={task.isVisible ? 'הסתר משימה' : 'הצג משימה'}
                        >
                          {task.isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 