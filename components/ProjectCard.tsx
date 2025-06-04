'use client';

import { Clock, AlertTriangle } from 'lucide-react';
import { useHebrewFont } from '@/hooks/useFont';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { useEffect, useState } from 'react';

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
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only showing offline indicators after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleProjectClick = () => {
    // Simple navigation using URL params
    window.location.href = `/project/${encodeURIComponent(project.name)}`;
  };

  const showOfflineIndicators = mounted && !offlineStatus.isOnline;

  return (
    <div className="group relative">
      <div
        onClick={handleProjectClick}
        className="block cursor-pointer"
      >
        <div className="bg-card rounded-lg border border-border p-4 hover:shadow-lg transition-all duration-200 group-hover:border-primary/50 relative overflow-hidden min-h-[120px] flex flex-col justify-center">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-primary/20 to-transparent" />
          
          {/* Status Indicators - Only when offline and after mount */}
          {showOfflineIndicators && (
            <div className="absolute top-3 left-3">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" title="מצב אופליין" />
            </div>
          )}
          
          {/* Project Info - Right aligned and vertically centered */}
          <div className="relative text-right space-y-3">
            <h3 className={`text-lg font-semibold text-foreground group-hover:text-primary transition-colors ${hebrewFont.fontClass} leading-tight`}>
              {project.name}
            </h3>
            {project.description && (
              <p className={`text-sm text-muted-foreground line-clamp-2 ${hebrewFont.fontClass} leading-relaxed`}>
                {project.description}
              </p>
            )}
            
            {/* Stats Row - Right aligned */}
            <div className="flex items-center justify-end gap-4 text-sm pt-1">
              {highPriorityCount > 0 && (
                <span className="bg-red-50 text-red-600 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 border border-red-100">
                  <AlertTriangle className="h-3 w-3" />
                  {highPriorityCount} דחוף
                </span>
              )}
              <span className={`text-muted-foreground flex items-center gap-1 ${hebrewFont.fontClass}`}>
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                {taskCount} משימות
              </span>
            </div>
          </div>

          {/* Cache Info (when offline and after mount) */}
          {showOfflineIndicators && (
            <div className="relative mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className={hebrewFont.fontClass}>נתונים שמורים במטמון</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading State Overlay - Only show after mount */}
      {showOfflineIndicators && (
        <div className="absolute inset-0 bg-yellow-50/80 backdrop-blur-sm rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="text-right">
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