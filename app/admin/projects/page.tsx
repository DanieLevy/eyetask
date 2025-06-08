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
  CheckCircle,
  AlertCircle,
  Info,
  List,
  Grid,
  Download,
  Menu
} from 'lucide-react';

// Temporary inline hooks to bypass import issue
const useHebrewFont = (element: string = 'body') => ({ fontClass: 'font-hebrew text-right', direction: 'rtl' as const });
const useMixedFont = (element: string = 'body') => ({ fontClass: 'font-mixed', direction: 'ltr' as const });
const usePageRefresh = (callback: () => void) => { useEffect(() => { callback(); }, [callback]); };

interface Project {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  taskCount?: number;
  highPriorityCount?: number;
}

interface Task {
  _id: string;
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
  const [operationLoading, setOperationLoading] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list'); // Default to list for mobile
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
  }, []); // Remove fetchData from dependencies to prevent infinite loop

  const getTaskStats = (projectId: string) => {
    const project = projects.find(p => p._id === projectId);
    if (project && project.taskCount !== undefined && project.highPriorityCount !== undefined) {
      return {
        totalTasks: project.taskCount,
        highPriorityTasks: project.highPriorityCount,
        completedTasks: tasks.filter(task => task.projectId === projectId && !task.isVisible).length
      };
    }
    
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

  const handleUpdateProject = async () => {
    if (!editingProject) return;
    
    if (!editingProject.name.trim()) {
      showNotification('שם הפרויקט נדרש', 'error');
      return;
    }
    
    setOperationLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/projects/${editingProject._id}`, {
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
    const project = projects.find(p => p._id === projectId);
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

  const exportProjectsCsv = async () => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/projects/export', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'projects.csv';
        link.click();
        URL.revokeObjectURL(link.href);
        showNotification('הייצוא נספק בהצלחה', 'success');
      } else {
        showNotification('שגיאה בייצוא פרויקטים', 'error');
      }
    } catch (error) {
      console.error('Error exporting projects:', error);
      showNotification('שגיאה בייצוא פרויקטים', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">טוען פרויקטים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First Notification */}
      {notification && (
        <div className={`fixed top-0 left-0 right-0 z-50 p-4 transition-all ${
          notification.type === 'success' ? 'bg-green-600' :
          notification.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        }`}>
          <div className="flex items-center gap-2 text-white">
            {notification.type === 'success' && <CheckCircle className="h-4 w-4" />}
            {notification.type === 'error' && <AlertCircle className="h-4 w-4" />}
            {notification.type === 'info' && <Info className="h-4 w-4" />}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Mobile-First Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="px-3 md:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Navigation and Title */}
            <div className="flex items-center gap-2 md:gap-3">
              <Link
                href="/admin/dashboard"
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="חזור ללוח הבקרה"
              >
                <ArrowLeft className="h-4 w-4 text-gray-600" />
              </Link>
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-blue-600" />
                <div>
                  <h1 className="text-lg md:text-xl font-bold text-gray-900">
                    ניהול פרויקטים
                  </h1>
                  <p className="text-xs text-gray-500 hidden sm:block">
                    {projects.length} פרויקטים • {tasks.length} משימות
                  </p>
                </div>
              </div>
            </div>
            
            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Mobile Menu Toggle */}
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
                <Link
                  href="/admin/projects/new"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  פרויקט חדש
                </Link>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-3 pt-3 border-t border-gray-200">
              <div className="flex flex-col gap-2">
                <Link
                  href="/"
                  className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-100 transition-colors w-full text-right"
                >
                  <Home className="h-4 w-4 text-gray-600" />
                  <span className="text-sm text-gray-700">עמוד הבית</span>
                </Link>
                <Link
                  href="/admin/projects/new"
                  className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors w-full text-right"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm">פרויקט חדש</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-3 md:p-6">
        {/* Mobile-First Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="חפש פרויקטים..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {searchTerm && (
            <p className="text-xs text-gray-500 mt-2">
              {filteredProjects.length} מתוך {projects.length} פרויקטים
            </p>
          )}
        </div>

        {/* View Toggle for Desktop */}
        <div className="hidden md:flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Grid className="h-4 w-4" />
            </button>
          </div>
          
          <button
            onClick={exportProjectsCsv}
            disabled={isExporting}
            className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'מייצא...' : 'ייצא CSV'}
          </button>
        </div>

        {/* Projects List/Grid */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-8 md:py-12">
            <FolderOpen className="h-12 md:h-16 w-12 md:w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm ? 'לא נמצאו פרויקטים' : 'אין פרויקטים עדיין'}
            </h3>
            <p className="text-gray-600 mb-4 text-sm">
              {searchTerm ? 'נסה לחפש במילות מפתח אחרות' : 'צור את הפרויקט הראשון שלך כדי להתחיל'}
            </p>
            {!searchTerm && (
              <Link
                href="/admin/projects/new"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block"
              >
                צור פרויקט חדש
              </Link>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
            {filteredProjects.map((project) => {
              const stats = getTaskStats(project._id);
              const isEditing = editingProject?._id === project._id;
              const isDeleting = deletingProjectId === project._id;
              
              if (viewMode === 'grid') {
                return (
                  <div key={project._id} className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all ${isDeleting ? 'opacity-50' : ''}`}>
                    {/* Grid Card Layout */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingProject.name}
                            onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                            className="text-lg font-semibold w-full p-2 border border-gray-200 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {project.name}
                          </h3>
                        )}
                        
                        {isEditing ? (
                          <textarea
                            value={editingProject.description || ''}
                            onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                            className="text-sm w-full mt-2 p-2 border border-gray-200 rounded bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 h-16 resize-none"
                            placeholder="תיאור הפרויקט..."
                          />
                        ) : (
                          project.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {project.description}
                            </p>
                          )
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center p-2 bg-blue-50 rounded-lg">
                        <div className="text-sm font-bold text-blue-600">{stats.totalTasks}</div>
                        <div className="text-xs text-blue-700">משימות</div>
                      </div>
                      <div className="text-center p-2 bg-red-50 rounded-lg">
                        <div className="text-sm font-bold text-red-600">{stats.highPriorityTasks}</div>
                        <div className="text-xs text-red-700">דחוף</div>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded-lg">
                        <div className="text-sm font-bold text-green-600">{stats.completedTasks}</div>
                        <div className="text-xs text-green-700">הושלמו</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button
                            onClick={handleUpdateProject}
                            disabled={operationLoading}
                            className="flex items-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50 text-sm"
                          >
                            <Save className="h-3 w-3" />
                            שמור
                          </button>
                          <button
                            onClick={() => setEditingProject(null)}
                            className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                          >
                            <X className="h-3 w-3" />
                            ביטול
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingProject(project)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <Link
                            href={`/admin/projects/${project._id}`}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDeleteProject(project._id)}
                            disabled={isDeleting}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              } else {
                // List View - Mobile-Optimized
                return (
                  <div key={project._id} className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all ${isDeleting ? 'opacity-50' : ''}`}>
                    <div className="flex items-start gap-3">
                      {/* Project Icon */}
                      <div className="flex-shrink-0 p-2 bg-blue-50 rounded-lg">
                        <FolderOpen className="h-4 w-4 text-blue-600" />
                      </div>

                      {/* Project Content */}
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editingProject.name}
                              onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                              className="text-base font-semibold w-full p-2 border border-gray-200 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <textarea
                              value={editingProject.description || ''}
                              onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                              className="text-sm w-full p-2 border border-gray-200 rounded bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 h-16 resize-none"
                              placeholder="תיאור הפרויקט..."
                            />
                          </div>
                        ) : (
                          <div>
                            <h3 className="text-base font-semibold text-gray-900 truncate">
                              {project.name}
                            </h3>
                            {project.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {project.description}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Stats Row */}
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="flex items-center gap-1 text-blue-600">
                            <Target className="h-3 w-3" />
                            {stats.totalTasks} משימות
                          </span>
                          <span className="flex items-center gap-1 text-red-600">
                            <AlertCircle className="h-3 w-3" />
                            {stats.highPriorityTasks} דחוף
                          </span>
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            {stats.completedTasks} הושלמו
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <button
                              onClick={handleUpdateProject}
                              disabled={operationLoading}
                              className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingProject(null)}
                              className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingProject(project)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <Link
                              href={`/admin/projects/${project._id}`}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => handleDeleteProject(project._id)}
                              disabled={isDeleting}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}

        {/* Mobile FAB for New Project */}
        <Link
          href="/admin/projects/new"
          className="md:hidden fixed bottom-6 left-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center z-30"
        >
          <Plus className="h-6 w-6" />
        </Link>

        {/* Mobile Export Button */}
        {filteredProjects.length > 0 && (
          <button
            onClick={exportProjectsCsv}
            disabled={isExporting}
            className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-colors flex items-center justify-center z-30 disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Download className="h-5 w-5" />
            )}
          </button>
        )}
      </main>
    </div>
  );
} 