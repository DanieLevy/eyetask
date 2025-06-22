'use client';

import { useEffect, useCallback, Suspense, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';
import { usePageRefresh } from '@/hooks/usePageRefresh';
import DailyUpdatesCarousel from '@/components/DailyUpdatesCarousel';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { usePWADetection } from '@/hooks/usePWADetection';
import ProjectCard from '@/components/ProjectCard';
import { useHomepageData, useDataPreloader } from '@/hooks/useOptimizedData';
import { HomepageLoadingSkeleton } from '@/components/SkeletonLoaders';
import { LoadingSpinner } from '@/components/LoadingSystem';

// Project and Task interfaces moved to shared types

function HomePageCore() {
  const searchParams = useSearchParams();
  const hebrewHeading = useHebrewFont('heading');
  const mixedBody = useMixedFont('body');
  
  // Hooks
  const { data: homepageData, loading, error, refetch } = useHomepageData();
  const { preloadProject } = useDataPreloader();
  const offlineStatus = useOfflineStatus();
  const pwaStatus = usePWADetection();
  
  // URL parameters
  const isPWALaunch = searchParams.get('utm_medium') === 'pwa' || pwaStatus.status.isStandalone;
  const launchSource = searchParams.get('utm_source') || 'direct';
  
  // Effect tracking
  const effectTracker = useRef({
    analytics: 0,
    serviceWorker: 0
  });

  // Memoized data processing
  const projects = useMemo(() => {
    if (!homepageData?.projects) return [];
    
    return [...homepageData.projects].sort((a, b) => {
      const aName = a.name || '';
      const bName = b.name || '';
      return aName.localeCompare(bName, 'he');
    });
  }, [homepageData?.projects]);

  const tasks = useMemo(() => {
    if (!homepageData?.tasks) return [];
    
    return homepageData.tasks.filter(task => task.isVisible);
  }, [homepageData?.tasks]);

  // Page refresh handling
  usePageRefresh(async () => {
    await refetch();
  });

  // Analytics tracking
  useEffect(() => {
    effectTracker.current.analytics++;

    if (homepageData && offlineStatus.isOnline) {
      fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({ 
          isUniqueVisitor: true,
          isPWALaunch,
          launchSource,
          displayMode: pwaStatus.status.displayMode,
          isStandalone: pwaStatus.status.isStandalone
        }),
      })
      .catch(() => {
        // Silent error handling
      });
    }
  }, [homepageData, offlineStatus.isOnline, isPWALaunch, launchSource, pwaStatus.status.displayMode, pwaStatus.status.isStandalone]);

  // Register service worker for offline functionality
  useEffect(() => {
    effectTracker.current.serviceWorker++;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .catch(() => {
          // Silent error handling
        });
    }
  }, []);

  // Preload project data on hover
  const handleProjectHover = useCallback((projectName: string) => {
    preloadProject(projectName)
      .catch(() => {
        // Silent error handling
      });
  }, [preloadProject]);

  const getTaskCountForProject = useCallback((projectId: string) => {
    const project = projects.find(p => p._id === projectId);
    if (project && project.taskCount !== undefined) {
      return project.taskCount;
    }
    const count = tasks.filter(task => task.projectId === projectId && task.isVisible).length;
    return count;
  }, [projects, tasks]);

  const getHighPriorityTasksForProject = useCallback((projectId: string) => {
    const project = projects.find(p => p._id === projectId);
    if (project && project.highPriorityCount !== undefined) {
      return project.highPriorityCount;
    }
    const count = tasks.filter(task => 
      task.projectId === projectId && 
      task.isVisible && 
      task.priority >= 4
    ).length;
    return count;
  }, [projects, tasks]);

  if (loading && !homepageData) {
    return <HomepageLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className={`text-2xl font-bold text-foreground mb-4 ${hebrewHeading}`}>
            שגיאה בטעינת הנתונים
          </h2>
          <p className={`text-muted-foreground mb-6 ${mixedBody}`}>
            אירעה שגיאה בטעינת נתוני הדף הראשי. אנא נסה שוב.
          </p>
          <button
            onClick={() => refetch()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Daily Updates Carousel */}
        <div className="mb-8">
          <DailyUpdatesCarousel />
        </div>

        {/* Projects Grid */}
        <div className="mb-6">
          <h2 className={`text-lg font-medium text-foreground mb-6 text-center ${hebrewHeading}`}>
            פרויקטים זמינים
          </h2>
          
          {loading && (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner showText text="טוען פרויקטים..." />
            </div>
          )}

          {!loading && projects.length === 0 && (
            <div className="text-center py-12">
              <div className="text-muted-foreground text-6xl mb-4">📁</div>
              <h3 className={`text-xl font-semibold text-foreground mb-2 ${hebrewHeading}`}>
                אין פרויקטים זמינים
              </h3>
              <p className={`text-muted-foreground ${mixedBody}`}>
                כרגע אין פרויקטים פעילים במערכת
              </p>
            </div>
          )}

          {!loading && projects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div 
                  key={project._id || project.name}
                  onMouseEnter={() => handleProjectHover(project.name)}
                >
                  <ProjectCard 
                    project={project}
                    taskCount={getTaskCountForProject(project._id || '')}
                    highPriorityCount={getHighPriorityTasksForProject(project._id || '')}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Offline Status Indicator */}
        {!offlineStatus.isOnline && (
          <div className="fixed bottom-4 left-4 right-4 z-50">
            <div className="bg-amber-500 text-white px-4 py-3 rounded-lg shadow-lg text-center">
              <span className={`font-medium ${mixedBody}`}>
                🔌 אין חיבור לאינטרנט - מוצגים נתונים שמורים
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HomePageFallback() {
  const mixedBody = useMixedFont('body');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className={`text-muted-foreground ${mixedBody}`}>
          טוען את הדף הראשי...
        </p>
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
