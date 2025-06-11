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
  Trash2,
  Calendar,
  MapPin,
  Car,
  Zap,
  Clock,
  Building,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  Layers
} from 'lucide-react';
import { useTasksRealtime, useProjectsRealtime } from '@/hooks/useRealtime';
import { capitalizeEnglish, capitalizeEnglishArray } from '@/lib/utils';
import { usePageRefresh } from '@/hooks/usePageRefresh';
import { RealtimeNotification, useRealtimeNotification } from '@/components/RealtimeNotification';
import { toast } from 'sonner';

interface Task {
  _id: string;
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

interface Subtask {
  _id: string;
  taskId: string;
}

interface Project {
  _id: string;
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
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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
            const exists = current.find(t => t._id === newRecord._id);
            return exists ? current : [...current, newRecord];
          }
          return current;
          
        case 'UPDATE':
          if (newRecord && newRecord.project_id === projectId) {
            // Update existing task
            return current.map(task => 
              task._id === newRecord._id ? newRecord : task
            );
          } else if (newRecord && newRecord.project_id !== projectId) {
            // Task was moved to another project, remove it
            return current.filter(task => task._id !== newRecord._id);
          }
          return current;
          
        case 'DELETE':
          if (oldRecord) {
            // Remove deleted task
            return current.filter(task => task._id !== oldRecord._id);
          }
          return current;
          
