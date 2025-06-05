'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowRight, 
  Eye, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  MapPin, 
  Car, 
  Zap,
  Clock,
  Target,
  AlertTriangle,
  Filter,
  X,
  Sun,
  Moon,
  Sunset,
  Sunrise
} from 'lucide-react';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';
import { useTasksRealtime } from '@/hooks/useRealtime';
import { capitalizeEnglish, capitalizeEnglishArray } from '@/lib/utils';
import { usePageRefresh } from '@/hooks/usePageRefresh';
import { ImageDisplay, ImageGallery } from '@/components/ImageUpload';

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
  weather: string;
  scene: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectName = decodeURIComponent(params.projectName as string);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Record<string, Subtask[]>>({});
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [dataFetched, setDataFetched] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);

  // Filtering states
  const [activeFilters, setActiveFilters] = useState<{
    dayTime: ('day' | 'night' | 'dusk' | 'dawn')[];
  }>({
    dayTime: []
  });
  
  // Dropdown state
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Font configurations
  const hebrewHeading = useHebrewFont('heading');
  const mixedBody = useMixedFont('body');

  const fetchProjectData = useCallback(async () => {
    try {
      // Only show loading on initial fetch if no data has been fetched yet
      if (!dataFetched) {
        setLoading(true);
      }
      
      // Add cache busting timestamp
      const timestamp = Date.now();
      
      // First, fetch all projects to find the project ID by name
      const projectsResponse = await fetch(`/api/projects?_t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      const projectsData = await projectsResponse.json();
      const project = projectsData.projects?.find((p: any) => p.name === projectName);
      
      if (!project) {
        console.error('Project not found:', projectName);
        setDataFetched(true);
        setLoading(false);
        return;
      }
      
      // Fetch tasks for this project with cache busting
      const tasksResponse = await fetch(`/api/tasks?_t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      const tasksData = await tasksResponse.json();
      
      // Find all visible tasks for this project - simplified and more robust filtering
      const allTasks = tasksData.tasks || [];
      
      const projectTasks = allTasks.filter((task: Task) => {
        const isVisible = task.isVisible;
        const belongsToProject = task.projectId === project.id;
        return isVisible && belongsToProject;
      });
      
      setTasks(projectTasks);
      
      // Fetch subtasks for each task with cache busting
      const subtaskPromises = projectTasks.map(async (task: Task) => {
        const subtaskResponse = await fetch(`/api/tasks/${task.id}/subtasks?_t=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        const subtaskData = await subtaskResponse.json();
        // Handle both old and new response formats
        const subtasks = subtaskData.data?.subtasks || subtaskData.subtasks || [];
        return { taskId: task.id, subtasks };
      });
      
      const subtaskResults = await Promise.all(subtaskPromises);
      const subtaskMap: Record<string, Subtask[]> = {};
      subtaskResults.forEach(({ taskId, subtasks }) => {
        subtaskMap[taskId] = subtasks;
      });
      
      setSubtasks(subtaskMap);
      setDataFetched(true);
      setLoading(false);
      setProjectId(project.id);
    } catch (error) {
      console.error('Error fetching project data:', error);
      setDataFetched(true);
      setLoading(false);
    }
  }, [projectName, dataFetched]);

  // Register this page's refresh function
  usePageRefresh(fetchProjectData);

  // Set up realtime subscription for tasks
  useTasksRealtime(fetchProjectData);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-filter-dropdown]')) {
        setIsFilterDropdownOpen(false);
      }
    };

    if (isFilterDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isFilterDropdownOpen]);

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const toggleSubtaskExpansion = (subtaskId: string) => {
    const newExpanded = new Set(expandedSubtasks);
    if (newExpanded.has(subtaskId)) {
      newExpanded.delete(subtaskId);
    } else {
      newExpanded.add(subtaskId);
    }
    setExpandedSubtasks(newExpanded);
  };

  // Filter helper functions
  const getDayTimeLabel = (dayTime: string) => {
    switch (dayTime) {
      case 'day': return 'יום';
      case 'night': return 'לילה';
      case 'dusk': return 'דמדומים';
      case 'dawn': return 'שחר';
      default: return dayTime;
    }
  };

  const getDayTimeIcon = (dayTime: string) => {
    switch (dayTime) {
      case 'day': return '☀️';
      case 'night': return '🌙';
      case 'dusk': return '🌆';
      case 'dawn': return '🌅';
      default: return '🕐';
    }
  };

  // Filter tasks based on active filters
  const filteredTasks = tasks.filter(task => {
    // If no day time filters are active, show all tasks
    if (activeFilters.dayTime.length === 0) {
      return true;
    }

    // Check if task has any of the selected day times
    return activeFilters.dayTime.some(selectedTime => 
      task.dayTime.includes(selectedTime)
    );
  });

  // Toggle day time filter
  const toggleDayTimeFilter = (dayTime: 'day' | 'night' | 'dusk' | 'dawn') => {
    setActiveFilters(prev => {
      const newDayTime = prev.dayTime.includes(dayTime)
        ? prev.dayTime.filter(t => t !== dayTime)
        : [...prev.dayTime, dayTime];
      
      return {
        ...prev,
        dayTime: newDayTime
      };
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setActiveFilters({
      dayTime: []
    });
  };

  // Check if any filters are active
  const hasActiveFilters = activeFilters.dayTime.length > 0;

  // Get unique day times from all tasks for filter options
  const availableDayTimes = Array.from(
    new Set(tasks.flatMap(task => task.dayTime))
  ).sort();

  // Format DATACO number to always show with DATACO- prefix
  const formatDatacoNumber = (datacoNumber: string) => {
    if (!datacoNumber) return '';
    const cleanNumber = datacoNumber.replace(/^DATACO-?/i, '');
    return `DATACO-${cleanNumber}`;
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 1 && priority <= 3) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
    if (priority >= 4 && priority <= 6) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
    if (priority >= 7 && priority <= 10) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
    return 'text-muted-foreground bg-muted';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 1 && priority <= 3) return 'גבוהה';
    if (priority >= 4 && priority <= 6) return 'בינונית';
    if (priority >= 7 && priority <= 10) return 'נמוכה';
    return 'ללא';
  };



  if (loading && !dataFetched) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">טוען משימות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="חזור"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 flex-1">
              <Eye className="h-6 w-6 text-primary" />
              <div>
                <h1 className={`text-2xl font-bold text-foreground ${hebrewHeading.fontClass}`}>
                  {projectName}
                </h1>
                <p className={`text-sm text-muted-foreground ${mixedBody.fontClass}`}>
                  {hasActiveFilters ? (
                    <>
                      {filteredTasks.length} מתוך {tasks.length} משימות
                      {activeFilters.dayTime.length > 0 && (
                        <span className="mr-2">
                          • מסונן לפי: {activeFilters.dayTime.map(getDayTimeLabel).join(', ')}
                        </span>
                      )}
                    </>
                  ) : (
                    `${tasks.length} משימות זמינות`
                  )}
                </p>
              </div>
            </div>
            

          </div>
        </div>
      </div>

      {/* Filter Dropdown Section */}
      {tasks.length > 0 && (
        <div className="bg-muted/20 border-b border-border">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Filter Dropdown */}
              {availableDayTimes.length > 0 && (
                <div className="relative" data-filter-dropdown>
                  <button
                    onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors"
                  >
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {hasActiveFilters 
                        ? `סינון פעיל (${activeFilters.dayTime.length})`
                        : 'סנן לפי זמן יום'
                      }
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {isFilterDropdownOpen && (
                    <div className="absolute top-full mt-1 right-0 z-50 bg-background border border-border rounded-lg shadow-lg p-2 w-64 max-w-[calc(100vw-2rem)]">
                      <div className="space-y-1">
                        {availableDayTimes.map((dayTime) => {
                          const isActive = activeFilters.dayTime.includes(dayTime);
                          const taskCount = tasks.filter(task => task.dayTime.includes(dayTime)).length;
                          
                          return (
                            <button
                              key={dayTime}
                              onClick={() => toggleDayTimeFilter(dayTime)}
                              className={`
                                w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors
                                ${isActive
                                  ? 'bg-primary text-primary-foreground'
                                  : 'hover:bg-accent text-foreground'
                                }
                              `}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-base">
                                  {getDayTimeIcon(dayTime)}
                                </span>
                                <span>
                                  {getDayTimeLabel(dayTime)}
                                </span>
                              </div>
                              <span className={`
                                px-2 py-0.5 rounded-full text-xs font-medium
                                ${isActive 
                                  ? 'bg-primary-foreground/20 text-primary-foreground' 
                                  : 'bg-muted text-muted-foreground'
                                }
                              `}>
                                {taskCount}
                              </span>
                            </button>
                          );
                        })}
                        
                        {/* Clear All Option */}
                        {hasActiveFilters && (
                          <>
                            <hr className="my-2 border-border" />
                            <button
                              onClick={() => {
                                clearAllFilters();
                                setIsFilterDropdownOpen(false);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-destructive hover:bg-destructive/10 rounded-md text-sm transition-colors"
                            >
                              <X className="h-4 w-4" />
                              <span>נקה את כל הסינונים</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-2 text-sm">
                <span className={`text-muted-foreground ${mixedBody.fontClass}`}>
                  {hasActiveFilters ? (
                    <>
                      {filteredTasks.length} מתוך {tasks.length} משימות
                      {activeFilters.dayTime.length > 0 && (
                        <span className="mr-2">
                          • {activeFilters.dayTime.map(getDayTimeLabel).join(', ')}
                        </span>
                      )}
                    </>
                  ) : (
                    `${tasks.length} משימות זמינות`
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">אין משימות זמינות</h3>
            <p className="text-muted-foreground">משימות יופיעו כאן כאשר יתווספו על ידי המנהל</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <Filter className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">אין משימות מתאימות לסינון</h3>
            <p className="text-muted-foreground mb-4">
              נסה לשנות את הסינון או לנקות את כל המסננים
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <X className="h-4 w-4" />
                נקה סינון
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTasks
              .sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title))
              .map((task) => {
                const isExpanded = expandedTasks.has(task.id);
                const taskSubtasks = subtasks[task.id] || [];
                
                return (
                  <div key={task.id} className="bg-card rounded-lg border border-border overflow-hidden">
                    {/* Task Header - Always Visible (Collapsed View) */}
                    <button
                      onClick={() => toggleTaskExpansion(task.id)}
                      className="w-full p-4 text-right hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          {/* Top row: Title and Dataco number only */}
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-base font-semibold text-foreground">{task.title}</h3>
                            <span className="text-xs text-muted-foreground font-mono px-2 py-1 bg-muted rounded">
                              {formatDatacoNumber(task.datacoNumber)}
                            </span>
                          </div>
                          
                          {/* Bottom row: Priority and subtask count */}
                          {!isExpanded && (
                            <div className="flex items-center gap-3 text-xs">
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                {getPriorityLabel(task.priority)}
                              </div>
                              {taskSubtasks.length > 0 && (
                                <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium">
                                  {taskSubtasks.length} תת-משימות
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Task Details - Collapsible */}
                    {isExpanded && (
                      <div className="px-6 pb-6 border-t border-border">
                        <div className="space-y-6 pt-6">
                          {/* Subtitle when expanded */}
                          {task.subtitle && (
                            <div>
                              <p className="text-muted-foreground">{task.subtitle}</p>
                            </div>
                          )}

                          {/* Task type and basic info when expanded */}
                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <strong>סוג:</strong> {capitalizeEnglishArray(task.type).join(', ')}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <strong>מיקומים:</strong> {capitalizeEnglishArray(task.locations).join(', ')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Car className="h-3 w-3" />
                              <strong>רכבי יעד:</strong> {capitalizeEnglishArray(task.targetCar).join(', ')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <strong>זמני יום:</strong> {task.dayTime.map(getDayTimeLabel).join(', ')}
                            </span>
                          </div>

                          {/* Description */}
                          <div>
                            <h4 className="font-semibold text-foreground mb-2 text-sm">תיאור המשימה</h4>
                            <p className="text-muted-foreground text-sm">{task.description.main}</p>
                          </div>

                          {/* Execution Instructions */}
                          <div>
                            <h4 className="font-semibold text-foreground mb-2 text-sm">הוראות ביצוע</h4>
                            <p className="text-muted-foreground text-sm">{task.description.howToExecute}</p>
                          </div>

                          {/* Task Image Display */}
                          {task.images && task.images.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-foreground mb-2 text-sm">תמונות המשימה</h4>
                              <ImageGallery 
                                images={task.images} 
                                className="w-full"
                                showExpand={true}
                                maxDisplay={4}
                              />
                            </div>
                          )}

                          {/* Technical Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold text-foreground mb-2 text-sm">פרטים טכניים</h4>
                              <div className="space-y-2 text-xs">
                                <div className="flex items-center gap-2">
                                  <Zap className="h-3 w-3 text-muted-foreground" />
                                  <span><strong>LiDAR:</strong> {task.lidar ? 'כן' : 'לא'}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground mb-2 text-sm">כמות נדרשת</h4>
                              <div className="text-xl font-bold text-primary">
                                {task.amountNeeded}
                              </div>
                            </div>
                          </div>

                          {/* Subtasks */}
                          {taskSubtasks.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-foreground mb-3 text-sm">תת-משימות</h4>
                              <div className="space-y-2">
                                {taskSubtasks.map((subtask) => {
                                  const isSubtaskExpanded = expandedSubtasks.has(subtask.id);
                                  
                                  return (
                                    <div key={subtask.id} className="bg-muted/30 rounded-lg overflow-hidden">
                                      {/* Subtask Header - Minimal Info (Collapsed) */}
                                      <button
                                        onClick={() => toggleSubtaskExpansion(subtask.id)}
                                        className="w-full p-3 text-right hover:bg-muted/50 transition-colors"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <h5 className="font-medium text-foreground text-sm">{subtask.title}</h5>
                                            <span className="text-xs text-muted-foreground font-mono px-2 py-1 bg-background rounded">
                                              {formatDatacoNumber(subtask.datacoNumber)}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {isSubtaskExpanded ? (
                                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            )}
                                          </div>
                                        </div>
                                      </button>

                                      {/* Subtask Details - Collapsible */}
                                      {isSubtaskExpanded && (
                                        <div className="px-3 pb-3 border-t border-border/50">
                                          <div className="pt-3 space-y-4">
                                            {/* Subtitle */}
                                            {subtask.subtitle && (
                                              <div>
                                                <p className="text-xs text-muted-foreground">{subtask.subtitle}</p>
                                              </div>
                                            )}
                                            
                                            {/* Basic Info with Clear Labels */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                              <div className="space-y-2">
                                                <div>
                                                  <span className="font-medium text-foreground">סוג: </span>
                                                  <span className="text-muted-foreground">
                                                    {subtask.type === 'events' ? 'אירועים' : 'שעות'} ({capitalizeEnglish(subtask.type)})
                                                  </span>
                                                </div>
                                                <div>
                                                  <span className="font-medium text-foreground">כמות נדרשת: </span>
                                                  <span className="text-primary font-semibold">{subtask.amountNeeded}</span>
                                                </div>
                                              </div>
                                              <div className="space-y-2">
                                                <div>
                                                  <span className="font-medium text-foreground">מזג אוויר: </span>
                                                  <span className="text-muted-foreground">{subtask.weather}</span>
                                                </div>
                                                <div>
                                                  <span className="font-medium text-foreground">סצנה: </span>
                                                  <span className="text-muted-foreground">{subtask.scene}</span>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Target Cars */}
                                            <div>
                                              <span className="font-medium text-foreground text-xs">רכבי יעד: </span>
                                              <span className="text-muted-foreground text-xs">{capitalizeEnglishArray(subtask.targetCar).join(', ')}</span>
                                            </div>

                                            {/* Labels Section */}
                                            {subtask.labels.length > 0 && (
                                              <div>
                                                <h6 className="font-medium text-foreground mb-2 text-xs">לייבלים</h6>
                                                <div className="flex flex-wrap gap-2">
                                                  {subtask.labels.map((label, index) => (
                                                    <span 
                                                      key={`${subtask.id}-label-${index}-${label}`}
                                                      className="px-2 py-1 bg-black text-white text-xs rounded-md font-medium"
                                                    >
                                                      {label}
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                            )}

                                            {/* Image Section */}
                                            {subtask.images && subtask.images.length > 0 && (
                                              <div>
                                                <h6 className="font-medium text-foreground mb-2 text-xs">תמונות</h6>
                                                <ImageGallery 
                                                  images={subtask.images} 
                                                  className="w-full"
                                                  showExpand={true}
                                                  maxDisplay={3}
                                                />
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </main>
    </div>
  );
} 