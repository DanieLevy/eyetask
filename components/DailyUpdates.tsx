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

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'notification':
        return <Bell className="h-5 w-5 text-primary" />;
      default:
        return <Info className="h-5 w-5 text-primary" />;
    }
  };

  const getBorderAndTextClasses = (type: string) => {
    switch (type) {
      case 'warning':
        return 'border-yellow-300/60 dark:border-yellow-600/60 text-yellow-800 dark:text-yellow-50';
      case 'success':
        return 'border-green-300/60 dark:border-green-600/60 text-green-800 dark:text-green-50';
      case 'error':
        return 'border-red-300/60 dark:border-red-600/60 text-red-800 dark:text-red-50';
      case 'notification':
      case 'announcement':
        return 'border-blue-300/60 dark:border-blue-600/60 text-blue-800 dark:text-blue-50';
      default:
        return 'border-slate-300/60 dark:border-slate-600/60 text-slate-800 dark:text-slate-100';
    }
  };

  const getBackgroundStyle = (type: string) => {
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    switch (type) {
      case 'warning':
        return isDark 
          ? 'linear-gradient(to right, rgba(217, 119, 6, 0.2), rgba(194, 65, 12, 0.2))'
          : 'linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(254, 252, 232, 0.8))';
      case 'success':
        return isDark 
          ? 'linear-gradient(to right, rgba(21, 128, 61, 0.2), rgba(22, 101, 52, 0.2))'
          : 'linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(240, 253, 244, 0.8))';
      case 'error':
        return isDark 
          ? 'linear-gradient(to right, rgba(185, 28, 28, 0.2), rgba(190, 18, 60, 0.2))'
          : 'linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(254, 242, 242, 0.8))';
      case 'notification':
      case 'announcement':
        return isDark 
          ? 'linear-gradient(to right, rgba(30, 64, 175, 0.2), rgba(67, 56, 202, 0.2))'
          : 'linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(239, 246, 255, 0.8))';
      default:
        return isDark 
          ? 'linear-gradient(to right, rgba(30, 41, 59, 0.3), rgba(55, 65, 81, 0.3))'
          : 'linear-gradient(to right, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.9))';
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
        <div 
          className="border border-red-300/60 dark:border-red-600/60 rounded-lg p-4 text-red-800 dark:text-red-50"
          style={{ 
            background: typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
              ? 'linear-gradient(to right, rgba(185, 28, 28, 0.2), rgba(190, 18, 60, 0.2))'
              : 'linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(254, 242, 242, 0.8))'
          }}
        >
          <div className="flex items-center gap-2">
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
            className={`relative border rounded-lg p-4 ${getBorderAndTextClasses(update.type)}`}
            style={{ background: getBackgroundStyle(update.type) }}
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
                <Pin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            )}

            <div className="pr-6 pl-8">
              {/* Header */}
              <div className="flex items-start gap-3 mb-2">
                {getIcon(update.type)}
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