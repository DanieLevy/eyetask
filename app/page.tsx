'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, BarChart3, ArrowLeft } from 'lucide-react';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';

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
}

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Font configurations
  const hebrewHeading = useHebrewFont('heading');
  const mixedBody = useMixedFont('body');

  useEffect(() => {
    // Clear any cached data to ensure fresh content
    const clearPageCache = async () => {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          if (cacheName.includes('eyetask-api')) {
            await caches.delete(cacheName);
          }
        }
      }
    };

    const fetchData = async () => {
      try {
        // Clear cache first
        await clearPageCache();
        
        // Log visit for analytics
        await fetch('/api/analytics', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          },
          body: JSON.stringify({ isUniqueVisitor: true }),
        }).catch(console.error);

        // Add cache busting timestamp
        const timestamp = Date.now();
        
        // Fetch projects and tasks with cache busting
        const [projectsResponse, tasksResponse] = await Promise.all([
          fetch(`/api/projects?_t=${timestamp}`, {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          }),
          fetch(`/api/tasks?_t=${timestamp}`, {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          })
        ]);

        const [projectsData, tasksData] = await Promise.all([
          projectsResponse.json(),
          tasksResponse.json()
        ]);

        // Projects API returns { projects: [...], success: true }
        if (projectsData.success && projectsData.projects) {
          setProjects(projectsData.projects);
        }
        
        // Tasks API returns { tasks: [...], success: true }
        if (tasksData.success && tasksData.tasks) {
          const visibleTasks = tasksData.tasks.filter((t: Task) => t.isVisible);
          setTasks(visibleTasks);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();

    // Register service worker for offline functionality
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          // Service worker registered successfully
        })
        .catch(error => {
          // Service worker registration failed
        });
    }
  }, []);

  const getTaskCountForProject = (projectId: string) => {
    return tasks.filter(task => task.projectId === projectId && task.isVisible).length;
  };

  const getHighPriorityTasksForProject = (projectId: string) => {
    return tasks.filter(task => 
      task.projectId === projectId && 
      task.isVisible && 
      task.priority >= 1 && 
      task.priority <= 3
    ).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Compact Stats */}
        <section className="mb-8">
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center justify-center gap-6 text-center">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <div>
                  <span className={`text-lg font-bold text-foreground ${hebrewHeading.fontClass}`}>
                    {projects.length}
                  </span>
                  <span className="text-sm text-muted-foreground mr-1">פרויקטים</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-green-500" />
                <div>
                  <span className={`text-lg font-bold text-foreground ${hebrewHeading.fontClass}`}>
                    {tasks.filter(task => task.isVisible).length}
                  </span>
                  <span className="text-sm text-muted-foreground mr-1">משימות</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">!</span>
                </div>
                <div>
                  <span className={`text-lg font-bold text-foreground ${hebrewHeading.fontClass}`}>
                    {tasks.filter(task => task.priority >= 1 && task.priority <= 3 && task.isVisible).length}
                  </span>
                  <span className="text-sm text-muted-foreground mr-1">עדיפות גבוהה</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Projects Section */}
        <section>
          <div className="mb-6">
            <h2 className={`text-2xl font-bold text-foreground ${hebrewHeading.fontClass}`}>פרויקטים</h2>
          </div>
          
          {projects.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">אין פרויקטים במערכת</h3>
              <p className="text-muted-foreground mb-4">התחילו ליצור פרויקטים חדשים כדי לנהל משימות</p>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                כניסת מנהל
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => {
                const taskCount = getTaskCountForProject(project.id);
                const highPriorityCount = getHighPriorityTasksForProject(project.id);
                
                return (
                  <Link
                    key={project.id}
                    href={`/project/${encodeURIComponent(project.name)}`}
                    className="group"
                  >
                    <div className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition-all duration-200 group-hover:border-primary/50">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                            {project.name}
                          </h3>
                          {project.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {project.description}
                            </p>
                          )}
                        </div>
                        <Eye className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">
                            {taskCount} משימות
                          </span>
                          {highPriorityCount > 0 && (
                            <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium">
                              {highPriorityCount} עדיפות גבוהה
                            </span>
                          )}
                        </div>
                        <span className="text-primary group-hover:translate-x-1 transition-transform">
                          <ArrowLeft className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
