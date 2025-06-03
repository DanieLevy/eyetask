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

interface Task {
  id: string;
  title: string;
  subtitle?: string;
  datacoNumber: string;
  description: {
    main: string;
    howToExecute: string;
  };
  project: string;
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

  useEffect(() => {
    // Fetch tasks for this project
    fetch('/api/tasks')
      .then(res => res.json())
      .then(data => {
        const projectTasks = (data.tasks || []).filter(
          (task: Task) => task.project === projectName && task.isVisible
        );
        setTasks(projectTasks);
        
        // Fetch subtasks for each task
        const subtaskPromises = projectTasks.map((task: Task) =>
          fetch(`/api/tasks/${task.id}/subtasks`)
            .then(res => res.json())
            .then(data => ({ taskId: task.id, subtasks: data.subtasks || [] }))
        );
        
        return Promise.all(subtaskPromises);
      })
      .then(subtaskData => {
        const subtaskMap: Record<string, Subtask[]> = {};
        subtaskData.forEach(({ taskId, subtasks: taskSubtasks }) => {
          subtaskMap[taskId] = taskSubtasks;
        });
        setSubtasks(subtaskMap);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching project data:', error);
        setLoading(false);
      });
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
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
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
                <h1 className="text-lg font-bold text-foreground">{projectName}</h1>
                <p className="text-sm text-muted-foreground">
                  {tasks.length} משימות זמינות
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">אין משימות זמינות</h3>
            <p className="text-muted-foreground">משימות יופיעו כאן כאשר יתווספו לפרויקט זה</p>
            <Link 
              href="/"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
              חזור לדף הבית
            </Link>
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
                            <h3 className="text-lg font-semibold text-foreground">
                              {task.title}
                            </h3>
                            <span className="text-sm text-muted-foreground font-mono">
                              {task.datacoNumber}
                            </span>
                            {task.priority > 0 && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                {getPriorityLabel(task.priority)}
                              </span>
                            )}
                          </div>
                          {task.subtitle && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {task.subtitle}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Target className="h-4 w-4" />
                              {task.amountNeeded} נדרש
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {task.locations.join(', ')}
                            </span>
                            {task.lidar && (
                              <span className="flex items-center gap-1">
                                <Zap className="h-4 w-4" />
                                LiDAR
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {taskSubtasks.length > 0 && (
                            <span className="text-sm text-muted-foreground">
                              {taskSubtasks.length} תת-משימות
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Expanded Task Content */}
                    <div 
                      className={`collapsible-content ${isExpanded ? 'max-h-none' : 'max-h-0'}`}
                      data-state={isExpanded ? 'open' : 'closed'}
                    >
                      <div className="px-6 pb-6 border-t border-border">
                        {/* Task Description */}
                        <div className="mb-6 pt-4">
                          <h4 className="font-semibold text-foreground mb-2">תיאור המשימה</h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            {task.description.main}
                          </p>
                          <h4 className="font-semibold text-foreground mb-2">אופן ביצוע</h4>
                          <p className="text-sm text-muted-foreground">
                            {task.description.howToExecute}
                          </p>
                        </div>

                        {/* Task Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <div>
                            <h5 className="font-medium text-foreground mb-2">פרטי המשימה</h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>סוג: {task.type.join(', ')}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>זמן: {task.dayTime.map(getDayTimeLabel).join(', ')}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-muted-foreground" />
                                <span>רכבים: {task.targetCar.join(', ')}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Subtasks */}
                        {taskSubtasks.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-foreground mb-4">תת-משימות</h4>
                            <div className="space-y-3">
                              {taskSubtasks.map((subtask) => (
                                <div key={subtask.id} className="bg-muted/30 rounded-lg p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <h5 className="font-medium text-foreground">
                                        {subtask.title}
                                      </h5>
                                      {subtask.subtitle && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                          {subtask.subtitle}
                                        </p>
                                      )}
                                    </div>
                                    <span className="text-sm text-muted-foreground font-mono">
                                      {subtask.datacoNumber}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Target className="h-3 w-3" />
                                      {subtask.amountNeeded} {subtask.type}
                                    </span>
                                    <span>מזג אוויר: {subtask.weather}</span>
                                    <span>סצנה: {subtask.scene}</span>
                                  </div>
                                  
                                  {subtask.labels.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                      {subtask.labels.map((label, index) => (
                                        <span 
                                          key={index}
                                          className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                                        >
                                          {label}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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