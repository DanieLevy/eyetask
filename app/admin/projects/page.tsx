'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, 
  Trash2, 
  FolderOpen,
  FileText,
  Search,
  Loader2,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

interface Project {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  taskCount?: number;
}

interface Task {
  _id: string;
  projectId: string;
}

export default function ProjectsManagementPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [operationLoading, setOperationLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const router = useRouter();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/admin');
        return;
      }
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
        const projectsWithCounts = projectsRes.projects.map((p: Project) => ({
          ...p,
          taskCount: tasksRes.tasks.filter((t: Task) => t.projectId === p._id).length
        }));
        setProjects(projectsWithCounts);
      } else {
        toast.error('Failed to load projects');
      }
      
      if (tasksRes.success) {
        setTasks(tasksRes.tasks);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('An error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteProject = async (projectId: string) => {
    setOperationLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(`Project deleted successfully`);
        setProjects(prev => prev.filter(p => p._id !== projectId));
      } else {
        toast.error(result.error || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('An error occurred while deleting the project.');
    } finally {
      setOperationLoading(false);
      setDeleteConfirm(null);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">טוען פרויקטים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900" dir="rtl">
      <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 h-16">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">פרויקטים</h1>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="חיפוש..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 pl-3 py-2 border border-gray-300 rounded-lg text-sm w-40 md:w-56 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <Link
                href="/admin/projects/new"
                className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-sm transition-all hover:scale-105"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">פרויקט חדש</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-24">
            <FolderOpen className="h-20 w-20 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">לא נמצאו פרויקטים</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {searchTerm ? 'נסה לשנות את החיפוש.' : 'צור פרויקט חדש כדי להתחיל.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProjects.map(project => (
              <div key={project._id} className="bg-white dark:bg-gray-800 rounded-xl border-l-4 border-blue-500 shadow-md transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col">
                <div className="p-5 flex-grow">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{project.name}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 h-10 line-clamp-2">{project.description || 'לא סופק תיאור.'}</p>
                  
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{project.taskCount}</span>
                    <span>{project.taskCount === 1 ? 'משימה' : 'משימות'}</span>
                  </div>
                </div>
                <div className="px-4 py-3 bg-slate-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                   <Link
                      href={`/admin/tasks/new?projectId=${project._id}`}
                      className="flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors"
                      title="הוסף משימה חדשה"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      הוסף משימה
                    </Link>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/admin/projects/${project._id}`}
                      className="p-2 inline-flex items-center justify-center text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                      title="צפה בפרויקט"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                    <button
                      onClick={() => setDeleteConfirm(project._id)}
                      className="p-2 inline-flex items-center justify-center text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                      title="מחק פרויקט"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold">האם אתה בטוח?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              פעולה זו תמחק לצמיתות את הפרויקט ואת כל המשימות המשויכות אליו. לא ניתן לשחזר פעולה זו.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium"
              >
                ביטול
              </button>
              <button
                onClick={() => handleDeleteProject(deleteConfirm)}
                disabled={operationLoading}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
              >
                {operationLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin"/>
                ) : (
                  'אשר מחיקה'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 