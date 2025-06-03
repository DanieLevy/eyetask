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
  AlertTriangle
} from 'lucide-react';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';
import { useTasksRealtime } from '@/hooks/useRealtime';
import { capitalizeEnglish, capitalizeEnglishArray } from '@/lib/utils';
import { usePageRefresh } from '@/hooks/usePageRefresh';

interface Task {
  id: string;
  title: string;
  subtitle?: string;
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
  image?: string | null;
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
  const [projectId, setProjectId] = useState<string | null>(null);

  // Font configurations
  const hebrewHeading = useHebrewFont('heading');
  const mixedBody = useMixedFont('body');

  // Realtime handler for tasks
  const handleTaskChange = useCallback((payload: any) => {
    console.log('🔄 Public Task realtime update:', payload);
    
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    setTasks(current => {
      switch (eventType) {
        case 'INSERT':
          if (newRecord && newRecord.project_id === projectId && newRecord.is_visible) {
            // Add new visible task
            const exists = current.find(t => t.id === newRecord.id);
            return exists ? current : [...current, newRecord];
          }
          return current;
          
        case 'UPDATE':
          if (newRecord && newRecord.project_id === projectId) {
            if (newRecord.is_visible) {
              // Update existing task or add if it became visible
              const exists = current.find(t => t.id === newRecord.id);
              return exists 
                ? current.map(task => task.id === newRecord.id ? newRecord : task)
                : [...current, newRecord];
            } else {
              // Remove task if it became hidden
              return current.filter(task => task.id !== newRecord.id);
            }
          } else if (newRecord && newRecord.project_id !== projectId) {
            // Task was moved to another project, remove it
            return current.filter(task => task.id !== newRecord.id);
          }
          return current;
          
        case 'DELETE':
          if (oldRecord) {
            // Remove deleted task
            return current.filter(task => task.id !== oldRecord.id);
          }
          return current;
          
        default:
          return current;
      }
    });
  }, [projectId]);

  // Set up realtime subscription for tasks
  useTasksRealtime(handleTaskChange);

  const fetchProjectData = useCallback(async () => {
    try {
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
      setLoading(false);
      setProjectId(project.id);
    } catch (error) {
      console.error('Error fetching project data:', error);
      setLoading(false);
    }
  }, [projectName]);

  // Register this page's refresh function
  usePageRefresh(fetchProjectData);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

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

  // Format DATACO number to always show with DATACO- prefix
  const formatDatacoNumber = (datacoNumber: string) => {
    if (!datacoNumber) return '';
    const cleanNumber = datacoNumber.replace(/^DATACO-?/i, '');
    return `DATACO-${cleanNumber}`;
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 1 && priority <= 3) return 'text-red-500 bg-red-50';
    if (priority >= 4 && priority <= 6) return 'text-yellow-500 bg-yellow-50';
    if (priority >= 7 && priority <= 10) return 'text-green-500 bg-green-50';
    return 'text-gray-500 bg-gray-50';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 1 && priority <= 3) return 'גבוהה';
    if (priority >= 4 && priority <= 6) return 'בינונית';
    if (priority >= 7 && priority <= 10) return 'נמוכה';
    return 'ללא';
  };

  const getDayTimeLabel = (dayTime: string) => {
    const labels: Record<string, string> = {
      day: 'יום',
      night: 'לילה',
      dusk: 'דמדומים',
      dawn: 'שחר'
    };
    return labels[dayTime] || dayTime;
  };

  if (loading) {
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
            <div className="flex items-center gap-3">
              <Eye className="h-6 w-6 text-primary" />
              <div>
                <h1 className={`text-2xl font-bold text-foreground ${hebrewHeading.fontClass}`}>
                  {projectName}
                </h1>
                <p className={`text-sm text-muted-foreground ${mixedBody.fontClass}`}>
                  {tasks.length} משימות זמינות
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">אין משימות זמינות</h3>
            <p className="text-muted-foreground">משימות יופיעו כאן כאשר יתווספו על ידי המנהל</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks
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
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-foreground">{task.title}</h3>
                            <span className="text-sm text-muted-foreground font-mono px-2 py-1 bg-muted rounded">
                              {formatDatacoNumber(task.datacoNumber)}
                            </span>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                              {getPriorityLabel(task.priority)}
                            </div>
                          </div>
                          
                          {/* Only show subtask count when collapsed */}
                          {!isExpanded && taskSubtasks.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                              <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium">
                                {taskSubtasks.length} תת-משימות
                              </span>
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
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <strong>סוג:</strong> {capitalizeEnglishArray(task.type).join(', ')}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <strong>מיקומים:</strong> {capitalizeEnglishArray(task.locations).join(', ')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Car className="h-4 w-4" />
                              <strong>רכבי יעד:</strong> {capitalizeEnglishArray(task.targetCar).join(', ')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <strong>זמני יום:</strong> {task.dayTime.map(getDayTimeLabel).join(', ')}
                            </span>
                          </div>

                          {/* Description */}
                          <div>
                            <h4 className="font-semibold text-foreground mb-2">תיאור המשימה</h4>
                            <p className="text-muted-foreground">{task.description.main}</p>
                          </div>

                          {/* Execution Instructions */}
                          <div>
                            <h4 className="font-semibold text-foreground mb-2">הוראות ביצוע</h4>
                            <p className="text-muted-foreground">{task.description.howToExecute}</p>
                          </div>

                          {/* Technical Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold text-foreground mb-2">פרטים טכניים</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <Zap className="h-4 w-4 text-muted-foreground" />
                                  <span><strong>LiDAR:</strong> {task.lidar ? 'כן' : 'לא'}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground mb-2">כמות נדרשת</h4>
                              <div className="text-2xl font-bold text-primary">
                                {task.amountNeeded}
                              </div>
                            </div>
                          </div>

                          {/* Subtasks */}
                          {taskSubtasks.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-foreground mb-3">תת-משימות</h4>
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
                                            <h5 className="font-medium text-foreground">{subtask.title}</h5>
                                            <span className="text-sm text-muted-foreground font-mono px-2 py-1 bg-background rounded">
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
                                                <p className="text-sm text-muted-foreground">{subtask.subtitle}</p>
                                              </div>
                                            )}
                                            
                                            {/* Basic Info with Clear Labels */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
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
                                              <span className="font-medium text-foreground">רכבי יעד: </span>
                                              <span className="text-muted-foreground">{capitalizeEnglishArray(subtask.targetCar).join(', ')}</span>
                                            </div>

                                            {/* Labels Section */}
                                            {subtask.labels.length > 0 && (
                                              <div>
                                                <h6 className="font-medium text-foreground mb-2">לייבלים</h6>
                                                <div className="flex flex-wrap gap-2">
                                                  {subtask.labels.map((label, index) => (
                                                    <span 
                                                      key={index}
                                                      className="px-3 py-1 bg-black text-white text-sm rounded-md font-medium"
                                                    >
                                                      {label}
                                                    </span>
                                                  ))}
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