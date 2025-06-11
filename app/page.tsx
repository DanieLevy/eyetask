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
  const { status: offlineStatus } = useOfflineStatus();
  const { status: pwaStatus } = usePWADetection();
  const searchParams = useSearchParams();
  const { preloadProject } = useDataPreloader();
  const { withPageLoading } = usePageLoading();

  // Font configurations
  const hebrewHeading = useHebrewFont('heading');
  const mixedBody = useMixedFont('body');

  // Check if launched from PWA
  const isPWALaunch = searchParams?.get('utm_source') === 'pwa';
  const launchSource = searchParams?.get('utm_medium');

  // Use optimized data fetching
  const { 
    data: homepageData, 
    loading, 
    error, 
    refetch,
    isStale 
  } = useHomepageData();

  const projects = (homepageData?.projects || []).sort((a, b) => (b.taskCount || 0) - (a.taskCount || 0));
  const tasks = homepageData?.tasks || [];

  // Register refresh function for pull-to-refresh
  usePageRefresh(refetch);

  // Log analytics for homepage visits
  useEffect(() => {
    if (offlineStatus.isOnline && homepageData) {
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
      }).catch(console.error);
    }
  }, [homepageData, offlineStatus.isOnline, isPWALaunch, launchSource, pwaStatus.displayMode, pwaStatus.isStandalone]);

  // Register service worker for offline functionality
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service worker registered successfully');
        })
        .catch(error => {
          console.error('Service worker registration failed:', error);
        });
    }
  }, []);

  // Preload project data on hover
  const handleProjectHover = useCallback((projectName: string) => {
    preloadProject(projectName);
  }, [preloadProject]);

  const getTaskCountForProject = (projectId: string) => {
    const project = projects.find(p => p._id === projectId);
    if (project && project.taskCount !== undefined) {
      return project.taskCount;
    }
    return tasks.filter(task => task.projectId === projectId && task.isVisible).length;
  };

  const getHighPriorityTasksForProject = (projectId: string) => {
    const project = projects.find(p => p._id === projectId);
    if (project && project.highPriorityCount !== undefined) {
      return project.highPriorityCount;
    }
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
    
    return 'ברוכים הבאים ל-Driver Tasks';
  };

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
