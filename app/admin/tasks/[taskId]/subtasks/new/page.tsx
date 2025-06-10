'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowRight, 
  Eye, 
  Save,
  X,
  RefreshCw,
  ChevronRight,
  Plus,
  Target
} from 'lucide-react';
import { capitalizeEnglishArray } from '@/lib/utils';
import { toast } from 'sonner';
import SimpleImageGallery from '@/components/SimpleImageGallery';

interface Task {
  id: string;
  title: string;
  subtitle?: string;
  datacoNumber: string;
  projectId: string;
  type: string[];
  locations: string[];
  targetCar: string[];
  dayTime: string[];
}

interface NewSubtaskData {
  title: string;
  subtitle?: string;
  datacoNumber: string;
  type: 'events' | 'hours';
  amountNeeded: number;
  labels: string[];
  targetCar: string[];
  weather: 'Clear' | 'Fog' | 'Overcast' | 'Rain' | 'Snow' | 'Mixed';
  scene: 'Highway' | 'Urban' | 'Rural' | 'Sub-Urban' | 'Test Track' | 'Mixed';
  dayTime: string[];
}

export default function NewSubtaskPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;
  
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [imagesToUpload, setImagesToUpload] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Array<{id: string, url: string}>>([]);
  
  const [newSubtaskData, setNewSubtaskData] = useState<NewSubtaskData>({
    title: '',
    subtitle: '',
    datacoNumber: '',
    type: 'events',
    amountNeeded: 1,
    labels: [],
    targetCar: ['EQ'],
    weather: 'Mixed',
    scene: 'Mixed',
    dayTime: []
  });

  useEffect(() => {
    if (taskId) {
    fetchTaskData();
    }
  }, [taskId]);

  const fetchTaskData = async () => {
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
          setNewSubtaskData(prev => ({ ...prev, targetCar: taskData.targetCar }));
        }
      }
    } catch (error) {
      console.error('Error fetching task:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (imagesToUpload.length + files.length > 10) {
      toast.error('You can upload a maximum of 10 new images.');
      return;
    }
    
    // Convert files to base64 for preview
    const previews = await Promise.all(
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
    
    setImagesToUpload(prev => [...prev, ...files]);
    setImagePreviewUrls(prev => [...prev, ...previews]);
  };

  const handleRemoveNewImage = (indexToRemove: number) => {
    setImagesToUpload(prev => prev.filter((_, index) => index !== indexToRemove));
    setImagePreviewUrls(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLabelInput = e.target.value;
    setLabelInput(newLabelInput);
    
    const labels = newLabelInput.split(' ').filter(label => label.trim() !== '');
    setNewSubtaskData(prev => ({ ...prev, labels }));
  };

  const handleCreateSubtask = async () => {
    if (!task) return;
    
    setOperationLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const formData = new FormData();
      
      // Append all text fields to formData
      Object.entries(newSubtaskData).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(item => formData.append(`${key}[]`, item));
        } else {
          formData.append(key, String(value));
        }
      });
      formData.append('taskId', task.id);
      
      // Append images
      imagesToUpload.forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch(`/api/subtasks?_t=${Date.now()}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();
      
      if (result.success) {
        if (createAnother) {
          // Reset form but keep some preferences
          setNewSubtaskData(prev => ({
            ...prev, // Keep most settings
            title: '', 
            subtitle: '',
            datacoNumber: '',
          }));
          setImagesToUpload([]); // Clear images for the next one
          setImagePreviewUrls([]); // Clear image previews
          
          toast.success('תת-משימה נוצרה בהצלחה! הטופס נשמר חלקית למשימה הבאה.');
        } else {
          router.push(`/admin/tasks/${taskId}`);
        }
      } else {
        toast.error('Failed to create subtask: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating subtask:', error);
      toast.error('Error creating subtask');
    } finally {
      setOperationLoading(false);
    }
  };

  const formatDatacoDisplay = (datacoNumber: string) => {
    if (!datacoNumber) return '';
    return `DATACO-${datacoNumber}`;
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
              <Eye className="h-6 w-6 text-primary" />
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>פאנל ניהול משימות</span>
                  <ChevronRight className="h-4 w-4" />
                  <span>{task.title}</span>
                  <ChevronRight className="h-4 w-4" />
                  <span>תת-משימה חדשה</span>
                </div>
                <h1 className="text-lg font-bold text-foreground">הוסף תת-משימה חדשה</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">הוסף תת-משימה חדשה</h2>
              <p className="text-sm text-muted-foreground mt-1">צור תת-משימה חדשה עבור המשימה "{task.title}"</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">כותרת *</label>
                  <input
                    type="text"
                    value={newSubtaskData.title}
                    onChange={(e) => setNewSubtaskData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                    placeholder="כותרת התת-משימה"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">כותרת משנה</label>
                  <input
                    type="text"
                    value={newSubtaskData.subtitle}
                    onChange={(e) => setNewSubtaskData(prev => ({ ...prev, subtitle: e.target.value }))}
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
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={newSubtaskData.datacoNumber}
                      onChange={(e) => setNewSubtaskData(prev => ({ ...prev, datacoNumber: e.target.value.replace(/[^0-9]/g, '') }))}
                      className="w-full p-2 border border-border rounded-lg bg-background text-foreground pl-20"
                      placeholder="הזן מספר"
                      dir="ltr"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium pointer-events-none">
                      DATACO-
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    הזן מספרים בלבד. הקידומת "DATACO-" תתווסף אוטומטית
                  </p>
                  {newSubtaskData.datacoNumber && (
                    <p className="text-xs text-primary mt-1">
                      תוצג כ: {formatDatacoDisplay(newSubtaskData.datacoNumber)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    כמות נדרשת *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={newSubtaskData.amountNeeded}
                    onChange={(e) => {
                      const value = Number(e.target.value.replace(/[^0-9]/g, ''));
                      setNewSubtaskData(prev => ({ ...prev, amountNeeded: Math.max(value, 0) }))
                    }}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                    placeholder="הכנס כמות"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">סוג תת-משימה *</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="subtaskType"
                      value="events"
                      checked={newSubtaskData.type === 'events'}
                      onChange={(e) => setNewSubtaskData(prev => ({ ...prev, type: e.target.value as 'events' | 'hours' }))}
                      className="mr-2"
                    />
                    Events (אירועים)
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="subtaskType"
                      value="hours"
                      checked={newSubtaskData.type === 'hours'}
                      onChange={(e) => setNewSubtaskData(prev => ({ ...prev, type: e.target.value as 'events' | 'hours' }))}
                      className="mr-2"
                    />
                    Hours (שעות)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">לייבלים (מופרדים ברווח)</label>
                <input
                  type="text"
                  value={labelInput}
                  onChange={handleLabelChange}
                  className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                  placeholder="לייבל1 לייבל2 לייבל3"
                />
                {newSubtaskData.labels.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newSubtaskData.labels.map((label, index) => (
                      <span key={index} className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                        {label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">העלה תמונות</label>
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
                {imagePreviewUrls.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-foreground">תצוגה מקדימה:</h4>
                    <SimpleImageGallery 
                      images={imagePreviewUrls}
                      onRemove={(id) => {
                        const indexToRemove = imagePreviewUrls.findIndex(preview => preview.id === id);
                        if (indexToRemove !== -1) {
                          handleRemoveNewImage(indexToRemove);
                        }
                      }}
                      removable={true}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">מזג אוויר *</label>
                  <select
                    value={newSubtaskData.weather}
                    onChange={(e) => setNewSubtaskData(prev => ({ ...prev, weather: e.target.value as any }))}
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
                    value={newSubtaskData.scene}
                    onChange={(e) => setNewSubtaskData(prev => ({ ...prev, scene: e.target.value as any }))}
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
                        checked={newSubtaskData.dayTime?.includes(dayTimeOption.value) || false}
                        onChange={(e) => {
                          const currentDayTime = newSubtaskData.dayTime || [];
                          if (e.target.checked) {
                            setNewSubtaskData(prev => ({
                              ...prev,
                              dayTime: [...currentDayTime, dayTimeOption.value]
                            }));
                          } else {
                            setNewSubtaskData(prev => ({
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

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">רכבי יעד (ירושה מהמשימה)</label>
                <div className="p-2 border border-border rounded-lg bg-muted/30 text-foreground">
                  {capitalizeEnglishArray(task.targetCar || []).join(', ') || 'לא נבחרו רכבים'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">רכבי היעד עוברים בירושה מהמשימה הראשית</p>
              </div>
            </div>
            
            <div className="p-6 border-t border-border">
              {/* Create Another Subtask Option */}
                              <div className="mb-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createAnother}
                    onChange={(e) => setCreateAnother(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-foreground">צור תת-משימה נוספת לאחר השמירה (שמור הגדרות)</span>
                </label>
                  <p className="text-xs text-muted-foreground mt-1">אם מסומן, כל ההגדרות יישמרו לתת-המשימה הבאה (מלבד הכותרת ומספר DATACO)</p>
                </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleCreateSubtask}
                  disabled={operationLoading || !newSubtaskData.title || !newSubtaskData.datacoNumber}
                  className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {operationLoading ? 'יוצר...' : 'צור תת-משימה'}
                </button>
                <Link
                  href={`/admin/tasks/${taskId}`}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-center"
                >
                  ביטול
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 