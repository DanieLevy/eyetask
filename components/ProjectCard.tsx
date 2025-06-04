'use client';

import Link from 'next/link';
import { Eye, ArrowLeft, Clock, AlertTriangle, Share2, ExternalLink } from 'lucide-react';
import { useHebrewFont } from '@/hooks/useFont';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { usePWADetection } from '@/hooks/usePWADetection';
import { useDeepLink } from '@/components/DeepLinkHandler';
import { MiniAppBanner } from '@/components/SmartAppBanner';

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface ProjectCardProps {
  project: Project;
  taskCount: number;
  highPriorityCount: number;
}

export default function ProjectCard({ project, taskCount, highPriorityCount }: ProjectCardProps) {
  const hebrewFont = useHebrewFont('body');
  const { status: offlineStatus } = useOfflineStatus();
  const { status: pwaStatus } = usePWADetection();
  const { shareAppLink, createDeepLink } = useDeepLink();

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const success = await shareAppLink(
      'project',
      encodeURIComponent(project.name),
      `פרויקט ${project.name}`,
      `צפה בפרויקט ${project.name} ב-EyeTask - ${taskCount} משימות זמינות`
    );
    
    if (!success) {
      // Fallback: create a notification or toast
      console.log('Share not available, link copied to clipboard');
    }
  };

  const projectLink = `/project/${encodeURIComponent(project.name)}`;
  const deepLink = createDeepLink('project', encodeURIComponent(project.name));

  return (
    <div className="group relative">
      <Link
        href={projectLink}
        className="block"
      >
        <div className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition-all duration-200 group-hover:border-primary/50 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-primary/20 to-transparent" />
          
          {/* Header Row */}
          <div className="relative flex items-start justify-between mb-4">
            {/* Status Indicators */}
            <div className="flex items-center gap-2">
              {!offlineStatus.isOnline && (
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" title="מצב אופליין" />
              )}
              {pwaStatus.isStandalone && (
                <div className="w-2 h-2 bg-green-400 rounded-full" title="מצב אפליקציה" />
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleShare}
                className="p-2 rounded-lg bg-background/80 border border-border hover:bg-accent transition-colors"
                title="שתף פרויקט"
              >
                <Share2 className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
          
          {/* Project Info */}
          <div className="relative flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h3 className={`text-lg font-semibold text-foreground group-hover:text-primary transition-colors ${hebrewFont.fontClass} line-clamp-1`}>
                {project.name}
              </h3>
              {project.description && (
                <p className={`text-sm text-muted-foreground mt-1 line-clamp-2 ${hebrewFont.fontClass}`}>
                  {project.description}
                </p>
              )}
            </div>
            <div className="flex-shrink-0 mr-4">
              <Eye className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
          
          {/* Stats Row */}
          <div className="relative flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className={`text-muted-foreground flex items-center gap-1 ${hebrewFont.fontClass}`}>
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                {taskCount} משימות
              </span>
              {highPriorityCount > 0 && (
                <span className="bg-red-50 text-red-600 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 border border-red-100">
                  <AlertTriangle className="h-3 w-3" />
                  {highPriorityCount} דחוף
                </span>
              )}
            </div>
            <span className="text-primary group-hover:translate-x-1 transition-transform">
              <ArrowLeft className="h-4 w-4" />
            </span>
          </div>

          {/* Cache Info (when offline) */}
          {!offlineStatus.isOnline && (
            <div className="relative mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className={hebrewFont.fontClass}>נתונים שמורים במטמון</span>
              </div>
            </div>
          )}

          {/* Progressive Enhancement Indicator */}
          <div className="absolute bottom-2 left-2">
            <MiniAppBanner />
          </div>
        </div>
      </Link>

      {/* Hover Actions Overlay */}
      <div className="absolute inset-0 pointer-events-none group-hover:pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute top-4 left-4 flex gap-2">
          {/* PWA Launch Button */}
          {!pwaStatus.isStandalone && pwaStatus.canHandleAppLinks && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(deepLink, '_blank');
              }}
              className="p-2 bg-white/90 backdrop-blur-sm border border-white/20 rounded-lg shadow-lg hover:bg-white transition-colors"
              title="פתח באפליקציה"
            >
              <ExternalLink className="h-4 w-4 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Loading State Overlay */}
      {offlineStatus.isOnline === false && (
        <div className="absolute inset-0 bg-yellow-50/80 backdrop-blur-sm rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="text-center">
            <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
            <p className={`text-xs text-yellow-800 ${hebrewFont.fontClass}`}>
              נתונים לא מעודכנים
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 