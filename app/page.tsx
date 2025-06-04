'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, BarChart3, ArrowLeft, Smartphone, Star } from 'lucide-react';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';
import { usePageRefresh } from '@/hooks/usePageRefresh';
import DailyUpdatesCarousel from '@/components/DailyUpdatesCarousel';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { usePWADetection } from '@/hooks/usePWADetection';
import ProjectCard from '@/components/ProjectCard';

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

function HomePageCore() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  
  const { status: offlineStatus } = useOfflineStatus();
  const { status: pwaStatus } = usePWADetection();
  const searchParams = useSearchParams();

  // Font configurations
  const hebrewHeading = useHebrewFont('heading');
  const mixedBody = useMixedFont('body');

  // Check if launched from PWA
  const isPWALaunch = searchParams?.get('utm_source') === 'pwa';
  const launchSource = searchParams?.get('utm_medium');

  const fetchData = useCallback(async () => {
    try {
      // Check if we're in offline mode and should show cached data
      const urlParams = new URLSearchParams(window.location.search);
      const isOfflineMode = urlParams.get('offline') === 'true' || !offlineStatus.isOnline;
      
      if (isOfflineMode) {
        // Try to load from cache first in offline mode
        const cachedProjects = await getCachedData('/api/projects');
        const cachedTasks = await getCachedData('/api/tasks');
        
        if (cachedProjects) {
          setProjects(cachedProjects.projects || []);
        }
        
        if (cachedTasks) {
          const visibleTasks = (cachedTasks.tasks || []).filter((t: Task) => t.isVisible);
          setTasks(visibleTasks);
        }
        
        setLoading(false);
        
        // If we have cached data, don't try network calls
        if (cachedProjects || cachedTasks) {
          return;
        }
      }
      
      // Clear any cached data to ensure fresh content (when online)
      if ('caches' in window && offlineStatus.isOnline) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          if (cacheName.includes('eyetask-api')) {
            await caches.delete(cacheName);
          }
        }
      }
      
      // Log visit for analytics (only when online)
      if (offlineStatus.isOnline) {
        await fetch('/api/analytics', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          },
          body: JSON.stringify({ 
            isUniqueVisitor: true,
            isPWALaunch,
            launchSource,
            displayMode: pwaStatus.displayMode,
            isStandalone: pwaStatus.isStandalone
          }),
        }).catch(console.error);
      }

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
      
      // If network fails, try to load cached data
      if (!offlineStatus.isOnline) {
        try {
          const cachedProjects = await getCachedData('/api/projects');
          const cachedTasks = await getCachedData('/api/tasks');
          
          if (cachedProjects?.projects) {
            setProjects(cachedProjects.projects);
          }
          
          if (cachedTasks?.tasks) {
            const visibleTasks = cachedTasks.tasks.filter((t: Task) => t.isVisible);
            setTasks(visibleTasks);
          }
        } catch (cacheError) {
          console.error('Error loading cached data:', cacheError);
        }
      }
      
      setLoading(false);
    }
  }, [offlineStatus.isOnline, isPWALaunch, launchSource, pwaStatus.displayMode, pwaStatus.isStandalone]);

  // Helper function to get cached data
  const getCachedData = async (url: string) => {
    if (!('caches' in window)) return null;
    
    try {
      const cache = await caches.open('eyetask-api-v3');
      const cachedResponse = await cache.match(url);
      
      if (cachedResponse) {
        return await cachedResponse.json();
      }
    } catch (error) {
      console.error('Error retrieving cached data:', error);
    }
    
    return null;
  };

  // Register refresh function for pull-to-refresh
  usePageRefresh(fetchData);

  useEffect(() => {
    fetchData();
    setIsFirstLoad(false);

    // Register service worker for offline functionality
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service worker registered successfully');
        })
        .catch(error => {
          console.error('Service worker registration failed:', error);
        });
    }
  }, [fetchData]);

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

  // Welcome message based on launch source
  const getWelcomeMessage = () => {
    if (isPWALaunch) {
      switch (launchSource) {
        case 'homescreen':
          return 'ברוך הבא מהמסך הראשי!';
        case 'pwa_shortcut':
          return 'ברוך הבא מקיצור הדרך!';
        default:
          return 'ברוך הבא לאפליקציה!';
      }
    }
    
    if (pwaStatus.isStandalone) {
      return 'ברוך הבא לאפליקציה!';
    }
    
    return 'ברוכים הבאים ל-EyeTask';
  };

  if (loading && isFirstLoad) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {offlineStatus.isOnline ? 'טוען נתונים...' : 'טוען נתונים מהמטמון...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* PWA Launch Notification */}
      {isPWALaunch && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4 text-indigo-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              {launchSource === 'homescreen' ? <Smartphone className="h-5 w-5 text-indigo-600" /> : <Star className="h-5 w-5 text-indigo-600" />}
            </div>
            <div>
              <p className={`font-medium ${hebrewHeading.fontClass}`}>
                {getWelcomeMessage()}
              </p>
              <p className={`text-sm text-indigo-600 ${mixedBody.fontClass}`}>
                אתה משתמש כעת באפליקציה המותקנת
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Offline indicator */}
      {!offlineStatus.isOnline && (projects.length > 0 || tasks.length > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          <p className="text-sm font-medium">
            📱 מציג נתונים שמורים במטמון • הנתונים עשויים להיות לא מעודכנים
          </p>
        </div>
      )}

      {/* App Status Bar (for PWA) */}
      {pwaStatus.isStandalone && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className={`font-medium ${hebrewHeading.fontClass}`}>
              אפליקציה מותקנת • מצב עצמאי
            </span>
          </div>
        </div>
      )}

      {/* Daily Updates Section */}
      <DailyUpdatesCarousel className="mb-8" />

      {/* Main Content */}
      <div className="space-y-8">
        {/* Page Title */}
        <div className="text-center space-y-3">
          <h1 className={`text-3xl font-bold ${hebrewHeading.fontClass}`}>
            {getWelcomeMessage()}
          </h1>
          <p className={`text-lg text-muted-foreground ${mixedBody.fontClass}`}>
            מערכת ניהול משימות נהגים - Mobileye
          </p>
          
          {/* App Enhancement Notice */}
          {!pwaStatus.isStandalone && !pwaStatus.shouldShowInstallPrompt && (
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-accent px-3 py-2 rounded-full">
              <Smartphone className="h-4 w-4" />
              <span className={mixedBody.fontClass}>
                גרסת דפדפן • התקן את האפליקציה לחוויה משופרת
              </span>
            </div>
          )}
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className={`text-xl font-semibold mb-2 ${hebrewHeading.fontClass}`}>
              אין פרויקטים זמינים
            </h3>
            <p className={`text-muted-foreground ${mixedBody.fontClass}`}>
              {offlineStatus.isOnline ? 
                'נראה שעדיין לא נוספו פרויקטים למערכת' :
                'אין פרויקטים במטמון - התחבר לאינטרנט לטעינה'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                taskCount={getTaskCountForProject(project.id)}
                highPriorityCount={getHighPriorityTasksForProject(project.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HomePageFallback() {
  return (
    <div className="container mx-auto p-6">
      <div className="animate-pulse space-y-8">
        <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomePageFallback />}>
      <HomePageCore />
    </Suspense>
  );
}
