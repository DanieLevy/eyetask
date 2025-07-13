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
  MapPin as Road,
  Car,
  Zap,
  Clock,
  AlertTriangle,
  ChevronRight,
  Cloud,
  FileText,
  ImageIcon,
  Loader2,
  Info,
  EyeOff
} from 'lucide-react';
import { RealtimeNotification, useRealtimeNotification } from '@/components/RealtimeNotification';
import { capitalizeEnglish, capitalizeEnglishArray } from '@/lib/utils';
import { usePageRefresh } from '@/hooks/usePageRefresh';
import { toast } from 'sonner';
import SimpleImageGallery from '@/components/SimpleImageGallery';
import { subtaskTypeOptions } from '@/lib/constants';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';

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
  type: 'events' | 'hours' | 'loops';
  amountNeeded: number;
  labels: string[];
  targetCar: string[];
  weather: 'Clear' | 'Fog' | 'Overcast' | 'Rain' | 'Snow' | 'Mixed';
  scene: 'Highway' | 'Urban' | 'Rural' | 'Sub-Urban' | 'Test Track' | 'Mixed';
  dayTime: string[];
  isVisible?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  _id: string;
  name: string;
  description?: string;
}

interface DeleteConfirmationData {
  type: 'task' | 'subtask';
  id: string;
}

const InfoPill: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | React.ReactNode;
  color?: string;
}> = ({ icon: Icon, label, value, color = 'text-gray-500 dark:text-gray-400' }) => (
  <div className="flex items-start gap-3">
    <Icon className={`mt-1 h-5 w-5 flex-shrink-0 ${color}`} />
    <div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-base font-semibold text-gray-800 dark:text-gray-100">{value}</p>
    </div>
  </div>
);

