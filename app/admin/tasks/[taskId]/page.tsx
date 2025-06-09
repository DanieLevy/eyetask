'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowRight, 
  Eye, 
  Target, 
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Calendar,
  MapPin,
  Car,
  Zap,
  Clock,
  AlertTriangle,
  ChevronRight,
  Cloud,
  Building,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { RealtimeNotification, useRealtimeNotification } from '@/components/RealtimeNotification';
import { capitalizeEnglish, capitalizeEnglishArray } from '@/lib/utils';
import { usePageRefresh } from '@/hooks/usePageRefresh';
import { ImageGallery } from '@/components/ImageUpload';

interface Task {
  _id: string;
  title: string;
  subtitle?: string;
  images?: string[];
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
  title: string;
  subtitle?: string;
  images?: string[];
  datacoNumber: string;
  type: 'events' | 'hours';
  amountNeeded: number;
  labels: string[];
  targetCar: string[];
  weather: 'Clear' | 'Fog' | 'Overcast' | 'Rain' | 'Snow' | 'Mixed';
  scene: 'Highway' | 'Urban' | 'Rural' | 'Sub-Urban' | 'Test Track' | 'Mixed';
  dayTime: string[];
  createdAt: string;
  updatedAt: string;
}

interface Project {
  _id: string;
  name: string;
  description?: string;
}

