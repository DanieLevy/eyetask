'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowRight, 
  Save,
  ChevronRight,
  Target
} from 'lucide-react';
import { capitalizeEnglishArray } from '@/lib/utils';
import { MultipleImageUpload } from '@/components/ImageUpload';
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  subtitle?: string;
  images?: string[];
  datacoNumber: string;
  description: string;
  projectId: string;
  type: string[];
  locations: string[];
  targetCar: string[];
  lidar: boolean;
  dayTime: string[];
  priority: number;
  isVisible: boolean;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

interface EditTaskData {
  title: string;
  subtitle?: string;
  images?: string[];
  datacoNumber: string;
  description: { main: string; howToExecute: string };
  type: string[];
  locations: string[];
  targetCar: string[];
  lidar: boolean;
  dayTime: string[];
  priority: number;
}

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.taskId as string;
  
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [editTaskData, setEditTaskData] = useState<EditTaskData>({
    title: '',
    subtitle: '',
    images: [],
    datacoNumber: '',
    description: { main: '', howToExecute: '' },
    type: ['events'],
    locations: ['Urban'],
    targetCar: ['EQ'],
    lidar: false,
    dayTime: ['day'],
    priority: 5
  });

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  const fetchTask = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/tasks/${taskId}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        const taskData = result.data?.task || result.task;
        if (taskData) {
          setTask(taskData);
          setEditTaskData({
            title: taskData.title,
            subtitle: taskData.subtitle || '',
            images: taskData.images || [],
            datacoNumber: taskData.datacoNumber,
            description: typeof taskData.description === 'string' 
              ? { main: taskData.description, howToExecute: '' } 
              : (taskData.description || { main: '', howToExecute: '' }),
            type: taskData.type,
            locations: taskData.locations,
            targetCar: taskData.targetCar,
            lidar: taskData.lidar,
            dayTime: taskData.dayTime,
            priority: taskData.priority
          });
        } else {
          toast.error('משימה לא נמצאה');
          router.push('/admin/dashboard');
        }
      } else {
        toast.error('שגיאה בטעינת המשימה');
        router.push('/admin/dashboard');
      }
    } catch (error) {
      console.error('Error fetching task:', error);
      toast.error('שגיאה בטעינת המשימה');
      router.push('/admin/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify(editTaskData)
      });

      const result = await response.json();
      
      if (result.success) {
        router.push(`/admin/tasks/${taskId}`);
      } else {
        toast.error('Failed to update task: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Error updating task');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle DATACO number input - only allow numbers
  const handleDatacoNumberChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setEditTaskData(prev => ({ ...prev, datacoNumber: numericValue }));
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
          <p className="text-muted-foreground">טוען משימה...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
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
              href={`/admin/tasks/${taskId}`}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="חזור למשימה"
            >
              <ArrowRight className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-primary" />
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>ניהול משימות</span>
                  <ChevronRight className="h-4 w-4" />
                  <span>{task.title}</span>
                  <ChevronRight className="h-4 w-4" />
                  <span>עריכה</span>
                </div>
                <h1 className="text-lg font-bold text-foreground">ערוך משימה</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-lg border border-border">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">ערוך משימה</h2>
              <p className="text-sm text-muted-foreground mt-1">ערוך את המשימה "{task.title}"</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">כותרת *</label>
                  <input
                    type="text"
                    value={editTaskData.title}
                    onChange={(e) => setEditTaskData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-3 border border-border rounded-lg bg-background text-foreground"
                    placeholder="הזן כותרת למשימה"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">כותרת משנה</label>
                  <input
                    type="text"
                    value={editTaskData.subtitle}
                    onChange={(e) => setEditTaskData(prev => ({ ...prev, subtitle: e.target.value }))}
                    className="w-full p-3 border border-border rounded-lg bg-background text-foreground"
                    placeholder="כותרת משנה (אופציונלי)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">מספר DATACO *</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={editTaskData.datacoNumber}
                      onChange={(e) => handleDatacoNumberChange(e.target.value)}
                      className="w-full p-3 border border-border rounded-lg bg-background text-foreground"
                      placeholder="הזן מספר DATACO (מספרים בלבד)"
                    />
                    {editTaskData.datacoNumber && (
                      <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {formatDatacoDisplay(editTaskData.datacoNumber)}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">עדיפות (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editTaskData.priority}
                    onChange={(e) => setEditTaskData(prev => ({ ...prev, priority: parseInt(e.target.value) || 5 }))}
                    className="w-full p-3 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">תיאור המשימה *</label>
                <textarea
                  value={editTaskData.description.main}
                  onChange={(e) => setEditTaskData(prev => ({ ...prev, description: { ...prev.description, main: e.target.value } }))}
                  className="w-full p-3 border border-border rounded-lg bg-background text-foreground h-24"
                  placeholder="תאר את המשימה בפירוט"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">הוראות ביצוע (אופציונלי)</label>
                <textarea
                  value={editTaskData.description.howToExecute}
                  onChange={(e) => setEditTaskData(prev => ({ ...prev, description: { ...prev.description, howToExecute: e.target.value } }))}
                  className="w-full p-3 border border-border rounded-lg bg-background text-foreground h-20"
                  placeholder="הזן הוראות ספציפיות לביצוע המשימה (אם ריק, יוצג טקסט ברירת מחדל)"
                />
                <p className="text-xs text-muted-foreground mt-1">הוראות ספציפיות כיצד לבצע את המשימה. אם לא תמלא, יוצג טקסט ברירת מחדל.</p>
              </div>

              {/* Task Images Upload */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">תמונות המשימה</label>
                <MultipleImageUpload
                  currentImages={editTaskData.images}
                  onImagesChange={(images) => setEditTaskData(prev => ({ ...prev, images }))}
                />
                <p className="text-xs text-muted-foreground mt-1">העלה תמונות רלוונטיות למשימה (עד 5 תמונות)</p>
              </div>

              {/* Task Type (Multi-select) */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">סוג משימה * (ניתן לבחור מספר)</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editTaskData.type.includes('events')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditTaskData(prev => ({ ...prev, type: [...prev.type.filter(t => t !== 'events'), 'events'] }));
                        } else {
                          setEditTaskData(prev => ({ ...prev, type: prev.type.filter(t => t !== 'events') }));
                        }
                      }}
                      className="mr-2"
                    />
                    Events (אירועים)
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editTaskData.type.includes('hours')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditTaskData(prev => ({ ...prev, type: [...prev.type.filter(t => t !== 'hours'), 'hours'] }));
                        } else {
                          setEditTaskData(prev => ({ ...prev, type: prev.type.filter(t => t !== 'hours') }));
                        }
                      }}
                      className="mr-2"
                    />
                    Hours (שעות)
                  </label>
                </div>
              </div>

              {/* Locations (Multi-select) */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">מיקומים * (ניתן לבחור מספר)</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {['Urban', 'Highway', 'Rural', 'Sub-Urban', 'Mixed'].map(location => (
                    <label key={location} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editTaskData.locations.includes(location)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditTaskData(prev => ({ ...prev, locations: [...prev.locations, location] }));
                          } else {
                            setEditTaskData(prev => ({ ...prev, locations: prev.locations.filter(l => l !== location) }));
                          }
                        }}
                        className="mr-2"
                      />
                      {location === 'Urban' ? 'עירוני' : 
                       location === 'Highway' ? 'כביש מהיר' :
                       location === 'Rural' ? 'כפרי' :
                       location === 'Sub-Urban' ? 'פרברי' : 'מעורב'}
                    </label>
                  ))}
                </div>
              </div>

              {/* Target Cars (Editable input) */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">רכבי יעד * (הפרד באמצעות פסיק)</label>
                <input
                  type="text"
                  value={editTaskData.targetCar.join(', ')}
                  onChange={(e) => {
                    const cars = e.target.value.split(',').map(car => car.trim()).filter(car => car.length > 0);
                    setEditTaskData(prev => ({ ...prev, targetCar: cars }));
                  }}
                  className="w-full p-3 border border-border rounded-lg bg-background text-foreground"
                  placeholder="EQ, EQS, S-Class (הפרד באמצעות פסיק)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  רכבים נוכחיים: {capitalizeEnglishArray(editTaskData.targetCar).join(', ') || 'לא נבחרו רכבים'}
                </p>
              </div>

              {/* Day Time (Multi-select) */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">זמן יום * (ניתן לבחור מספר)</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {['day', 'night', 'dawn', 'dusk'].map(time => (
                    <label key={time} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editTaskData.dayTime.includes(time)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditTaskData(prev => ({ ...prev, dayTime: [...prev.dayTime, time] }));
                          } else {
                            setEditTaskData(prev => ({ ...prev, dayTime: prev.dayTime.filter(t => t !== time) }));
                          }
                        }}
                        className="mr-2"
                      />
                      {time === 'day' ? 'יום' : 
                       time === 'night' ? 'לילה' :
                       time === 'dawn' ? 'שחר' : 'בין ערביים'}
                    </label>
                  ))}
                </div>
              </div>

              {/* LiDAR Checkbox */}
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editTaskData.lidar}
                    onChange={(e) => setEditTaskData(prev => ({ ...prev, lidar: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium text-foreground">נדרש LiDAR</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <button
                  type="submit"
                  disabled={submitting || !editTaskData.title || !editTaskData.datacoNumber || !editTaskData.description.main || editTaskData.type.length === 0 || editTaskData.locations.length === 0 || editTaskData.targetCar.length === 0 || editTaskData.dayTime.length === 0}
                  className="flex-1 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {submitting ? 'שומר שינויים...' : 'שמור שינויים'}
                </button>
                <Link
                  href={`/admin/tasks/${taskId}`}
                  className="px-6 py-3 border border-border rounded-lg hover:bg-accent transition-colors font-medium"
                >
                  ביטול
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
} 