'use client';

import { useEffect, useState, Suspense } from 'react';
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
  RotateCcw,
  X,
  Menu,
  Home
} from 'lucide-react';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';
import { capitalizeEnglish, capitalizeEnglishArray } from '@/lib/utils';
import ImageUpload, { MultipleImageUpload } from '@/components/ImageUpload';
import ModernCheckbox from '@/components/ModernCheckbox';

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
  executionInstructions?: string;
  projectId: string;
  type: string[];
  locations: string[];
  targetCar: string[];
  lidar: boolean;
  dayTime: string[];
  priority: number;
}

function NewTaskPageCore() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [newTaskData, setNewTaskData] = useState<NewTaskData>({
    title: '',
    subtitle: '',
    images: [],
    datacoNumber: '',
    description: '',
    executionInstructions: '',
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

    // Set projectId from query params
    const queryProjectId = searchParams.get('projectId');
    if (queryProjectId) {
      setNewTaskData(prev => ({ ...prev, projectId: queryProjectId }));
    }
  }, [router, searchParams]);

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
          howToExecute: newTaskData.executionInstructions || "יש לעקוב אחר הוראות המשימה"
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
          // Save current form data (except title and dataco) for next task
          setNewTaskData(prev => ({
            title: '', // Reset title
            subtitle: '', // Reset subtitle
            images: [], // Reset images
            datacoNumber: '', // Reset dataco number
            description: prev.description, // Keep description
            executionInstructions: prev.executionInstructions, // Keep execution instructions
            projectId: prev.projectId, // Keep selected project
            type: prev.type, // Keep task type
            locations: prev.locations, // Keep locations
            targetCar: prev.targetCar, // Keep target cars
            lidar: prev.lidar, // Keep lidar setting
            dayTime: prev.dayTime, // Keep day time settings
            priority: prev.priority // Keep priority
          }));
          
          // Show success message
          alert('משימה נוצרה בהצלחה! הטופס נשמר עם כל ההגדרות למשימה הבאה.');
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-3 md:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Navigation and Title */}
            <div className="flex items-center gap-2 md:gap-3">
              <Link
                href="/admin/dashboard"
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="חזור ללוח הבקרה"
              >
                <ArrowRight className="h-4 w-4 text-gray-600" />
              </Link>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-600" />
                <div>
                  <h1 className="text-lg md:text-xl font-bold text-gray-900">
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
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
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
      <main className="p-3 md:p-6">
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
                      value={newTaskData.title}
                      onChange={(e) => setNewTaskData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="הזן כותרת למשימה"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">כותרת משנה</label>
                    <input
                      type="text"
                      value={newTaskData.subtitle}
                      onChange={(e) => setNewTaskData(prev => ({ ...prev, subtitle: e.target.value }))}
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
                          value={newTaskData.datacoNumber}
                          onChange={(e) => setNewTaskData(prev => ({ ...prev, datacoNumber: e.target.value.replace(/[^0-9]/g, '') }))}
                          className="pl-20 p-3 w-full border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="הזן מספר"
                          dir="ltr"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none">
                          DATACO-
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        הזן מספרים בלבד. הקידומת "DATACO-" תתווסף אוטומטית
                      </p>
                      {newTaskData.datacoNumber && (
                        <p className="text-xs text-blue-600 mt-1">
                          תוצג כ: {formatDatacoDisplay(newTaskData.datacoNumber)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">פרויקט *</label>
                      <select
                        value={newTaskData.projectId}
                        onChange={(e) => setNewTaskData(prev => ({ ...prev, projectId: e.target.value }))}
                        className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">בחר פרויקט</option>
                        {projects.map(project => (
                          <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">תיאור המשימה *</label>
                    <textarea
                      value={newTaskData.description}
                      onChange={(e) => setNewTaskData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24 resize-none"
                      placeholder="תאר את המשימה בפירות"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">הוראות ביצוע (אופציונלי)</label>
                    <textarea
                      value={newTaskData.executionInstructions}
                      onChange={(e) => setNewTaskData(prev => ({ ...prev, executionInstructions: e.target.value }))}
                      className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-20 resize-none"
                      placeholder="הזן הוראות ספציפיות לביצוע המשימה"
                    />
                    <p className="text-xs text-gray-500 mt-1">הוראות ספציפיות כיצד לבצע את המשימה. אם לא תמלא, יוצג טקסט ברירת מחדל.</p>
                  </div>

                  {/* Task Images Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">תמונות המשימה (אופציונלי)</label>
                    <MultipleImageUpload
                      onImagesChange={(images) => setNewTaskData(prev => ({ ...prev, images }))}
                      currentImages={newTaskData.images}
                      disabled={operationLoading}
                      maxImages={5}
                    />
                    <p className="text-xs text-gray-500 mt-1">העלה תמונות רלוונטיות למשימה (עד 5 תמונות)</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">עדיפות (1-10) *</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={newTaskData.priority}
                        onChange={(e) => {
                          const value = Number(e.target.value.replace(/[^0-9]/g, ''));
                          setNewTaskData(prev => ({ ...prev, priority: Math.min(Math.max(value, 1), 10) }))
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
                        checked={newTaskData.lidar}
                        onChange={(checked) => setNewTaskData(prev => ({ ...prev, lidar: checked }))}
                        label="נדרש LiDAR"
                      />
                    </div>
                  </div>

                  {/* Task Categories - Mobile-Optimized */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">סוג משימה</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['events', 'objects', 'scenarios', 'weather'].map((type) => (
                          <label key={type} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newTaskData.type.includes(type)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewTaskData(prev => ({ ...prev, type: [...prev.type, type] }));
                                } else {
                                  setNewTaskData(prev => ({ ...prev, type: prev.type.filter(t => t !== type) }));
                                }
                              }}
                              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 capitalize">{type}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">מיקומים</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Urban', 'Highway', 'Rural', 'Parking'].map((location) => (
                          <label key={location} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
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
                              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{location}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">רכב יעד</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['EQ', 'MB', 'General'].map((car) => (
                          <label key={car} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newTaskData.targetCar.includes(car)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewTaskData(prev => ({ ...prev, targetCar: [...prev.targetCar, car] }));
                                } else {
                                  setNewTaskData(prev => ({ ...prev, targetCar: prev.targetCar.filter(c => c !== car) }));
                                }
                              }}
                              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{car}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">זמן יום</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['day', 'night', 'twilight'].map((time) => (
                          <label key={time} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
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
                              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 capitalize">{time}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

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
                    disabled={operationLoading || !newTaskData.title || !newTaskData.datacoNumber || !newTaskData.description || !newTaskData.projectId}
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