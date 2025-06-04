'use client';

import { useState, useEffect, useRef } from 'react';
import { useHebrewFont } from '@/hooks/useFont';
import { Bell, AlertTriangle, CheckCircle, XCircle, Megaphone, Info } from 'lucide-react';

interface DailyUpdate {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'announcement';
  priority: number;
  isPinned: boolean;
}

interface DailyUpdatesCarouselProps {
  className?: string;
}

export default function DailyUpdatesCarousel({ className = '' }: DailyUpdatesCarouselProps) {
  const [updates, setUpdates] = useState<DailyUpdate[]>([]);
  const [fallbackMessage, setFallbackMessage] = useState<string>('המשך יום טוב');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const hebrewFont = useHebrewFont('body');

  const fetchData = async () => {
    try {
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
          // Filter and prioritize updates
          const activeUpdates = updatesData.updates
            .filter((update: DailyUpdate) => update.isPinned || update.priority <= 3)
            .slice(0, 5); // Show max 5 updates in carousel
          setUpdates(activeUpdates);
        }
      }

      // Handle fallback message setting - provide default if it doesn't exist
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        if (settingsData.success && settingsData.value) {
          setFallbackMessage(settingsData.value);
        }
      } else {
        // Set default fallback message if setting doesn't exist
        setFallbackMessage('Welcome to EyeTask! Check back later for important updates and announcements.');
      }
    } catch (error) {
      console.error('❌ Error fetching carousel data:', error);
      // Set default fallback message on error
      setFallbackMessage('Welcome to EyeTask! Check back later for important updates and announcements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Refresh data every 10 minutes
    const refreshInterval = setInterval(fetchData, 10 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    if (updates.length <= 1 || isPaused) return;

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Start carousel rotation
    intervalRef.current = setInterval(() => {
      setIsVisible(false);
      
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % updates.length);
        setIsVisible(true);
      }, 300); // Faster transition
    }, 5000); // Change every 5 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updates.length, isPaused]);

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
        return <Info className="h-4 w-4 animate-pulse" style={{ animationDuration: '2s' }} />;
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

  const handleCardClick = (index: number) => {
    if (updates.length <= 1) return;
    setIsVisible(false);
    setTimeout(() => {
      setCurrentIndex(index);
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
            transition-all duration-300 ease-out transform
            ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}
          `}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className={`
            ${colors.bg} ${colors.border} ${colors.glow}
            border rounded-xl
            shadow-lg shadow-black/5 dark:shadow-black/20
            backdrop-blur-sm backdrop-saturate-150
            p-4
            relative overflow-hidden
            hover:shadow-xl
            transition-all duration-200 ease-out
            cursor-pointer
          `}>
            {/* Content */}
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
                      <h3 className={`
                        text-sm font-semibold leading-tight
                        ${colors.text} ${hebrewFont.fontClass}
                      `}>
                        {currentUpdate!.title}
                      </h3>
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

                {/* Priority Badge */}
                {hasUpdates && currentUpdate!.isPinned && (
                  <div className="flex-shrink-0">
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Subtle glow effect */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/10 to-transparent rounded-full -translate-y-8 translate-x-8"></div>
          </div>
        </div>
        
        {/* Progress Indicators */}
        {updates.length > 1 && (
          <div className="flex items-center justify-center space-x-2 mt-3">
            {updates.map((update, index) => {
              const isActive = index === currentIndex;
              const dotColors = getTypeColors(update.type);
              
              return (
                <button
                  key={update.id}
                  onClick={() => handleCardClick(index)}
                  className={`
                    relative transition-all duration-300 ease-out
                    ${isActive ? 'scale-110' : 'scale-100 hover:scale-105'}
                  `}
                >
                  <div className={`
                    w-2 h-2 rounded-full transition-all duration-300
                    ${isActive 
                      ? `${dotColors.bg} ${dotColors.border} border shadow-sm ${dotColors.glow}` 
                      : 'bg-white/40 dark:bg-slate-600/40 border border-white/60 dark:border-slate-500/60 hover:bg-white/60 dark:hover:bg-slate-500/60'
                    }
                  `} />
                  
                  {/* Priority indicator */}
                  {update.isPinned && (
                    <div className="absolute -top-0.5 -right-0.5 w-1 h-1 bg-yellow-400 rounded-full animate-pulse"></div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 