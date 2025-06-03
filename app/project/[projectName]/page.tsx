'use client';

import { useEffect, useState } from 'react';
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
  const [loading, setLoading] = useState(true);

  // Font configurations
  const hebrewHeading = useHebrewFont('heading');
  const mixedBody = useMixedFont('body');

  useEffect(() => {
    const fetchProjectData = async () => {
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
        
        // Find all visible tasks for this project
        const projectTasks = tasksData.tasks
          ?.filter((task: Task) => task.isVisible && 
            projectsData.projects?.find((p: any) => p.id === task.projectId)?.name.toLowerCase().replace(/\s+/g, '-') === projectName.toLowerCase()) || [];
        
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
      } catch (error) {
        console.error('Error fetching project data:', error);
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [projectName]);

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
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
                    {/* Task Header - Always Visible */}
                    <button
                      onClick={() => toggleTaskExpansion(task.id)}
                      className="w-full p-6 text-right hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-foreground">{task.title}</h3>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                              {getPriorityLabel(task.priority)}
                            </div>
                          </div>
                          {task.subtitle && (
                            <p className="text-sm text-muted-foreground mb-2">{task.subtitle}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Target className="h-4 w-4" />
                              {task.datacoNumber}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {task.type.join(', ')}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {task.locations.join(', ')}
                            </span>
                            {taskSubtasks.length > 0 && (
                              <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">
                                {taskSubtasks.length} תת-משימות
                              </span>
                            )}
                          </div>
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
                    <div className={`collapsible-content ${isExpanded ? 'open' : 'closed'}`}>
                      <div className="px-6 pb-6 border-t border-border">
                        <div className="space-y-6 pt-6">
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
                                  <Car className="h-4 w-4 text-muted-foreground" />
                                  <span>רכב יעד: {task.targetCar.join(', ')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Zap className="h-4 w-4 text-muted-foreground" />
                                  <span>LiDAR: {task.lidar ? 'כן' : 'לא'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span>זמן: {task.dayTime.map(getDayTimeLabel).join(', ')}</span>
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
                              <div className="space-y-3">
                                {taskSubtasks.map((subtask) => (
                                  <div key={subtask.id} className="bg-muted/30 rounded-lg p-4">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <h5 className="font-medium text-foreground">{subtask.title}</h5>
                                        {subtask.subtitle && (
                                          <p className="text-sm text-muted-foreground mt-1">{subtask.subtitle}</p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                                          <span>{subtask.datacoNumber}</span>
                                          <span className="capitalize">{subtask.type}</span>
                                          <span>{subtask.weather}</span>
                                          <span>{subtask.scene}</span>
                                          {subtask.labels.length > 0 && (
                                            <span className="bg-secondary/50 px-2 py-1 rounded text-xs">
                                              {subtask.labels.join(', ')}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-lg font-semibold text-primary">
                                        {subtask.amountNeeded}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </main>
    </div>
  );
} 