export default function TaskManagement() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;
  
  const [task, setTask] = useState<Task | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Operation states
  const [operationLoading, setOperationLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Realtime notifications
  const { notification, showNotification } = useRealtimeNotification();

  // Helper function to check if any operations are active
  const isUserInteracting = useCallback(() => {
    return operationLoading || deleteConfirm !== null;
  }, [operationLoading, deleteConfirm]);

  const fetchTaskData = useCallback(async (forceRefresh = false) => {
    // Prevent automatic refreshes when user is interacting unless forced
    if (!forceRefresh && isUserInteracting()) {
      console.log('⏸️ Skipping automatic refresh - user is interacting');
      return;
    }
    
    try {
      setLoading(true);
      
      // Add cache busting timestamp
      const timestamp = Date.now();
      
      // Fetch task details
      const taskResponse = await fetch(`/api/tasks/${taskId}?_t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!taskResponse.ok) {
        const errorData = await taskResponse.json();
        console.error('Failed to fetch task:', errorData);
        setLoading(false);
        return;
      }
      
      const taskData = await taskResponse.json();
      
      // Handle both formats for consistency
      const taskInfo = taskData.data?.task || taskData.task;
      
      if (!taskInfo) {
        setLoading(false);
        return;
      }
      
      setTask(taskInfo);
      
      // Fetch project details
      if (taskInfo.projectId) {
        const projectResponse = await fetch(`/api/projects/${taskInfo.projectId}?_t=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        if (projectResponse.ok) {
          const projectData = await projectResponse.json();
          setProject(projectData.data?.project || projectData.project);
        }
      }
      
      // Fetch subtasks
      const subtasksResponse = await fetch(`/api/tasks/${taskId}/subtasks?_t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (subtasksResponse.ok) {
        const subtasksData = await subtasksResponse.json();
        // Handle both formats
        const subtasksList = subtasksData.data?.subtasks || subtasksData.subtasks || [];
        setSubtasks(subtasksList);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching task data:', error);
      setLoading(false);
    }
  }, [taskId, isUserInteracting]);

  usePageRefresh(fetchTaskData);

  useEffect(() => {
    fetchTaskData(true); // Initial fetch
  }, [taskId]);

  const handleUpdateSubtask = async () => {
    if (!deleteConfirm) return;
    
    setOperationLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/subtasks/${deleteConfirm}?_t=${Date.now()}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
      });

      if (response.ok) {
        setDeleteConfirm(null);
        // Refresh data after successful deletion
        await fetchTaskData();
      } else {
        alert('Failed to delete subtask');
      }
    } catch (error) {
      console.error('Error deleting subtask:', error);
      alert('Error deleting subtask');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את המשימה? פעולה זו תמחק גם את כל התת-משימות ולא ניתנת לביטול.')) {
      return;
    }
    
    setOperationLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/tasks/${taskId}?_t=${Date.now()}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
      });

      const result = await response.json();
      
      if (result.success) {
        // Navigate back to project or dashboard
        if (project) {
          router.push(`/admin/projects/${project._id}`);
        } else {
          router.push('/admin/dashboard');
        }
      } else {
        alert('Failed to delete task: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error deleting task');
    } finally {
      setOperationLoading(false);
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 1 && priority <= 3) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
    if (priority >= 4 && priority <= 6) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
    if (priority >= 7 && priority <= 10) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
    return 'text-muted-foreground bg-muted';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 1 && priority <= 3) return 'גבוהה';
    if (priority >= 4 && priority <= 6) return 'בינונית';
    if (priority >= 7 && priority <= 10) return 'נמוכה';
    return 'ללא';
  };

  const getDayTimeLabel = (dayTime: string) => {
    const labels: Record<string, string> = {
      day: 'יום',
      night: 'לילה',
      dusk: 'דמדומים',
      dawn: 'שחר'
    };
    return labels[dayTime] || dayTime;
  };

  // Format DATACO number for display
  const formatDatacoDisplay = (datacoNumber: string) => {
    if (!datacoNumber) return '';
    return `DATACO-${datacoNumber}`;
  };

  // Auto-calculate task amount when subtasks change
  const calculateTaskAmount = useCallback(async () => {
    if (!task || subtasks.length === 0) return;
    
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return;

      const response = await fetch(`/api/tasks/${taskId}/calculate-amount`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Refresh task data to get updated amount
        await fetchTaskData();
      }
    } catch (error) {
      console.error('Error calculating task amount:', error);
    }
  }, [task, subtasks, taskId, fetchTaskData]);

  // Call calculate amount when subtasks change
  useEffect(() => {
    if (subtasks.length > 0) {
      calculateTaskAmount();
    }
  }, [subtasks.length]);

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!subtaskId) return;
    
    setOperationLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/subtasks/${subtaskId}?_t=${Date.now()}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
      });

      const result = await response.json();
      
      if (result.success) {
        setDeleteConfirm(null);
        // Refresh data after successful deletion
        await fetchTaskData();
      } else {
        alert('Failed to delete subtask: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting subtask:', error);
      alert('Error deleting subtask');
    } finally {
      setOperationLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">טוען נתוני משימה...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">משימה לא נמצאה</h3>
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title="חזור"
              >
                <ArrowRight className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
              <div className="flex flex-col">
                <p className="text-xs text-gray-500 dark:text-gray-400">פרטי משימה</p>
                <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">
                  {task.title}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchTaskData(true)}
                disabled={operationLoading}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title="רענן נתונים"
              >
                <RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-300 ${operationLoading ? 'animate-spin' : ''}`} />
              </button>
              <Link
                href={`/admin/tasks/${task._id}/edit`}
                className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900"
                title="ערוך משימה"
              >
                <Edit className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6">
        {/* Task Details Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{task.title}</h2>
            {task.subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{task.subtitle}</p>}
          </div>
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">תיאור</h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{task.description.main}</p>
            </div>
            {task.description.howToExecute && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">הוראות ביצוע</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{task.description.howToExecute}</p>
              </div>
            )}
            {task.images && task.images.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">תמונות</h3>
                <ImageGallery images={task.images} />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-100 dark:bg-gray-700/50 rounded-b-lg overflow-hidden">
            <InfoPill icon={FileText} label="DATACO" value={formatDatacoDisplay(task.datacoNumber)} />
            <InfoPill icon={Zap} label="עדיפות" value={getPriorityLabel(task.priority)} color={getPriorityColor(task.priority)} />
            <InfoPill icon={Building} label="פרויקט" value={project?.name || 'N/A'} />
            <InfoPill icon={Car} label="רכב מטרה" value={task.targetCar.join(', ') || 'Any'} />
          </div>
        </div>

        {/* Subtasks Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">תת-משימות ({subtasks.length})</h2>
            <Link
              href={`/admin/tasks/${task._id}/subtasks/new`}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <Plus className="h-4 w-4" />
              הוסף תת-משימה
            </Link>
          </div>

          <div className="p-4">
            {subtasks.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-500 dark:text-gray-400">לא נוצרו תת-משימות.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {subtasks.map((subtask) => (
                  <li key={subtask._id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800 dark:text-gray-100">{subtask.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{subtask.subtitle || 'אין תת-כותרת'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-white dark:bg-gray-800 rounded-full font-mono">
                        {subtask.datacoNumber || 'N/A'}
                      </span>
                      <Link
                        href={`/admin/tasks/${taskId}/subtasks/${subtask._id}/edit`}
                        className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"
                        title="ערוך תת-משימה"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => setDeleteConfirm(subtask._id)}
                        className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"
                        title="מחק תת-משימה"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Delete Task Section */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-200">מחק משימה</h3>
              <p className="text-sm text-red-700 dark:text-red-300">פעולה זו היא קבועה ולא ניתנת לביטול.</p>
            </div>
            <button
              onClick={() => setDeleteConfirm(task._id)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              מחק
            </button>
        </div>
      </main>

      {/* Deletion Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold">האם אתה בטוח?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              {`הפעולה תמחק לצמיתות את ה${deleteConfirm === task._id ? 'משימה' : 'תת-משימה'}.`}
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                ביטול
              </button>
              <button
                onClick={deleteConfirm === task._id ? handleDeleteTask : () => handleDeleteSubtask(deleteConfirm)}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                אשר מחיקה
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const InfoPill: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  color?: string;
}> = ({ icon: Icon, label, value, color }) => (
  <div className="p-3 bg-white dark:bg-gray-800">
    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </div>
    <p className={`text-base font-semibold text-gray-800 dark:text-gray-100 mt-1 truncate ${color || ''}`}>
      {value}
    </p>
  </div>
); 