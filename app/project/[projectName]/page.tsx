"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  MapPin, 
  Car, 
  Zap,
  Clock,
  Target,
  Filter,
  X,
  Sun,
  Moon,
  Sunset,
  Sunrise,
  ImageIcon,
  TrendingUp,
  Layers,
  Search,
} from "lucide-react";
import { useHebrewFont, useMixedFont } from "@/hooks/useFont";
import { capitalizeEnglish, capitalizeEnglishArray } from "@/lib/utils";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import { useProjectData } from "@/hooks/useOptimizedData";
import { ProjectPageLoadingSkeleton } from "@/components/SkeletonLoaders";
import { InlineLoading } from "@/components/LoadingSystem";
import SimpleImageGallery from "@/components/SimpleImageGallery";
import CloudinaryImage from "@/components/CloudinaryImage";
import DailyUpdatesCarousel from "@/components/DailyUpdatesCarousel";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectName = decodeURIComponent(params.projectName as string);
  
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(
    new Set()
  );

  // Use optimized data fetching
  const { 
    data: projectData, 
    loading, 
    error, 
    refetch,
  } = useProjectData(projectName);

  const project = projectData?.project;
  const tasks = projectData?.tasks || [];
  const subtasks = projectData?.subtasks || {};

  // Filtering states
  const [activeFilters, setActiveFilters] = useState<{
    dayTime: ("day" | "night" | "dusk" | "dawn")[];
  }>({
    dayTime: [],
  });
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  
  // Sorting state
  const [sortBy, setSortBy] = useState<"priority-asc" | "priority-desc">(
    "priority-asc"
  );
  
  // Dropdown states
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Font configurations
  const hebrewHeading = useHebrewFont("heading");
  const mixedBody = useMixedFont("body");

  // Register this page's refresh function
  usePageRefresh(refetch);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Track page visit
  useEffect(() => {
    const trackVisit = async () => {
      const token = localStorage.getItem('adminToken');
      if (token && projectName) {
        try {
          await fetch('/api/analytics', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              page: `project_${projectName}`,
              action: 'page_view'
            })
          });
        } catch (error) {
          console.error('Failed to track visit:', error);
        }
      }
    };

    trackVisit();
  }, [projectName]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-filter-dropdown]")) {
        setIsFilterDropdownOpen(false);
      }
      if (!target.closest("[data-sort-dropdown]")) {
        setIsSortDropdownOpen(false);
      }
    };

    if (isFilterDropdownOpen || isSortDropdownOpen) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isFilterDropdownOpen, isSortDropdownOpen]);

  // Keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Focus search on "/" or Ctrl+K/Cmd+K
      if (
        event.key === "/" ||
        (event.key === "k" && (event.ctrlKey || event.metaKey))
      ) {
        event.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="text"][placeholder*="חיפוש"]'
        );
        searchInput?.focus();
      }
      
      // Clear search on Escape when search input is focused
      if (event.key === "Escape") {
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="text"][placeholder*="חיפוש"]'
        );
        if (document.activeElement === searchInput && searchQuery) {
          event.preventDefault();
          setSearchQuery("");
          setDebouncedSearchQuery("");
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery]);

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
      case "day":
        return "יום / Day";
      case "night":
        return "לילה / Night";
      case "dusk":
        return "דמדומים / Dusk";
      case "dawn":
        return "שחר / Dawn";
      default:
        return dayTime;
    }
  };

  const getDayTimeIcon = (dayTime: string) => {
    switch (dayTime) {
      case "day":
        return <Sun className="h-2.5 w-2.5" />;
      case "night":
        return <Moon className="h-2.5 w-2.5" />;
      case "dusk":
        return <Sunset className="h-2.5 w-2.5" />;
      case "dawn":
        return <Sunrise className="h-2.5 w-2.5" />;
      default:
        return <Clock className="h-2.5 w-2.5" />;
    }
  };

  // Search helper function - searches across multiple fields
  const matchesSearchQuery = (task: any, query: string): boolean => {
    if (!query || query.trim() === "") return true;
    
    const lowerQuery = query.toLowerCase().trim();
    
    // Special handling for DATACO numbers
    const normalizedQuery = lowerQuery.replace(/^dataco-?/i, "");
    
    // Search in task fields
    const taskFields = [
      task.title,
      task.datacoNumber,
      task.datacoNumber?.replace(/^DATACO-?/i, ""), // Search without DATACO prefix
      task.subtitle,
      task.description?.main,
      task.description?.howToExecute,
      ...(task.type || []),
      ...(task.locations || []),
      ...(task.targetCar || [])
    ];
    
    // Check if any task field matches
    const taskMatches = taskFields.some(field => {
      if (!field) return false;
      const fieldLower = field.toString().toLowerCase();
      return fieldLower.includes(lowerQuery) || 
             (normalizedQuery && fieldLower.includes(normalizedQuery));
    });
    
    if (taskMatches) return true;
    
    // Search in subtasks
    const taskSubtasks = subtasks[task._id] || [];
    return taskSubtasks.some(subtask => {
      const subtaskFields = [
        subtask.title,
        subtask.subtitle,
        subtask.datacoNumber,
        subtask.datacoNumber?.replace(/^DATACO-?/i, ""), // Search without DATACO prefix
        subtask.weather,
        subtask.scene,
        ...(subtask.labels || []),
        ...(subtask.targetCar || [])
      ];
      
      return subtaskFields.some(field => {
        if (!field) return false;
        const fieldLower = field.toString().toLowerCase();
        return fieldLower.includes(lowerQuery) || 
               (normalizedQuery && fieldLower.includes(normalizedQuery));
      });
    });
  };

  // Filter tasks based on active filters
  const filteredTasks = tasks.filter((task) => {
    // First apply search filter
    if (!matchesSearchQuery(task, debouncedSearchQuery)) {
      return false;
    }
    
    // If no day time filters are active, show all tasks that match search
    if (activeFilters.dayTime.length === 0) {
      return true;
    }

    // Check if task has any visible subtasks for the selected day times
    const taskSubtasks = subtasks[task._id] || [];
    const visibleSubtasks = taskSubtasks.filter((subtask) => subtask.isVisible !== false);
    
    // Only show task if it has at least one visible subtask for the selected day time
    return activeFilters.dayTime.some((selectedTime) => {
      return visibleSubtasks.some((subtask) =>
        subtask.dayTime && subtask.dayTime.length > 0 && 
        subtask.dayTime.includes(selectedTime)
      );
    });
  });

  // Filter subtasks based on active day time filters
  const getFilteredSubtasks = (taskId: string) => {
    const taskSubtasks = subtasks[taskId] || [];
    
    // Filter by visibility first
    let filtered = taskSubtasks.filter((subtask) => subtask.isVisible !== false);
    
    // If day time filters are active, also filter by day time
    if (activeFilters.dayTime.length > 0) {
      filtered = filtered.filter((subtask) =>
        // Check if subtask has any of the selected day times
        subtask.dayTime && subtask.dayTime.length > 0 && 
        activeFilters.dayTime.some((filterTime) =>
          subtask.dayTime.includes(filterTime)
        )
      );
    }
    
    return filtered;
  };

  // Sort filtered tasks based on sortBy state
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "priority-asc") {
      // Lower number = higher priority, so ascending order
      return a.priority - b.priority || a.title.localeCompare(b.title);
    } else {
      // Higher number = lower priority, so descending order  
      return b.priority - a.priority || a.title.localeCompare(b.title);
    }
  });

  // Toggle day time filter
  const toggleDayTimeFilter = (dayTime: "day" | "night" | "dusk" | "dawn") => {
    setActiveFilters((prev) => {
      const newDayTime = prev.dayTime.includes(dayTime)
        ? prev.dayTime.filter((t) => t !== dayTime)
        : [...prev.dayTime, dayTime];
      
      return {
        ...prev,
        dayTime: newDayTime,
      };
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setActiveFilters({
      dayTime: [],
    });
    setSearchQuery("");
    setDebouncedSearchQuery("");
  };

  // Check if any filters are active
  const hasActiveFilters = activeFilters.dayTime.length > 0 || debouncedSearchQuery.trim() !== "";

  // Calculate total subtasks
  const totalSubtasks = Object.values(subtasks).reduce(
    (total, taskSubtasks) => total + taskSubtasks.filter(subtask => subtask.isVisible !== false).length,
    0
  );
  const filteredSubtasks = hasActiveFilters 
    ? Object.values(subtasks).reduce((total, taskSubtasks) => {
        const filtered = taskSubtasks
          .filter((subtask) => subtask.isVisible !== false) // Filter by visibility first
          .filter((subtask) =>
            subtask.dayTime && subtask.dayTime.length > 0 &&
            activeFilters.dayTime.some((filterTime) =>
              subtask.dayTime.includes(filterTime)
            )
          );
        return total + filtered.length;
      }, 0)
    : totalSubtasks;

  // Get unique day times from all tasks for filter options
  const availableDayTimes = Array.from(
    new Set(tasks.flatMap((task) => task.dayTime))
  ).sort();

  // Format DATACO number to always show with DATACO- prefix
  const formatDatacoNumber = (datacoNumber: string) => {
    if (!datacoNumber) return "";
    const cleanNumber = datacoNumber.replace(/^DATACO-?/i, "");
    return `DATACO-${cleanNumber}`;
  };

  // Highlight search query in text
  const highlightSearchText = (text: string, query: string): React.ReactNode => {
    if (!query || !text) return text;
    
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);
    
    if (index === -1) return text;
    
    return (
      <>
        {text.substring(0, index)}
        <mark className="bg-yellow-200 dark:bg-yellow-800/50 text-inherit px-0.5 rounded">
          {text.substring(index, index + query.length)}
        </mark>
        {text.substring(index + query.length)}
      </>
    );
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 1 && priority <= 3)
      return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20";
    if (priority >= 4 && priority <= 6)
      return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20";
    if (priority >= 7 && priority <= 10)
      return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20";
    return "text-muted-foreground bg-muted";
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 1 && priority <= 3) return "גבוהה";
    if (priority >= 4 && priority <= 6) return "בינונית";
    if (priority >= 7 && priority <= 10) return "נמוכה";
    return "ללא";
  };

  // Image viewer functions are now handled by the ImageDisplay components

  return (
    <InlineLoading
      loading={loading}
      error={error}
      skeleton={<ProjectPageLoadingSkeleton />}
      errorFallback={
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <h3
              className={`text-xl font-semibold mb-2 ${hebrewHeading.fontClass}`}
            >
              שגיאה בטעינת הפרויקט
            </h3>
            <p className={`text-muted-foreground mb-4 ${mixedBody.fontClass}`}>
              {error?.message || "אירעה שגיאה בטעינת נתוני הפרויקט"}
            </p>
            <button
              onClick={refetch}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              נסה שוב
            </button>
          </div>
        </div>
      }
      loadingText="טוען נתוני פרויקט..."
      minHeight="50vh"
    >
      {!project ? (
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3
              className={`text-xl font-semibold mb-2 ${hebrewHeading.fontClass}`}
            >
              פרויקט לא נמצא
            </h3>
            <p className={`text-muted-foreground mb-4 ${mixedBody.fontClass}`}>
              הפרויקט &quot;{projectName}&quot; לא קיים במערכת
            </p>
            <button
              onClick={() => router.push("/")}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              חזור לעמוד הבית
            </button>
          </div>
        </div>
      ) : (
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
                    <h1
                      className={`text-xl font-semibold text-foreground truncate ${hebrewHeading.fontClass}`}
                    >
                  {projectName}
                </h1>
                {hasActiveFilters && (
                      <p
                        className={`text-xs text-muted-foreground/60 mt-0.5 ${mixedBody.fontClass}`}
                      >
                        {debouncedSearchQuery.trim() !== "" && (
                          <>
                            חיפוש: &quot;{debouncedSearchQuery}&quot;
                            {activeFilters.dayTime.length > 0 && " • "}
                          </>
                        )}
                        {activeFilters.dayTime.length > 0 && (
                          <>זמן: {activeFilters.dayTime.map(getDayTimeLabel).join(", ")}</>
                        )}
                  </p>
                )}
              </div>
            </div>

            {/* Right Side - Stats */}
            {tasks.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="text-xs">
                      <span
                        className={`font-medium text-foreground ${mixedBody.fontClass}`}
                      >
                    {hasActiveFilters ? sortedTasks.length : tasks.length}
                  </span>
                      <span
                        className={`text-muted-foreground/70 ${mixedBody.fontClass}`}
                      >
                        {hasActiveFilters && sortedTasks.length !== tasks.length
                          ? `/${tasks.length}`
                          : ""}{" "}
                        משימות
                  </span>
                </div>
                {totalSubtasks > 0 && (
                  <>
                    <div className="w-px h-4 bg-border"></div>
                    <div className="text-xs">
                          <span
                            className={`font-medium text-foreground ${mixedBody.fontClass}`}
                          >
                            {hasActiveFilters
                              ? filteredSubtasks
                              : totalSubtasks}
                      </span>
                          <span
                            className={`text-muted-foreground/70 ${mixedBody.fontClass}`}
                          >
                            {hasActiveFilters &&
                            filteredSubtasks !== totalSubtasks
                              ? `/${totalSubtasks}`
                              : ""}{" "}
                            תת-משימות
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
              <div className="flex items-center gap-3 flex-1">
                {/* Search Input */}
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="חיפוש משימות... (/ או Ctrl+K)"
                    className="w-full pr-9 pl-3 py-1.5 bg-background border border-border/60 rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setDebouncedSearchQuery("");
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-0.5 rounded-sm hover:bg-accent/50 transition-colors"
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  )}
                </div>

                {/* Filter Dropdown */}
                {availableDayTimes.length > 0 && (
                  <div className="relative" data-filter-dropdown>
                  <button
                          onClick={() =>
                            setIsFilterDropdownOpen(!isFilterDropdownOpen)
                          }
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-background border border-border/60 rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">
                      {hasActiveFilters 
                        ? `סינון (${activeFilters.dayTime.length})`
                              : "סנן"}
                    </span>
                          <ChevronDown
                            className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                              isFilterDropdownOpen ? "rotate-180" : ""
                            }`}
                          />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {isFilterDropdownOpen && (
                    <div className="absolute top-full mt-1 right-0 z-50 bg-background border border-border rounded-lg shadow-lg p-2 w-64 max-w-[calc(100vw-2rem)]">
                      <div className="space-y-1">
                        {availableDayTimes.map((dayTime) => {
                                const isActive =
                                  activeFilters.dayTime.includes(dayTime);
                                const taskCount = tasks.filter((task) =>
                                  task.dayTime.includes(dayTime)
                                ).length;
                          
                          return (
                            <button
                              key={dayTime}
                              onClick={() => toggleDayTimeFilter(dayTime)}
                              className={`
                                w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors
                                ${
                                  isActive
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-accent text-foreground"
                                }
                              `}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-base">
                                  {getDayTimeIcon(dayTime)}
                                </span>
                                      <span>{getDayTimeLabel(dayTime)}</span>
                              </div>
                                    <span
                                      className={`
                                px-2 py-0.5 rounded-full text-xs font-medium
                                ${
                                  isActive
                                    ? "bg-primary-foreground/20 text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                                }
                              `}
                                    >
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
                        onClick={() =>
                          setIsSortDropdownOpen(!isSortDropdownOpen)
                        }
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-background border border-border/60 rounded-md hover:bg-accent/50 transition-colors"
                >
                        <ArrowRight
                          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                            sortBy === "priority-asc"
                              ? "rotate-90"
                              : "-rotate-90"
                          }`}
                        />
                  <span className="text-xs font-medium">
                          {sortBy === "priority-asc" ? "עדיפות ↑" : "עדיפות ↓"}
                  </span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                            isSortDropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                </button>
                
                {/* Sort Dropdown Menu */}
                {isSortDropdownOpen && (
                  <div className="absolute top-full mt-1 right-0 z-50 bg-background border border-border rounded-lg shadow-lg p-2 w-56">
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                                setSortBy("priority-asc");
                          setIsSortDropdownOpen(false);
                        }}
                        className={`
                          w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-right
                          ${
                            sortBy === "priority-asc"
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-accent text-foreground"
                          }
                        `}
                      >
                        <ArrowRight className="h-4 w-4 rotate-90" />
                        <span>עדיפות: גבוהה ראשונה</span>
                              <span className="text-xs opacity-70">
                                (1, 2, 3...)
                              </span>
                      </button>
                      
                      <button
                        onClick={() => {
                                setSortBy("priority-desc");
                          setIsSortDropdownOpen(false);
                        }}
                        className={`
                          w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-right
                          ${
                            sortBy === "priority-desc"
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-accent text-foreground"
                          }
                        `}
                      >
                        <ArrowRight className="h-4 w-4 -rotate-90" />
                        <span>עדיפות: נמוכה ראשונה</span>
                              <span className="text-xs opacity-70">
                                (10, 9, 8...)
                              </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

              {/* Stats */}
              {hasActiveFilters && (
                <div className="flex items-center text-xs">
                      <span
                        className={`text-muted-foreground/70 ${mixedBody.fontClass}`}
                      >
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
        {/* Project-specific Daily Updates */}
        <DailyUpdatesCarousel 
          projectId={project._id}
          projectName={project.name}
          hideWhenEmpty={true}
          className="mb-8"
        />
        
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  אין משימות זמינות
                </h3>
                <p className="text-muted-foreground">
                  משימות יופיעו כאן כאשר יתווספו על ידי המנהל
                </p>
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="text-center py-12">
            <Filter className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {debouncedSearchQuery 
                    ? `לא נמצאו תוצאות עבור "${debouncedSearchQuery}"`
                    : "אין משימות מתאימות לסינון"}
                </h3>
            <p className="text-muted-foreground mb-4">
              {debouncedSearchQuery
                ? "נסה לחפש במילים אחרות או לנקות את החיפוש"
                : "נסה לשנות את הסינון או לנקות את כל המסננים"}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <X className="h-4 w-4" />
                נקה {debouncedSearchQuery ? "חיפוש ו" : ""}סינון
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
                {sortedTasks.map((task) => {
                const isExpanded = expandedTasks.has(task._id);
                const taskSubtasks = getFilteredSubtasks(task._id);
                
                return (
                    <div
                      key={task._id}
                      className="group bg-card rounded-xl border border-border/40 overflow-hidden shadow-md shadow-black/5 dark:shadow-black/20 hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-black/30 transition-all duration-300 hover:border-border/60"
                    >
                    {/* Task Header - Always Visible (Collapsed View) */}
                    <button
                      onClick={() => toggleTaskExpansion(task._id)}
                        className="w-full py-4 px-3 sm:p-5 text-right hover:bg-gradient-to-r hover:from-accent/30 hover:to-accent/10 transition-all duration-300 group relative min-h-[5rem]"
                    >
                      {/* Subtle accent border on left when hovered */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      
                                                {/* Dataco indicator fixed at top left */}
                        <span className="absolute top-1 left-1 sm:top-2 sm:left-2 z-10 inline-flex items-center px-1.5 py-0.5 text-[10px] sm:text-xs font-mono text-gray-600 dark:text-gray-400">
                          {debouncedSearchQuery ? highlightSearchText(formatDatacoNumber(task.datacoNumber), debouncedSearchQuery) : formatDatacoNumber(task.datacoNumber)}
                        </span>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex-1 min-w-0 sm:pr-4">
                            {/* First row: Title with chevron */}
                            <div className="mb-2 sm:mb-3 pl-16 sm:pl-20 flex items-center gap-2">
                              {/* Chevron at the left */}
                              <div className="group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                                )}
                            </div>
                            
                              <h3 className="text-base sm:text-lg font-semibold text-foreground leading-tight group-hover:text-primary transition-colors duration-300 line-clamp-2">
                                {debouncedSearchQuery ? highlightSearchText(task.title, debouncedSearchQuery) : task.title}
                              </h3>
                          </div>
                          
                            {/* Second row: Functional labels with space-between */}
                          {!isExpanded && (
                              <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
                                <div
                                  className={`inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg font-medium transition-all duration-200 shadow-sm ${getPriorityColor(
                                    task.priority
                                  )}`}
                                >
                                  <TrendingUp className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                                  <span>{getPriorityLabel(task.priority)}</span>
                                  <span className="opacity-75 ml-0.5 font-mono text-[8px] sm:text-[9px]">
                                    {task.priority}
                                  </span>
                              </div>
                              {taskSubtasks.length > 0 && (
                                  <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg font-medium border border-blue-200/30 dark:border-blue-800/30 shadow-sm">
                                    <Layers className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                                  {taskSubtasks.length} תת-משימות
                                </span>
                              )}
                                {/* Day time indicators - simplified on mobile */}
                                {task.dayTime && task.dayTime.length > 0 && (
                                  <div className="inline-flex items-center gap-0.5 bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-purple-200/30 dark:border-purple-800/30 shadow-sm">
                                    {/* Always show all icons if there are 3 or fewer */}
                                    {task.dayTime.length <= 3 ? (
                                      // If 3 or fewer, show all
                                      task.dayTime.map((dt, index) => {
                                        const getIconBg = (dayTime: string) => {
                                          switch (dayTime) {
                                            case "day":
                                              return "bg-yellow-200/50 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 border-yellow-300/40 dark:border-yellow-700/40";
                                            case "night":
                                              return "bg-slate-200/50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 border-slate-300/40 dark:border-slate-600/40";
                                            case "dusk":
                                              return "bg-orange-200/50 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 border-orange-300/40 dark:border-orange-700/40";
                                            case "dawn":
                                              return "bg-pink-200/50 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300 border-pink-300/40 dark:border-pink-700/40";
                                            default:
                                              return "bg-gray-200/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200 border-gray-300/40 dark:border-gray-600/40";
                                          }
                                        };
                                        return (
                                          <span
                                            key={`${task._id}-dt-${index}-${dt}`}
                                            className={`inline-flex items-center px-1 py-0.5 rounded text-[10px] border ${getIconBg(dt)}`}
                                            title={getDayTimeLabel(dt)}
                                          >
                                            {getDayTimeIcon(dt)}
                                          </span>
                                        );
                                      })
                                    ) : (
                                      // If more than 3, show first 3 plus counter
                                      <>
                                        {task.dayTime.slice(0, 3).map((dt, index) => {
                                          const getIconBg = (dayTime: string) => {
                                            switch (dayTime) {
                                              case "day":
                                                return "bg-yellow-200/50 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 border-yellow-300/40 dark:border-yellow-700/40";
                                              case "night":
                                                return "bg-slate-200/50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 border-slate-300/40 dark:border-slate-600/40";
                                              case "dusk":
                                                return "bg-orange-200/50 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 border-orange-300/40 dark:border-orange-700/40";
                                              case "dawn":
                                                return "bg-pink-200/50 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300 border-pink-300/40 dark:border-pink-700/40";
                                              default:
                                                return "bg-gray-200/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200 border-gray-300/40 dark:border-gray-600/40";
                                            }
                                          };
                                          return (
                                            <span
                                              key={`${task._id}-dt-${index}-${dt}`}
                                              className={`inline-flex items-center px-1 py-0.5 rounded text-[10px] border ${getIconBg(dt)}`}
                                              title={getDayTimeLabel(dt)}
                                            >
                                              {getDayTimeIcon(dt)}
                                            </span>
                                          );
                                        })}
                                        {task.dayTime.length > 3 && (
                                          <span
                                            className="text-[10px] text-purple-700 dark:text-purple-300 font-medium ml-1"
                                            title={`${task.dayTime.length - 3} זמני יום נוספים: ${task.dayTime.slice(3).map(getDayTimeLabel).join(", ")}`}
                                          >
                                            +{task.dayTime.length - 3}
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                                {/* Image count indicator moved to same row */}
                                {!isExpanded &&
                                  task.images &&
                                  task.images.length > 0 && (
                                    <div className="inline-flex items-center gap-1 bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg font-medium border border-gray-200/30 dark:border-gray-700/30 shadow-sm">
                                      <ImageIcon className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                                      {task.images.length} תמונות
                            </div>
                          )}
                            </div>
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
                                <p className="text-muted-foreground">
                                  {task.subtitle}
                                </p>
                            </div>
                          )}

                          {/* Task type and basic info when expanded */}
                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                                <strong>סוג:</strong>{" "}
                                {capitalizeEnglishArray(task.type).join(", ")}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                                <strong>מיקומים:</strong>{" "}
                                {capitalizeEnglishArray(task.locations).join(
                                  ", "
                                )}
                            </span>
                            <span className="flex items-center gap-1">
                              <Car className="h-3 w-3" />
                                <strong>רכבי יעד:</strong>{" "}
                                {capitalizeEnglishArray(task.targetCar).join(
                                  ", "
                                )}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                                <strong>זמני יום:</strong>{" "}
                                {task.dayTime.map(getDayTimeLabel).join(", ")}
                            </span>
                          </div>

                          {/* Description */}
                          <div>
                              <h4 className="font-semibold text-foreground mb-2 text-sm">
                                תיאור המשימה
                              </h4>
                              <p className="text-muted-foreground text-sm">
                                {task.description?.main || "אין תיאור זמין"}
                              </p>
                          </div>

                          {/* Execution Instructions */}
                          <div>
                              <h4 className="font-semibold text-foreground mb-2 text-sm">
                                הוראות ביצוע
                              </h4>
                              <p className="text-muted-foreground text-sm">
                                {task.description?.howToExecute || "אין הוראות זמינות"}
                              </p>
                          </div>

                          {/* Task Image Display - Updated with new ImageDisplay component */}
                          {task.images && task.images.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-foreground mb-2 text-sm flex items-center gap-1">
                                <ImageIcon className="h-3 w-3" />
                                תמונות המשימה ({task.images.length})
                              </h4>
                              <SimpleImageGallery images={task.images} />
                            </div>
                          )}

                          {/* Technical Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-semibold text-foreground mb-2 text-sm">
                                  פרטים טכניים
                                </h4>
                              <div className="space-y-2 text-xs">
                                <div className="flex items-center gap-2">
                                  <Zap className="h-3 w-3 text-muted-foreground" />
                                    <span>
                                      <strong>LiDAR:</strong>{" "}
                                      {task.lidar ? "כן" : "לא"}
                                    </span>
                                </div>
                              </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-foreground mb-2 text-sm">
                                  כמות נדרשת
                                </h4>
                              <div className="text-xl font-bold text-primary">
                                {task.amountNeeded}
                              </div>
                            </div>
                          </div>

                          {/* Subtasks */}
                          {taskSubtasks.length > 0 && (
                            <div className="bg-gradient-to-r from-muted/20 via-muted/10 to-muted/20 rounded-xl p-4 border border-border/30 backdrop-blur-sm shadow-md shadow-black/5 dark:shadow-black/15">
                              <h4 className="font-semibold text-foreground mb-3 text-sm flex items-center gap-2">
                                <div className="w-2 h-2 bg-primary rounded-full"></div>
                                תת-משימות ({taskSubtasks.length})
                              </h4>
                              <div className="space-y-3">
                                {taskSubtasks.map((subtask) => {
                                    const isSubtaskExpanded =
                                      expandedSubtasks.has(subtask._id);
                                  
                                  return (
                                      <div
                                        key={subtask._id}
                                        className="bg-background/60 backdrop-blur-sm rounded-lg overflow-hidden border border-border/30 shadow-md shadow-black/5 dark:shadow-black/15 hover:shadow-lg hover:shadow-black/8 dark:hover:shadow-black/25 transition-all duration-200"
                                      >
                                      {/* Subtask Header - Minimal Info (Collapsed) */}
                                      <button
                                          onClick={() =>
                                            toggleSubtaskExpansion(subtask._id)
                                          }
                                        className="w-full p-3 text-right hover:bg-muted/30 transition-all duration-200 group"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            {/* Small preview image for collapsed state */}
                                              {!isSubtaskExpanded &&
                                                subtask.images &&
                                                subtask.images.length > 0 && (
                                              <div 
                                                className="w-8 h-8 rounded-md overflow-hidden bg-muted flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all relative"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  // Click handling is now done by the ImageDisplay component
                                                }}
                                              >
                                                    <CloudinaryImage
                                                      src={subtask.images[0]}
                                                      alt="Preview"
                                                      width={32}
                                                      height={32}
                                                      sizes="32px"
                                                      className="w-full h-full object-cover"
                                                      crop="fill"
                                                      quality="auto:good"
                                                    />
                                              </div>
                                            )}
                                            <div className="min-w-0">
                                                <h5 className="text-sm font-medium text-foreground leading-tight group-hover:text-primary transition-colors duration-300">
                                          {debouncedSearchQuery ? highlightSearchText(subtask.title, debouncedSearchQuery) : subtask.title}
                                        </h5>
                                              <div className="flex items-center justify-between gap-2 mt-0.5">
                                                <span className="text-xs text-primary font-medium">
                                                    {subtask.amountNeeded}{" "}
                                                    {subtask.type === "events"
                                                      ? "אירועים"
                                                      : "שעות"}
                                                </span>
                                                <span className="text-xs text-muted-foreground font-mono px-1.5 py-0.5 bg-background/80 rounded text-[10px]">
                                                    {formatDatacoNumber(
                                                      subtask.datacoNumber
                                                    )}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                              {subtask.images &&
                                                subtask.images.length > 0 &&
                                                !isSubtaskExpanded && (
                                              <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                                    {subtask.images.length}{" "}
                                                    תמונות
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
                                                  <p className="text-xs text-muted-foreground">
                                                    {subtask.subtitle}
                                                  </p>
                                              </div>
                                            )}
                                            
                                            {/* Basic Info with Clear Labels */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                              <div className="space-y-2">
                                                <div>
                                                    <span className="font-medium text-foreground">
                                                      סוג:{" "}
                                                    </span>
                                                  <span className="text-muted-foreground">
                                                      {subtask.type === "events"
                                                        ? "אירועים"
                                                        : "שעות"}{" "}
                                                      (
                                                      {capitalizeEnglish(
                                                        subtask.type
                                                      )}
                                                      )
                                                  </span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-foreground">
                                                      כמות נדרשת:{" "}
                                                    </span>
                                                    <span className="text-primary font-semibold">
                                                      {subtask.amountNeeded}
                                                    </span>
                                                </div>
                                              </div>
                                              <div className="space-y-2">
                                                <div>
                                                    <span className="font-medium text-foreground">
                                                      מזג אוויר:{" "}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                      {subtask.weather}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-foreground">
                                                      סצנה:{" "}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                      {subtask.scene}
                                                    </span>
                                                </div>
                                              </div>
                                            </div>

                                                                        {/* Day Time Display */}
                                              {subtask.dayTime &&
                                                subtask.dayTime.length > 0 && (
                              <div>
                                                    <span className="font-medium text-foreground text-xs">
                                                      זמני יום:{" "}
                                                    </span>
                                <div className="inline-flex gap-1 mt-1">
                                                      {subtask.dayTime.map(
                                                        (dt, index) => (
                                                          <span
                                                            key={`${subtask._id}-dayTime-${index}-${dt}`}
                                                            className="inline-flex items-center gap-1 px-2 py-1 bg-accent rounded-md text-xs"
                                                          >
                                                            <span>
                                                              {getDayTimeIcon(
                                                                dt
                                                              )}
                                    </span>
                                                            <span>
                                                              {getDayTimeLabel(
                                                                dt
                                                              )}
                                                            </span>
                                                          </span>
                                                        )
                                                      )}
                                </div>
                              </div>
                            )}

                                            {/* Target Cars */}
                                            <div>
                                                <span className="font-medium text-foreground text-xs">
                                                  רכבי יעד:{" "}
                                                </span>
                                                <span className="text-muted-foreground text-xs">
                                                  {capitalizeEnglishArray(
                                                    subtask.targetCar
                                                  ).join(", ")}
                                                </span>
                                            </div>

                                            {/* Labels Section */}
                                            {subtask.labels.length > 0 && (
                                              <div>
                                                  <h6 className="font-medium text-foreground mb-2 text-xs">
                                                    לייבלים
                                                  </h6>
                                                <div className="flex flex-wrap gap-2">
                                                    {subtask.labels.map(
                                                      (label, index) => (
                                                    <span 
                                                      key={`${subtask._id}-label-${index}-${label}`}
                                                      className="px-2 py-1 bg-black text-white text-xs rounded-md font-medium"
                                                    >
                                                      {label}
                                                    </span>
                                                      )
                                                    )}
                                                </div>
                                              </div>
                                            )}

                                            {/* Image Section - Updated with new ImageDisplay component */}
                                              {subtask.images &&
                                                subtask.images.length > 0 && (
                                              <div>
                                                <h6 className="font-medium text-foreground mb-2 text-xs flex items-center gap-1">
                                                  <ImageIcon className="h-3 w-3" />
                                                      תמונות (
                                                      {subtask.images.length})
                                                </h6>
                                                    <SimpleImageGallery
                                                      images={subtask.images}
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
      )}
    </InlineLoading>
  );
} 
