'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowRight, 
  Save,
  ChevronRight,
  Target,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import SimpleImageGallery from '@/components/SimpleImageGallery';

interface Task {
  id: string;
  title: string;
  targetCar: string[];
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
  isVisible: boolean;
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
  const [newImages, setNewImages] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<Array<{id: string, url: string}>>([]);


  useEffect(() => {
    fetchData();
  }, [taskId, subtaskId]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      
      const [taskRes, subtaskRes] = await Promise.all([
          fetch(`/api/tasks/${taskId}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/subtasks/${subtaskId}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (taskRes.ok) {
        const taskResult = await taskRes.json();
        setTask(taskResult.task);
        }
      
      if (subtaskRes.ok) {
        const subtaskResult = await subtaskRes.json();
        const subtaskData = subtaskResult.subtask;
        if (subtaskData) {
          setSubtask(subtaskData);
          setEditSubtaskData(subtaskData);
          setExistingImageUrls(subtaskData.images || []);
        } else {
          toast.error('תת-משימה לא נמצאה');
          router.push(`/admin/tasks/${taskId}`);
        }
      } else {
        toast.error('שגיאה בטעינת התת-משימה');
        router.push(`/admin/tasks/${taskId}`);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  };
  
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    // Simple validation, can be expanded
    if (newImages.length + files.length > 10) {
      toast.error('You can upload a maximum of 10 new images.');
      return;
    }
    
    // Convert files to data URLs for preview
    const newPreviews = await Promise.all(
      files.map(async (file, index) => {
        return new Promise<{id: string, url: string}>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({ 
              id: `${file.name}-${index}`, 
              url: reader.result as string 
            });
          };
          reader.readAsDataURL(file);
        });
      })
    );
    
    setNewImages(prev => [...prev, ...files]);
    setNewImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const handleRemoveNewImage = (indexToRemove: number) => {
    setNewImages(prev => prev.filter((_, index) => index !== indexToRemove));
    setNewImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const handleRemoveExistingImage = (urlToRemove: string) => {
    setExistingImageUrls(prev => prev.filter(url => url !== urlToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSubtaskData) return;
    setSubmitting(true);

    try {
      const token = localStorage.getItem('adminToken');
      const formData = new FormData();

      // Explicitly append only the fields that are meant to be edited.
      // This is safer than iterating over the whole state object.
      formData.append('title', editSubtaskData.title || '');
      formData.append('subtitle', editSubtaskData.subtitle || '');
      formData.append('datacoNumber', editSubtaskData.datacoNumber || '');
      formData.append('type', editSubtaskData.type || 'events');
      formData.append('amountNeeded', String(editSubtaskData.amountNeeded || 0));
      
      (editSubtaskData.labels || []).forEach(label => formData.append('labels[]', label));
      (editSubtaskData.dayTime || []).forEach(dt => formData.append('dayTime[]', dt));
      
      formData.append('weather', editSubtaskData.weather || 'Mixed');
      formData.append('scene', editSubtaskData.scene || 'Mixed');
      
      // Append images to upload
      newImages.forEach(file => {
          formData.append('newImages', file);
      });
      
      // Append existing images to keep
      existingImageUrls.forEach(url => {
          formData.append('existingImages[]', url);
      });

      const response = await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();
      
      if (result.success) {
        router.push(`/admin/tasks/${taskId}`);
      } else {
        toast.error('Failed to update subtask: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating subtask:', error);
      toast.error('Error updating subtask');
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
        <div className="max-w-4xl mx-auto">
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

              {/* DATACO Number */}
                <div>
                <label className="block text-sm font-medium text-foreground mb-1">מספר DATACO</label>
                  <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    DATACO-
                  </span>
                    <input
                      type="text"
                      value={editSubtaskData.datacoNumber || ''}
                      onChange={(e) => handleDatacoNumberChange(e.target.value)}
                    className="w-full p-2 pl-16 border border-border rounded-lg bg-background text-foreground"
                    placeholder="12345"
                    />
                      </div>
                  </div>

              {/* Type and Amount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">סוג</label>
                  <select
                    value={editSubtaskData.type || 'events'}
                    onChange={(e) => setEditSubtaskData(prev => ({ ...prev, type: e.target.value as 'events' | 'hours' }))}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="events">אירועים</option>
                    <option value="hours">שעות</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">כמות נדרשת</label>
                  <input
                    type="number"
                    value={editSubtaskData.amountNeeded || 0}
                    onChange={(e) => setEditSubtaskData(prev => ({ ...prev, amountNeeded: Number(e.target.value) }))}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                    placeholder="כמות"
                  />
                </div>
              </div>

              {/* Labels */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">תוויות</label>
                <input
                  type="text"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const newLabel = e.currentTarget.value.trim();
                      if (newLabel && !(editSubtaskData.labels || []).includes(newLabel)) {
                        setEditSubtaskData(prev => ({...prev, labels: [...(prev.labels || []), newLabel]}));
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                  className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                  placeholder="הכנס תווית ולחץ Enter"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {(editSubtaskData.labels || []).map((label, index) => (
                    <div key={index} className="flex items-center bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-sm">
                      {label}
                      <button 
                        type="button"
                        onClick={() => {
                          setEditSubtaskData(prev => ({
                            ...prev,
                            labels: (prev.labels || []).filter(l => l !== label)
                          }));
                        }}
                        className="mr-2 text-muted-foreground hover:text-foreground"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Image Uploader */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">תמונות קיימות</label>
                 <SimpleImageGallery
                    images={existingImageUrls}
                  />
                  {existingImageUrls.length === 0 && (
                    <p className="text-sm text-muted-foreground">אין תמונות קיימות.</p>
                  )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">העלה תמונות חדשות</label>
                <div className="mt-2">
                    <input 
                        type="file" 
                        multiple 
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="w-full text-sm text-slate-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-full file:border-0
                          file:text-sm file:font-semibold
                          file:bg-violet-50 file:text-violet-700
                          hover:file:bg-violet-100"
                    />
                </div>
                {/* Preview for new images */}
                {newImagePreviews.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-foreground">תצוגה מקדימה של תמונות חדשות:</h4>
                    <SimpleImageGallery 
                      images={newImagePreviews.map(preview => preview.url)}
                />
                  </div>
                )}
              </div>

              {/* Technical Details */}
              <h3 className="text-lg font-semibold text-foreground pt-4 border-t border-border">פרטים טכניים</h3>

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

              {/* Day Time */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">זמני יום</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { value: 'day', label: 'יום ☀️' },
                    { value: 'night', label: 'לילה 🌙' },
                    { value: 'dusk', label: 'דמדומים 🌆' },
                    { value: 'dawn', label: 'שחר 🌅' }
                  ].map((dayTimeOption) => (
                    <label key={dayTimeOption.value} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editSubtaskData.dayTime?.includes(dayTimeOption.value) || false}
                        onChange={(e) => {
                          const currentDayTime = editSubtaskData.dayTime || [];
                          if (e.target.checked) {
                            setEditSubtaskData(prev => ({
                              ...prev,
                              dayTime: [...currentDayTime, dayTimeOption.value]
                            }));
                          } else {
                            setEditSubtaskData(prev => ({
                              ...prev,
                              dayTime: currentDayTime.filter(dt => dt !== dayTimeOption.value)
                            }));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{dayTimeOption.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">בחר את זמני היום הרלוונטיים לתת-המשימה</p>
              </div>

              {/* Target Cars */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">רכבי יעד (ירושה מהמשימה)</label>
                <div className="p-2 border border-border rounded-lg bg-muted/30 text-foreground">
                  {task.targetCar?.join(', ') || 'לא נבחרו רכבים'}
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
                  className="flex-1 bg-muted text-foreground px-4 py-2 rounded-lg hover:bg-muted/80 transition-colors flex items-center justify-center gap-2"
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