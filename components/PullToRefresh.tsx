'use client';

import { useEffect, useState, useRef } from 'react';
import { RefreshCw, ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  refreshThreshold?: number;
}

export default function PullToRefresh({ 
  onRefresh, 
  children, 
  refreshThreshold = 80 
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const [canPull, setCanPull] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
      setCanPull(true);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!canPull || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    if (diff > 0 && window.scrollY === 0) {
      e.preventDefault();
      setPullDistance(Math.min(diff, refreshThreshold * 1.5));
    }
  };

  const handleTouchEnd = async () => {
    if (!canPull || isRefreshing) return;

    if (pullDistance >= refreshThreshold) {
      setIsRefreshing(true);
      setRefreshSuccess(false);
      try {
        await onRefresh();
        setRefreshSuccess(true);
        // Show success state briefly
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 600);
      } catch (error) {
        console.error('Refresh failed:', error);
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }

    setCanPull(false);
    setStartY(0);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [canPull, isRefreshing, pullDistance, startY, refreshThreshold]);

  const pullProgress = Math.min(pullDistance / refreshThreshold, 1);
  const shouldShowIndicator = pullDistance > 5;
  
  // Color transitions based on progress
  const getIndicatorGradient = () => {
    if (refreshSuccess) {
      return 'bg-gradient-to-b from-green-500/20 to-green-400/5';
    }
    
    if (isRefreshing) {
      return 'bg-gradient-to-b from-primary/20 to-primary/5';
    }
    
    // Change background gradient as user pulls
    if (pullProgress >= 1) {
      return 'bg-gradient-to-b from-primary/20 to-primary/5';
    }
    
    return 'bg-gradient-to-b from-background/80 to-background/20';
  };

  return (
    <div ref={containerRef} className="relative min-h-screen">
      {/* Modern pull indicator */}
      {shouldShowIndicator && (
        <div 
          className={`fixed top-0 left-0 right-0 flex items-center justify-center transition-all duration-300 ease-out backdrop-blur-sm z-50 ${getIndicatorGradient()}`}
          style={{ 
            height: `${Math.min(pullDistance, 70)}px`,
            transform: `translateY(-${Math.max(0, 70 - pullDistance) * 0.5}px)`,
          }}
        >
          <div className="relative flex flex-col items-center">
            {/* Icon */}
            <div className="relative">
              {isRefreshing ? (
                <RefreshCw 
                  className="h-6 w-6 text-primary animate-spin transition-all duration-300"
                />
              ) : refreshSuccess ? (
                <div className="h-6 w-6 rounded-full bg-green-500 text-white flex items-center justify-center transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : (
                <div className="relative transition-all duration-300">
                  <RefreshCw 
                    className="h-6 w-6 text-foreground/80 transition-transform duration-300"
                    style={{ 
                      transform: `rotate(${pullProgress * 360}deg)`,
                      opacity: 0.3 + pullProgress * 0.7
                    }}
                  />
                  {pullProgress < 1 && (
                    <ArrowDown 
                      className="h-3 w-3 absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-1.5 text-foreground/70 animate-bounce"
                      style={{ opacity: Math.max(0, 0.7 - pullProgress) }}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Text */}
            <span 
              className="text-xs font-light mt-2 transition-all duration-300"
              style={{ 
                opacity: 0.5 + pullProgress * 0.5,
              }}
            >
              {isRefreshing ? 'מרענן...' : 
               refreshSuccess ? 'רענון בוצע בהצלחה' :
               pullProgress >= 1 ? 'שחרר לרענון' : 'משוך למטה לרענון'}
            </span>
          </div>
        </div>
      )}

      {/* Content with smooth transition */}
      <div 
        className="transition-transform will-change-transform"
        style={{ 
          transform: `translateY(${Math.min(pullDistance * 0.3, 25)}px)`,
          transition: pullDistance === 0 ? 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
} 