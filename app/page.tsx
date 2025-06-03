'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, Calendar, Users, BarChart3, ArrowLeft } from 'lucide-react';
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

        console.log('📦 Main page - Projects data:', projectsData);
        console.log('📦 Main page - Tasks data:', tasksData);
        console.log('📦 Main page - Visible tasks:', tasksData.tasks?.filter(t => t.isVisible));

        setProjects(projectsData.projects || []);
        setTasks(tasksData.tasks || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();

    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => console.log('SW registered:', registration))
        .catch(error => console.log('SW registration failed:', error));
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
        {/* Welcome Section */}
        <section className="text-center mb-12">
          <h1 className={`text-4xl font-bold text-foreground mb-4 ${hebrewHeading.fontClass}`}>
            ברוכים הבאים ל-EyeTask
          </h1>
          <p className={`text-xl text-muted-foreground max-w-2xl mx-auto ${mixedBody.fontClass}`}>
            מערכת ניהול משימות נהיגה חכמה עבור Mobileye. נהלו פרויקטים, עקבו אחר משימות ותת-משימות בקלות ויעילות.
          </p>
        </section>

        {/* Quick Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-card rounded-lg border border-border p-6 text-center">
            <Users className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className={`text-2xl font-bold text-foreground ${hebrewHeading.fontClass}`}>
              {projects.length}
            </h3>
            <p className="text-muted-foreground">פרויקטים פעילים</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-6 text-center">
            <BarChart3 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className={`text-2xl font-bold text-foreground ${hebrewHeading.fontClass}`}>
              {tasks.filter(task => task.isVisible).length}
            </h3>
            <p className="text-muted-foreground">משימות גלויות</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-6 text-center">
            <Calendar className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className={`text-2xl font-bold text-foreground ${hebrewHeading.fontClass}`}>
              {tasks.filter(task => task.priority >= 1 && task.priority <= 3 && task.isVisible).length}
            </h3>
            <p className="text-muted-foreground">עדיפות גבוהה</p>
          </div>
        </section>

        {/* Projects Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-2xl font-bold text-foreground ${hebrewHeading.fontClass}`}>פרויקטים אחרונים</h2>
            <Link 
              href="/admin"
              className="text-primary hover:text-primary/80 transition-colors text-sm font-medium"
            >
              צפה בכל הפרויקטים ←
            </Link>
          </div>
          
          {projects.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
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
              {projects.slice(0, 6).map((project) => {
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
