'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, Eye, Calendar, Users, BarChart3 } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface Task {
  id: string;
  title: string;
  project: string;
  priority: number;
  isVisible: boolean;
}

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const getTaskCountForProject = (projectName: string) => {
    return tasks.filter(task => task.project === projectName && task.isVisible).length;
  };

  const getHighPriorityTasksForProject = (projectName: string) => {
    return tasks.filter(task => 
      task.project === projectName && 
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <Eye className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">EyeTask</h1>
                <p className="text-sm text-muted-foreground">Mobileye</p>
              </div>
            </div>

            {/* Menu Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="תפריט"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>

          {/* Mobile Menu */}
          {menuOpen && (
            <div className="mt-4 p-4 bg-card rounded-lg border border-border">
              <nav className="space-y-2">
                <Link 
                  href="/" 
                  className="block p-2 rounded hover:bg-accent transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  דף הבית
                </Link>
                <Link 
                  href="/admin" 
                  className="block p-2 rounded hover:bg-accent transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  ניהול מנהל
                </Link>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Daily Updates Section */}
        <section className="mb-8">
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              עדכונים יומיים
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-primary/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span className="font-semibold">סה״כ משימות</span>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {tasks.filter(task => task.isVisible).length}
                </p>
              </div>
              <div className="bg-secondary/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-secondary-foreground" />
                  <span className="font-semibold">פרויקטים פעילים</span>
                </div>
                <p className="text-2xl font-bold text-secondary-foreground">
                  {projects.length}
                </p>
              </div>
              <div className="bg-accent/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-5 w-5 text-accent-foreground" />
                  <span className="font-semibold">עדיפות גבוהה</span>
                </div>
                <p className="text-2xl font-bold text-accent-foreground">
                  {tasks.filter(task => task.isVisible && task.priority >= 1 && task.priority <= 3).length}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Projects Section */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6">בחירת פרויקט</h2>
          
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <Eye className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">אין פרויקטים זמינים</h3>
              <p className="text-muted-foreground">פרויקטים יופיעו כאן כאשר יתווספו על ידי המנהל</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => {
                const taskCount = getTaskCountForProject(project.name);
                const highPriorityCount = getHighPriorityTasksForProject(project.name);
                
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
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {project.description}
                          </p>
                        </div>
                        <Eye className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors rtl-flip" />
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
                        <span className="text-primary group-hover:translate-x-1 transition-transform rtl-flip">
                          ←
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2025 Mobileye - EyeTask. כל הזכויות שמורות.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
