'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowRight, 
  Eye, 
  Plus,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  ArrowLeft,
  Trash2,
  Save,
  RotateCcw
} from 'lucide-react';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';
import { capitalizeEnglish, capitalizeEnglishArray } from '@/lib/utils';
import ImageUpload, { MultipleImageUpload } from '@/components/ImageUpload';
import NumberInput, { NumericTextInput } from '@/components/NumberInput';

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface NewTaskData {
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
}

// Custom NumberInput component for better mobile support and clearing
interface NumberInputProps {
  value: number | string;
  onChange: (value: number) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  className?: string;
  disabled?: boolean;
}

function NumberInput({ value, onChange, placeholder, min, max, className = '', disabled = false }: NumberInputProps) {
  const [inputValue, setInputValue] = useState(value?.toString() || '');

  useEffect(() => {
    setInputValue(value?.toString() || '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Allow empty string for clearing
    if (newValue === '') {
      onChange(min ?? 0);
      return;
    }
    
    // Parse and validate number
    const numValue = parseFloat(newValue);
    if (!isNaN(numValue)) {
      // Apply min/max constraints
      let finalValue = numValue;
      if (min !== undefined && finalValue < min) finalValue = min;
      if (max !== undefined && finalValue > max) finalValue = max;
      onChange(finalValue);
    }
  };

  const handleBlur = () => {
    // If empty on blur, set to minimum or 0
    if (inputValue === '' || isNaN(parseFloat(inputValue))) {
      const defaultValue = min ?? 0;
      setInputValue(defaultValue.toString());
      onChange(defaultValue);
    }
  };

  return (
    <input
      type="number"
      inputMode="numeric"
      pattern="[0-9]*"
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      min={min}
      max={max}
      disabled={disabled}
      className={`
        w-full px-3 py-2 border border-border rounded-md 
        focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
        disabled:bg-muted disabled:cursor-not-allowed
        [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
        ${className}
      `}
    />
  );
}

export default function NewTaskPage() {
  const router = useRouter();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);
  
  const [newTaskData, setNewTaskData] = useState<NewTaskData>({
    title: '',
    subtitle: '',
    images: [],
    datacoNumber: '',
    description: '',
    projectId: '',
    type: ['events'],
    locations: ['Urban'],
    targetCar: ['EQ'],
    lidar: false,
    dayTime: ['day'],
    priority: 5
  });

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

    fetchProjects();
  }, [router]);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const timestamp = Date.now();
      
      const response = await fetch(`/api/projects?_t=${timestamp}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setProjects(result.projects);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    setOperationLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const taskPayload = {
        title: newTaskData.title,
        subtitle: newTaskData.subtitle,
        images: newTaskData.images,
        datacoNumber: newTaskData.datacoNumber,
        description: {
          main: newTaskData.description,
          howToExecute: "יש לעקוב אחר הוראות המשימה"
        },
        projectId: newTaskData.projectId,
        type: newTaskData.type,
        locations: newTaskData.locations,
        targetCar: newTaskData.targetCar,
        lidar: newTaskData.lidar,
        dayTime: newTaskData.dayTime,
        priority: newTaskData.priority,
        isVisible: true
      };

      const response = await fetch(`/api/tasks?_t=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify(taskPayload)
      });

      const result = await response.json();
      
      if (result.success) {
        if (createAnother) {
          // Reset form but keep project selection and show success message
          setNewTaskData(prev => ({
            title: '',
            subtitle: '',
            images: [],
            datacoNumber: '',
            description: '',
            projectId: prev.projectId, // Keep selected project
            type: ['events'],
            locations: ['Urban'],
            targetCar: ['EQ'],
            lidar: false,
            dayTime: ['day'],
            priority: 5
          }));
          
          // Show success message
          alert('משימה נוצרה בהצלחה! אתה יכול ליצור משימה נוספת.');
        } else {
          // Redirect to the project management page where the task was created
          router.push(`/admin/projects/${newTaskData.projectId}`);
        }
      } else {
        alert('Failed to create task: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Error creating task');
    } finally {
      setOperationLoading(false);
    }
  };

  // Handle DATACO number input - only allow numbers
  const handleDatacoNumberChange = (value: string) => {
    // Remove any non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, '');
    setNewTaskData(prev => ({ ...prev, datacoNumber: numericValue }));
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
          <p className="text-muted-foreground">טוען נתונים...</p>
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
                  <span>הוסף משימה חדשה</span>
                </div>
                <h1 className="text-lg font-bold text-foreground">צור משימה חדשה</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">אין פרויקטים זמינים</h3>
            <p className="text-muted-foreground mb-4">כדי ליצור משימה, קודם צריך ליצור פרויקט</p>
            <Link 
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
              חזור ליצירת פרויקט
            </Link>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-semibold text-foreground">הוסף משימה חדשה</h2>
                <p className="text-sm text-muted-foreground mt-1">צור משימה חדשה ושייך אותה לפרויקט</p>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">כותרת *</label>
                    <input
                      type="text"
                      value={newTaskData.title}
                      onChange={(e) => setNewTaskData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full p-3 border border-border rounded-lg bg-background text-foreground"
                      placeholder="הזן כותרת למשימה"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">כותרת משנה</label>
                    <input
                      type="text"
                      value={newTaskData.subtitle}
                      onChange={(e) => setNewTaskData(prev => ({ ...prev, subtitle: e.target.value }))}
                      className="w-full p-3 border border-border rounded-lg bg-background text-foreground"
                      placeholder="כותרת משנה (אופציונלי)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">מספר Dataco *</label>
                    <div className="relative">
                      <NumericTextInput
                        value={newTaskData.datacoNumber}
                        onChange={(value) => setNewTaskData(prev => ({ ...prev, datacoNumber: value }))}
                        className="pl-20 p-3"
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
                    {newTaskData.datacoNumber && (
                      <p className="text-xs text-primary mt-1">
                        תוצג כ: {formatDatacoDisplay(newTaskData.datacoNumber)}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">פרויקט *</label>
                    <select
                      value={newTaskData.projectId}
                      onChange={(e) => setNewTaskData(prev => ({ ...prev, projectId: e.target.value }))}
                      className="w-full p-3 border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="">בחר פרויקט</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">תיאור המשימה *</label>
                  <textarea
                    value={newTaskData.description}
                    onChange={(e) => setNewTaskData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-3 border border-border rounded-lg bg-background text-foreground h-24"
                    placeholder="תאר את המשימה בפירות"
                  />
                </div>

                {/* Task Images Upload */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">תמונות המשימה (אופציונלי)</label>
                  <MultipleImageUpload
                    onImagesChange={(images) => setNewTaskData(prev => ({ ...prev, images }))}
                    currentImages={newTaskData.images}
                    disabled={operationLoading}
                    maxImages={5}
                  />
                  <p className="text-xs text-muted-foreground mt-1">העלה תמונות רלוונטיות למשימה (עד 5 תמונות)</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">עדיפות (1-10) *</label>
                    <NumberInput
                      value={newTaskData.priority}
                      onChange={(value) => setNewTaskData(prev => ({ ...prev, priority: value }))}
                      placeholder="עדיפות"
                      min={1}
                      max={10}
                      className="p-3"
                    />
                    <p className="text-xs text-muted-foreground mt-1">1 = גבוהה ביותר, 10 = נמוכה</p>
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="lidar"
                        checked={newTaskData.lidar}
                        onChange={(e) => setNewTaskData(prev => ({ ...prev, lidar: e.target.checked }))}
                        className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                      />
                      <span className="text-sm font-medium text-foreground">נדרש LiDAR</span>
                    </label>
                  </div>
                </div>

                {/* Type Selection (Multi-select) */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">סוג משימה * (ניתן לבחור מספר)</label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newTaskData.type.includes('events')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewTaskData(prev => ({ ...prev, type: [...prev.type.filter(t => t !== 'events'), 'events'] }));
                          } else {
                            setNewTaskData(prev => ({ ...prev, type: prev.type.filter(t => t !== 'events') }));
                          }
                        }}
                        className="mr-2"
                      />
                      Events (אירועים)
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newTaskData.type.includes('hours')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewTaskData(prev => ({ ...prev, type: [...prev.type.filter(t => t !== 'hours'), 'hours'] }));
                          } else {
                            setNewTaskData(prev => ({ ...prev, type: prev.type.filter(t => t !== 'hours') }));
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
                          checked={newTaskData.locations.includes(location)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewTaskData(prev => ({ ...prev, locations: [...prev.locations, location] }));
                            } else {
                              setNewTaskData(prev => ({ ...prev, locations: prev.locations.filter(l => l !== location) }));
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
                  <label className="block text-sm font-medium text-foreground mb-1">רכבי יעד *</label>
                  <input
                    type="text"
                    value={newTaskData.targetCar.join(' ')}
                    onChange={(e) => {
                      const carsText = e.target.value;
                      // Allow spaces while typing - only split when there are actual complete words
                      if (carsText.endsWith(' ') && carsText.trim().includes(' ')) {
                        // Split only when user completes a word with space
                        const carsArray = carsText.split(' ').map(car => car.trim()).filter(car => car.length > 0);
                        setNewTaskData(prev => ({ ...prev, targetCar: carsArray }));
                      } else {
                        // Keep the raw text until user adds separating spaces
                        const carsArray = carsText.length === 0 ? [] : [carsText];
                        setNewTaskData(prev => ({ ...prev, targetCar: carsArray }));
                      }
                    }}
                    onBlur={(e) => {
                      // Process the final input when user leaves the field
                      const carsText = e.target.value;
                      const carsArray = carsText.split(' ').map(car => car.trim()).filter(car => car.length > 0);
                      setNewTaskData(prev => ({ ...prev, targetCar: carsArray }));
                    }}
                    className="w-full p-3 border border-border rounded-lg bg-background text-foreground"
                    placeholder="הזן שמות רכבים מופרדים ברווח (למשל: EQ EQS GLS S-Class)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">הזן שמות רכבי יעד מופרדים ברווח</p>
                  {newTaskData.targetCar.length > 0 && newTaskData.targetCar[0] !== '' && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newTaskData.targetCar.map((car, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                        >
                          {car}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Day Time (Multi-select) */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">זמני יום * (ניתן לבחור מספר)</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['day', 'night', 'dusk', 'dawn'].map(time => (
                      <label key={time} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newTaskData.dayTime.includes(time)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewTaskData(prev => ({ ...prev, dayTime: [...prev.dayTime, time] }));
                            } else {
                              setNewTaskData(prev => ({ ...prev, dayTime: prev.dayTime.filter(t => t !== time) }));
                            }
                          }}
                          className="mr-2"
                        />
                        {time === 'day' ? 'יום' : 
                         time === 'night' ? 'לילה' :
                         time === 'dusk' ? 'דמדומים' : 'שחר'}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-border">
                {/* Create Another Task Option */}
                <div className="mb-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={createAnother}
                      onChange={(e) => setCreateAnother(e.target.checked)}
                      className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                    />
                    <span className="text-sm font-medium text-foreground">צור משימה נוספת לאחר השמירה</span>
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">אם מסומן, הטופס יישאר פתוח לאחר יצירת המשימה</p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateTask}
                    disabled={operationLoading || !newTaskData.title || !newTaskData.datacoNumber || !newTaskData.projectId || !newTaskData.description || newTaskData.type.length === 0 || newTaskData.locations.length === 0 || newTaskData.targetCar.length === 0 || newTaskData.dayTime.length === 0}
                    className="flex-1 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium"
                  >
                    {operationLoading ? 'יוצר משימה...' : 'צור משימה'}
                  </button>
                  <Link
                    href="/admin/dashboard"
                    className="px-6 py-3 border border-border rounded-lg hover:bg-accent transition-colors font-medium"
                  >
                    ביטול
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 