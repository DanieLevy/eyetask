'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { PlusCircle, Loader2, AlertTriangle, ChevronLeft, List, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale/he';

interface Project {
  _id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'planning';
  updatedAt?: string;
  taskCount?: number;
}

interface Task {
  _id: string;
  projectId: string;
  status: 'open' | 'in-progress' | 'completed';
  updatedAt?: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  useEffect(() => {
    async function fetchData() {
    try {
      setLoading(true);
      const [projectsRes, tasksRes] = await Promise.all([
          fetch('/api/projects'),
          fetch('/api/tasks'),
        ]);

        if (!projectsRes.ok) {
          throw new Error('לא ניתן לטעון פרויקטים');
        }
        if (!tasksRes.ok) {
          throw new Error('לא ניתן לטעון משימות');
        }

        const projectsData = await projectsRes.json();
        const tasksData = await tasksRes.json();
        
        const projectsWithTaskCounts = (projectsData.projects || []).map((project: Project) => ({
          ...project,
          taskCount: (tasksData.tasks || []).filter((task: Task) => task.projectId === project._id).length
        }));

        projectsWithTaskCounts.sort((a: Project, b: Project) => (b.taskCount ?? 0) - (a.taskCount ?? 0));

        setProjects(projectsWithTaskCounts);
        setTasks(tasksData.tasks || []);
      } catch (e: any) {
        setError(e.message);
    } finally {
      setLoading(false);
    }
    }
    fetchData();
  }, []);

  const getTaskCounts = (projectId: string) => {
    const projectTasks = tasks.filter(task => task.projectId === projectId);
    const openTasks = projectTasks.filter(task => task.status !== 'completed').length;
    const completedTasks = projectTasks.length - openTasks;
    return { openTasks, completedTasks, totalTasks: projectTasks.length };
  };

  const navigateToProject = (id: string) => {
    router.push(`/admin/projects/${id}`);
  };

  const getMostRecentUpdate = (projectId: string) => {
    const projectTasks = tasks
      .filter(task => task.projectId === projectId && task.updatedAt)
      .sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime());
    
    const project = projects.find(p => p._id === projectId);

    const mostRecentTaskUpdate = projectTasks.length > 0 ? new Date(projectTasks[0].updatedAt!) : null;
    const projectUpdate = project?.updatedAt ? new Date(project.updatedAt) : null;

    if (!mostRecentTaskUpdate && !projectUpdate) return null;
    if (mostRecentTaskUpdate && !projectUpdate) return mostRecentTaskUpdate;
    if (!mostRecentTaskUpdate && projectUpdate) return projectUpdate;
    
    return mostRecentTaskUpdate! > projectUpdate! ? mostRecentTaskUpdate : projectUpdate;
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-red-50 dark:bg-gray-900 text-red-700 dark:text-red-300">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <h2 className="text-xl font-semibold mb-2">אופס! משהו השתבש</h2>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  return (
    <div dir="rtl" className="bg-gray-50 dark:bg-gray-950 min-h-screen">
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
              פרויקטים
                  </h1>
            <button
              onClick={() => router.push('/admin/projects/new')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusCircle size={20} />
              <span>פרויקט חדש</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => {
              const { openTasks, completedTasks } = getTaskCounts(project._id);
              const lastUpdate = getMostRecentUpdate(project._id);
              
                return (
                <div
                  key={project._id}
                  onClick={() => navigateToProject(project._id)}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-transparent dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 leading-tight">
                            {project.name}
                      </h2>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        project.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                        project.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {project.status === 'active' ? 'פעיל' : project.status === 'completed' ? 'הושלם' : 'בתכנון'}
                      </span>
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-2 h-10 overflow-hidden">
                      {project.description}
                    </p>

                    <div className="mt-6 flex justify-between items-center text-sm text-gray-600 dark:text-gray-300">
                       <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2" title="משימות פתוחות">
                            <List className="w-4 h-4 text-orange-500" />
                            <span>{openTasks}</span>
                          </div>
                          <div className="flex items-center gap-2" title="משימות שהושלמו">
                             <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>{completedTasks}</span>
                          </div>
                        </div>
                      </div>

                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                       <p className="text-xs text-gray-500 dark:text-gray-400">
                        עדכון אחרון: {lastUpdate ? format(lastUpdate, 'd MMM yyyy, HH:mm', { locale: he }) : 'אין עדכונים'}
                      </p>
                    </div>
                    </div>
                  </div>
                );
            })}
          </div>

          {projects.length === 0 && (
            <div className="text-center py-16 px-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">לא נמצאו פרויקטים</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                עדיין לא יצרת פרויקטים. לחץ על 'פרויקט חדש' כדי להתחיל.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 