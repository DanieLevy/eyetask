'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  FolderOpen,
  Calendar,
  FileText,
  Eye,
  ArrowLeft,
  Search,
  Filter,
  MoreVertical,
  Settings,
  BarChart3,
  Target,
  Clock,
  ExternalLink,
  Home,
  AlertTriangle,
  Loader2,
  CheckCircle
} from 'lucide-react';

// Temporary inline hooks to bypass import issue
const useHebrewFont = (element: string = 'body') => ({ fontClass: 'font-hebrew text-right', direction: 'rtl' as const });
const useMixedFont = (element: string = 'body') => ({ fontClass: 'font-mixed', direction: 'ltr' as const });
const usePageRefresh = (callback: () => void) => { useEffect(() => { callback(); }, [callback]); };

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface Task {
  id: string;
  title: string;
  projectId: string;
  priority: number;
  isVisible: boolean;
  amountNeeded: number;
}

export default function ProjectsManagementPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectData, setNewProjectData] = useState({ name: '', description: '' });
  const [operationLoading, setOperationLoading] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const router = useRouter();
  
  // Font configurations
  const hebrewHeading = useHebrewFont('heading');
  const hebrewBody = useHebrewFont('body');
  const mixedBody = useMixedFont('body');

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const timestamp = Date.now();
      
      const [projectsRes, tasksRes] = await Promise.all([
        fetch(`/api/projects?_t=${timestamp}`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }).then(res => res.json()),
        fetch(`/api/tasks?_t=${timestamp}`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }).then(res => res.json())
      ]);

      if (projectsRes.success) {
        setProjects(projectsRes.projects);
      } else {
        showNotification('שגיאה בטעינת הפרויקטים', 'error');
      }
      
      if (tasksRes.success) {
        setTasks(tasksRes.tasks);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification('שגיאה בטעינת הנתונים', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  usePageRefresh(fetchData);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getTaskStats = (projectId: string) => {
    const projectTasks = tasks.filter(task => task.projectId === projectId);
    const totalTasks = projectTasks.length;
    const highPriorityTasks = projectTasks.filter(task => task.priority >= 1 && task.priority <= 3).length;
    const completedTasks = projectTasks.filter(task => !task.isVisible).length;
    
    return { totalTasks, highPriorityTasks, completedTasks };
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateProject = async () => {
    if (!newProjectData.name.trim()) {
      showNotification('שם הפרויקט נדרש', 'error');
      return;
    }
    
    setOperationLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newProjectData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setShowNewProjectForm(false);
        setNewProjectData({ name: '', description: '' });
        showNotification('הפרויקט נוצר בהצלחה', 'success');
        await fetchData();
      } else {
        showNotification(result.error || 'שגיאה ביצירת הפרויקט', 'error');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      showNotification('שגיאה ביצירת הפרויקט', 'error');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject) return;
    
    if (!editingProject.name.trim()) {
      showNotification('שם הפרויקט נדרש', 'error');
      return;
    }
    
    setOperationLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editingProject.name,
          description: editingProject.description
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setEditingProject(null);
        showNotification('הפרויקט עודכן בהצלחה', 'success');
        await fetchData();
      } else {
        showNotification(result.error || 'שגיאה בעדכון הפרויקט', 'error');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      showNotification('שגיאה בעדכון הפרויקט', 'error');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    const stats = getTaskStats(projectId);
    
    const confirmMessage = stats.totalTasks > 0 
      ? `האם אתה בטוח שברצונך למחוק את הפרויקט "${project?.name}"?\n\nפעולה זו תמחק:\n• ${stats.totalTasks} משימות\n• כל התת-משימות הקשורות\n\nפעולה זו לא ניתנת לביטול.`
      : `האם אתה בטוח שברצונך למחוק את הפרויקט "${project?.name}"?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    setDeletingProjectId(projectId);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showNotification(`הפרויקט "${project?.name}" נמחק בהצלחה`, 'success');
        await fetchData();
      } else {
        showNotification(result.error || 'שגיאה במחיקת הפרויקט', 'error');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      showNotification('שגיאה במחיקת הפרויקט', 'error');
    } finally {
      setDeletingProjectId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">טוען פרויקטים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Notification - Enhanced for Mobile PWA */}
      {notification && (
        <div className={`fixed top-20 right-4 left-4 md:left-auto md:top-4 md:right-4 z-[9999] p-4 rounded-lg shadow-lg border transition-all max-w-md mx-auto md:mx-0 ${
          notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' && <CheckCircle className="h-5 w-5 flex-shrink-0" />}
            {notification.type === 'error' && <AlertTriangle className="h-5 w-5 flex-shrink-0" />}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/dashboard"
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                title="חזור ללוח הבקרה"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex items-center gap-3">
                <FolderOpen className="h-6 w-6 text-primary" />
                <div>
                  <h1 className={`text-xl font-bold text-foreground ${hebrewHeading.fontClass}`}>
                    ניהול פרויקטים
                  </h1>
                  <p className={`text-sm text-muted-foreground ${mixedBody.fontClass}`}>
                    {projects.length} פרויקטים במערכת • {tasks.length} משימות סה״כ
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
              >
                <Home className="h-4 w-4" />
                עמוד הבית
              </Link>
              <button
                onClick={() => setShowNewProjectForm(true)}
                disabled={operationLoading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                פרויקט חדש
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="חפש פרויקטים..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            {searchTerm && (
              <span className="text-sm text-muted-foreground">
                {filteredProjects.length} מתוך {projects.length} פרויקטים
              </span>
            )}
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchTerm ? 'לא נמצאו פרויקטים' : 'אין פרויקטים עדיין'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'נסה לחפש במילות מפתח אחרות' : 'צור את הפרויקט הראשון שלך כדי להתחיל'}
            </p>
            {!searchTerm && (
              <button 
                onClick={() => setShowNewProjectForm(true)}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
              >
                צור פרויקט חדש
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const stats = getTaskStats(project.id);
              const isEditing = editingProject?.id === project.id;
              const isDeleting = deletingProjectId === project.id;
              
              return (
                <div key={project.id} className={`bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-all group relative ${isDeleting ? 'opacity-50' : ''}`}>
                  {/* Project Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingProject.name}
                          onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                          className="text-lg font-semibold w-full p-2 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      ) : (
                        <h3 className={`text-lg font-semibold text-foreground group-hover:text-primary transition-colors ${hebrewHeading.fontClass}`}>
                          {project.name}
                        </h3>
                      )}
                      
                      {isEditing ? (
                        <textarea
                          value={editingProject.description || ''}
                          onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                          className="text-sm w-full mt-2 p-2 border border-border rounded bg-background text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary h-20 resize-none"
                          placeholder="תיאור הפרויקט..."
                        />
                      ) : (
                        project.description && (
                          <p className={`text-sm text-muted-foreground mt-2 line-clamp-2 ${mixedBody.fontClass}`}>
                            {project.description}
                          </p>
                        )
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 ml-2">
                      {isEditing ? (
                        <div className="flex gap-1">
                          <button
                            onClick={handleUpdateProject}
                            disabled={operationLoading}
                            className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg transition-colors disabled:opacity-50 border border-green-200 dark:border-green-700"
                            title="שמור שינויים"
                          >
                            {operationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => setEditingProject(null)}
                            disabled={operationLoading}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
                            title="בטל עריכה"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingProject(project)}
                            disabled={isDeleting}
                            className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg transition-colors disabled:opacity-50 border border-blue-200 dark:border-blue-700 shadow-sm hover:shadow-md"
                            title="ערוך פרויקט"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            disabled={isDeleting}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg transition-colors disabled:opacity-50 border border-red-200 dark:border-red-700 shadow-sm hover:shadow-md"
                            title="מחק פרויקט"
                          >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Project Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 bg-primary/5 rounded-lg">
                      <div className="text-lg font-bold text-primary">{stats.totalTasks}</div>
                      <div className="text-xs text-muted-foreground">משימות</div>
                    </div>
                    <div className="text-center p-3 bg-orange-500/5 rounded-lg">
                      <div className="text-lg font-bold text-orange-600">{stats.highPriorityTasks}</div>
                      <div className="text-xs text-muted-foreground">דחוף</div>
                    </div>
                    <div className="text-center p-3 bg-green-500/5 rounded-lg">
                      <div className="text-lg font-bold text-green-600">{stats.completedTasks}</div>
                      <div className="text-xs text-muted-foreground">הושלמו</div>
                    </div>
                  </div>

                  {/* Project Actions */}
                  <div className="space-y-2">
                    <Link
                      href={`/admin/projects/${project.id}`}
                      className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-center text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Target className="h-4 w-4" />
                      נהל משימות ({stats.totalTasks})
                    </Link>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={`/project/${encodeURIComponent(project.name)}`}
                        className="bg-secondary text-secondary-foreground px-3 py-2 rounded-lg hover:bg-secondary/90 transition-colors text-center text-xs flex items-center justify-center gap-1"
                        target="_blank"
                      >
                        <Eye className="h-3 w-3" />
                        צפייה
                      </Link>
                      <Link
                        href={`/admin/tasks/new?projectId=${project.id}`}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-center text-xs flex items-center justify-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        משימה
                      </Link>
                    </div>
                  </div>

                  {/* Project Metadata */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>נוצר: {new Date(project.createdAt).toLocaleDateString('he-IL')}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(project.updatedAt).toLocaleDateString('he-IL')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* New Project Modal */}
      {showNewProjectForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-border w-full max-w-md">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">צור פרויקט חדש</h3>
              <p className="text-sm text-muted-foreground mt-1">הוסף פרויקט חדש למערכת לניהול משימות</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">שם הפרויקט *</label>
                <input
                  type="text"
                  value={newProjectData.name}
                  onChange={(e) => setNewProjectData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="הזן שם לפרויקט החדש"
                  disabled={operationLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">תיאור (אופציונלי)</label>
                <textarea
                  value={newProjectData.description}
                  onChange={(e) => setNewProjectData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent h-20 resize-none"
                  placeholder="הוסף תיאור לפרויקט"
                  disabled={operationLoading}
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <button
                onClick={handleCreateProject}
                disabled={operationLoading || !newProjectData.name.trim()}
                className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {operationLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    יוצר...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    צור פרויקט
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowNewProjectForm(false);
                  setNewProjectData({ name: '', description: '' });
                }}
                disabled={operationLoading}
                className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 