export default function TaskManagement() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;
  
  const [task, setTask] = useState<Task | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmationData | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchTaskData = useCallback(async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin');
      return;
    }
    
    try {
      const timestamp = Date.now();
      
      const taskRes = await fetch(`/api/tasks/${taskId}?_t=${timestamp}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!taskRes.ok) throw new Error('Failed to fetch task');
      const taskData = await taskRes.json();
      
      const taskInfo = taskData.task;
      
      // Ensure the task object has the _id property as the interface expects.
      const formattedTask = {
        ...taskInfo,
        _id: taskInfo._id || taskInfo.id
      };
      setTask(formattedTask);

      if (formattedTask.projectId) {
        const projectRes = await fetch(`/api/projects/${formattedTask.projectId}?_t=${timestamp}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if(projectRes.ok) {
          const projectData = await projectRes.json();
          setProject(projectData.project);
        }
      }

      const subtasksRes = await fetch(`/api/tasks/${taskId}/subtasks?_t=${timestamp}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (subtasksRes.ok) {
        const subtasksData = await subtasksRes.json();
        setSubtasks(subtasksData.data?.subtasks || []);
      }

    } catch (error) {
      console.error('Error fetching task data:', error);
      toast.error("שגיאה בטעינת נתוני המשימה.");
      router.push('/admin/dashboard');
    }
  }, [taskId, router]);

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchTaskData();
    setIsRefreshing(false);
    toast.success("הנתונים עודכנו");
  }, [fetchTaskData]);

  useEffect(() => {
      const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin');
      return;
    }
    setLoading(true);
    fetchTaskData().finally(() => setLoading(false));
  }, [fetchTaskData]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setIsRefreshing(true);
    setDeleteLoading(true);
    const { type, id } = deleteConfirm;
    const url = type === 'task' ? `/api/tasks/${id}` : `/api/subtasks/${id}`;
    const successMessage = type === 'task' ? 'המשימה נמחקה בהצלחה' : 'תת-המשימה נמחקה בהצלחה';
    const errorMessage = type === 'task' ? 'שגיאה במחיקת המשימה' : 'שגיאה במחיקת תת-המשימה';

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      if (result.success) {
        toast.success(successMessage);
        if (type === 'task') {
          router.push(`/admin/projects/${task?.projectId}`);
        } else {
          setSubtasks(prev => prev.filter(st => st._id !== id));
        }
      } else {
        toast.error(result.error || errorMessage);
      }
    } catch (error) {
      toast.error(errorMessage);
    } finally {
      setIsRefreshing(false);
      setDeleteLoading(false);
      setDeleteConfirm(null);
      setShowDeleteDialog(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!task) return;
    
    setIsRefreshing(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/tasks/${taskId}/visibility`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isVisible: !task.isVisible })
      });

      if (response.ok) {
        setTask(prev => prev ? { ...prev, isVisible: !prev.isVisible } : null);
        toast.success(`Task visibility updated`);
      } else {
        toast.error('Failed to update task visibility');
      }
    } catch (error) {
      console.error('Error toggling task visibility:', error);
      toast.error('An error occurred while updating visibility.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSubtaskToggleVisibility = async (subtaskId: string, currentVisibility: boolean) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/subtasks/${subtaskId}/visibility`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isVisible: !currentVisibility })
      });

      if (response.ok) {
        setSubtasks(prevSubtasks => 
          prevSubtasks.map(subtask => 
            subtask._id === subtaskId ? { ...subtask, isVisible: !currentVisibility } : subtask
          )
        );
        toast.success(`Subtask visibility updated`);
      } else {
        toast.error('Failed to update subtask visibility');
      }
    } catch (error) {
      console.error('Error toggling subtask visibility:', error);
      toast.error('An error occurred while updating visibility.');
    }
  };

  const getPriorityInfo = (priority: number): { label: string; color: string } => {
    if (priority >= 1 && priority <= 3) return { label: 'גבוהה', color: 'text-red-500 dark:text-red-400' };
    if (priority >= 4 && priority <= 6) return { label: 'בינונית', color: 'text-amber-500 dark:text-amber-400' };
    if (priority >= 7 && priority <= 10) return { label: 'נמוכה', color: 'text-green-500 dark:text-green-400' };
    return { label: 'לא הוגדרה', color: 'text-gray-500 dark:text-gray-400' };
  };

  const formatDatacoDisplay = (datacoNumber: string) => `DATACO-${datacoNumber}`;
  
  const HEBREW_MAPS = {
    locations: { Highway: 'כביש מהיר', Urban: 'עירוני', Country: 'בין-עירוני' },
    dayTime: { day: 'יום', night: 'לילה', dusk: 'בין ערביים', dawn: 'שחר' }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">טוען משימה...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center" dir="rtl">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">שגיאה בטעינת משימה</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">המשימה לא נמצאה או שאין לך הרשאת גישה.</p>
          <Link href="/admin/dashboard" className="mt-6 inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
            חזור ללוח הבקרה
          </Link>
        </div>
      </div>
    );
  }

  const priorityInfo = getPriorityInfo(task.priority);

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
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">{task.title}</h1>
                  {project && (
                  <Link href={`/admin/projects/${project._id}`} className="text-sm text-blue-600 hover:underline">
                    {project.name}
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="p-2 inline-flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                title="רענן נתונים"
              >
                <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <Link
                href={`/admin/tasks/${task._id}/edit`}
                className="p-2 inline-flex items-center justify-center text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/50 rounded-md transition-colors"
                title="ערוך משימה"
              >
                <Edit className="h-5 w-5" />
              </Link>
              <button
                onClick={() => {
                  setDeleteConfirm({type: 'task', id: task._id});
                  setShowDeleteDialog(true);
                }}
                className="p-2 inline-flex items-center justify-center text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/50 rounded-md transition-colors"
                title="מחק משימה"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Details & Description */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{task.title}</h2>
              <p className="text-base text-gray-600 dark:text-gray-300 mt-2">{task.subtitle}</p>

              <div className="mt-6 border-t pt-6">
                 <h3 className="text-lg font-semibold mb-4">תיאור</h3>
                 <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{task.description.main || 'לא סופק תיאור.'}</p>
              </div>

              {task.description.howToExecute && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">הוראות ביצוע</h3>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{task.description.howToExecute}</p>
                  </div>
                )}
            </div>
            
            {task.images && task.images.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-3">
                  <ImageIcon className="h-5 w-5 text-gray-400" />
                  תמונות מצורפות למשימה ({task.images.length})
                </h3>
                <SimpleImageGallery images={task.images} />
              </div>
            )}
        </div>

          {/* Right Column: Info Pills */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Info className="h-5 w-5 text-gray-400"/>פרטי משימה</h3>
              <div className="space-y-5">
                <InfoPill icon={FileText} label="מספר DATACO" value={formatDatacoDisplay(task.datacoNumber)} />
                <InfoPill icon={Zap} label="עדיפות" value={<span className={priorityInfo.color}>{priorityInfo.label}</span>} color={priorityInfo.color} />
                <InfoPill icon={Car} label="רכבי מטרה" value={task.targetCar.join(', ')} />
                <InfoPill icon={Road} label="סוגי כביש" value={task.locations.map(l => HEBREW_MAPS.locations[l as keyof typeof HEBREW_MAPS.locations] || l).join(', ')} />
                <InfoPill icon={Clock} label="זמן ביום" value={task.dayTime.map(d => HEBREW_MAPS.dayTime[d as keyof typeof HEBREW_MAPS.dayTime] || d).join(', ')} />
                <InfoPill icon={Calendar} label="נוצר בתאריך" value={new Date(task.createdAt).toLocaleDateString('he-IL')} />
              </div>
            </div>
          </div>
        </div>

        {/* Subtasks Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">תת-משימות ({subtasks.length})</h2>
            {task && task._id && (
            <Link
                href={`/admin/tasks/${task._id}/subtasks/new`}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-sm transition-all hover:scale-105"
            >
              <Plus className="h-4 w-4" />
                הוסף תת-משימה
            </Link>
            )}
          </div>
          
          <div>
            {subtasks.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">לא נוצרו תת-משימות.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {subtasks.map((subtask) => (
                  <li key={subtask._id} className="p-4 hover:bg-slate-50 dark:hover:bg-gray-700/40 transition-colors">
                     <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{subtask.title}</p>
                          {/* Show calibration/stability badges */}
                          {subtask.labels?.includes('calibration') && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 text-xs rounded-full font-medium">
                              כיול
                            </span>
                          )}
                          {subtask.labels?.includes('stability') && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200 text-xs rounded-full font-medium">
                              יציבות
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{subtask.subtitle || 'אין תת-כותרת'}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                           <span className="font-mono">{formatDatacoDisplay(subtask.datacoNumber)}</span>
                           <span className="capitalize">{subtask.scene}</span>
                           <span>{subtask.weather}</span>
                           {/* Show amount needed with special styling for calibration tasks */}
                           <span className={subtask.amountNeeded === 0 ? 'text-blue-600 dark:text-blue-400' : ''}>
                             {subtask.type === 'hours' ? `${subtask.amountNeeded} שעות` : 
                              subtask.type === 'loops' ? `${subtask.amountNeeded} לולאות` :
                              `${subtask.amountNeeded} אירועים`}
                           </span>
                        </div>
                        {/* Show calibration type labels */}
                        {subtask.labels && subtask.labels.length > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            {subtask.labels.filter(label => 
                              ['setup-approval', 'calibration-approval', 'di-validation', 'gt-approval', 'c2l-approval'].includes(label)
                            ).map(label => (
                              <span key={label} className="px-2 py-0.5 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 text-xs rounded">
                                {label.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSubtaskToggleVisibility(subtask._id, subtask.isVisible !== false)}
                          className="p-2 inline-flex items-center justify-center text-gray-500 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-md transition-all"
                          title={subtask.isVisible !== false ? 'הסתר' : 'הצג'}
                        >
                          {subtask.isVisible !== false ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-yellow-500"/>}
                        </button>
                        <Link
                          href={`/admin/tasks/${task._id}/subtasks/${subtask._id}/edit`}
                          className="p-2 inline-flex items-center justify-center text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-md transition-all"
                          title="ערוך תת-משימה"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => {
                            setDeleteConfirm({type: 'subtask', id: subtask._id});
                            setShowDeleteDialog(true);
                          }}
                          className="p-2 inline-flex items-center justify-center text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-md transition-all"
                          title="מחק תת-משימה"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {subtask.images && subtask.images.length > 0 && (
                      <div className="mt-3 col-span-2">
                         <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                           תמונות ({subtask.images.length})
                         </h4>
                        <SimpleImageGallery images={subtask.images} />
                  </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
      
      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          setShowDeleteDialog(open);
          if (!open) setDeleteConfirm(null);
        }}
        onConfirm={handleDelete}
        title="האם אתה בטוח?"
        description={
          deleteConfirm?.type === 'task'
            ? 'פעולה זו תמחק לצמיתות את המשימה וכל תת-המשימות שלה. לא ניתן לשחזר פעולה זו.'
            : 'פעולה זו תמחק לצמיתות את תת-המשימה. לא ניתן לשחזר פעולה זו.'
        }
        loading={deleteLoading}
      />
    </div>
  );
} 