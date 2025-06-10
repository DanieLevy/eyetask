'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useHebrewFont } from '@/hooks/useFont';
import { Bell, AlertTriangle, CheckCircle, XCircle, Megaphone, Info, Pin, X } from 'lucide-react';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { useRouter } from 'next/navigation';

interface DailyUpdate {
  _id?: string;  // Backend might use _id
  id?: string;   // Or id in some responses
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'announcement';
  priority: number;
  isPinned: boolean;
  isActive: boolean;
  is_hidden?: boolean; // API might use snake_case
  isHidden?: boolean;  // Or camelCase
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
  const [fallbackMessage, setFallbackMessage] = useState('לא נמצאו עדכונים להצגה');
  const [error, setError] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hebrewFont = useHebrewFont('body');
  const { status } = useOfflineStatus();
  const { isOnline } = status;
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch active daily updates
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
        setUpdates(updatesData.updates || []);
      }

      try {
        // Fetch fallback message setting
        const settingsResponse = await fetch('/api/settings/main-page-carousel-fallback-message');
        
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          if (settingsData?.value) {
            setFallbackMessage(settingsData.value);
          }
        }
      } catch (settingsError) {
        // If settings fetch fails, keep using the default fallback message
        console.error('Error fetching fallback message settings:', settingsError);
      }
    } catch (error) {
      console.error('Error fetching daily updates:', error);
      // Only set error if we don't have updates - we want to show data if available
      if (updates.length === 0) {
        setError('אירעה שגיאה בטעינת העדכונים. נסה שוב מאוחר יותר.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    // Refresh data every 5 minutes
    const refreshInterval = setInterval(fetchData, 5 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, [fetchData]);

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

  const hideUpdate = async (updateId: string): Promise<void> => {
    try {
      // Check if updateId is valid
      if (!updateId || updateId === 'undefined') {
        console.error('⚠️ Invalid update ID:', updateId);
        return;
      }
      
      const response = await fetch(`/api/daily-updates/${updateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHidden: true })
      });
      
      if (!response.ok) {
        throw new Error('Failed to hide update');
      }
      
      // Remove from current updates and adjust index
      const newUpdates = updates.filter(update => {
        const id = update._id || update.id;
        return id !== updateId;
      });
      setUpdates(newUpdates);
      
      // Adjust current index if needed
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
      <div className={`relative mb-6 ${className}`}>
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800/50 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-red-800 dark:text-red-200 font-medium">שגיאת מערכת</p>
              <p className="text-red-700/80 dark:text-red-300/80 text-sm">{error}</p>
            </div>
            <button 
              onClick={fetchData}
              className="ml-auto bg-red-100 dark:bg-red-800/50 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800 rounded-lg px-3 py-1.5 text-sm transition-colors"
            >
              נסה שוב
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Loading or no updates
  if ((loading && updates.length === 0) || (!loading && updates.length === 0)) {
    return (
      <div className={`relative mb-6 ${className} ${loading ? 'animate-pulse' : ''}`}>
        <div className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 p-4">
          <div className="flex items-center gap-3">
            <Info className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            <div>
              <p className={`text-slate-800 dark:text-slate-200 ${loading ? 'text-transparent bg-slate-300 dark:bg-slate-700 rounded animate-pulse' : ''}`}>
                {loading ? 'טוען עדכונים...' : fallbackMessage}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Everything after this point means we have updates
  const currentUpdate = updates[currentIndex];

  // Guard clause for safety
  if (!currentUpdate) return null;

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
          bg: 'bg-gradient-to-r from-amber-100/90 to-orange-100/90 dark:from-amber-900/90 dark:to-orange-900/90',
          border: 'border-amber-300/60 dark:border-amber-600/60',
          icon: 'text-amber-600 dark:text-amber-300',
          text: 'text-amber-900 dark:text-amber-100',
          glow: 'shadow-amber-500/20 dark:shadow-amber-400/30'
        };
      case 'error':
        return {
          bg: 'bg-gradient-to-r from-red-100/90 to-rose-100/90 dark:from-red-900/90 dark:to-rose-900/90',
          border: 'border-red-300/60 dark:border-red-600/60',
          icon: 'text-red-600 dark:text-red-300',
          text: 'text-red-900 dark:text-red-100',
          glow: 'shadow-red-500/20 dark:shadow-red-400/30'
        };
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-emerald-100/90 to-green-100/90 dark:from-emerald-900/90 dark:to-green-900/90',
          border: 'border-emerald-300/60 dark:border-emerald-600/60',
          icon: 'text-emerald-600 dark:text-emerald-300',
          text: 'text-emerald-900 dark:text-emerald-100',
          glow: 'shadow-emerald-500/20 dark:shadow-emerald-400/30'
        };
      case 'announcement':
        return {
          bg: 'bg-gradient-to-r from-blue-100/90 to-indigo-100/90 dark:from-blue-900/90 dark:to-indigo-900/90',
          border: 'border-blue-300/60 dark:border-blue-600/60',
          icon: 'text-blue-600 dark:text-blue-300',
          text: 'text-blue-900 dark:text-blue-100',
          glow: 'shadow-blue-500/20 dark:shadow-blue-400/30'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-slate-100/90 to-gray-100/90 dark:from-slate-800/90 dark:to-gray-800/90',
          border: 'border-slate-300/60 dark:border-slate-600/60',
          icon: 'text-slate-600 dark:text-slate-300',
          text: 'text-slate-800 dark:text-slate-100',
          glow: 'shadow-slate-500/20 dark:shadow-slate-400/30'
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

  // Determine what to display
  const hasUpdates = updates.length > 0;
  const colors = currentUpdate ? getTypeColors(currentUpdate.type) : getTypeColors('info');
  
  // Debug logging
  console.log('🎨 DailyUpdatesCarousel: Render state:', { 
    loading, 
    hasUpdates, 
    updatesCount: updates.length,
    currentIndex,
    currentUpdate: currentUpdate ? { 
      id: currentUpdate._id || currentUpdate.id, 
      title: currentUpdate.title,
      content: currentUpdate.content?.substring(0, 50) + '...' 
    } : null,
    fallbackMessage: fallbackMessage?.substring(0, 50) + '...'
  });

  return (
    <div className={`${className}`}>
      <div className="relative py-4">
        {/* Main Content Card */}
        <div 
          className={`
            relative w-full
            ${colors.border}
            border rounded-lg px-4 py-3
            shadow-lg ${colors.glow}
            backdrop-blur-sm
            transition-all duration-500 ease-out
            ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
            ${hasUpdates ? 'cursor-pointer hover:shadow-xl' : ''}
          `}
          style={{
            background: currentUpdate ? (() => {
              const isDark = document.documentElement.classList.contains('dark');
              switch (currentUpdate.type) {
                case 'warning':
                  return isDark 
                    ? 'linear-gradient(to right, rgba(217, 119, 6, 0.2), rgba(194, 65, 12, 0.2))'
                    : 'linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(254, 252, 232, 0.8))';
                case 'error':
                  return isDark 
                    ? 'linear-gradient(to right, rgba(185, 28, 28, 0.2), rgba(190, 18, 60, 0.2))'
                    : 'linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(254, 242, 242, 0.8))';
                case 'success':
                  return isDark 
                    ? 'linear-gradient(to right, rgba(21, 128, 61, 0.2), rgba(22, 101, 52, 0.2))'
                    : 'linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(240, 253, 244, 0.8))';
                case 'announcement':
                  return isDark 
                    ? 'linear-gradient(to right, rgba(30, 64, 175, 0.2), rgba(67, 56, 202, 0.2))'
                    : 'linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(239, 246, 255, 0.8))';
                default:
                  return isDark 
                    ? 'linear-gradient(to right, rgba(30, 41, 59, 0.3), rgba(55, 65, 81, 0.3))'
                    : 'linear-gradient(to right, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.9))';
              }
            })() : document.documentElement.classList.contains('dark') 
              ? 'linear-gradient(to right, rgba(30, 41, 59, 0.3), rgba(55, 65, 81, 0.3))'
              : 'linear-gradient(to right, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.9))'
          }}
          onClick={handleCardClick}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Progress indicator for multiple updates */}
          {hasUpdates && updates.length > 1 && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200/30 dark:bg-slate-700/50 rounded-t-lg">
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
                e.preventDefault();
                e.stopPropagation();
                // Use either _id or id field, whichever is available
                const updateId = currentUpdate._id || currentUpdate.id;
                if (updateId) {
                  hideUpdate(updateId);
                } else {
                  console.error('⚠️ No valid ID found for update:', currentUpdate);
                }
              }}
              className={`absolute top-2 left-2 w-6 h-6 transition-all duration-200 ease-in-out z-20 flex items-center justify-center hover:scale-105 focus:scale-105 focus:outline-none touch-manipulation ${
                currentUpdate.type === 'warning' ? 'text-yellow-700 dark:text-yellow-300' :
                currentUpdate.type === 'success' ? 'text-green-700 dark:text-green-300' :
                currentUpdate.type === 'error' ? 'text-red-700 dark:text-red-300' :
                currentUpdate.type === 'announcement' ? 'text-blue-700 dark:text-blue-300' :
                'text-slate-700 dark:text-slate-300'
              }`}
              title="הסתר עדכון זה"
              type="button"
            >
              <X className="h-3 w-3 pointer-events-none" />
            </button>
          )}

          <div className="relative z-10">
            <div className="flex items-center gap-3">
              {/* Icon - FIXED BACKGROUND */}
              <div className={`
                ${colors.icon}
                p-2 rounded-lg
                bg-white/80 dark:bg-slate-800
                shadow-sm backdrop-blur-sm
                flex-shrink-0
                transition-all duration-300 ease-out
                hover:scale-110 hover:rotate-12
                border border-slate-200/20 dark:border-slate-600
              `}>
                {hasUpdates ? getTypeIcon(currentUpdate!.type) : getBellIcon()}
              </div>

              {/* Text Content */}
              <div className="flex-1 min-w-0">
                {hasUpdates && currentUpdate ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`
                        text-sm font-semibold leading-tight
                        ${colors.text} ${hebrewFont.fontClass}
                      `}>
                        {currentUpdate.title}
                      </h3>
                      {currentUpdate.isPinned && (
                        <Pin className="h-3 w-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className={`
                      text-xs leading-relaxed
                      ${colors.text} ${hebrewFont.fontClass}
                      opacity-90
                    `}>
                      {currentUpdate.content}
                    </p>
                  </div>
                ) : (
                  <p className={`
                    text-sm font-medium leading-relaxed
                    ${colors.text} ${hebrewFont.fontClass}
                  `}>
                    {fallbackMessage || 'ברוכים הבאים ל-Drivers Hub! בדקו כאן עדכונים חשובים והודעות.'}
                  </p>
                )}
              </div>

              {/* Update counter - FIXED BACKGROUND */}
              {hasUpdates && updates.length > 1 && (
                <div className="flex-shrink-0">
                  <div className={`
                    text-xs px-2 py-1 rounded-full
                    bg-white/80 dark:bg-slate-800
                    ${colors.text}
                    font-medium
                    border border-slate-200/20 dark:border-slate-600
                    backdrop-blur-sm
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