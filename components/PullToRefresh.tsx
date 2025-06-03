'use client';

import { useEffect, useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

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
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
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
  const shouldShowIndicator = pullDistance > 10;

  return (
    <div ref={containerRef} className="relative min-h-screen">
      {/* Pull indicator */}
      {shouldShowIndicator && (
        <div 
          className="fixed top-0 left-0 right-0 flex items-center justify-center bg-primary/10 transition-all duration-200 z-50"
          style={{ 
            height: `${Math.min(pullDistance, 60)}px`,
            transform: `translateY(-${Math.max(0, 60 - pullDistance)}px)`
          }}
        >
          <div className="flex items-center gap-2 text-primary">
            <RefreshCw 
              className={`h-5 w-5 transition-transform duration-200 ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              style={{ 
                transform: `rotate(${pullProgress * 180}deg)`,
                opacity: pullProgress 
              }}
            />
            <span className="text-sm font-medium" style={{ opacity: pullProgress }}>
              {isRefreshing ? 'מרענן...' : pullDistance >= refreshThreshold ? 'שחרר לרענון' : 'משוך לרענון'}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div 
        style={{ 
          transform: `translateY(${Math.min(pullDistance * 0.5, 30)}px)`,
          transition: pullDistance === 0 ? 'transform 0.2s ease-out' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
} 