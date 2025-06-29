'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowRight, 
  Eye, 
  Target, 
  Plus,
  EyeOff,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  Car,
  Zap,
  Clock,
  Building,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  Layers,
  Activity,
  Filter,
  Menu,
  Settings,
  ArrowUpDown
} from 'lucide-react';
import { useTasksRealtime, useProjectsRealtime } from '@/hooks/useRealtime';
import { capitalizeEnglish, capitalizeEnglishArray } from '@/lib/utils';
import { usePageRefresh } from '@/hooks/usePageRefresh';
import { RealtimeNotification, useRealtimeNotification } from '@/components/RealtimeNotification';
import { toast } from 'sonner';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';

interface Task {
  _id: string;
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
  subtaskCount?: number;
}

interface Subtask {
  _id: string;
  taskId: string;
}

interface Project {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  color?: string;
  isActive?: boolean;
}

// Task skeleton component
const TaskSkeleton = () => (
  <div className="p-4 border-b border-gray-100 dark:border-gray-700/50">
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </div>
  </div>
);

export default function ProjectManagement() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'project' | 'task', id: string } | null>(null);
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'name'>('priority');
  const [filterVisible, setFilterVisible] = useState<'all' | 'visible' | 'hidden'>('all');

  // Realtime notifications
  const { notification, showNotification } = useRealtimeNotification();

  // Helper function to check if any operations are active
  const isUserInteracting = useCallback(() => {
    return operationLoading;
  }, [operationLoading]);

  // Realtime handlers
  const handleProjectChange = useCallback((payload: any) => {

    
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    if (eventType === 'UPDATE' && newRecord && newRecord.id === projectId) {
      // Update the current project
      setProject(newRecord);
    } else if (eventType === 'DELETE' && oldRecord && oldRecord.id === projectId) {
      // Project was deleted, redirect to dashboard
      router.push('/admin/dashboard');
    }
  }, [projectId, router]);

  const handleTaskChange = useCallback((payload: any) => {
    
    
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    setTasks(current => {
      switch (eventType) {
        case 'INSERT':
          if (newRecord && newRecord.project_id === projectId) {
            // Add new task
            const exists = current.find(t => t._id === newRecord._id);
            return exists ? current : [...current, newRecord];
          }
          return current;
          
        case 'UPDATE':
          if (newRecord && newRecord.project_id === projectId) {
            // Update existing task
            return current.map(task => 
              task._id === newRecord._id ? newRecord : task
            );
          } else if (newRecord && newRecord.project_id !== projectId) {
            // Task was moved to another project, remove it
            return current.filter(task => task._id !== newRecord._id);
          }
          return current;
          
        case 'DELETE':
          if (oldRecord) {
            // Remove deleted task
            return current.filter(task => task._id !== oldRecord._id);
          }
          return current;
          
        default:
          return current;
      }
    });
  }, [projectId]);

  // Optimized data fetching with separate project and tasks loading
  const fetchProjectData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const timestamp = Date.now();
      
      // Fetch project data first (fast)
      const projectRes = await fetch(`/api/projects/${projectId}?_t=${timestamp}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }).then(res => res.json());

      if (projectRes.success) {
        setProject(projectRes.project);
        setLoading(false); // Show project info immediately
        
        // Then fetch tasks (potentially slower)
        fetchTasks();
      } else {
        setError(projectRes.error || 'Failed to fetch project');
        toast.error(projectRes.error || 'Failed to fetch project data.');
        router.push('/admin/dashboard');
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      setError('An unexpected error occurred.');
      toast.error('An unexpected error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  // Separate function for fetching tasks with subtask counts
  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const timestamp = Date.now();
      
      // Fetch tasks
      const tasksRes = await fetch(`/api/tasks?projectId=${projectId}&_t=${timestamp}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }).then(res => res.json());

      if (tasksRes.success && tasksRes.tasks) {
        // Get subtask counts in parallel
        const taskIds = tasksRes.tasks.map((t: Task) => t._id);
        const subtaskCountsRes = await fetch(`/api/subtasks?taskIds=${taskIds.join(',')}&countOnly=true&_t=${timestamp}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }).then(res => res.json()).catch(() => ({ success: false }));

        // Enhance tasks with subtask counts
        const enhancedTasks = tasksRes.tasks.map((task: Task) => ({
          ...task,
          subtaskCount: subtaskCountsRes.success ? 
            (subtaskCountsRes.counts?.[task._id] || 0) : 0
        }));

        setTasks(enhancedTasks);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Error loading tasks');
    } finally {
      setTasksLoading(false);
    }
  }, [projectId]);

  // Manual refresh function
  const refreshData = useCallback(async () => {
    if (operationLoading) return;
    setOperationLoading(true);
    
    try {
      await Promise.all([fetchProjectData()]);
      toast.success('נתונים רועננו בהצלחה');
    } finally {
      setOperationLoading(false);
    }
  }, [fetchProjectData, operationLoading]);

  // Register this page's refresh function
  usePageRefresh(refreshData);

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

    fetchProjectData();
  }, [projectId, router, fetchProjectData]);

  const handleToggleVisibility = async (taskId: string, currentVisibility: boolean) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/tasks/${taskId}/visibility`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isVisible: !currentVisibility })
      });

      if (response.ok) {
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task._id === taskId ? { ...task, isVisible: !currentVisibility } : task
          )
        );
        toast.success(`משימה ${!currentVisibility ? 'הוצגה' : 'הוסתרה'} בהצלחה`);
      } else {
        toast.error('Failed to update task visibility');
      }
    } catch (error) {
      console.error('Error toggling task visibility:', error);
      toast.error('An error occurred while updating visibility.');
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteTarget || deleteTarget.type !== 'task') return;
    
    setOperationLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/tasks/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setTasks(prevTasks => prevTasks.filter(task => task._id !== deleteTarget.id));
        toast.success('המשימה נמחקה בהצלחה');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete task');
      }
    } catch (error) {
      toast.error('An error occurred while deleting the task.');
      console.error('Error deleting task:', error);
    } finally {
      setOperationLoading(false);
      setDeleteTarget(null);
      setShowDeleteDialog(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteTarget || deleteTarget.type !== 'project') return;
    
    setOperationLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('הפרויקט נמחק בהצלחה');
        router.push('/admin/projects');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete project');
      }
    } catch (error) {
      toast.error('An error occurred while deleting the project.');
      console.error('Error deleting project:', error);
    } finally {
      setOperationLoading(false);
      setDeleteTarget(null);
      setShowDeleteDialog(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    
    if (deleteTarget.type === 'project') {
      await handleDeleteProject();
    } else {
      await handleDeleteTask();
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 1 && priority <= 3) return 'text-red-500 dark:text-red-400';
    if (priority >= 4 && priority <= 6) return 'text-amber-500 dark:text-amber-400';
    if (priority >= 7 && priority <= 10) return 'text-green-500 dark:text-green-400';
    return 'text-gray-500 dark:text-gray-400';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 1 && priority <= 3) return 'גבוהה';
    if (priority >= 4 && priority <= 6) return 'בינונית';
    if (priority >= 7 && priority <= 10) return 'נמוכה';
    return 'לא הוגדרה';
  };

  const getPriorityBadge = (priority: number) => {
    if (priority <= 3) return <Badge variant="destructive">{getPriorityLabel(priority)}</Badge>;
    if (priority <= 6) return <Badge variant="secondary">{getPriorityLabel(priority)}</Badge>;
    return <Badge variant="outline">{getPriorityLabel(priority)}</Badge>;
  };

  // Format DATACO number for display
  const formatDatacoDisplay = (datacoNumber: string) => {
    if (!datacoNumber) return 'N/A';
    return `DATACO-${datacoNumber}`;
  };

  // Filter and sort tasks
  const filteredAndSortedTasks = tasks
    .filter(task => {
      if (filterVisible === 'visible') return task.isVisible;
      if (filterVisible === 'hidden') return !task.isVisible;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return a.priority - b.priority || a.title.localeCompare(b.title);
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'name':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  const visibleCount = tasks.filter(t => t.isVisible).length;
  const completionRate = tasks.length > 0 ? Math.round(((tasks.length - visibleCount) / tasks.length) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">טוען פרויקט...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="text-center pt-6">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">שגיאה בטעינת פרויקט</h2>
            <p className="text-muted-foreground mb-4">{error || 'הפרויקט לא נמצא.'}</p>
            <Button asChild>
              <Link href="/admin/projects">
                <ArrowRight className="h-4 w-4 mr-2" />
                חזור לרשימת הפרויקטים
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <main className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl">
        {/* Project Header Card */}
        <Card className="overflow-hidden">
          {project.color && (
            <div className="h-2 w-full" style={{ backgroundColor: project.color }} />
          )}
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-2xl sm:text-3xl">{project.name}</CardTitle>
                  {project.isActive !== undefined && (
                    <Badge variant={project.isActive ? "default" : "outline"}>
                      {project.isActive ? 'פעיל' : 'לא פעיל'}
                    </Badge>
                  )}
                </div>
                {project.description && (
                  <p className="text-muted-foreground">{project.description}</p>
                )}
                
                {/* Project stats */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{tasks.length} משימות</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600 font-medium">{visibleCount} פעילות</span>
                  </div>
                  {completionRate > 0 && (
                    <div className="flex items-center gap-2">
                      <Progress value={completionRate} className="w-20 h-2" />
                      <span className="text-sm text-muted-foreground">{completionRate}%</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshData}
                  disabled={operationLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${operationLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline mr-1">רענן</span>
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4" />
                      <span className="hidden sm:inline mr-1">פעולות</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>פעולות פרויקט</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/projects/${project._id}/edit`}>
                        <Edit className="h-4 w-4 mr-2" />
                        ערוך פרויקט
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => {
                        setDeleteTarget({ type: 'project', id: project._id });
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      מחק פרויקט
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tasks Card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-xl">משימות</CardTitle>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Filter dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-1" />
                      {filterVisible === 'all' ? 'הכל' : filterVisible === 'visible' ? 'פעילות' : 'מוסתרות'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setFilterVisible('all')}>
                      הצג הכל
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterVisible('visible')}>
                      פעילות בלבד
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterVisible('hidden')}>
                      מוסתרות בלבד
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Sort dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <ArrowUpDown className="h-4 w-4 mr-1" />
                      {sortBy === 'priority' ? 'עדיפות' : sortBy === 'date' ? 'תאריך' : 'שם'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSortBy('priority')}>
                      מיין לפי עדיפות
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('date')}>
                      מיין לפי תאריך
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('name')}>
                      מיין לפי שם
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button asChild size="sm">
                  <Link href={`/admin/tasks/new?projectId=${project._id}`}>
                    <Plus className="h-4 w-4 mr-1" />
                    משימה חדשה
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {tasksLoading ? (
              <div className="divide-y divide-border">
                {[...Array(3)].map((_, i) => (
                  <TaskSkeleton key={i} />
                ))}
              </div>
            ) : filteredAndSortedTasks.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {filterVisible !== 'all' 
                    ? `אין משימות ${filterVisible === 'visible' ? 'פעילות' : 'מוסתרות'}`
                    : 'לא נוצרו משימות עבור פרויקט זה.'}
                </p>
                {filteredAndSortedTasks.length === 0 && tasks.length === 0 && (
                  <Button asChild className="mt-4">
                    <Link href={`/admin/tasks/new?projectId=${project._id}`}>
                      <Plus className="h-4 w-4 mr-1" />
                      צור משימה ראשונה
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredAndSortedTasks.map((task) => (
                  <div key={task._id} className="p-4 hover:bg-muted/40 transition-colors group">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <Link href={`/admin/tasks/${task._id}`} className="block group/link">
                          <h3 className="font-semibold text-foreground group-hover/link:text-primary transition-colors truncate">
                            {task.title}
                          </h3>
                          {task.subtitle && (
                            <p className="text-sm text-muted-foreground truncate">{task.subtitle}</p>
                          )}
                        </Link>
                        
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <div className="flex items-center gap-1">
                            {getPriorityBadge(task.priority)}
                          </div>
                          
                          {task.subtaskCount !== undefined && task.subtaskCount > 0 && (
                            <div className="flex items-center gap-1 text-primary">
                              <Layers className="h-3 w-3" />
                              <span className="font-medium">{task.subtaskCount} תת-משימות</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span className="font-mono">{formatDatacoDisplay(task.datacoNumber)}</span>
                          </div>

                          {!task.isVisible && (
                            <Badge variant="secondary" className="gap-1">
                              <EyeOff className="h-3 w-3" />
                              מוסתר
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Actions - Mobile optimized */}
                      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleVisibility(task._id, task.isVisible)}
                          title={task.isVisible ? 'הסתר' : 'הצג'}
                        >
                          {task.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <Link href={`/admin/tasks/${task._id}/edit`} title="ערוך משימה">
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Menu className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/tasks/${task._id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                צפה בפרטים
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                setDeleteTarget({ type: 'task', id: task._id });
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              מחק משימה
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          setShowDeleteDialog(open);
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        title="האם אתה בטוח?"
        description={
          deleteTarget?.type === 'project'
            ? 'פעולה זו תמחק לצמיתות את הפרויקט וכל המשימות ותת-המשימות שלו. לא ניתן לשחזר פעולה זו.'
            : 'פעולה זו תמחק לצמיתות את המשימה. לא ניתן לשחזר פעולה זו.'
        }
        loading={operationLoading}
      />
    </div>
  );
} 