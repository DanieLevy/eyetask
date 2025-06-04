'use client';

import { useState, useEffect, useRef } from 'react';
import { useHebrewFont } from '@/hooks/useFont';
import { Bell, AlertTriangle, CheckCircle, XCircle, Megaphone, Info, Pin, X } from 'lucide-react';

interface DailyUpdate {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'announcement';
  priority: number;
  isPinned: boolean;
  isActive: boolean;
  isHidden: boolean;
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
  const [isPaused, setIsPaused] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState('');
  const intervalRef = useRef<NodeJS.Timeout>();
  const hebrewFont = useHebrewFont('body');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [updatesResponse, settingsResponse] = await Promise.all([
        fetch('/api/daily-updates', {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }),
        fetch('/api/daily-updates/settings/fallback_message', {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        })
      ]);

      if (updatesResponse.ok) {
        const updatesData = await updatesResponse.json();
        if (updatesData.success && updatesData.updates) {
          // Map to our interface format
          const activeUpdates = updatesData.updates.map((update: any) => ({
            id: update.id,
            title: update.title,
            content: update.content,
            type: update.type,
            priority: update.priority,
            isPinned: update.isPinned || update.is_pinned,
            isActive: update.isActive || update.is_active,
            isHidden: update.isHidden || update.is_hidden || false,
            expiresAt: update.expiresAt || update.expires_at
          }));
          
          setUpdates(activeUpdates);
          // Reset index if current index is out of bounds
          if (currentIndex >= activeUpdates.length) {
            setCurrentIndex(0);
          }
        }
      }

