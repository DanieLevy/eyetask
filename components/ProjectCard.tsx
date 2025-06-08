'use client';

import { Clock, Folder } from 'lucide-react';
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

  // Prevent hydration mismatch by only showing dynamic content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleProjectClick = () => {
    // Simple navigation using URL params
    window.location.href = `/project/${encodeURIComponent(project.name)}`;
  };

  // Only show offline-specific features after component is mounted
  const showOfflineIndicators = mounted && !offlineStatus.isOnline;

  return (
    <div className="group relative">
      <div
        onClick={handleProjectClick}
        className="block cursor-pointer"
      >
        {/* Main Card Container */}
        <div className="relative bg-card border border-border/40 rounded-2xl p-6 overflow-hidden shadow-md shadow-black/5 dark:shadow-black/20 hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-black/30 hover:border-primary/30 hover:-translate-y-0.5 group-hover:bg-card/80 transition-all duration-300 ease-out">
          
          {/* Subtle Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Status Indicators */}
          {showOfflineIndicators && (
            <div className="absolute top-4 right-4 z-20">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" title="מצב אופליין" />
            </div>
          )}
          
          {/* Urgent Indicator - Very Minimal */}
          {highPriorityCount > 0 && (
            <div className="absolute top-4 left-4 z-20">
              <div className="w-2 h-2 bg-red-400 rounded-full" title={`${highPriorityCount} משימות דחופות`} />
            </div>
          )}
          
                    {/* Content */}
          <div className="relative z-10 flex items-start justify-between">
            {/* Project Info */}
            <div className="flex-1 pr-4">
              <h3 className={`text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300 ${hebrewFont.fontClass} leading-tight`}>
                {project.name}
              </h3>
              {project.description && (
                <p className={`text-sm text-muted-foreground/70 line-clamp-2 ${hebrewFont.fontClass} leading-relaxed mt-1`}>
                  {project.description}
                </p>
              )}
            </div>
            
            {/* Task Count - Right Side */}
            <div className="flex flex-col items-center text-center">
              <span className={`text-2xl font-bold text-foreground ${hebrewFont.fontClass}`}>
                {taskCount}
              </span>
              <span className={`text-sm text-muted-foreground ${hebrewFont.fontClass}`}>
                משימות
              </span>
            </div>
          </div>

          {/* Cache Info - Minimal */}
          {showOfflineIndicators && (
            <div className="absolute bottom-4 right-4 opacity-60">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}