        default:
          return current;
      }
    });
  }, [projectId]);

  const fetchProjectData = useCallback(async (isManualRefresh = false) => {
    if (operationLoading && !isManualRefresh) return;
    if (isManualRefresh) {
      setOperationLoading(true);
    } else {
      setLoading(true);
    }
    
    try {
      const token = localStorage.getItem('adminToken');
      const timestamp = Date.now();
      
      const commonHeaders = {
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      };

      const [projectRes, tasksRes] = await Promise.all([
        fetch(`/api/projects/${projectId}?_t=${timestamp}`, { headers: commonHeaders }).then(res => res.json()),
        fetch(`/api/tasks?projectId=${projectId}&_t=${timestamp}`, { headers: commonHeaders }).then(res => res.json())
      ]);

      if (projectRes.success) {
        setProject(projectRes.project);
      } else {
        setError(projectRes.error || 'Failed to fetch project');
        toast.error(projectRes.error || 'Failed to fetch project data.');
        router.push('/admin/dashboard');
        return;
      }

      if (tasksRes.success) {
        setTasks(tasksRes.tasks);
        
        // Fetch subtasks for each task
        if (tasksRes.tasks && tasksRes.tasks.length > 0) {
          const subtasksPromises = tasksRes.tasks.map(task => 
            fetch(`/api/subtasks?taskId=${task._id}&_t=${timestamp}`, { headers: commonHeaders })
              .then(res => res.json())
          );
          
          const subtasksResults = await Promise.all(subtasksPromises);
          const allSubtasks = subtasksResults.flatMap(result => result.success ? result.subtasks : []);
          setSubtasks(allSubtasks || []);
        } else {
          setSubtasks([]);
        }
      }

      if(isManualRefresh){
        toast.success('Project data refreshed');
      }
    } catch (error) {
      console.error('Error fetching project data:', error);
      setError('An unexpected error occurred.');
      toast.error('An unexpected error occurred while fetching data.');
    } finally {
      setLoading(false);
      setOperationLoading(false);
    }
  }, [projectId, router, operationLoading]);

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
      const response = await fetch(`/api/tasks/${taskId}/visibility`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isVisible: !currentVisibility })
      });

      if (response.ok) {
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task._id === taskId ? { ...task, isVisible: !currentVisibility } : task
          )
        );
        toast.success(`Task visibility updated`);
      } else {
        toast.error('Failed to update task visibility');
      }
    } catch (error) {
      console.error('Error toggling task visibility:', error);
      toast.error('An error occurred while updating visibility.');
    }
  };
  
  const getSubtaskCount = (taskId: string) => {
    return subtasks.filter(subtask => subtask.taskId === taskId).length;
  };

  const handleDeleteTask = async (taskId: string) => {
    setOperationLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setTasks(prevTasks => prevTasks.filter(task => task._id !== taskId));
        toast.success('Task deleted successfully');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete task');
      }
    } catch (error) {
      toast.error('An error occurred while deleting the task.');
      console.error('Error deleting task:', error);
    } finally {
      setOperationLoading(false);
      setDeleteConfirm(null);
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 1 && priority <= 3) return 'text-red-500 dark:text-red-400';
    if (priority >= 4 && priority <= 6) return 'text-amber-500 dark:text-amber-400';
    if (priority >= 7 && priority <= 10) return 'text-green-500 dark:text-green-400';
    return 'text-gray-500 dark:text-gray-400';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 1 && priority <= 3) return 'גבוהה';
    if (priority >= 4 && priority <= 6) return 'בינונית';
    if (priority >= 7 && priority <= 10) return 'נמוכה';
    return 'לא הוגדרה';
  };

  // Format DATACO number for display
  const formatDatacoDisplay = (datacoNumber: string) => {
    if (!datacoNumber) return 'N/A';
    return `DATACO-${datacoNumber}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">טוען פרויקט...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center" dir="rtl">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">שגיאה בטעינת פרויקט</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{error || 'הפרויקט לא נמצא.'}</p>
          <Link href="/admin/projects" className="mt-6 inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
            חזור לרשימת הפרויקטים
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900" dir="rtl">
      <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 inline-flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                title="חזור"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
              <div className="flex flex-col">
                <p className="text-sm text-gray-500 dark:text-gray-400">פרויקט</p>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  {project.name}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchProjectData(true)}
                disabled={operationLoading}
                className="p-2 inline-flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                title="רענן נתונים"
              >
                <RefreshCw className={`h-5 w-5 ${operationLoading ? 'animate-spin' : ''}`} />
              </button>
              <Link
                href={`/admin/projects/${project._id}/edit`}
                className="p-2 inline-flex items-center justify-center text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/50 rounded-md transition-colors"
                title="ערוך פרויקט"
              >
                <Edit className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{project.name}</h2>
          <p className="text-base text-gray-600 dark:text-gray-300 mt-2">{project.description}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">משימות ({tasks.length})</h2>
            <Link
              href={`/admin/tasks/new?projectId=${project._id}`}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-sm transition-all hover:scale-105"
            >
              <Plus className="h-4 w-4" />
              הוסף משימה
            </Link>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {tasks.length === 0 ? (
              <div className="text-center py-16">
                 <FileText className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">לא נוצרו משימות עבור פרויקט זה.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {tasks
                  .sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title))
                  .map((task) => {
                    const subtaskCount = getSubtaskCount(task._id);
                    return (
                      <li key={task._id} className="p-4 hover:bg-slate-50 dark:hover:bg-gray-700/40 transition-colors">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex-1 min-w-0">
                            <Link href={`/admin/tasks/${task._id}`} className="block">
                              <p className="font-semibold text-gray-800 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 truncate">{task.title}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{task.subtitle || 'אין תת-כותרת'}</p>
                            </Link>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400 w-full justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold ${getPriorityColor(task.priority)}`}>
                                  {`עדיפות ${getPriorityLabel(task.priority)}`}
                                </span>
                                {subtaskCount > 0 && (
                                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                                    <Layers className="h-3 w-3" />
                                    {subtaskCount} {subtaskCount === 1 ? 'תת-משימה' : 'תת-משימות'}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-xs">{formatDatacoDisplay(task.datacoNumber)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToggleVisibility(task._id, task.isVisible)}
                              className="p-2 inline-flex items-center justify-center text-gray-500 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-md transition-all"
                              title={task.isVisible ? 'הסתר' : 'הצג'}
                            >
                              {task.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-yellow-500"/>}
                            </button>
                            <Link
                              href={`/admin/tasks/${task._id}/edit`}
                              className="p-2 inline-flex items-center justify-center text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-md transition-all"
                              title="ערוך משימה"
                            >
                              <Edit className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => setDeleteConfirm(task._id)}
                              className="p-2 inline-flex items-center justify-center text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-md transition-all"
                              title="מחק משימה"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        </div>
      </main>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold">האם אתה בטוח?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              פעולה זו תמחק לצמיתות את המשימה. לא ניתן לשחזר פעולה זו.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium"
              >
                ביטול
              </button>
              <button
                onClick={() => handleDeleteTask(deleteConfirm)}
                disabled={operationLoading}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
              >
                {operationLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin"/>
                ) : (
                  'אשר מחיקה'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 