      // Handle fallback message setting
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        if (settingsData.success && settingsData.value) {
          setFallbackMessage(settingsData.value);
        }
      } else {
        setFallbackMessage('ברוכים הבאים ל-EyeTask! בדקו כאן עדכונים חשובים והודעות.');
      }
    } catch (error) {
      console.error('❌ Error fetching carousel data:', error);
      setFallbackMessage('ברוכים הבאים ל-EyeTask! בדקו כאן עדכונים חשובים והודעות.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Refresh data every 5 minutes
    const refreshInterval = setInterval(fetchData, 5 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, []); // Remove hiddenUpdates dependency

  useEffect(() => {
    if (updates.length <= 1 || isPaused) return;

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Start carousel rotation - faster cycling for multiple updates
    intervalRef.current = setInterval(() => {
      setIsVisible(false);
      
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % updates.length);
        setIsVisible(true);
      }, 250); // Smooth transition
    }, 4000); // Switch every 4 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updates.length, isPaused]);

  const hideUpdate = async (updateId: string) => {
    try {
      const response = await fetch(`/api/daily-updates/${updateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHidden: true })
      });
      
      if (!response.ok) {
        throw new Error('Failed to hide update');
      }
      
      // Remove from current updates and adjust index
      const newUpdates = updates.filter(update => update.id !== updateId);
      setUpdates(newUpdates);
      
      // Adjust current index if needed
      if (currentIndex >= newUpdates.length && newUpdates.length > 0) {
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('❌ Error hiding update:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 animate-pulse" style={{ animationDuration: '1.5s' }} />;
      case 'error':
        return <XCircle className="h-4 w-4 animate-ping" style={{ animationDuration: '2s' }} />;
      case 'success':
        return <CheckCircle className="h-4 w-4 animate-bounce" style={{ animationDuration: '1.5s' }} />;
      case 'announcement':
        return <Megaphone className="h-4 w-4 animate-pulse" style={{ animationDuration: '1.2s' }} />;
      default:
        return getBellIcon();
    }
  };

  const getBellIcon = () => {
    return (
      <>
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes bell-swing {
              0%, 50%, 100% { transform: rotate(0deg); }
              10%, 30% { transform: rotate(-20deg); }
              20%, 40% { transform: rotate(20deg); }
            }
            
            @keyframes bell-glow {
              0%, 100% { 
                filter: drop-shadow(0 0 6px currentColor);
                opacity: 1;
              }
              50% { 
                filter: drop-shadow(0 0 15px currentColor);
                opacity: 0.6;
              }
            }
            
            .bell-animation {
              animation: bell-swing 1.8s ease-in-out infinite, bell-glow 2.2s ease-in-out infinite;
              transform-origin: 50% 5%;
            }
          `
        }} />
        <div className="relative">
          <Bell className="h-4 w-4 bell-animation" />
        </div>
      </>
    );
  };

  const getTypeColors = (type: string) => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
          border: 'border-amber-200 dark:border-amber-700/50',
          icon: 'text-amber-600 dark:text-amber-400',
          text: 'text-amber-900 dark:text-amber-100',
          glow: 'shadow-amber-500/20'
        };
      case 'error':
        return {
          bg: 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20',
          border: 'border-red-200 dark:border-red-700/50',
          icon: 'text-red-600 dark:text-red-400',
          text: 'text-red-900 dark:text-red-100',
          glow: 'shadow-red-500/20'
        };
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20',
          border: 'border-emerald-200 dark:border-emerald-700/50',
          icon: 'text-emerald-600 dark:text-emerald-400',
          text: 'text-emerald-900 dark:text-emerald-100',
          glow: 'shadow-emerald-500/20'
        };
      case 'announcement':
        return {
          bg: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
          border: 'border-blue-200 dark:border-blue-700/50',
          icon: 'text-blue-600 dark:text-blue-400',
          text: 'text-blue-900 dark:text-blue-100',
          glow: 'shadow-blue-500/20'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800/50 dark:to-gray-800/50',
          border: 'border-slate-200 dark:border-slate-700/50',
          icon: 'text-slate-600 dark:text-slate-400',
          text: 'text-slate-800 dark:text-slate-200',
          glow: 'shadow-slate-500/20'
        };
    }
  };

  const handleCardClick = () => {
    if (updates.length <= 1) return;
    // Manual advance to next update
    setIsVisible(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % updates.length);
      setIsVisible(true);
    }, 150);
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center py-4">
          <div className="relative">
            <div className="w-4 h-4 border-2 border-slate-200 dark:border-slate-700 border-t-slate-600 dark:border-t-slate-300 rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  // Determine what to display
  const hasUpdates = updates.length > 0;
  const currentUpdate = hasUpdates ? updates[currentIndex] : null;
  const colors = currentUpdate ? getTypeColors(currentUpdate.type) : getTypeColors('info');

  return (
    <div className={`${className}`}>
      <div className="relative py-4 px-4">
        {/* Main Content Card */}
        <div 
          className={`
            relative max-w-4xl mx-auto
            ${colors.bg} ${colors.border}
            border rounded-lg px-4 py-3
            shadow-lg ${colors.glow}
            backdrop-blur-sm
            transition-all duration-500 ease-out
            ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
            ${hasUpdates ? 'cursor-pointer hover:shadow-xl' : ''}
          `}
          onClick={handleCardClick}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Progress indicator for multiple updates */}
          {hasUpdates && updates.length > 1 && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-black/10 dark:bg-white/10 rounded-t-lg">
              <div 
                className="h-full bg-current rounded-t-lg transition-all duration-4000 ease-linear"
                style={{ 
                  width: `${((currentIndex + 1) / updates.length) * 100}%`,
                  color: colors.icon.includes('text-') ? colors.icon.split('text-')[1] : 'currentColor'
                }}
              />
            </div>
          )}

          {/* Hide button for current update */}
          {hasUpdates && currentUpdate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                hideUpdate(currentUpdate.id);
              }}
              className="absolute top-2 left-2 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors z-10"
              title="הסתר עדכון זה"
            >
              <X className="h-3 w-3 opacity-60 hover:opacity-100" />
            </button>
          )}

          <div className="relative z-10">
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div className={`
                ${colors.icon}
                p-2 rounded-lg
                bg-white/50 dark:bg-black/20
                shadow-sm backdrop-blur-sm
                flex-shrink-0
                transition-all duration-300 ease-out
                hover:scale-110 hover:rotate-12
              `}>
                {hasUpdates ? getTypeIcon(currentUpdate!.type) : getBellIcon()}
              </div>

              {/* Text Content */}
              <div className="flex-1 min-w-0">
                {hasUpdates ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`
                        text-sm font-semibold leading-tight
                        ${colors.text} ${hebrewFont.fontClass}
                      `}>
                        {currentUpdate!.title}
                      </h3>
                      {currentUpdate!.isPinned && (
                        <Pin className="h-3 w-3 text-orange-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className={`
                      text-xs leading-relaxed
                      ${colors.text} ${hebrewFont.fontClass}
                      opacity-90
                    `}>
                      {currentUpdate!.content}
                    </p>
                  </div>
                ) : (
                  <p className={`
                    text-sm font-medium leading-relaxed
                    ${colors.text} ${hebrewFont.fontClass}
                  `}>
                    {fallbackMessage}
                  </p>
                )}
              </div>

              {/* Update counter */}
              {hasUpdates && updates.length > 1 && (
                <div className="flex-shrink-0">
                  <div className={`
                    text-xs px-2 py-1 rounded-full
                    bg-white/30 dark:bg-black/20
                    ${colors.text}
                    font-medium
                  `}>
                    {currentIndex + 1}/{updates.length}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 