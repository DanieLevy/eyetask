'use client';

import { useState, useEffect, useRef } from 'react';
import { useHebrewFont } from '@/hooks/useFont';

interface DailyUpdate {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'announcement';
  priority: number;
  is_pinned: boolean;
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const hebrewFont = useHebrewFont('body');

  const fetchData = async () => {
    try {
      // Fetch both updates and fallback message
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
            .filter((update: DailyUpdate) => update.is_pinned || update.priority <= 3)
            .slice(0, 5); // Show max 5 updates in carousel
          setUpdates(activeUpdates);
        }
      }

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        if (settingsData.success && settingsData.value) {
          setFallbackMessage(settingsData.value);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching carousel data:', error);
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
    if (updates.length <= 1) return;

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
      }, 300); // Smooth transition
    }, 4000); // Change every 4 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updates.length]);

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center py-3">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // Determine what to display
  const displayText = updates.length > 0 
    ? `${updates[currentIndex].title} - ${updates[currentIndex].content}`
    : fallbackMessage;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'text-orange-600';
      case 'error':
        return 'text-red-600';
      case 'success':
        return 'text-green-600';
      case 'announcement':
        return 'text-blue-600';
      default:
        return 'text-black';
    }
  };

  const textColor = updates.length > 0 
    ? getTypeColor(updates[currentIndex].type)
    : 'text-black';

  return (
    <div className={`${className}`}>
      <div className="relative overflow-hidden">
        <div 
          className={`
            transition-all duration-300 ease-in-out transform
            ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-50 translate-x-2'}
          `}
        >
          <div className="flex items-center justify-center py-3 px-4">
            <p 
              className={`
                text-center text-sm md:text-base leading-relaxed
                ${textColor} ${hebrewFont.fontClass}
                transition-colors duration-300
              `}
              dir="rtl"
            >
              {displayText}
            </p>
          </div>
        </div>
        
        {/* Progress indicator for multiple updates */}
        {updates.length > 1 && (
          <div className="flex items-center justify-center space-x-1 py-1">
            {updates.map((_, index) => (
              <div
                key={index}
                className={`
                  w-1.5 h-1.5 rounded-full transition-all duration-300
                  ${index === currentIndex ? 'bg-gray-600' : 'bg-gray-300'}
                `}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 