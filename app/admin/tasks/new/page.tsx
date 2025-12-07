'use client';

import { 
  ArrowRight, 
  Eye, 
  Save,
  X,
  Menu,
  Home,
  Car,
  Clock,
  Zap,
  MapPin as Road,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense, useMemo } from 'react';
import { toast } from 'sonner';
import { MultipleImageUpload } from '@/components/ImageUpload';
import ModernCheckbox from '@/components/ModernCheckbox';
import { useHebrewFont as _useHebrewFont } from '@/hooks/useFont';

interface Project {
  _id: string;
  name: string;
}

interface NewTaskData {
  title: string;
  subtitle: string;
  images?: string[];
  datacoNumber: string;
  description: string;
  executionInstructions: string;
  projectId: string;
  type: ('events' | 'hours')[];
  locations: ('Highway' | 'Urban' | 'Country')[];
  targetCar: string;
  lidar: boolean;
  dayTime: ('day' | 'night' | 'dusk' | 'dawn')[];
  priority: number;
}

// --- Reusable MultiSelect Component ---
interface MultiSelectProps<T extends string> {
  label: string;
  options: readonly T[];
  selectedOptions: T[];
  onSelectionChange: (selected: T[]) => void;
  icon?: React.ReactNode;
  hebrewMap: Record<T, string>;
}

