'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowRight, 
  Eye, 
  Target, 
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Calendar,
  MapPin,
  Car,
  Zap,
  Clock,
  AlertTriangle,
  ChevronRight,
  Cloud,
  Building,
  FileText,
  Image as ImageIcon
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
  weather: 'Clear' | 'Fog' | 'Overcast' | 'Rain' | 'Snow' | 'Mixed';
  scene: 'Highway' | 'Urban' | 'Rural' | 'Sub-Urban' | 'Test Track' | 'Mixed';
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface NewSubtaskData {
  title: string;
  subtitle?: string;
  datacoNumber: string;
  type: 'events' | 'hours';
  amountNeeded: number;
  labels: string[];
  targetCar: string[];
  weather: 'Clear' | 'Fog' | 'Overcast' | 'Rain' | 'Snow' | 'Mixed';
  scene: 'Highway' | 'Urban' | 'Rural' | 'Sub-Urban' | 'Test Track' | 'Mixed';
}

export default function TaskManagement() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;
  
  const [task, setTask] = useState<Task | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Form states
  const [showNewSubtaskForm, setShowNewSubtaskForm] = useState(false);
  const [newSubtaskData, setNewSubtaskData] = useState<NewSubtaskData>({
    title: '',
    subtitle: '',
    datacoNumber: '',
    type: 'events',
    amountNeeded: 1,
    labels: [],
    targetCar: ['EQ'],
    weather: 'Clear',
    scene: 'Urban'
  });
  const [operationLoading, setOperationLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null);

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

    fetchTaskData();
  }, [taskId, router]);

  const fetchTaskData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const timestamp = Date.now();
      
      // Fetch task details, project info, and subtasks
      const [tasksRes, projectsRes, subtasksRes] = await Promise.all([
        fetch(`/api/tasks?_t=${timestamp}`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }).then(res => res.json()),
        fetch(`/api/projects?_t=${timestamp}`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }).then(res => res.json()),
        fetch(`/api/tasks/${taskId}/subtasks?_t=${timestamp}`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }).then(res => res.json())
      ]);

      if (tasksRes.success) {
        const foundTask = tasksRes.tasks.find((t: Task) => t.id === taskId);
        if (!foundTask) {
          router.push('/admin/dashboard');
          return;
        }
        setTask(foundTask);
        
        // Find the project for this task
        if (projectsRes.success) {
          const foundProject = projectsRes.projects.find((p: Project) => p.id === foundTask.projectId);
          setProject(foundProject || null);
        }
      }

      if (subtasksRes.success || subtasksRes.data?.subtasks) {
        const taskSubtasks = subtasksRes.data?.subtasks || subtasksRes.subtasks || [];
        setSubtasks(taskSubtasks);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching task data:', error);
      setLoading(false);
    }
  };

  const handleCreateSubtask = async () => {
    if (!task) return;
    
    setOperationLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const subtaskPayload = {
        ...newSubtaskData,
        taskId: task.id,
        targetCar: task.targetCar
      };

      const response = await fetch(`/api/subtasks?_t=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify(subtaskPayload)
      });

      const result = await response.json();
      
      if (result.success) {
        setNewSubtaskData({
          title: '',
          subtitle: '',
          datacoNumber: '',
          type: 'events',
          amountNeeded: 1,
          labels: [],
          targetCar: ['EQ'],
          weather: 'Clear',
          scene: 'Urban'
        });
        setShowNewSubtaskForm(false);
        await fetchTaskData();
      } else {
        alert('Failed to create subtask: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating subtask:', error);
      alert('Error creating subtask');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleUpdateSubtask = async () => {
    if (!editingSubtask) return;
    
    setOperationLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/subtasks/${editingSubtask.id}?_t=${Date.now()}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({
          title: editingSubtask.title,
          subtitle: editingSubtask.subtitle,
          amountNeeded: editingSubtask.amountNeeded,
          labels: editingSubtask.labels,
          weather: editingSubtask.weather,
          scene: editingSubtask.scene
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setEditingSubtask(null);
        await fetchTaskData();
      } else {
        alert('Failed to update subtask: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating subtask:', error);
      alert('Error updating subtask');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    setOperationLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/subtasks/${subtaskId}?_t=${Date.now()}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });

      if (response.ok) {
        await fetchTaskData();
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Error deleting subtask:', error);
    } finally {
      setOperationLoading(false);
    }
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
          <p className="text-muted-foreground">טוען נתוני משימה...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">משימה לא נמצאה</h3>
          <Link 
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            חזור ללוח הבקרה
          </Link>
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
              href={project ? `/admin/projects/${project.id}` : '/admin/dashboard'}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="חזור"
            >
              <ArrowRight className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Eye className="h-6 w-6 text-primary" />
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>לוח בקרה</span>
                  <ChevronRight className="h-4 w-4" />
                  {project && (
                    <>
                      <span>{project.name}</span>
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                  <span>ניהול משימה</span>
                </div>
                <h1 className="text-lg font-bold text-foreground">{task.title}</h1>
              </div>
            </div>
            <div className="mr-auto">
              <button
                onClick={fetchTaskData}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors"
                title="רענן נתונים"
              >
                <RefreshCw className="h-4 w-4" />
                רענן
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Task Details */}
        <div className="bg-card rounded-lg border border-border p-6 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-semibold text-foreground">{task.title}</h2>
                <span className="text-sm text-muted-foreground font-mono px-2 py-1 bg-muted rounded">
                  {task.datacoNumber}
                </span>
                {task.priority > 0 && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    {getPriorityLabel(task.priority)}
                  </span>
                )}
              </div>
              {task.subtitle && (
                <p className="text-muted-foreground mb-4">{task.subtitle}</p>
              )}
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">תיאור המשימה</h4>
                  <p className="text-sm text-muted-foreground">{task.description.main}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">אופן ביצוע</h4>
                  <p className="text-sm text-muted-foreground">{task.description.howToExecute}</p>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground text-left">
              <p>נוצר: {new Date(task.createdAt).toLocaleDateString('he-IL')}</p>
              <p>עודכן: {new Date(task.updatedAt).toLocaleDateString('he-IL')}</p>
            </div>
          </div>

          {/* Task Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-muted/30 rounded-lg p-4">
              <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                כמות נדרשת
              </h5>
              <p className="text-lg font-bold text-primary">{task.amountNeeded}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                מיקומים
              </h5>
              <p className="text-sm">{task.locations.join(', ')}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <Car className="h-4 w-4" />
                רכבי יעד
              </h5>
              <p className="text-sm">{task.targetCar.join(', ')}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                זמני יום
              </h5>
              <p className="text-sm">{task.dayTime.map(getDayTimeLabel).join(', ')}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                סוג משימה
              </h5>
              <p className="text-sm">{task.type.join(', ')}</p>
            </div>
            {task.lidar && (
              <div className="bg-muted/30 rounded-lg p-4">
                <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  LiDAR
                </h5>
                <p className="text-sm text-green-600">נדרש</p>
              </div>
            )}
          </div>
        </div>

        {/* Subtasks Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <Target className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">סה״כ תת-משימות</p>
                <p className="text-2xl font-bold text-foreground">{subtasks.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Events</p>
                <p className="text-2xl font-bold text-foreground">
                  {subtasks.filter(s => s.type === 'events').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Hours</p>
                <p className="text-2xl font-bold text-foreground">
                  {subtasks.filter(s => s.type === 'hours').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card rounded-lg border border-border p-6 mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">פעולות מהירות</h3>
          <div className="flex gap-4">
            <button
              onClick={() => setShowNewSubtaskForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              הוסף תת-משימה חדשה
            </button>
          </div>
        </div>

        {/* Subtasks List */}
        <div className="bg-card rounded-lg border border-border">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">תת-משימות</h3>
            <p className="text-sm text-muted-foreground mt-1">נהל את כל התת-משימות של המשימה</p>
          </div>
          
          <div className="p-6">
            {subtasks.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-foreground mb-2">אין תת-משימות</h4>
                <p className="text-muted-foreground mb-4">הוסף תת-משימה ראשונה כדי להתחיל</p>
                <button
                  onClick={() => setShowNewSubtaskForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  הוסף תת-משימה ראשונה
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {subtasks.map((subtask) => (
                  <div key={subtask.id} className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-foreground">{subtask.title}</h4>
                          <span className="text-xs text-muted-foreground px-2 py-1 bg-background rounded font-mono">
                            {subtask.datacoNumber}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            subtask.type === 'events' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {subtask.type}
                          </span>
                        </div>
                        {subtask.subtitle && (
                          <p className="text-sm text-muted-foreground mb-2">{subtask.subtitle}</p>
                        )}
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3 text-muted-foreground" />
                            <span>{subtask.amountNeeded} {subtask.type}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Cloud className="h-3 w-3 text-muted-foreground" />
                            <span>{subtask.weather}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            <span>{subtask.scene}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Car className="h-3 w-3 text-muted-foreground" />
                            <span>{subtask.targetCar.join(', ')}</span>
                          </div>
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingSubtask(subtask)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="ערוך תת-משימה"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(subtask.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="מחק תת-משימה"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* New Subtask Modal */}
      {showNewSubtaskForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">הוסף תת-משימה חדשה</h3>
              <p className="text-sm text-muted-foreground mt-1">צור תת-משימה חדשה עבור המשימה "{task?.title}"</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">כותרת *</label>
                  <input
                    type="text"
                    value={newSubtaskData.title}
                    onChange={(e) => setNewSubtaskData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                    placeholder="כותרת התת-משימה"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">כותרת משנה</label>
                  <input
                    type="text"
                    value={newSubtaskData.subtitle}
                    onChange={(e) => setNewSubtaskData(prev => ({ ...prev, subtitle: e.target.value }))}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                    placeholder="כותרת משנה (אופציונלי)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">מספר DATACO *</label>
                  <input
                    type="text"
                    value={newSubtaskData.datacoNumber}
                    onChange={(e) => setNewSubtaskData(prev => ({ ...prev, datacoNumber: e.target.value }))}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                    placeholder="DATACO-XXXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">כמות נדרשת *</label>
                  <input
                    type="number"
                    min="1"
                    value={newSubtaskData.amountNeeded}
                    onChange={(e) => setNewSubtaskData(prev => ({ ...prev, amountNeeded: parseInt(e.target.value) || 1 }))}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">סוג תת-משימה *</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="subtaskType"
                      value="events"
                      checked={newSubtaskData.type === 'events'}
                      onChange={(e) => setNewSubtaskData(prev => ({ ...prev, type: e.target.value as 'events' | 'hours' }))}
                      className="mr-2"
                    />
                    Events (אירועים)
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="subtaskType"
                      value="hours"
                      checked={newSubtaskData.type === 'hours'}
                      onChange={(e) => setNewSubtaskData(prev => ({ ...prev, type: e.target.value as 'events' | 'hours' }))}
                      className="mr-2"
                    />
                    Hours (שעות)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">תוויות (Labels)</label>
                <input
                  type="text"
                  value={newSubtaskData.labels.join(', ')}
                  onChange={(e) => {
                    const labelsText = e.target.value;
                    const labelsArray = labelsText.split(',').map(label => label.trim()).filter(label => label.length > 0);
                    setNewSubtaskData(prev => ({ ...prev, labels: labelsArray }));
                  }}
                  className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                  placeholder="הפרד תוויות בפסיק (למשל: urban, daytime, clear weather)"
                />
                <p className="text-xs text-muted-foreground mt-1">הזן תוויות מופרדות בפסיק</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">תמונה (אופציונלי)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // For now, we'll just store the filename
                      // In a real implementation, you'd upload the file to a storage service
                      console.log('Image file selected:', file.name);
                      // You could implement image upload here
                    }
                  }}
                  className="w-full p-2 border border-border rounded-lg bg-background text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                <p className="text-xs text-muted-foreground mt-1">העלה תמונה רלוונטית לתת-המשימה (JPG, PNG, GIF)</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">מזג אוויר *</label>
                  <select
                    value={newSubtaskData.weather}
                    onChange={(e) => setNewSubtaskData(prev => ({ ...prev, weather: e.target.value as any }))}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="Clear">בהיר (Clear)</option>
                    <option value="Fog">ערפל (Fog)</option>
                    <option value="Overcast">מעונן (Overcast)</option>
                    <option value="Rain">גשם (Rain)</option>
                    <option value="Snow">שלג (Snow)</option>
                    <option value="Mixed">מעורב (Mixed)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">סצנה *</label>
                  <select
                    value={newSubtaskData.scene}
                    onChange={(e) => setNewSubtaskData(prev => ({ ...prev, scene: e.target.value as any }))}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="Highway">כביש מהיר (Highway)</option>
                    <option value="Urban">עירוני (Urban)</option>
                    <option value="Rural">כפרי (Rural)</option>
                    <option value="Sub-Urban">פרברי (Sub-Urban)</option>
                    <option value="Test Track">מסלול בדיקות (Test Track)</option>
                    <option value="Mixed">מעורב (Mixed)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">רכבי יעד (ירושה מהמשימה)</label>
                <div className="p-2 border border-border rounded-lg bg-muted/30 text-foreground">
                  {task?.targetCar.join(', ') || 'לא נבחרו רכבים'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">רכבי היעד עוברים בירושה מהמשימה הראשית</p>
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <button
                onClick={handleCreateSubtask}
                disabled={operationLoading || !newSubtaskData.title || !newSubtaskData.datacoNumber}
                className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {operationLoading ? 'יוצר...' : 'צור תת-משימה'}
              </button>
              <button
                onClick={() => setShowNewSubtaskForm(false)}
                disabled={operationLoading}
                className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subtask Modal */}
      {editingSubtask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">ערוך תת-משימה</h3>
              <p className="text-sm text-muted-foreground mt-1">ערוך את תת-המשימה "{editingSubtask.title}"</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">כותרת *</label>
                  <input
                    type="text"
                    value={editingSubtask.title}
                    onChange={(e) => setEditingSubtask(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">כותרת משנה</label>
                  <input
                    type="text"
                    value={editingSubtask.subtitle || ''}
                    onChange={(e) => setEditingSubtask(prev => prev ? ({ ...prev, subtitle: e.target.value }) : null)}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">כמות נדרשת *</label>
                  <input
                    type="number"
                    min="1"
                    value={editingSubtask.amountNeeded}
                    onChange={(e) => setEditingSubtask(prev => prev ? ({ ...prev, amountNeeded: parseInt(e.target.value) || 1 }) : null)}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">סוג</label>
                  <div className="p-2 border border-border rounded-lg bg-muted/30 text-foreground">
                    {editingSubtask.type === 'events' ? 'Events (אירועים)' : 'Hours (שעות)'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">לא ניתן לשנות את סוג התת-משימה</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">תוויות (Labels)</label>
                <input
                  type="text"
                  value={editingSubtask.labels.join(', ')}
                  onChange={(e) => {
                    const labelsText = e.target.value;
                    const labelsArray = labelsText.split(',').map(label => label.trim()).filter(label => label.length > 0);
                    setEditingSubtask(prev => prev ? ({ ...prev, labels: labelsArray }) : null);
                  }}
                  className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                  placeholder="הפרד תוויות בפסיק"
                />
                <p className="text-xs text-muted-foreground mt-1">הזן תוויות מופרדות בפסיק</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">מזג אוויר *</label>
                  <select
                    value={editingSubtask.weather}
                    onChange={(e) => setEditingSubtask(prev => prev ? ({ ...prev, weather: e.target.value as any }) : null)}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="Clear">בהיר (Clear)</option>
                    <option value="Fog">ערפל (Fog)</option>
                    <option value="Overcast">מעונן (Overcast)</option>
                    <option value="Rain">גשם (Rain)</option>
                    <option value="Snow">שלג (Snow)</option>
                    <option value="Mixed">מעורב (Mixed)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">סצנה *</label>
                  <select
                    value={editingSubtask.scene}
                    onChange={(e) => setEditingSubtask(prev => prev ? ({ ...prev, scene: e.target.value as any }) : null)}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="Highway">כביש מהיר (Highway)</option>
                    <option value="Urban">עירוני (Urban)</option>
                    <option value="Rural">כפרי (Rural)</option>
                    <option value="Sub-Urban">פרברי (Sub-Urban)</option>
                    <option value="Test Track">מסלול בדיקות (Test Track)</option>
                    <option value="Mixed">מעורב (Mixed)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">רכבי יעד (ירושה מהמשימה)</label>
                <div className="p-2 border border-border rounded-lg bg-muted/30 text-foreground">
                  {editingSubtask.targetCar.join(', ')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">רכבי היעד עוברים בירושה מהמשימה הראשית</p>
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <button
                onClick={handleUpdateSubtask}
                disabled={operationLoading}
                className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {operationLoading ? 'שומר...' : 'שמור שינויים'}
              </button>
              <button
                onClick={() => setEditingSubtask(null)}
                disabled={operationLoading}
                className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-border w-full max-w-sm">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">אישור מחיקה</h3>
              <p className="text-muted-foreground mb-4">האם אתה בטוח שברצונך למחוק את התת-משימה? פעולה זו לא ניתנת לביטול.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDeleteSubtask(deleteConfirm)}
                  disabled={operationLoading}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {operationLoading ? 'מוחק...' : 'מחק'}
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={operationLoading}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 