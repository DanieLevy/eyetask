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
  Sunrise,
  ImageIcon,
  Hash,
  TrendingUp,
  Layers
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
  dayTime: string[];
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

  // Image viewer is now handled directly by ImageDisplay components

  // Filtering states
  const [activeFilters, setActiveFilters] = useState<{
    dayTime: ('day' | 'night' | 'dusk' | 'dawn')[];
  }>({
    dayTime: []
  });
  
  // Sorting state
  const [sortBy, setSortBy] = useState<'priority-asc' | 'priority-desc'>('priority-asc');
  
  // Dropdown states
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-filter-dropdown]')) {
        setIsFilterDropdownOpen(false);
      }
      if (!target.closest('[data-sort-dropdown]')) {
        setIsSortDropdownOpen(false);
      }
    };

    if (isFilterDropdownOpen || isSortDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isFilterDropdownOpen, isSortDropdownOpen]);

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
      case 'day': return <Sun className="h-2.5 w-2.5" />;
      case 'night': return <Moon className="h-2.5 w-2.5" />;
      case 'dusk': return <Sunset className="h-2.5 w-2.5" />;
      case 'dawn': return <Sunrise className="h-2.5 w-2.5" />;
      default: return <Clock className="h-2.5 w-2.5" />;
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

  // Filter subtasks based on active day time filters
  const getFilteredSubtasks = (taskId: string) => {
    const taskSubtasks = subtasks[taskId] || [];
    
    // If no day time filters are active, show all subtasks
    if (activeFilters.dayTime.length === 0) {
      return taskSubtasks;
    }

    // Filter subtasks that have any of the selected day times
    return taskSubtasks.filter(subtask => 
      activeFilters.dayTime.some(selectedTime => 
        subtask.dayTime.includes(selectedTime)
      )
    );
  };

  // Sort filtered tasks based on sortBy state
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'priority-asc') {
      // Lower number = higher priority, so ascending order
      return a.priority - b.priority || a.title.localeCompare(b.title);
    } else {
      // Higher number = lower priority, so descending order  
      return b.priority - a.priority || a.title.localeCompare(b.title);
    }
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

  // Calculate total subtasks
  const totalSubtasks = Object.values(subtasks).reduce((total, taskSubtasks) => total + taskSubtasks.length, 0);
  const filteredSubtasks = hasActiveFilters 
    ? Object.values(subtasks).reduce((total, taskSubtasks) => {
        const filtered = taskSubtasks.filter(subtask => 
          activeFilters.dayTime.some(selectedTime => 
            subtask.dayTime.includes(selectedTime)
          )
        );
        return total + filtered.length;
      }, 0)
    : totalSubtasks;

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

  // Image viewer functions are now handled by the ImageDisplay components



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
      <div className="border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left Side - Back Button + Project Name */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => router.back()}
                className="p-1.5 rounded-md hover:bg-accent/50 transition-colors"
                aria-label="חזור"
              >
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <div className="min-w-0">
                <h1 className={`text-xl font-semibold text-foreground truncate ${hebrewHeading.fontClass}`}>
                  {projectName}
                </h1>
                {hasActiveFilters && activeFilters.dayTime.length > 0 && (
                  <p className={`text-xs text-muted-foreground/60 mt-0.5 ${mixedBody.fontClass}`}>
                    מסונן לפי: {activeFilters.dayTime.map(getDayTimeLabel).join(', ')}
                  </p>
                )}
              </div>
            </div>

            {/* Right Side - Stats */}
            {tasks.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="text-xs">
                  <span className={`font-medium text-foreground ${mixedBody.fontClass}`}>
                    {hasActiveFilters ? sortedTasks.length : tasks.length}
                  </span>
                  <span className={`text-muted-foreground/70 ${mixedBody.fontClass}`}>
                    {hasActiveFilters && sortedTasks.length !== tasks.length ? `/${tasks.length}` : ''} משימות
                  </span>
                </div>
                {totalSubtasks > 0 && (
                  <>
                    <div className="w-px h-4 bg-border"></div>
                    <div className="text-xs">
                      <span className={`font-medium text-foreground ${mixedBody.fontClass}`}>
                        {hasActiveFilters ? filteredSubtasks : totalSubtasks}
                      </span>
                      <span className={`text-muted-foreground/70 ${mixedBody.fontClass}`}>
                        {hasActiveFilters && filteredSubtasks !== totalSubtasks ? `/${totalSubtasks}` : ''} תת-משימות
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Dropdown Section */}
      {tasks.length > 0 && (
        <div className="bg-muted/10 border-b border-border/30">
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center justify-between gap-3">
              {/* Filter and Sort Controls */}
              <div className="flex items-center gap-3">
                {/* Filter Dropdown */}
                {availableDayTimes.length > 0 && (
                  <div className="relative" data-filter-dropdown>
                  <button
                    onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-background border border-border/60 rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">
                      {hasActiveFilters 
                        ? `סינון (${activeFilters.dayTime.length})`
                        : 'סנן'
                      }
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
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

              {/* Sort Dropdown */}
              <div className="relative" data-sort-dropdown>
                <button
                  onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-background border border-border/60 rounded-md hover:bg-accent/50 transition-colors"
                >
                  <ArrowRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${sortBy === 'priority-asc' ? 'rotate-90' : '-rotate-90'}`} />
                  <span className="text-xs font-medium">
                    {sortBy === 'priority-asc' ? 'עדיפות ↑' : 'עדיפות ↓'}
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Sort Dropdown Menu */}
                {isSortDropdownOpen && (
                  <div className="absolute top-full mt-1 right-0 z-50 bg-background border border-border rounded-lg shadow-lg p-2 w-56">
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setSortBy('priority-asc');
                          setIsSortDropdownOpen(false);
                        }}
                        className={`
                          w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-right
                          ${sortBy === 'priority-asc'
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent text-foreground'
                          }
                        `}
                      >
                        <ArrowRight className="h-4 w-4 rotate-90" />
                        <span>עדיפות: גבוהה ראשונה</span>
                        <span className="text-xs opacity-70">(1, 2, 3...)</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setSortBy('priority-desc');
                          setIsSortDropdownOpen(false);
                        }}
                        className={`
                          w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-right
                          ${sortBy === 'priority-desc'
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent text-foreground'
                          }
                        `}
                      >
                        <ArrowRight className="h-4 w-4 -rotate-90" />
                        <span>עדיפות: נמוכה ראשונה</span>
                        <span className="text-xs opacity-70">(10, 9, 8...)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

              {/* Stats */}
              {hasActiveFilters && (
                <div className="flex items-center text-xs">
                  <span className={`text-muted-foreground/70 ${mixedBody.fontClass}`}>
                    {sortedTasks.length}/{tasks.length}
                  </span>
                </div>
              )}
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
        ) : sortedTasks.length === 0 ? (
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
            {sortedTasks
              .map((task) => {
                const isExpanded = expandedTasks.has(task.id);
                const taskSubtasks = getFilteredSubtasks(task.id);
                
                return (
                  <div key={task.id} className="group bg-card rounded-xl border border-border/60 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:border-border">
                    {/* Task Header - Always Visible (Collapsed View) */}
                    <button
                      onClick={() => toggleTaskExpansion(task.id)}
                      className="w-full p-5 text-right hover:bg-gradient-to-r hover:from-accent/30 hover:to-accent/10 transition-all duration-300 group relative"
                    >
                      {/* Subtle accent border on left when hovered */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          {/* Top row: Title only */}
                          <div className="mb-2">
                            <h3 className="text-lg font-semibold text-foreground truncate group-hover:text-primary transition-colors duration-300">{task.title}</h3>
                          </div>
                          
                          {/* Second row: Dataco number */}
                          <div className="mb-3">
                            <span className="text-xs text-muted-foreground font-mono px-3 py-1.5 bg-muted/60 rounded-lg border border-border/30 backdrop-blur-sm">
                              {formatDatacoNumber(task.datacoNumber)}
                            </span>
                          </div>
                          
                          {/* Bottom row: Enhanced priority and subtask count with icons */}
                          {!isExpanded && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 ${getPriorityColor(task.priority)}`}>
                                <TrendingUp className="h-2.5 w-2.5" />
                                {getPriorityLabel(task.priority)}
                              </div>
                              {taskSubtasks.length > 0 && (
                                <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-md text-[11px] font-medium border border-blue-200/30 dark:border-blue-800/30">
                                  <Layers className="h-2.5 w-2.5" />
                                  {taskSubtasks.length} תת-משימות
                                </span>
                              )}
                              {/* Day time indicators - now aligned with other labels */}
                              {task.dayTime && task.dayTime.length > 0 && (
                                <div className="inline-flex items-center gap-0.5 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 px-2.5 py-1 rounded-md border border-indigo-200/30 dark:border-indigo-800/30">
                                  {task.dayTime.slice(0, 2).map((dt, index) => {
                                    const getIconBg = (dayTime: string) => {
                                      switch (dayTime) {
                                        case 'day': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border-yellow-200/40 dark:border-yellow-700/40';
                                        case 'night': return 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200/40 dark:border-slate-600/40';
                                        case 'dusk': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200/40 dark:border-orange-700/40';
                                        case 'dawn': return 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 border-pink-200/40 dark:border-pink-700/40';
                                        default: return 'bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-200/40 dark:border-gray-600/40';
                                      }
                                    };
                                    return (
                                      <span key={index} className={`inline-flex items-center px-1 py-0.5 rounded text-[10px] border ${getIconBg(dt)}`} title={getDayTimeLabel(dt)}>
                                        {getDayTimeIcon(dt)}
                                      </span>
                                    );
                                  })}
                                  {task.dayTime.length > 2 && (
                                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium ml-1" title={`${task.dayTime.length - 2} זמני יום נוספים: ${task.dayTime.slice(2).map(getDayTimeLabel).join(', ')}`}>
                                      +{task.dayTime.length - 2}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {/* Image preview count for collapsed state */}
                          {!isExpanded && task.images && task.images.length > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 rounded-md text-[11px] border border-slate-200/30 dark:border-slate-700/30">
                              <ImageIcon className="h-2.5 w-2.5" />
                              {task.images.length}
                            </div>
                          )}
                          <div className="group-hover:scale-110 transition-transform duration-200">
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                            )}
                          </div>
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

                          {/* Task Image Display - Updated with new ImageDisplay component */}
                          {task.images && task.images.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-foreground mb-2 text-sm flex items-center gap-1">
                                <ImageIcon className="h-3 w-3" />
                                תמונות המשימה ({task.images.length})
                              </h4>
                              <ImageDisplay
                                images={task.images}
                                title={task.title}
                                maxDisplay={6}
                                size="lg"
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
                            <div className="bg-gradient-to-r from-muted/20 via-muted/10 to-muted/20 rounded-xl p-4 border border-border/30 backdrop-blur-sm shadow-sm">
                              <h4 className="font-semibold text-foreground mb-3 text-sm flex items-center gap-2">
                                <div className="w-2 h-2 bg-primary rounded-full"></div>
                                תת-משימות ({taskSubtasks.length})
                              </h4>
                              <div className="space-y-3">
                                {taskSubtasks.map((subtask) => {
                                  const isSubtaskExpanded = expandedSubtasks.has(subtask.id);
                                  
                                  return (
                                    <div key={subtask.id} className="bg-background/60 backdrop-blur-sm rounded-lg overflow-hidden border border-border/20 shadow-sm hover:shadow-md transition-all duration-200">
                                      {/* Subtask Header - Minimal Info (Collapsed) */}
                                      <button
                                        onClick={() => toggleSubtaskExpansion(subtask.id)}
                                        className="w-full p-3 text-right hover:bg-muted/30 transition-all duration-200 group"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            {/* Small preview image for collapsed state */}
                                            {!isSubtaskExpanded && subtask.images && subtask.images.length > 0 && (
                                              <div 
                                                className="w-8 h-8 rounded-md overflow-hidden bg-muted flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  // Click handling is now done by the ImageDisplay component
                                                }}
                                              >
                                                <img 
                                                  src={subtask.images[0]} 
                                                  alt="Preview" 
                                                  className="w-full h-full object-cover"
                                                  draggable="false"
                                                />
                                              </div>
                                            )}
                                            <div className="min-w-0">
                                              <h5 className="font-medium text-foreground text-sm truncate">{subtask.title}</h5>
                                              <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-muted-foreground font-mono px-1.5 py-0.5 bg-background/80 rounded text-[10px]">
                                                  {formatDatacoNumber(subtask.datacoNumber)}
                                                </span>
                                                <span className="text-xs text-primary font-medium">
                                                  {subtask.amountNeeded} {subtask.type === 'events' ? 'אירועים' : 'שעות'}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {subtask.images && subtask.images.length > 0 && !isSubtaskExpanded && (
                                              <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                                {subtask.images.length} תמונות
                                              </span>
                                            )}
                                            <div className="group-hover:scale-110 transition-transform duration-200">
                                              {isSubtaskExpanded ? (
                                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                              ) : (
                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </button>

                                      {/* Subtask Details - Collapsible */}
                                      {isSubtaskExpanded && (
                                        <div className="px-3 pb-3 border-t border-border/20 bg-muted/10">
                                          <div className="pt-3 space-y-3">
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

                                                                        {/* Day Time Display */}
                            {subtask.dayTime && subtask.dayTime.length > 0 && (
                              <div>
                                <span className="font-medium text-foreground text-xs">זמני יום: </span>
                                <div className="inline-flex gap-1 mt-1">
                                  {subtask.dayTime.map((dt, index) => (
                                    <span key={`${subtask.id}-dayTime-${index}-${dt}`} className="inline-flex items-center gap-1 px-2 py-1 bg-accent rounded-md text-xs">
                                      <span>{getDayTimeIcon(dt)}</span>
                                      <span>{getDayTimeLabel(dt)}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

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

                                            {/* Image Section - Updated with new ImageDisplay component */}
                                            {subtask.images && subtask.images.length > 0 && (
                                              <div>
                                                <h6 className="font-medium text-foreground mb-2 text-xs flex items-center gap-1">
                                                  <ImageIcon className="h-3 w-3" />
                                                  תמונות ({subtask.images.length})
                                                </h6>
                                                <ImageDisplay
                                                  images={subtask.images}
                                                  title={`${task.title} - ${subtask.title}`}
                                                  maxDisplay={8}
                                                  size="md"
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

      {/* Image viewer is now integrated into ImageDisplay components */}
    </div>
  );
} 