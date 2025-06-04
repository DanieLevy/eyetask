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
import { useTasksRealtime, useSubtasksRealtime } from '@/hooks/useRealtime';
import { RealtimeNotification, useRealtimeNotification } from '@/components/RealtimeNotification';
import { capitalizeEnglish, capitalizeEnglishArray } from '@/lib/utils';
import { usePageRefresh } from '@/hooks/usePageRefresh';
import { ImageGallery } from '@/components/ImageUpload';

interface Task {
  id: string;
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
  id: string;
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
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
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

  // Realtime handlers
  const handleTaskChange = useCallback((payload: any) => {
    console.log('🔄 Task realtime update:', payload);
    
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    if (eventType === 'UPDATE' && newRecord && newRecord.id === taskId) {
      // Only update if user is not interacting with forms
      if (!isUserInteracting()) {
        setTask(newRecord);
        showNotification('המשימה עודכנה', 'update');
      }
    } else if (eventType === 'DELETE' && oldRecord && oldRecord.id === taskId) {
      // Task was deleted, redirect back
      showNotification('המשימה נמחקה', 'error');
      if (project) {
        router.push(`/admin/projects/${project.id}`);
      } else {
        router.push('/admin/dashboard');
      }
    }
  }, [taskId, project, router, showNotification, isUserInteracting]);

  const handleSubtaskChange = useCallback((payload: any) => {
    console.log('🔄 Subtask realtime update:', payload);
    
    // Don't update subtasks if user is actively working with forms
    if (isUserInteracting()) {
      console.log('⏸️ Skipping subtask update - user is interacting');
      return;
    }
    
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    setSubtasks(current => {
      switch (eventType) {
        case 'INSERT':
          if (newRecord && newRecord.task_id === taskId) {
            // Add new subtask
            const exists = current.find(s => s.id === newRecord.id);
            if (!exists) {
              showNotification('תת-משימה חדשה נוספה', 'success');
              return [...current, newRecord];
            }
            return current;
          }
          return current;
          
        case 'UPDATE':
          if (newRecord && newRecord.task_id === taskId) {
            // Update existing subtask
            showNotification('תת-משימה עודכנה', 'update');
            return current.map(subtask => 
              subtask.id === newRecord.id ? newRecord : subtask
            );
          }
          return current;
          
        case 'DELETE':
          if (oldRecord) {
            // Remove deleted subtask
            showNotification('תת-משימה נמחקה', 'error');
            return current.filter(subtask => subtask.id !== oldRecord.id);
          }
          return current;
          
        default:
          return current;
      }
    });
  }, [taskId, showNotification, isUserInteracting]);

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

  // Smart refresh function that only refreshes when safe
  const safeRefresh = useCallback(() => {
    fetchTaskData(false); // Non-forced refresh
  }, [fetchTaskData]);

  // Force refresh function for when we need to update regardless
  const forceRefresh = useCallback(() => {
    fetchTaskData(true); // Forced refresh
  }, [fetchTaskData]);

  // Set up realtime subscriptions with safe refresh
  useTasksRealtime(safeRefresh);
  useSubtasksRealtime(taskId, safeRefresh);

  // Register this page's refresh function
  usePageRefresh(forceRefresh);

