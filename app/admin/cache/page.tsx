'use client';

import { Trash2, RefreshCw, Shield, AlertTriangle, Clock, Users, CheckCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useHebrewFont } from '@/hooks/useFont';
import { apiClient } from '@/lib/api-client';

interface CacheStatus {
  currentVersion: number;
  lastInvalidation: string | null;
  forceUpdate: boolean;
  timestamp: string;
}

interface CacheApiResponse {
  success: boolean;
  data?: CacheStatus & { newVersion?: number };
  message?: string;
}

interface ApiError {
  message?: string;
  status?: number;
}

export default function CacheManagementPage() {
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [reason, setReason] = useState('');
  const hebrewFont = useHebrewFont('body');
  const router = useRouter();

  // Check authentication on mount
  useEffect(() => {
    if (!apiClient.isAuthenticated()) {
      router.push('/admin');
      return;
    }
  }, [router]);

  // Fetch cache status
  const fetchCacheStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<CacheApiResponse>('/api/admin/cache?action=status');
      
      if (data.success && data.data) {
        setCacheStatus(data.data);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to fetch cache status' });
      }
    } catch (err) {
      const error = err as ApiError;
      setMessage({ type: 'error', text: error.message || 'Failed to fetch cache status' });
      // If unauthorized, redirect to login
      if (error.status === 401) {
        router.push('/admin');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Clear all caches for all users
  const clearAllCaches = async () => {
    if (!confirm('האם אתה בטוח שברצונך לנקות את המטמון של כל המשתמשים? פעולה זו תגרום לכל המשתמשים לקבל את התוכן החדש ולטעון מחדש את האפליקציה.')) {
      return;
    }

    setActionLoading('clear-all');
    try {
      const data = await apiClient.post<CacheApiResponse>('/api/admin/cache', { 
        action: 'clear-all',
        reason: reason || 'Manual cache clear by admin'
      });
      
      if (data.success && data.data) {
        setMessage({ type: 'success', text: `מטמון נוקה בהצלחה! גרסה חדשה: ${data.data.newVersion}` });
        await fetchCacheStatus();
        setReason('');
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to clear caches' });
      }
    } catch (err) {
      const error = err as ApiError;
      setMessage({ type: 'error', text: error.message || 'Failed to clear caches' });
    } finally {
      setActionLoading(null);
    }
  };

  // Soft cache update
  const softCacheUpdate = async () => {
    setActionLoading('soft-clear');
    try {
      const data = await apiClient.post<CacheApiResponse>('/api/admin/cache', { action: 'soft-clear' });
      
      if (data.success && data.data) {
        setMessage({ type: 'success', text: `עדכון רך בוצע! גרסה חדשה: ${data.data.newVersion}` });
        await fetchCacheStatus();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to perform soft update' });
      }
    } catch (err) {
      const error = err as ApiError;
      setMessage({ type: 'error', text: error.message || 'Failed to perform soft update' });
    } finally {
      setActionLoading(null);
    }
  };

  // Reset force update flag
  const resetForceUpdate = async () => {
    setActionLoading('reset-force');
    try {
      const data = await apiClient.post<CacheApiResponse>('/api/admin/cache', { action: 'reset-force' });
      
      if (data.success) {
        setMessage({ type: 'success', text: 'דגל עדכון חובה אופס' });
        await fetchCacheStatus();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to reset force update' });
      }
    } catch (err) {
      const error = err as ApiError;
      setMessage({ type: 'error', text: error.message || 'Failed to reset force update' });
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchCacheStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchCacheStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchCacheStatus]);

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold text-foreground ${hebrewFont.fontClass}`}>
            ניהול מטמון משתמשים
          </h1>
          <p className={`text-muted-foreground mt-2 ${hebrewFont.fontClass}`}>
            נקה מטמון לכל המשתמשים כדי לאלץ טעינת תוכן מעודכן
          </p>
        </div>

        {/* Message - Enhanced for Mobile PWA */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border animate-in slide-in-from-top-2 ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200' 
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 flex-shrink-0" />
              )}
              <p className={hebrewFont.fontClass}>{message.text}</p>
            </div>
          </div>
        )}

        {/* Cache Status Card */}
        <div className="bg-card rounded-lg border border-border shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-semibold text-foreground ${hebrewFont.fontClass}`}>
              סטטוס מטמון נוכחי
            </h2>
            <button
              onClick={fetchCacheStatus}
              disabled={loading}
              className="p-2 hover:bg-accent rounded-lg transition-colors disabled:opacity-50"
              aria-label="רענן סטטוס"
            >
              <RefreshCw className={`h-5 w-5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading && !cacheStatus ? (
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded animate-pulse"></div>
              <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
              <div className="h-4 bg-muted rounded animate-pulse w-1/2"></div>
            </div>
          ) : cacheStatus ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className={`text-sm text-muted-foreground ${hebrewFont.fontClass}`}>גרסת מטמון נוכחית</p>
                  <p className="text-lg font-semibold text-foreground">{cacheStatus.currentVersion}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className={`text-sm text-muted-foreground ${hebrewFont.fontClass}`}>ניקוי אחרון</p>
                  <p className="text-sm font-medium text-foreground">
                    {cacheStatus.lastInvalidation 
                      ? new Date(cacheStatus.lastInvalidation).toLocaleString('he-IL') 
                      : 'אין מידע'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                {cacheStatus.forceUpdate ? (
                  <>
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    <div className="flex-1">
                      <p className={`text-sm text-muted-foreground ${hebrewFont.fontClass}`}>מצב</p>
                      <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                        עדכון חובה פעיל
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Shield className="h-5 w-5 text-green-500" />
                    <div className="flex-1">
                      <p className={`text-sm text-muted-foreground ${hebrewFont.fontClass}`}>מצב</p>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        רגיל
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <p className={`text-muted-foreground ${hebrewFont.fontClass}`}>אין מידע זמין</p>
          )}
        </div>

        {/* Actions Section */}
        <div className="bg-card rounded-lg border border-border shadow-sm p-6 space-y-4">
          <h2 className={`text-xl font-semibold text-foreground mb-4 ${hebrewFont.fontClass}`}>
            פעולות
          </h2>

          {/* Reason Input */}
          <div className="space-y-2">
            <label className={`block text-sm font-medium text-foreground ${hebrewFont.fontClass}`}>
              סיבה לניקוי (אופציונלי)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="לדוגמה: עדכון תוכן חשוב"
              className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              dir="rtl"
            />
          </div>

          {/* Clear All Caches */}
          <button
            onClick={clearAllCaches}
            disabled={actionLoading === 'clear-all'}
            className={`w-full p-4 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${hebrewFont.fontClass}`}
          >
            <Trash2 className={`h-5 w-5 ${actionLoading === 'clear-all' ? 'animate-pulse' : ''}`} />
            {actionLoading === 'clear-all' ? 'מנקה...' : 'נקה מטמון לכל המשתמשים'}
          </button>

          {/* Soft Cache Update */}
          <button
            onClick={softCacheUpdate}
            disabled={actionLoading === 'soft-clear'}
            className={`w-full p-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${hebrewFont.fontClass}`}
          >
            <RefreshCw className={`h-5 w-5 ${actionLoading === 'soft-clear' ? 'animate-spin' : ''}`} />
            {actionLoading === 'soft-clear' ? 'מעדכן...' : 'עדכון רך (ללא אילוץ)'}
          </button>

          {/* Reset Force Update */}
          {cacheStatus?.forceUpdate && (
            <button
              onClick={resetForceUpdate}
              disabled={actionLoading === 'reset-force'}
              className={`w-full p-4 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${hebrewFont.fontClass}`}
            >
              <Shield className={`h-5 w-5 ${actionLoading === 'reset-force' ? 'animate-pulse' : ''}`} />
              {actionLoading === 'reset-force' ? 'מאפס...' : 'אפס דגל עדכון חובה'}
            </button>
          )}

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h3 className={`text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 ${hebrewFont.fontClass}`}>
              מידע חשוב
            </h3>
            <ul className={`text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside ${hebrewFont.fontClass}`}>
              <li>ניקוי מטמון יגרום לכל המשתמשים לטעון מחדש את האפליקציה</li>
              <li>עדכון רך ישדרג את המטמון ללא אילוץ טעינה מחדש</li>
              <li>המערכת תעדכן אוטומטית את גרסת המטמון</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
