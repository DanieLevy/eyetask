'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Bug } from 'lucide-react';
import BugReportModal from './BugReportModal';

interface PageContext {
  url: string;
  pathname: string;
  title: string;
  pageType: 'task' | 'project' | 'admin' | 'feedback' | 'home' | 'other';
  relatedId?: string;
  relatedTitle?: string;
  userAgent: string;
  timestamp: string;
}

export default function HeaderDebugIcon() {
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const capturePageContext = (): PageContext => {
    const url = window.location.href;
    const title = document.title || 'ללא כותרת';
    
    // Detect page type and related content
    let pageType: PageContext['pageType'] = 'other';
    let relatedId: string | undefined;
    let relatedTitle: string | undefined;

    if (pathname === '/') {
      pageType = 'home';
    } else if (pathname.startsWith('/admin')) {
      pageType = 'admin';
    } else if (pathname === '/feedback') {
      pageType = 'feedback';
    } else if (pathname.includes('/task/')) {
      pageType = 'task';
      // Try to extract task ID and title from URL or page content
      const taskIdMatch = pathname.match(/\/task\/([^\/]+)/);
      if (taskIdMatch) {
        relatedId = taskIdMatch[1];
        // Try to get task title from page content
        const taskTitleElement = document.querySelector('h1, [data-task-title]');
        relatedTitle = taskTitleElement?.textContent || undefined;
      }
    } else if (pathname.includes('/project/')) {
      pageType = 'project';
      // Try to extract project name from URL
      const projectNameMatch = pathname.match(/\/project\/([^\/]+)/);
      if (projectNameMatch) {
        relatedId = decodeURIComponent(projectNameMatch[1]);
        // Try to get project title from page content
        const projectTitleElement = document.querySelector('h1, [data-project-title]');
        relatedTitle = projectTitleElement?.textContent || relatedId;
      }
    }

    return {
      url,
      pathname,
      title,
      pageType,
      relatedId,
      relatedTitle,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };
  };



  const handleReportClick = () => {
    setIsModalOpen(true);
  };

  if (!mounted) return null;

  return (
    <>
      <button
        onClick={handleReportClick}
        className="p-2 rounded-lg hover:bg-accent transition-colors group relative"
        title="דיווח בעיה מהיר"
      >
        <Bug className="w-4 h-4 text-orange-500 hover:text-orange-600" />
        
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          דיווח בעיה מהיר
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
        </div>
      </button>

      <BugReportModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        pageContext={capturePageContext()}
      />
    </>
  );
} 