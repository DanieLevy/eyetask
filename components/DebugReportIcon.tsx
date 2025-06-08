'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bug, MessageCircle, X, Send, AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';

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

export default function DebugReportIcon() {
  const [mounted, setMounted] = useState(false);
  
  const pathname = usePathname();
  const router = useRouter();

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
      // Try to extract project ID and title from URL or page content
      const projectIdMatch = pathname.match(/\/project\/([^\/]+)/);
      if (projectIdMatch) {
        relatedId = projectIdMatch[1];
        // Try to get project title from page content
        const projectTitleElement = document.querySelector('h1, [data-project-title]');
        relatedTitle = projectTitleElement?.textContent || undefined;
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

  const getAdminPageTitle = (pathname: string): string => {
    if (pathname.includes('/dashboard')) return 'לוח בקרה';
    if (pathname.includes('/analytics')) return 'אנליטיקס';
    if (pathname.includes('/feedback')) return 'ניהול פניות';
    if (pathname.includes('/projects')) return 'ניהול פרויקטים';
    if (pathname.includes('/tasks')) return 'ניהול משימות';
    if (pathname.includes('/cache')) return 'ניהול מטמון';
    return 'פאנל ניהול';
  };

  const getCategoryFromPageType = (pageType: PageContext['pageType']): string => {
    switch (pageType) {
      case 'task': return 'task_related';
      case 'project': return 'project_related';
      case 'admin': return 'technical_issue';
      case 'feedback': return 'general_support';
      default: return 'general_support';
    }
  };

  const handleReportClick = () => {
    const context = capturePageContext();
    
    // Build URL parameters for the feedback form
    const params = new URLSearchParams();
    
    // Auto-fill form based on context
    if (context.pageType === 'task' || context.pageType === 'project') {
      params.set('title', `דיווח על בעיה ב${context.pageType === 'task' ? 'משימה' : 'פרויקט'}: ${context.relatedTitle || 'לא ידוע'}`);
      params.set('description', `דיווח בעיה בעמוד: ${context.url}\n\nתיאור הבעיה:\n`);
    } else if (context.pageType === 'admin') {
      params.set('title', `בעיה בפאנל ניהול: ${getAdminPageTitle(context.pathname)}`);
      params.set('description', `דיווח בעיה בעמוד ניהול: ${context.url}\n\nתיאור הבעיה:\n`);
    } else {
      params.set('title', `בעיה בעמוד: ${context.title}`);
      params.set('description', `דיווח בעיה בעמוד: ${context.url}\n\nתיאור הבעיה:\n`);
    }
    
    // Set category and issue type based on page context
    params.set('category', getCategoryFromPageType(context.pageType));
    params.set('issueType', 'bug');
    params.set('isUrgent', 'true');
    
    // Add related item if available
    if (context.pageType === 'task' && context.relatedId) {
      params.set('relatedType', 'task');
      params.set('relatedId', context.relatedId);
    } else if (context.pageType === 'project' && context.relatedId) {
      params.set('relatedType', 'project');
      params.set('relatedId', context.relatedId);
    }
    
    // Navigate to feedback form with pre-filled data
    router.push(`/feedback?${params.toString()}`);
  };

  if (!mounted) return null;

  return (
    <button
      onClick={handleReportClick}
      className="fixed bottom-6 left-6 bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-[9998] group"
      title="דווח על בעיה בעמוד זה"
    >
      <Bug className="w-5 h-5" />
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        דווח על בעיה
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
      </div>
    </button>
  );
} 