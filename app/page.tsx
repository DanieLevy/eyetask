'use client';

import { useEffect, useCallback, Suspense, useRef, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';
import { usePageRefresh } from '@/hooks/usePageRefresh';
import DailyUpdatesCarousel from '@/components/DailyUpdatesCarousel';
import { PushNotificationBanner } from '@/components/PushNotificationBanner';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { usePWADetection } from '@/hooks/usePWADetection';
import ProjectCard from '@/components/ProjectCard';
import { useHomepageData, useDataPreloader } from '@/hooks/useOptimizedData';
import { HomepageLoadingSkeleton } from '@/components/SkeletonLoaders';
import { LoadingSpinner } from '@/components/LoadingSystem';
import { EmptyState } from '@/components/EmptyState';
import { toast } from 'sonner';
import { useVisitor } from '@/contexts/VisitorContext';
import { VisitorNameModal } from '@/components/VisitorNameModal';
import { trackPageView, trackAction } from '@/lib/visitor-utils';
import { markVisitorModalShown } from '@/lib/visitor-utils';
import { logger } from '@/lib/logger';

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
  const router = useRouter();
  const { visitor, isLoading: visitorLoading, isRegistering, registerVisitor, refreshVisitorInfo } = useVisitor();
  
  // State for visitor modal - simplified
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const modalShownRef = useRef(false); // Track if we already tried to show modal
  
  // URL parameters
  const isPWALaunch = searchParams.get('utm_medium') === 'pwa' || pwaStatus.status.isStandalone;
  const launchSource = searchParams.get('utm_source') || 'direct';
  
  // Single effect to handle visitor modal display
  useEffect(() => {
    // Skip if already processing or modal was already shown
    if (visitorLoading || modalShownRef.current) {
      return;
    }
    
    // Skip if visitor is not loaded yet
    if (!visitor) {
      return;
    }
    
    // Skip if visitor is registered or modal was already shown before
    if (visitor.isRegistered || visitor.modalShown) {
      logger.info('[Visitor] Skipping modal - visitor registered or modal already shown', 'HOMEPAGE', {
        visitorId: visitor.visitorId,
        isRegistered: visitor.isRegistered,
        modalShown: visitor.modalShown,
        name: visitor.name
      });
      return;
    }
    
    // Prevent multiple executions
    modalShownRef.current = true;
    
    logger.info('[Visitor] Scheduling modal display', 'HOMEPAGE', {
      visitorId: visitor.visitorId,
      delayMs: 1500
    });
    
    // Show modal after delay
    const timer = setTimeout(() => {
      // Mark modal as shown immediately to prevent duplicates
      markVisitorModalShown();
      
      // Refresh visitor info to update the modalShown flag
      refreshVisitorInfo();
      
      setShowVisitorModal(true);
      
      logger.info('[Visitor] Showing registration modal', 'HOMEPAGE', {
        visitorId: visitor.visitorId
      });
    }, 1500);
    
    // Cleanup
    return () => {
      clearTimeout(timer);
    };
  }, [visitor, visitorLoading]);
  
  // Track page view for registered visitors
  useEffect(() => {
    if (visitor?.isRegistered) {
      logger.info('[Visitor] Tracking homepage view', 'HOMEPAGE', {
        visitorId: visitor.visitorId,
        name: visitor.name,
        page: 'דף הבית'
      });
      trackPageView('דף הבית');
    }
  }, [visitor?.isRegistered]);

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

  // Combined analytics tracking - only track if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    
    // Only track analytics if user is authenticated
    if (token && offlineStatus.isOnline) {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({
          page: 'homepage',
          action: 'page_view',
          isUniqueVisitor: true,
          isPWALaunch,
          launchSource,
          displayMode: pwaStatus.status.displayMode,
          isStandalone: pwaStatus.status.isStandalone
        })
      })
      .catch(() => {
        // Silent error handling - analytics is not critical
      });
    }
  }, [offlineStatus.isOnline, isPWALaunch, launchSource, pwaStatus.status.displayMode, pwaStatus.status.isStandalone]);

  // Register service worker for offline functionality
  useEffect(() => {
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

  const handleProjectClick = useCallback((projectName: string) => {
    // Track visitor action
    if (visitor?.isRegistered) {
      logger.info('[Visitor] Project clicked', 'HOMEPAGE', {
        visitorId: visitor.visitorId,
        name: visitor.name,
        projectName,
        action: `לחץ על פרויקט: ${projectName}`
      });
      trackAction(`לחץ על פרויקט: ${projectName}`, 'project');
    }
  }, [visitor?.isRegistered, visitor?.visitorId, visitor?.name]);

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

  const handleVisitorRegistration = async (name: string): Promise<boolean> => {
    logger.info('[Visitor] Registration attempt', 'HOMEPAGE', {
      visitorId: visitor?.visitorId,
      name,
      attemptTime: new Date().toISOString()
    });
    
    const success = await registerVisitor(name);
    
    if (success) {
      logger.info('[Visitor] Registration successful', 'HOMEPAGE', {
        visitorId: visitor?.visitorId,
        name,
        registeredAt: new Date().toISOString()
      });
      
      toast.success(`שלום ${name}! 👋`, {
        description: 'נרשמת בהצלחה למערכת',
        duration: 4000,
      });
      setShowVisitorModal(false);
      // setShouldShowModalForVisitor(false); // Reset the flag to prevent modal from showing again - This line was removed as per the new_code
      
      // Track the homepage view after registration
      setTimeout(() => {
        logger.info('[Visitor] Tracking initial page view after registration', 'HOMEPAGE', {
          visitorId: visitor?.visitorId,
          name
        });
        trackPageView('דף הבית');
      }, 500);
    } else {
      logger.error('[Visitor] Registration failed', 'HOMEPAGE', {
        visitorId: visitor?.visitorId,
        name,
        failedAt: new Date().toISOString()
      });
    }
    
    return success;
  };

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
        
        {/* Visitor Name Modal */}
        <VisitorNameModal
          isOpen={showVisitorModal}
          onClose={() => {}} // Empty function since modal is mandatory
          onSubmit={handleVisitorRegistration}
          isSubmitting={isRegistering}
        />

        {/* Welcome message for registered visitors */}
        {visitor?.isRegistered && visitor.name && (
          <div className="mb-4 text-center">
            <p className={`text-sm text-muted-foreground ${mixedBody}`}>
              שלום {visitor.name} 👋
            </p>
          </div>
        )}

        {/* Push Notification Banner */}
        <PushNotificationBanner />
        
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
                  onClick={() => handleProjectClick(project.name)}
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