function MultiSelect<T extends string>({ label, options, selectedOptions, onSelectionChange, icon, hebrewMap }: MultiSelectProps<T>) {
  const toggleOption = (option: T) => {
    const newSelection = selectedOptions.includes(option)
      ? selectedOptions.filter((item) => item !== option)
      : [...selectedOptions, option];
    onSelectionChange(newSelection);
  };

  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {icon}
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => toggleOption(option)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              selectedOptions.includes(option)
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {hebrewMap[option]}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Target Car Input Component ---
interface TargetCarInputProps {
  value: string;
  onChange: (value: string) => void;
}

function TargetCarInput({ value, onChange }: TargetCarInputProps) {
  const quickAddOptions = ['Cay4', 'Cay8', 'Wstn'];
  const detectedVehicles = useMemo(() => value.split(' ').filter(v => v.trim() !== ''), [value]);

  const addQuickVehicle = (vehicle: string) => {
    if (!detectedVehicles.includes(vehicle)) {
      onChange((value + ' ' + vehicle).trim());
    }
  };

  return (
    <div>
      <label htmlFor="targetCar" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        <Car className="h-5 w-5" />
        רכבי מטרה
      </label>
      <input
        id="targetCar"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="לדוגמה: Cay4 Cay8 Wstn"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">הוספה מהירה:</span>
        {quickAddOptions.map(vehicle => (
          <button 
            key={vehicle}
            type="button"
            onClick={() => addQuickVehicle(vehicle)}
            className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            {vehicle}
          </button>
        ))}
      </div>
      {detectedVehicles.length > 0 && (
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          <span className="font-semibold">רכבים שזוהו:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {detectedVehicles.map((v, i) => (
              <span key={i} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded-md">{v}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NewTaskPageCore() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get('projectId');
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [_user, _setUser] = useState<null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [task, setTask] = useState<NewTaskData>({
    title: '',
    subtitle: '',
    images: [],
    datacoNumber: '',
    description: '',
    executionInstructions: '',
    projectId: initialProjectId || '',
    type: ['events'],
    locations: ['Urban'],
    targetCar: '',
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
      // User data validated - no need to store in state
    } catch {
      router.push('/admin');
      return;
    }

    fetchProjects();

    // Set projectId from query params
    if (initialProjectId) {
      setTask(prev => ({ ...prev, projectId: initialProjectId }));
    }
  }, [router, initialProjectId]);

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
        title: task.title,
        subtitle: task.subtitle,
        images: task.images,
        datacoNumber: task.datacoNumber,
        description: {
          main: task.description,
          howToExecute: task.executionInstructions || "יש לעקוב אחר הוראות המשימה"
        },
        projectId: task.projectId,
        type: task.type,
        locations: task.locations,
        targetCar: task.targetCar.split(' ').filter(v => v.trim() !== ''),
        lidar: task.lidar,
        dayTime: task.dayTime,
        priority: task.priority,
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
          // Save current form data (except title and dataco) for next task
          setTask(prev => ({
            title: '', // Reset title
            subtitle: '', // Reset subtitle
            images: [], // Reset images
            datacoNumber: '', // Reset dataco number
            description: prev.description, // Keep description
            executionInstructions: prev.executionInstructions, // Keep execution instructions
            projectId: prev.projectId, // Keep selected project
            type: prev.type, // Keep task type
            locations: prev.locations, // Keep locations
            targetCar: '', // Reset target car
            lidar: prev.lidar, // Keep lidar setting
            dayTime: prev.dayTime, // Keep day time settings
            priority: prev.priority // Keep priority
          }));
          
          // Show success message
          toast.success('משימה נוצרה בהצלחה! הטופס נשמר עם כל ההגדרות למשימה הבאה.');
        } else {
          // Redirect to the project management page where the task was created
          router.push(`/admin/projects/${task.projectId}`);
        }
      } else {
        toast.error(`שגיאה ביצירת המשימה: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Error creating task');
    } finally {
      setOperationLoading(false);
    }
  };

  // Handle DATACO number input - only allow numbers
  const _handleDatacoNumberChange = (value: string) => {
    // Remove any non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, '');
    setTask(prev => ({ ...prev, datacoNumber: numericValue }));
  };

  // Format DATACO number for display
  const formatDatacoDisplay = (datacoNumber: string) => {
    if (!datacoNumber) return '';
    return `DATACO-${datacoNumber}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  const HEBREW_MAPS = {
    type: { events: 'אירועים', hours: 'שעות' },
    locations: { Highway: 'כביש מהיר', Urban: 'עירוני', Country: 'בין-עירוני' },
    dayTime: { day: 'יום', night: 'לילה', dusk: 'בין ערביים', dawn: 'שחר' }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      {/* Mobile-First Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Navigation and Title */}
            <div className="flex items-center gap-2">
              <Link
                href="/admin/dashboard"
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="חזור ללוח הבקרה"
              >
                <ArrowRight className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </Link>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-600" />
                <div>
                  <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                    משימה חדשה
                  </h1>
                  <p className="text-xs text-gray-500 hidden sm:block">
                    צור משימה לפרויקט
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Mobile Menu */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5 text-gray-600" />
                ) : (
                  <Menu className="h-5 w-5 text-gray-600" />
                )}
              </button>

              {/* Desktop Actions */}
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/"
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Home className="h-4 w-4" />
                  עמוד הבית
                </Link>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-3 pt-3 border-t border-gray-200">
              <Link
                href="/"
                className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-100 transition-colors w-full text-right"
              >
                <Home className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-700">עמוד הבית</span>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        {projects.length === 0 ? (
          <div className="text-center py-8 md:py-12">
            <AlertTriangle className="h-12 md:h-16 w-12 md:w-16 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">אין פרויקטים זמינים</h3>
            <p className="text-gray-600 mb-4 text-sm">כדי ליצור משימה, קודם צריך ליצור פרויקט</p>
            <Link 
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
              חזור ליצירת פרויקט
            </Link>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">הוסף משימה חדשה</h2>
                <p className="text-sm text-gray-600 mt-1">צור משימה חדשה ושייך אותה לפרויקט</p>
              </div>
              
              {/* Form */}
              <div className="p-4 space-y-4">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">כותרת *</label>
                    <input
                      type="text"
                      value={task.title}
                      onChange={(e) => setTask(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="הזן כותרת למשימה"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">כותרת משנה</label>
                    <input
                      type="text"
                      value={task.subtitle}
                      onChange={(e) => setTask(prev => ({ ...prev, subtitle: e.target.value }))}
                      className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="כותרת משנה (אופציונלי)"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">מספר Dataco *</label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={task.datacoNumber}
                          onChange={(e) => setTask(prev => ({ ...prev, datacoNumber: e.target.value.replace(/[^0-9]/g, '') }))}
                          className="pl-20 p-3 w-full border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="הזן מספר"
                          dir="ltr"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none">
                          DATACO-
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        הזן מספרים בלבד. הקידומת &quot;DATACO-&quot; תתווסף אוטומטית
                      </p>
                      {task.datacoNumber && (
                        <p className="text-xs text-blue-600 mt-1">
                          תוצג כ: {formatDatacoDisplay(task.datacoNumber)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">פרויקט *</label>
                      <select
                        value={task.projectId}
                        onChange={(e) => setTask(prev => ({ ...prev, projectId: e.target.value }))}
                        className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">בחר פרויקט</option>
                        {projects.map(project => (
                          <option key={project._id} value={project._id}>{project.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">תיאור המשימה *</label>
                    <textarea
                      value={task.description}
                      onChange={(e) => setTask(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24 resize-none"
                      placeholder="תאר את המשימה בפירות"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">הוראות ביצוע (אופציונלי)</label>
                    <textarea
                      value={task.executionInstructions}
                      onChange={(e) => setTask(prev => ({ ...prev, executionInstructions: e.target.value }))}
                      className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-20 resize-none"
                      placeholder="הזן הוראות ספציפיות לביצוע המשימה"
                    />
                    <p className="text-xs text-gray-500 mt-1">הוראות ספציפיות כיצד לבצע את המשימה. אם לא תמלא, יוצג טקסט ברירת מחדל.</p>
                  </div>

                  {/* Task Images Upload */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">תמונות (אופציונלי)</label>
                    <MultipleImageUpload
                      onImagesChange={(images) => setTask(prev => ({...prev, images}))}
                      currentImages={task.images}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">עדיפות (1-10) *</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={task.priority}
                        onChange={(e) => {
                          const value = Number(e.target.value.replace(/[^0-9]/g, ''));
                          setTask(prev => ({ ...prev, priority: Math.min(Math.max(value, 1), 10) }))
                        }}
                        className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="1-10"
                        min="1"
                        max="10"
                      />
                      <p className="text-xs text-gray-500 mt-1">1 = גבוהה ביותר, 10 = נמוכה</p>
                    </div>
                    <div className="flex items-center pt-6">
                      <ModernCheckbox
                        checked={task.lidar}
                        onChange={(checked) => setTask(prev => ({ ...prev, lidar: checked }))}
                        label="נדרש LiDAR"
                      />
                    </div>
                  </div>

                  {/* Task Categories - Mobile-Optimized */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">סוג משימה</label>
                      <MultiSelect
                        label="סוג משימה"
                        options={['events', 'hours']}
                        selectedOptions={task.type}
                        onSelectionChange={(selected) => setTask(prev => ({...prev, type: selected as ('events' | 'hours')[]}))}
                        icon={<Zap className="h-5 w-5" />}
                        hebrewMap={HEBREW_MAPS.type}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">מיקומים</label>
                      <MultiSelect
                        label="סוגי כביש"
                        options={['Highway', 'Urban', 'Country']}
                        selectedOptions={task.locations}
                        onSelectionChange={(selected) => setTask(prev => ({...prev, locations: selected as ('Highway' | 'Urban' | 'Country')[]}))}
                        icon={<Road className="h-5 w-5" />}
                        hebrewMap={HEBREW_MAPS.locations}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">זמן יום</label>
                      <MultiSelect
                        label="זמן ביום"
                        options={['day', 'night', 'dusk', 'dawn']}
                        selectedOptions={task.dayTime}
                        onSelectionChange={(selected) => setTask(prev => ({...prev, dayTime: selected as ('day' | 'night' | 'dusk' | 'dawn')[]}))}
                        icon={<Clock className="h-5 w-5" />}
                        hebrewMap={HEBREW_MAPS.dayTime}
                      />
                    </div>
                  </div>

                  <TargetCarInput value={task.targetCar} onChange={(value) => setTask(prev => ({ ...prev, targetCar: value }))} />

                  {/* Create Another Checkbox */}
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <input
                      type="checkbox"
                      id="createAnother"
                      checked={createAnother}
                      onChange={(e) => setCreateAnother(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor="createAnother" className="text-sm text-blue-800 font-medium">
                      צור משימה נוספת לאחר השמירה
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    onClick={handleCreateTask}
                    disabled={operationLoading || !task.title || !task.datacoNumber || !task.description || !task.projectId}
                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                  >
                    {operationLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        יוצר משימה...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        צור משימה
                      </>
                    )}
                  </button>
                  
                  <Link
                    href="/admin/dashboard"
                    className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 font-medium"
                  >
                    <X className="h-4 w-4" />
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

// Loading fallback component
function NewTaskPageFallback() {
  _useHebrewFont();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
        <p className="text-gray-600 text-sm">טוען...</p>
      </div>
    </div>
  );
}

// Main export with Suspense boundary
export default function NewTaskPage() {
  return (
    <Suspense fallback={<NewTaskPageFallback />}>
      <NewTaskPageCore />
    </Suspense>
  );
} 