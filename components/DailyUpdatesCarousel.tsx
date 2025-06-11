'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useHebrewFont } from '@/hooks/useFont';
import { Bell, AlertTriangle, CheckCircle, XCircle, Megaphone, Info, Pin, X } from 'lucide-react';

interface DailyUpdate {
  _id?: string;
  id?: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'announcement';
  priority: number;
  isPinned?: boolean;
  is_pinned?: boolean;
  isActive?: boolean;
  is_active?: boolean;
  is_hidden?: boolean;
  isHidden?: boolean;
  expiresAt: string | null;
}

interface DailyUpdatesCarouselProps {
  className?: string;
}

export default function DailyUpdatesCarousel({ className = '' }: DailyUpdatesCarouselProps) {
  const [updates, setUpdates] = useState<DailyUpdate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [fallbackMessage, setFallbackMessage] = useState('לא נמצאו עדכונים להצגה');
  const [error, setError] = useState<string | null>(null);
  const [hiddenUpdateIds, setHiddenUpdateIds] = useState<string[]>([]);
  const [progressPercent, setProgressPercent] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hebrewFont = useHebrewFont('body');

  // Load hidden update IDs from localStorage
  useEffect(() => {
    const loadHiddenUpdates = () => {
      try {
        const storedIds = localStorage.getItem('eyetask_hidden_updates');
        if (storedIds) {
          setHiddenUpdateIds(JSON.parse(storedIds));
        }
      } catch (err) {
        console.error('Error loading hidden updates from localStorage:', err);
      }
    };
    
    loadHiddenUpdates();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const updatesResponse = await fetch('/api/daily-updates', {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!updatesResponse.ok) {
        throw new Error('Failed to fetch daily updates');
      }
      
      const updatesData = await updatesResponse.json();
      
      if (updatesData?.success) {
        const allUpdates = updatesData.updates || [];
        const filteredUpdates = allUpdates.filter((update: DailyUpdate) => {
          const updateId = update._id || update.id;
          return updateId && !hiddenUpdateIds.includes(updateId);
        });
        
        setUpdates(filteredUpdates);
      }

      try {
        const settingsResponse = await fetch('/api/settings/main-page-carousel-fallback-message');
        
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          if (settingsData?.value) {
            setFallbackMessage(settingsData.value);
          }
        }
      } catch (settingsError) {
        console.error('Error fetching fallback message settings:', settingsError);
      }
    } catch (error) {
      console.error('Error fetching daily updates:', error);
      if (updates.length === 0) {
        setError('אירעה שגיאה בטעינת העדכונים. נסה שוב מאוחר יותר.');
      }
    } finally {
      setLoading(false);
    }
  }, [hiddenUpdateIds, updates.length]);

  useEffect(() => {
    fetchData();
    const refreshInterval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, [fetchData]);

  // Auto-rotation for multiple updates
  useEffect(() => {
    if (updates.length <= 1) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    // Reset progress when changing slides
    setProgressPercent(0);
    
    // Start progress animation
    const animationDuration = 4000; // 4 seconds
    const animationSteps = 100;
    const stepDuration = animationDuration / animationSteps;
    
    progressIntervalRef.current = setInterval(() => {
      setProgressPercent(prev => {
        if (prev >= 100) return 100;
        return prev + (100 / animationSteps);
      });
    }, stepDuration);

    intervalRef.current = setInterval(() => {
      setIsVisible(false);
      setProgressPercent(0);
      
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % updates.length);
        setIsVisible(true);
      }, 300);
    }, 4000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [updates.length, currentIndex]);

  const hideUpdate = async (updateId: string): Promise<void> => {
    try {
      if (!updateId || updateId === 'undefined') {
        console.error('⚠️ Invalid update ID:', updateId);
        return;
      }
      
      const newHiddenIds = [...hiddenUpdateIds, updateId];
      setHiddenUpdateIds(newHiddenIds);
      
      try {
        localStorage.setItem('eyetask_hidden_updates', JSON.stringify(newHiddenIds));
      } catch (err) {
        console.error('Error saving hidden updates to localStorage:', err);
      }
      
      const newUpdates = updates.filter(update => {
        const id = update._id || update.id;
        return id !== updateId;
      });
      setUpdates(newUpdates);
      
      if (currentIndex >= newUpdates.length && newUpdates.length > 0) {
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('❌ Error hiding update:', error);
    }
  };

  // Error UI
  if (error && updates.length === 0) {
    return (
      <div className={`relative mb-3 ${className}`}>
        <div className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50/80 dark:bg-red-950/20 p-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-red-800 dark:text-red-200 text-sm font-medium">שגיאת מערכת</p>
              <p className="text-red-700 dark:text-red-300 text-xs mt-0.5">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Loading or no updates
  if ((loading && updates.length === 0) || (!loading && updates.length === 0)) {
    return (
      <div className={`relative mb-3 ${className}`}>
        <div className={`rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/20 p-3 backdrop-blur-sm ${loading ? 'animate-pulse' : ''}`}>
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 ${loading ? 'animate-pulse' : ''}`}>
              <Info className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-slate-800 dark:text-slate-200 text-sm font-medium ${loading ? 'bg-slate-300 dark:bg-slate-600 text-transparent rounded animate-pulse' : ''}`}>
                {loading ? 'טוען עדכונים...' : fallbackMessage}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentUpdate = updates[currentIndex];
  if (!currentUpdate) return null;

  const getTypeIcon = (type: string) => {
    const iconProps = "h-3.5 w-3.5";
    switch (type) {
      case 'warning':
        return <AlertTriangle className={`${iconProps} text-amber-600 dark:text-amber-400`} />;
      case 'error':
        return <XCircle className={`${iconProps} text-red-600 dark:text-red-400`} />;
      case 'success':
        return <CheckCircle className={`${iconProps} text-emerald-600 dark:text-emerald-400`} />;
      case 'announcement':
        return <Megaphone className={`${iconProps} text-blue-600 dark:text-blue-400`} />;
      default:
        return <Bell className={`${iconProps} text-slate-600 dark:text-slate-400`} />;
    }
  };

  const getTypeColors = (type: string) => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-amber-50/80 dark:bg-amber-950/20',
          border: 'border-amber-200 dark:border-amber-800/50',
          text: 'text-amber-900 dark:text-amber-100',
          accent: 'bg-amber-500'
        };
      case 'error':
        return {
          bg: 'bg-red-50/80 dark:bg-red-950/20',
          border: 'border-red-200 dark:border-red-800/50',
          text: 'text-red-900 dark:text-red-100',
          accent: 'bg-red-500'
        };
      case 'success':
        return {
          bg: 'bg-emerald-50/80 dark:bg-emerald-950/20',
          border: 'border-emerald-200 dark:border-emerald-800/50',
          text: 'text-emerald-900 dark:text-emerald-100',
          accent: 'bg-emerald-500'
        };
      case 'announcement':
        return {
          bg: 'bg-blue-50/80 dark:bg-blue-950/20',
          border: 'border-blue-200 dark:border-blue-800/50',
          text: 'text-blue-900 dark:text-blue-100',
          accent: 'bg-blue-500'
        };
      default:
        return {
          bg: 'bg-slate-50/80 dark:bg-slate-800/20',
          border: 'border-slate-200 dark:border-slate-700/50',
          text: 'text-slate-900 dark:text-slate-100',
          accent: 'bg-slate-500'
        };
    }
  };

  const colors = getTypeColors(currentUpdate.type);

  return (
    <div className={`${className} relative`}>
      {/* Main Card */}
      <div 
        className={`
          relative overflow-hidden
          rounded-xl ${colors.border} border ${colors.bg}
          backdrop-blur-sm shadow-sm
          transition-all duration-500 ease-out
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
        `}
      >
        {/* Progress bar for multiple updates */}
        {updates.length > 1 && (
          <div className="flex h-0.5 w-full overflow-hidden absolute top-0 left-0 right-0" dir="rtl">
            {updates.map((_, index) => (
              <div key={index} className="relative flex-1 bg-slate-300/40 dark:bg-slate-600/40 overflow-hidden">
                {index === currentIndex && (
                  <div 
                    className={`absolute top-0 right-0 h-full ${colors.accent} transition-all duration-100 ease-linear`}
                    style={{ width: `${progressPercent}%` }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const updateId = currentUpdate._id || currentUpdate.id;
            if (updateId) {
              hideUpdate(updateId);
            }
          }}
          className="absolute top-1 left-1 z-10 flex items-center justify-center bg-transparent p-1 rounded-full"
          title="הסתר עדכון זה"
        >
          <X className="h-3 w-3 text-black dark:text-white hover:opacity-80" />
        </button>

        {/* Content */}
        <div className="p-2">
          <div className="flex flex-row items-center gap-2">
            {/* Icon */}
            <div className="p-1 rounded-md bg-white/50 dark:bg-black/10 backdrop-blur-sm">
              {getTypeIcon(currentUpdate.type)}
            </div>

            {/* Text Content */}
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium leading-tight ${colors.text} ${hebrewFont.fontClass} mb-0.5`}>
                {currentUpdate.title}
              </p>
              <p className={`text-2xs leading-tight ${colors.text} ${hebrewFont.fontClass} opacity-90`}>
                {currentUpdate.content}
              </p>
            </div>
          </div>
        </div>

        {/* Pin Icon */}
        {(currentUpdate.isPinned || currentUpdate.is_pinned) && (
          <div className="absolute top-2 right-2">
            <Pin className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
          </div>
        )}
      </div>
    </div>
  );
}