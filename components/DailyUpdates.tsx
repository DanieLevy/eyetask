'use client';

import { useState, useEffect } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info, 
  Pin,
  Clock,
  Calendar,
  X,
  RefreshCw
} from 'lucide-react';
import { useHebrewFont } from '@/hooks/useFont';

interface DailyUpdate {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'announcement';
  priority: number;
  duration_type: 'hours' | 'days' | 'permanent';
  duration_value: number | null;
  expires_at: string | null;
  is_active: boolean;
  is_pinned: boolean;
  target_audience: any[];
  created_at: string;
  updated_at: string;
}

interface DailyUpdatesProps {
  className?: string;
  maxItems?: number;
  showHeader?: boolean;
}

export default function DailyUpdates({ 
  className = '', 
  maxItems = 5,
  showHeader = true 
}: DailyUpdatesProps) {
  const [updates, setUpdates] = useState<DailyUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const hebrewHeading = useHebrewFont('heading');
  const hebrewBody = useHebrewFont('body');

  const fetchUpdates = async () => {
    try {
      setError(null);
      const response = await fetch('/api/daily-updates', {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch daily updates');
      }
      
      const data = await response.json();
      setUpdates(data.updates || []);
    } catch (err) {
      console.error('❌ Error fetching daily updates:', err);
      setError('שגיאה בטעינת עדכונים יומיים');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
    
    // Refresh updates every 5 minutes
    const interval = setInterval(fetchUpdates, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Load dismissed updates from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('dismissedDailyUpdates');
    if (dismissed) {
      try {
        setDismissedIds(new Set(JSON.parse(dismissed)));
      } catch (err) {
        console.error('Error loading dismissed updates:', err);
      }
    }
  }, []);

  const dismissUpdate = (id: string) => {
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(id);
    setDismissedIds(newDismissed);
    
    // Save to localStorage
    localStorage.setItem('dismissedDailyUpdates', JSON.stringify([...newDismissed]));
  };

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'announcement':
        return <Bell className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getUpdateStyles = (type: string) => {
    switch (type) {
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'success':
        return 'border-green-200 bg-green-50 text-green-800';
      case 'error':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'announcement':
        return 'border-blue-200 bg-blue-50 text-blue-800';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  const formatTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return 'קבוע';
    
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'פג תוקף';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} ימים`;
    } else if (hours > 0) {
      return `${hours} שעות`;
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes} דקות`;
    }
  };

  // Filter out dismissed updates and limit by maxItems
  const visibleUpdates = updates
    .filter(update => !dismissedIds.has(update.id))
    .slice(0, maxItems);

  if (loading) {
    return (
      <div className={`${className}`}>
        {showHeader && (
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className={`text-lg font-semibold text-foreground ${hebrewHeading.fontClass}`}>
              עדכונים יומיים
            </h2>
          </div>
        )}
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className={`mr-2 text-muted-foreground ${hebrewBody.fontClass}`}>
            טוען עדכונים...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        {showHeader && (
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className={`text-lg font-semibold text-foreground ${hebrewHeading.fontClass}`}>
              עדכונים יומיים
            </h2>
          </div>
        )}
        <div className="border border-red-200 bg-red-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            <span className={hebrewBody.fontClass}>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (visibleUpdates.length === 0) {
    return (
      <div className={`${className}`}>
        {showHeader && (
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className={`text-lg font-semibold text-foreground ${hebrewHeading.fontClass}`}>
              עדכונים יומיים
            </h2>
          </div>
        )}
        <div className="text-center py-6">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className={`text-muted-foreground ${hebrewBody.fontClass}`}>
            אין עדכונים יומיים כרגע
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className={`text-lg font-semibold text-foreground ${hebrewHeading.fontClass}`}>
              עדכונים יומיים
            </h2>
          </div>
          <span className={`text-sm text-muted-foreground ${hebrewBody.fontClass}`}>
            {visibleUpdates.length} עדכונים זמינים
          </span>
        </div>
      )}
      
      <div className="space-y-3">
        {visibleUpdates.map((update) => (
          <div
            key={update.id}
            className={`relative border rounded-lg p-4 ${getUpdateStyles(update.type)}`}
          >
            {/* Dismiss button */}
            <button
              onClick={() => dismissUpdate(update.id)}
              className="absolute top-2 left-2 p-1 hover:bg-black/10 rounded-full transition-colors"
              aria-label="דחה עדכון"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Pinned indicator */}
            {update.is_pinned && (
              <div className="absolute top-2 right-2">
                <Pin className="h-4 w-4 text-orange-500" />
              </div>
            )}

            <div className="pr-6 pl-8">
              {/* Header */}
              <div className="flex items-start gap-3 mb-2">
                {getUpdateIcon(update.type)}
                <div className="flex-1">
                  <h3 className={`font-semibold text-lg ${hebrewHeading.fontClass}`}>
                    {update.title}
                  </h3>
                  <div className="flex items-center gap-4 text-xs mt-1 opacity-80">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>נותר: {formatTimeRemaining(update.expires_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>עדיפות: {update.priority}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className={`text-sm leading-relaxed ${hebrewBody.fontClass}`}>
                <p>{update.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 