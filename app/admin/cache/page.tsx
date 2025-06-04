'use client';

import { useState, useEffect } from 'react';
import { Trash2, RefreshCw, Shield, AlertTriangle, Clock, Users, CheckCircle, XCircle } from 'lucide-react';
import { useHebrewFont } from '@/hooks/useFont';

interface CacheStatus {
  currentVersion: number;
  lastInvalidation: string | null;
  forceUpdate: boolean;
  timestamp: string;
}

export default function CacheManagementPage() {
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [reason, setReason] = useState('');
  const hebrewFont = useHebrewFont('body');

  // Fetch cache status
  const fetchCacheStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/cache?action=status');
      const data = await response.json();
      
      if (data.success) {
        setCacheStatus(data.data);
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch cache status' });
    } finally {
      setLoading(false);
    }
  };

  // Clear all caches for all users
  const clearAllCaches = async () => {
    if (!confirm('האם אתה בטוח שברצונך לנקות את המטמון של כל המשתמשים? פעולה זו תגרום לכל המשתמשים לקבל את התוכן החדש ולטעון מחדש את האפליקציה.')) {
      return;
    }

    setActionLoading('clear-all');
    try {
      const response = await fetch('/api/admin/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'clear-all',
          reason: reason || 'Manual cache clear by admin'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: `מטמון נוקה בהצלחה! גרסה חדשה: ${data.data.newVersion}` });
        await fetchCacheStatus();
        setReason('');
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to clear caches' });
    } finally {
      setActionLoading(null);
    }
  };

  // Soft cache update
  const softCacheUpdate = async () => {
    setActionLoading('soft-clear');
    try {
      const response = await fetch('/api/admin/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'soft-clear' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: `עדכון רך בוצע! גרסה חדשה: ${data.data.newVersion}` });
        await fetchCacheStatus();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to perform soft update' });
    } finally {
      setActionLoading(null);
    }
  };

  // Reset force update flag
  const resetForceUpdate = async () => {
    setActionLoading('reset-force');
    try {
      const response = await fetch('/api/admin/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-force' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'דגל עדכון חובה אופס' });
        await fetchCacheStatus();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to reset force update' });
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchCacheStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchCacheStatus, 30000);
    return () => clearInterval(interval);
  }, []);

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

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              <span className={hebrewFont.fontClass}>{message.text}</span>
            </div>
          </div>
        )}

        {/* Current Status */}
        <div className="bg-card rounded-lg border border-border p-6 mb-8">
          <h2 className={`text-xl font-semibold text-foreground mb-4 ${hebrewFont.fontClass}`}>
            סטטוס מטמון נוכחי
          </h2>
          
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className={hebrewFont.fontClass}>טוען...</span>
            </div>
          ) : cacheStatus ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-background rounded-lg border">
                <Clock className="h-5 w-5 text-blue-500" />
                <div>
                  <div className={`text-sm font-medium text-foreground ${hebrewFont.fontClass}`}>
                    גרסת מטמון נוכחית
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {cacheStatus.currentVersion}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-background rounded-lg border">
                <Users className="h-5 w-5 text-purple-500" />
                <div>
                  <div className={`text-sm font-medium text-foreground ${hebrewFont.fontClass}`}>
                    עדכון חובה
                  </div>
                  <div className={`text-xs ${cacheStatus.forceUpdate ? 'text-red-600' : 'text-green-600'}`}>
                    {cacheStatus.forceUpdate ? 'פעיל' : 'כבוי'}
                  </div>
                </div>
              </div>
              
              {cacheStatus.lastInvalidation && (
                <div className="flex items-center gap-3 p-4 bg-background rounded-lg border md:col-span-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <div>
                    <div className={`text-sm font-medium text-foreground ${hebrewFont.fontClass}`}>
                      ניקוי אחרון
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(cacheStatus.lastInvalidation).toLocaleString('he-IL')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground">לא ניתן לטעון סטטוס מטמון</div>
          )}
          
          <button
            onClick={fetchCacheStatus}
            disabled={loading}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className={hebrewFont.fontClass}>רענן סטטוס</span>
          </button>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Clear All Caches */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="h-6 w-6 text-red-500" />
              <h3 className={`text-lg font-semibold text-foreground ${hebrewFont.fontClass}`}>
                ניקוי מטמון מלא
              </h3>
            </div>
            
            <p className={`text-muted-foreground mb-4 text-sm ${hebrewFont.fontClass}`}>
              ינקה את המטמון של כל המשתמשים ויאלץ אותם לטעון את התוכן החדש. 
              המשתמשים יקבלו הודעה על הצורך לרענן.
            </p>

            <div className="mb-4">
              <label className={`block text-sm font-medium text-foreground mb-2 ${hebrewFont.fontClass}`}>
                סיבה לניקוי (אופציונלי)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="למשל: עדכון גרסה, תיקון באגים..."
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            <button
              onClick={clearAllCaches}
              disabled={actionLoading === 'clear-all'}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {actionLoading === 'clear-all' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span className={hebrewFont.fontClass}>
                {actionLoading === 'clear-all' ? 'מנקה...' : 'נקה מטמון לכל המשתמשים'}
              </span>
            </button>
          </div>

          {/* Soft Update */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <RefreshCw className="h-6 w-6 text-blue-500" />
              <h3 className={`text-lg font-semibold text-foreground ${hebrewFont.fontClass}`}>
                עדכון רך
              </h3>
            </div>
            
            <p className={`text-muted-foreground mb-4 text-sm ${hebrewFont.fontClass}`}>
              עדכן גרסת מטמון בלי לאלץ רענון מיידי. 
              המשתמשים יקבלו עדכון בטעינה הבאה.
            </p>
            
            <button
              onClick={softCacheUpdate}
              disabled={actionLoading === 'soft-clear'}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {actionLoading === 'soft-clear' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className={hebrewFont.fontClass}>
                {actionLoading === 'soft-clear' ? 'מעדכן...' : 'בצע עדכון רך'}
              </span>
            </button>
          </div>
        </div>

        {/* Reset Force Update */}
        {cacheStatus?.forceUpdate && (
          <div className="mt-6 bg-card rounded-lg border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-6 w-6 text-green-500" />
              <h3 className={`text-lg font-semibold text-foreground ${hebrewFont.fontClass}`}>
                איפוס עדכון חובה
              </h3>
            </div>
            
            <p className={`text-muted-foreground mb-4 text-sm ${hebrewFont.fontClass}`}>
              בטל את דגל העדכון החובה. המשתמשים לא יאולצו יותר לרענן.
            </p>
            
            <button
              onClick={resetForceUpdate}
              disabled={actionLoading === 'reset-force'}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {actionLoading === 'reset-force' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              <span className={hebrewFont.fontClass}>
                {actionLoading === 'reset-force' ? 'מאפס...' : 'אפס עדכון חובה'}
              </span>
            </button>
          </div>
        )}

        {/* Warning */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className={`font-medium text-yellow-800 ${hebrewFont.fontClass}`}>
                הערה חשובה
              </h4>
              <p className={`text-yellow-700 text-sm mt-1 ${hebrewFont.fontClass}`}>
                ניקוי מטמון מלא יגרום לכל המשתמשים לטעון מחדש את האפליקציה. 
                השתמש בזה רק אחרי עדכונים חשובים או תיקוני באגים קריטיים.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 