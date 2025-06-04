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

interface Task {
  id: string;
  title: string;
  targetCar: string[];
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

export default function EditSubtaskPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.taskId as string;
  const subtaskId = params.subtaskId as string;
  
  const [task, setTask] = useState<Task | null>(null);
  const [subtask, setSubtask] = useState<Subtask | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [editSubtaskData, setEditSubtaskData] = useState<Partial<Subtask>>({});

  useEffect(() => {
    fetchData();
  }, [taskId, subtaskId]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      
      // Fetch task data
      const taskResponse = await fetch(`/api/tasks/${taskId}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      if (taskResponse.ok) {
        const taskResult = await taskResponse.json();
        const taskData = taskResult.data?.task || taskResult.task;
        if (taskData) {
          setTask(taskData);
        }
      }
      
      // Fetch subtask data
      const subtaskResponse = await fetch(`/api/subtasks/${subtaskId}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      if (subtaskResponse.ok) {
        const subtaskResult = await subtaskResponse.json();
        const subtaskData = subtaskResult.data?.subtask || subtaskResult.subtask;
        if (subtaskData) {
          setSubtask(subtaskData);
          setEditSubtaskData(subtaskData);
        } else {
          alert('תת-משימה לא נמצאה');
          router.push(`/admin/tasks/${taskId}`);
        }
      } else {
        alert('שגיאה בטעינת התת-משימה');
        router.push(`/admin/tasks/${taskId}`);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('שגיאה בטעינת הנתונים');
      router.push(`/admin/tasks/${taskId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify(editSubtaskData)
      });

      const result = await response.json();
      
      if (result.success) {
        router.push(`/admin/tasks/${taskId}`);
      } else {
        alert('Failed to update subtask: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating subtask:', error);
      alert('Error updating subtask');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle DATACO number input - only allow numbers
  const handleDatacoNumberChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setEditSubtaskData(prev => ({ ...prev, datacoNumber: numericValue }));
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
          <p className="text-muted-foreground">טוען תת-משימה...</p>
        </div>
      </div>
    );
  }

  if (!task || !subtask) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">תת-משימה לא נמצאה</h3>
          <Link 
            href={`/admin/tasks/${taskId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            חזור למשימה
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
                  <span>{subtask.title}</span>
                  <ChevronRight className="h-4 w-4" />
                  <span>עריכה</span>
                </div>
                <h1 className="text-lg font-bold text-foreground">ערוך תת-משימה</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-lg border border-border">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">ערוך תת-משימה</h2>
              <p className="text-sm text-muted-foreground mt-1">ערוך את התת-משימה "{subtask.title}"</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">כותרת *</label>
                  <input
                    type="text"
                    value={editSubtaskData.title || ''}
                    onChange={(e) => setEditSubtaskData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                    placeholder="כותרת התת-משימה"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">כותרת משנה</label>
                  <input
                    type="text"
                    value={editSubtaskData.subtitle || ''}
                    onChange={(e) => setEditSubtaskData(prev => ({ ...prev, subtitle: e.target.value }))}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
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
                      value={editSubtaskData.datacoNumber || ''}
                      onChange={(e) => handleDatacoNumberChange(e.target.value)}
                      className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                      placeholder="הזן מספר DATACO (מספרים בלבד)"
                    />
                    {editSubtaskData.datacoNumber && (
                      <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {formatDatacoDisplay(editSubtaskData.datacoNumber)}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    כמות נדרשת *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={editSubtaskData.amountNeeded || 0}
                    onChange={(e) => {
                      const value = Number(e.target.value.replace(/[^0-9]/g, ''));
                      setEditSubtaskData(prev => ({ ...prev, amountNeeded: Math.max(value, 0) }))
                    }}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                    placeholder="הכנס כמות"
                    min="0"
                  />
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">סוג תת-משימה *</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="subtaskType"
                      value="events"
                      checked={editSubtaskData.type === 'events'}
                      onChange={(e) => setEditSubtaskData(prev => ({ ...prev, type: e.target.value as 'events' | 'hours' }))}
                      className="mr-2"
                    />
                    Events (אירועים)
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="subtaskType"
                      value="hours"
                      checked={editSubtaskData.type === 'hours'}
                      onChange={(e) => setEditSubtaskData(prev => ({ ...prev, type: e.target.value as 'events' | 'hours' }))}
                      className="mr-2"
                    />
                    Hours (שעות)
                  </label>
                </div>
              </div>

              {/* Labels */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">תוויות (Labels)</label>
                <input
                  type="text"
                  value={editSubtaskData.labels?.join(' ') || ''}
                  onChange={(e) => {
                    const labelsText = e.target.value;
                    if (labelsText.endsWith(' ') && labelsText.trim().includes(' ')) {
                      const labelsArray = labelsText.split(' ').map(label => label.trim()).filter(label => label.length > 0);
                      setEditSubtaskData(prev => ({ ...prev, labels: labelsArray }));
                    } else {
                      const labelsArray = labelsText.length === 0 ? [] : [labelsText];
                      setEditSubtaskData(prev => ({ ...prev, labels: labelsArray }));
                    }
                  }}
                  onBlur={(e) => {
                    const labelsText = e.target.value;
                    const labelsArray = labelsText.split(' ').map(label => label.trim()).filter(label => label.length > 0);
                    setEditSubtaskData(prev => ({ ...prev, labels: labelsArray }));
                  }}
                  className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                  placeholder="הפרד תוויות ברווח (למשל: urban daytime clear_weather)"
                />
                <p className="text-xs text-muted-foreground mt-1">הפרד תוויות ברווח</p>
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">תמונות (אופציונלי)</label>
                <MultipleImageUpload
                  onImagesChange={(images) => setEditSubtaskData(prev => ({ ...prev, images }))}
                  currentImages={editSubtaskData.images || []}
                  disabled={submitting}
                  maxImages={5}
                />
                <p className="text-xs text-muted-foreground mt-1">העלה תמונות רלוונטיות לתת-המשימה (עד 5 תמונות)</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">מזג אוויר *</label>
                  <select
                    value={editSubtaskData.weather || 'Clear'}
                    onChange={(e) => setEditSubtaskData(prev => ({ ...prev, weather: e.target.value as any }))}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="Clear">בהיר (Clear)</option>
                    <option value="Fog">ערפל (Fog)</option>
                    <option value="Overcast">מעונן (Overcast)</option>
                    <option value="Rain">גשם (Rain)</option>
                    <option value="Snow">שלג (Snow)</option>
                    <option value="Mixed">מעורב (Mixed)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">סצנה *</label>
                  <select
                    value={editSubtaskData.scene || 'Urban'}
                    onChange={(e) => setEditSubtaskData(prev => ({ ...prev, scene: e.target.value as any }))}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="Highway">כביש מהיר (Highway)</option>
                    <option value="Urban">עירוני (Urban)</option>
                    <option value="Rural">כפרי (Rural)</option>
                    <option value="Sub-Urban">פרברי (Sub-Urban)</option>
                    <option value="Test Track">מסלול בדיקות (Test Track)</option>
                    <option value="Mixed">מעורב (Mixed)</option>
                  </select>
                </div>
              </div>

              {/* Target Cars */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">רכבי יעד (ירושה מהמשימה)</label>
                <div className="p-2 border border-border rounded-lg bg-muted/30 text-foreground">
                  {capitalizeEnglishArray(task.targetCar || []).join(', ') || 'לא נבחרו רכבים'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">רכבי היעד עוברים בירושה מהמשימה הראשית</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <button
                  type="submit"
                  disabled={submitting || !editSubtaskData.title || !editSubtaskData.datacoNumber}
                  className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {submitting ? 'שומר שינויים...' : 'שמור שינויים'}
                </button>
                <Link
                  href={`/admin/tasks/${taskId}`}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-center"
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