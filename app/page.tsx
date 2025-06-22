'use client';

import { useEffect, useState, useCallback, Suspense, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, BarChart3, ArrowLeft, Smartphone, Star } from 'lucide-react';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';
import { usePageRefresh } from '@/hooks/usePageRefresh';
import DailyUpdatesCarousel from '@/components/DailyUpdatesCarousel';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { usePWADetection } from '@/hooks/usePWADetection';
import ProjectCard from '@/components/ProjectCard';
import { useHomepageData, useDataPreloader } from '@/hooks/useOptimizedData';
import { HomepageLoadingSkeleton } from '@/components/SkeletonLoaders';
import { InlineLoading } from '@/components/LoadingSystem';
import { usePageLoading } from '@/contexts/LoadingContext';

interface Project {
  _id?: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  taskCount?: number;
  highPriorityCount?: number;
}

interface Task {
  _id?: string;
  title: string;
  projectId: string;
  priority: number;
  isVisible: boolean;
}

function HomePageCore() {
  const searchParams = useSearchParams();
  const { status: offlineStatus } = useOfflineStatus();
  const { status: pwaStatus } = usePWADetection();
  const { preloadProject } = useDataPreloader();
  const { withPageLoading } = usePageLoading();

  // Font configurations
  const hebrewHeading = useHebrewFont('heading');
  const mixedBody = useMixedFont('body');

  // Performance tracking
  const componentId = useRef(`homepage-${Math.random().toString(36).substr(2, 9)}`);
  const renderCount = useRef(0);
  const effectTracker = useRef({
    analytics: 0,
    serviceWorker: 0
  });

  // Track renders
  renderCount.current++;
  console.log(`🏠 [HOMEPAGE-RENDER] ${componentId.current} - Render #${renderCount.current}`);
  
  if (renderCount.current > 3) {
    console.warn(`⚠️ [HOMEPAGE-WARNING] ${componentId.current} - High render count: ${renderCount.current}`);
  }

  // Check if launched from PWA
  const isPWALaunch = searchParams?.get('utm_source') === 'pwa';
  const launchSource = searchParams?.get('utm_medium');

  console.log(`🔍 [HOMEPAGE-PARAMS] ${componentId.current} - URL params:`, {
    isPWALaunch,
    launchSource,
    searchParams: searchParams?.toString()
  });

  // Use optimized data fetching
  const { 
    data: homepageData, 
    loading, 
    error, 
    refetch,
    isStale 
  } = useHomepageData();

  console.log(`📊 [HOMEPAGE-DATA] ${componentId.current} - Data state:`, {
    hasData: !!homepageData,
    loading,
    hasError: !!error,
    isStale,
    projectsCount: homepageData?.projects?.length || 0,
    tasksCount: homepageData?.tasks?.length || 0
  });

  const projects = useMemo(() => {
    console.log(`🔄 [HOMEPAGE-MEMO] ${componentId.current} - Processing projects data`);
    const sorted = (homepageData?.projects || []).sort((a, b) => (b.taskCount || 0) - (a.taskCount || 0));
    console.log(`📋 [HOMEPAGE-PROJECTS] ${componentId.current} - Sorted ${sorted.length} projects`);
    return sorted;
  }, [homepageData?.projects]);

  const tasks = useMemo(() => {
    console.log(`🔄 [HOMEPAGE-MEMO] ${componentId.current} - Processing tasks data`);
    const taskList = homepageData?.tasks || [];
    console.log(`📋 [HOMEPAGE-TASKS] ${componentId.current} - Processed ${taskList.length} tasks`);
    return taskList;
  }, [homepageData?.tasks]);

  // Register refresh function for pull-to-refresh
  usePageRefresh(refetch);

  // Log analytics for homepage visits
  useEffect(() => {
    effectTracker.current.analytics++;
    console.log(`📈 [HOMEPAGE-ANALYTICS-EFFECT] ${componentId.current} - Effect #${effectTracker.current.analytics} triggered:`, {
      isOnline: offlineStatus.isOnline,
      hasData: !!homepageData,
      isPWALaunch,
      launchSource,
      displayMode: pwaStatus.displayMode,
      isStandalone: pwaStatus.isStandalone
    });

    if (offlineStatus.isOnline && homepageData) {
      console.log(`🚀 [HOMEPAGE-ANALYTICS] ${componentId.current} - Sending analytics request`);
      const startTime = Date.now();
      
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
          displayMode: pwaStatus.displayMode,
          isStandalone: pwaStatus.isStandalone
        }),
      })
      .then(() => {
        console.log(`✅ [HOMEPAGE-ANALYTICS] ${componentId.current} - Analytics sent (${Date.now() - startTime}ms)`);
      })
      .catch((error) => {
        console.error(`❌ [HOMEPAGE-ANALYTICS] ${componentId.current} - Analytics failed:`, error);
      });
    } else {
      console.log(`⚠️ [HOMEPAGE-ANALYTICS] ${componentId.current} - Skipped analytics:`, {
        isOnline: offlineStatus.isOnline,
        hasData: !!homepageData
      });
    }
  }, [homepageData, offlineStatus.isOnline, isPWALaunch, launchSource, pwaStatus.displayMode, pwaStatus.isStandalone]);

  // Register service worker for offline functionality
  useEffect(() => {
    effectTracker.current.serviceWorker++;
    console.log(`🔧 [HOMEPAGE-SW-EFFECT] ${componentId.current} - Service Worker effect #${effectTracker.current.serviceWorker} triggered`);

    if ('serviceWorker' in navigator) {
      console.log(`🚀 [HOMEPAGE-SW] ${componentId.current} - Registering service worker`);
      const startTime = Date.now();
      
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log(`✅ [HOMEPAGE-SW] ${componentId.current} - Service worker registered (${Date.now() - startTime}ms)`);
        })
        .catch(error => {
          console.error(`❌ [HOMEPAGE-SW] ${componentId.current} - Service worker registration failed:`, error);
        });
    } else {
      console.log(`⚠️ [HOMEPAGE-SW] ${componentId.current} - Service worker not supported`);
    }
  }, []);

  // Preload project data on hover
  const handleProjectHover = useCallback((projectName: string) => {
    console.log(`🖱️ [HOMEPAGE-HOVER] ${componentId.current} - Project hover: ${projectName}`);
    const startTime = Date.now();
    
    preloadProject(projectName)
      .then(() => {
        console.log(`✅ [HOMEPAGE-PRELOAD] ${componentId.current} - Project preloaded: ${projectName} (${Date.now() - startTime}ms)`);
      })
      .catch((error) => {
        console.error(`❌ [HOMEPAGE-PRELOAD] ${componentId.current} - Preload failed for ${projectName}:`, error);
      });
  }, [preloadProject]);

  const getTaskCountForProject = useCallback((projectId: string) => {
    const project = projects.find(p => p._id === projectId);
    if (project && project.taskCount !== undefined) {
      return project.taskCount;
    }
    const count = tasks.filter(task => task.projectId === projectId && task.isVisible).length;
    console.log(`🔢 [HOMEPAGE-TASK-COUNT] ${componentId.current} - Project ${projectId}: ${count} tasks`);
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
      task.priority >= 1 && 
      task.priority <= 3
    ).length;
    console.log(`🔥 [HOMEPAGE-PRIORITY-COUNT] ${componentId.current} - Project ${projectId}: ${count} high priority tasks`);
    return count;
  }, [projects, tasks]);

  // Welcome message based on launch source
  const getWelcomeMessage = useCallback(() => {
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
    
    return 'ברוכים הבאים ל-Driver Tasks';
  }, [isPWALaunch, launchSource, pwaStatus.isStandalone]);

  // Log final render state
  console.log(`🏁 [HOMEPAGE-FINAL] ${componentId.current} - Final render state:`, {
    renderCount: renderCount.current,
    effectCounts: effectTracker.current,
    projectsCount: projects.length,
    tasksCount: tasks.length,
    loading,
    hasError: !!error,
    isStale
  });

  return (
    <InlineLoading
      loading={loading}
      error={error}
      skeleton={<HomepageLoadingSkeleton />}
      errorFallback={
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className={`text-xl font-semibold mb-2 ${hebrewHeading.fontClass}`}>
              שגיאה בטעינת הנתונים
            </h3>
            <p className={`text-muted-foreground mb-4 ${mixedBody.fontClass}`}>
              {error?.message || 'אירעה שגיאה בטעינת הנתונים'}
            </p>
            <button
              onClick={refetch}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              נסה שוב
            </button>
          </div>
        </div>
      }
      loadingText="טוען נתוני דף הבית..."
      minHeight="50vh"
    >
      <div className="container mx-auto p-6 space-y-8">
        {/* Offline indicator */}
        {!offlineStatus.isOnline && projects.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg p-4 text-yellow-800 dark:text-yellow-200">
            <p className="text-sm font-medium">
              📱 מציג נתונים שמורים במטמון • הנתונים עשויים להיות לא מעודכנים
            </p>
          </div>
        )}

        {/* Daily Updates Section */}
        <DailyUpdatesCarousel className="mb-8" />

        {/* Main Content */}
        <div className="space-y-8">
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
                <div
                  key={project._id || ''}
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
      </div>
    </InlineLoading>
  );
}

function HomePageFallback() {
  return (
    <div className="container mx-auto p-6">
      <div className="animate-pulse space-y-8">
        <div className="h-8 bg-muted rounded w-1/3 mx-auto"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted rounded-lg"></div>
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