  useEffect(() => {
    // Initial load should always work
    fetchTaskData(true);
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
        await forceRefresh();
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
          router.push(`/admin/projects/${project.id}`);
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
        await forceRefresh();
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">טוען נתוני משימה...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href={project ? `/admin/projects/${project.id}` : '/admin/dashboard'}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="חזור"
            >
              <ArrowRight className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Eye className="h-6 w-6 text-primary" />
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>פאנל ניהול משימות</span>
                  <ChevronRight className="h-4 w-4" />
                  {project && (
                    <>
                      <span>{project.name}</span>
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                  <span>פאנל ניהול משימות</span>
                </div>
                <h1 className="text-lg font-bold text-foreground">{task.title}</h1>
              </div>
            </div>
            <div className="mr-auto">
              <button
                onClick={() => fetchTaskData(true)}
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
        {/* Task Details */}
        <div className="bg-card rounded-lg border border-border p-6 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-semibold text-foreground">{task.title}</h2>
                <span className="text-sm text-muted-foreground font-mono px-2 py-1 bg-muted rounded">
                  {formatDatacoDisplay(task.datacoNumber)}
                </span>
                {task.priority > 0 && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    {getPriorityLabel(task.priority)}
                  </span>
                )}
              </div>
              {task.subtitle && (
                <p className="text-muted-foreground mb-4">{task.subtitle}</p>
              )}
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">תיאור המשימה</h4>
                  <p className="text-sm text-muted-foreground">{task.description.main}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">אופן ביצוע</h4>
                  <p className="text-sm text-muted-foreground">{task.description.howToExecute}</p>
                </div>
                
                {/* Task Image Display */}
                {task.images && task.images.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      תמונות המשימה ({task.images.length})
                    </h4>
                    <ImageGallery 
                      images={task.images} 
                      className="w-full"
                      maxDisplay={4}
                    />
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground text-left">
              <p>נוצר: {new Date(task.createdAt).toLocaleDateString('he-IL')}</p>
              <p>עודכן: {new Date(task.updatedAt).toLocaleDateString('he-IL')}</p>
            </div>
          </div>

          {/* Task Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-muted/30 rounded-lg p-4">
              <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                כמות נדרשת
              </h5>
              <p className="text-lg font-bold text-primary">{task.amountNeeded}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                מיקומים
              </h5>
              <p className="text-sm">{capitalizeEnglishArray(task.locations).join(', ')}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <Car className="h-4 w-4" />
                רכבי יעד
              </h5>
              <p className="text-sm">{capitalizeEnglishArray(task.targetCar).join(', ')}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                זמני יום
              </h5>
              <p className="text-sm">{task.dayTime.map(getDayTimeLabel).join(', ')}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                סוג משימה
              </h5>
              <p className="text-sm">{capitalizeEnglishArray(task.type).join(', ')}</p>
            </div>
            {task.lidar && (
              <div className="bg-muted/30 rounded-lg p-4">
                <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  LiDAR
                </h5>
                <p className="text-sm text-green-600">נדרש</p>
              </div>
            )}
          </div>
        </div>

        {/* Subtasks Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <Target className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">סה״כ תת-משימות</p>
                <p className="text-2xl font-bold text-foreground">{subtasks.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Events</p>
                <p className="text-2xl font-bold text-foreground">
                  {subtasks.filter(s => s.type === 'events').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Hours</p>
                <p className="text-2xl font-bold text-foreground">
                  {subtasks.filter(s => s.type === 'hours').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card rounded-lg border border-border p-6 mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">פעולות מהירות</h3>
          <div className="flex flex-wrap gap-4">
            <Link
              href={`/admin/tasks/${task.id}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Edit className="h-4 w-4" />
              ערוך משימה
            </Link>
            <Link
              href={`/admin/tasks/${task.id}/subtasks/new`}
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              תת-משימה חדשה
            </Link>
            <button
              onClick={() => handleDeleteTask()}
              className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              מחק משימה
            </button>
          </div>
        </div>

        {/* Subtasks List */}
        <div className="bg-card rounded-lg border border-border">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">תת-משימות</h3>
            <p className="text-sm text-muted-foreground mt-1">נהל את כל התת-משימות של המשימה</p>
          </div>
          
          <div className="p-6">
            {subtasks.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-foreground mb-2">אין תת-משימות</h4>
                <p className="text-muted-foreground mb-4">הוסף תת-משימה ראשונה כדי להתחיל</p>
                <Link
                  href={`/admin/tasks/${taskId}/subtasks/new`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  הוסף תת-משימה ראשונה
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {subtasks.map((subtask) => (
                  <div key={subtask.id} className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-foreground">{subtask.title}</h4>
                          <span className="text-xs text-muted-foreground px-2 py-1 bg-background rounded font-mono">
                            {formatDatacoDisplay(subtask.datacoNumber)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            subtask.type === 'events' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {capitalizeEnglish(subtask.type)}
                          </span>
                        </div>
                        {subtask.subtitle && (
                          <p className="text-sm text-muted-foreground mb-2">{subtask.subtitle}</p>
                        )}
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3 text-muted-foreground" />
                            <span>{subtask.amountNeeded} {capitalizeEnglish(subtask.type)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Cloud className="h-3 w-3 text-muted-foreground" />
                            <span>{capitalizeEnglish(subtask.weather)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            <span>{subtask.scene}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Car className="h-3 w-3 text-muted-foreground" />
                            <span>{capitalizeEnglishArray(subtask.targetCar).join(', ')}</span>
                          </div>
                        </div>
                        
                        {subtask.labels.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {subtask.labels.map((label, index) => (
                              <span 
                                key={index}
                                className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Images Display */}
                        {subtask.images && subtask.images.length > 0 && (
                          <div className="mt-3">
                            <h6 className="text-xs font-medium text-muted-foreground mb-2">
                              תמונות ({subtask.images.length})
                            </h6>
                            <ImageGallery 
                              images={subtask.images} 
                              className="w-full"
                              maxDisplay={3}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDeleteConfirm(subtask.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="מחק תת-משימה"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Realtime Notifications */}
      <RealtimeNotification {...notification} />

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-border w-full max-w-sm">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">אישור מחיקה</h3>
              <p className="text-muted-foreground mb-4">האם אתה בטוח שברצונך למחוק את התת-משימה? פעולה זו לא ניתנת לביטול.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDeleteSubtask(deleteConfirm)}
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