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
  Building,
  FileText,
  ImageIcon,
  Loader2,
  Info
} from 'lucide-react';
import { RealtimeNotification, useRealtimeNotification } from '@/components/RealtimeNotification';
import { capitalizeEnglish, capitalizeEnglishArray } from '@/lib/utils';
import { usePageRefresh } from '@/hooks/usePageRefresh';
import { ImageGallery } from '@/components/ImageUpload';
import { toast } from 'sonner';

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
  const [operationLoading, setOperationLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'task' | 'subtask'; id: string } | null>(null);

  const fetchTaskData = useCallback(async (isManualRefresh = false) => {
    if (operationLoading && !isManualRefresh) return;
    
    if (isManualRefresh) {
      setOperationLoading(true);
    } else {
      setLoading(true);
    }

    try {
      const token = localStorage.getItem('adminToken');
      const timestamp = Date.now();
      
      const taskRes = await fetch(`/api/tasks/${taskId}?_t=${timestamp}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!taskRes.ok) throw new Error('Failed to fetch task');
      const taskData = await taskRes.json();
      const taskInfo = taskData.task;
      setTask(taskInfo);

      if (taskInfo.projectId) {
        const projectRes = await fetch(`/api/projects/${taskInfo.projectId}?_t=${timestamp}`, {
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
        setSubtasks(subtasksData.subtasks || []);
      }

    } catch (error) {
      console.error('Error fetching task data:', error);
      toast.error("שגיאה בטעינת נתוני המשימה.");
      router.push('/admin/dashboard');
    } finally {
      setLoading(false);
      setOperationLoading(false);
      if (isManualRefresh) toast.success("הנתונים עודכנו");
    }
  }, [taskId, router, operationLoading]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin');
      return;
    }
    fetchTaskData(true);
  }, [taskId, fetchTaskData]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setOperationLoading(true);
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
      setOperationLoading(false);
      setDeleteConfirm(null);
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
                onClick={() => fetchTaskData(true)}
                disabled={operationLoading}
                className="p-2 inline-flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                title="רענן נתונים"
              >
                <RefreshCw className={`h-5 w-5 ${operationLoading ? 'animate-spin' : ''}`} />
              </button>
              <Link
                href={`/admin/tasks/${task._id}/edit`}
                className="p-2 inline-flex items-center justify-center text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/50 rounded-md transition-colors"
                title="ערוך משימה"
              >
                <Edit className="h-5 w-5" />
              </Link>
              <button
                onClick={() => setDeleteConfirm({type: 'task', id: task._id})}
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
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><ImageIcon className="h-5 w-5 text-gray-400"/> תמונות</h3>
                <ImageGallery images={task.images} />
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
            <Link
              href={`/admin/tasks/${task._id}/subtasks/new`}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-sm transition-all hover:scale-105"
            >
              <Plus className="h-4 w-4" />
              הוסף תת-משימה
            </Link>
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
                        <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{subtask.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{subtask.subtitle || 'אין תת-כותרת'}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                           <span className="font-mono">{formatDatacoDisplay(subtask.datacoNumber)}</span>
                           <span className="capitalize">{subtask.scene}</span>
                           <span>{subtask.weather}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/admin/tasks/${task._id}/subtasks/${subtask._id}/edit`}
                          className="p-2 inline-flex items-center justify-center text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-md transition-all"
                          title="ערוך תת-משימה"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => setDeleteConfirm({type: 'subtask', id: subtask._id})}
                          className="p-2 inline-flex items-center justify-center text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-md transition-all"
                          title="מחק תת-משימה"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
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
              {deleteConfirm.type === 'task' 
                ? 'פעולה זו תמחק לצמיתות את המשימה ואת כל תת-המשימות המשויכות אליה.'
                : 'פעולה זו תמחק לצמיתות את תת-המשימה.'
              }
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium"
              >
                ביטול
              </button>
              <button
                onClick={handleDelete}
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