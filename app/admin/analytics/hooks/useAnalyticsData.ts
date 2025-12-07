'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useAnalytics } from '../context/AnalyticsContext';
import { AnalyticsData } from '../types/analytics';
import { fetchManager } from '../utils/fetchManager';

const REFRESH_INTERVAL = 60000; // 60 seconds instead of 30
const ENABLE_AUTO_REFRESH = false; // Disable auto-refresh by default

export function useAnalyticsData() {
  const router = useRouter();
  const {
    data,
    loading,
    error,
    timeRange,
    refreshing,
    setData,
    setLoading,
    setError,
    setRefreshing
  } = useAnalytics();

  const isMountedRef = useRef(true);

  const fetchAnalytics = useCallback(async () => {
    const fetchKey = `analytics-${timeRange.value}`;

    try {
      setError(null);
      if (!refreshing && !loading) {
        setLoading(true);
      }

      const result = await fetchManager.fetch(fetchKey, async () => {
        const token = localStorage.getItem('adminToken');
        if (!token) {
          router.push('/admin');
          throw new Error('No auth token');
        }

        const response = await fetch(`/api/analytics?range=${timeRange.value}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }

        return response.json();
      });
      
      if (result.success && result.data && isMountedRef.current) {
        // Calculate week visitors
        let weekVisitors = 0;
        if (result.data.dailyStats) {
          const today = new Date();
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          
          Object.entries(result.data.dailyStats).forEach(([date, stats]) => {
            const statData = stats as { visits?: number };
            const statDate = new Date(date);
            if (statDate >= weekAgo && statDate <= today) {
              weekVisitors += statData.visits || 0;
            }
          });
        }

        // Filter out admin activities and users
        const filteredActivities = (result.data.recentActivities || [])
          .filter((activity: { userRole: string }) => activity.userRole !== 'admin');
        
        const filteredUsers = (result.data.topUsers || [])
          .filter((user: { role: string }) => user.role !== 'admin'); // Pass all non-admin users

        // Transform the data to our simplified structure
        const transformedData: AnalyticsData = {
          metrics: {
            todayVisitors: result.data.visits || 0,
            weekVisitors: weekVisitors,
            totalActions: filteredActivities.length
          },
          recentActivities: filteredActivities,
          topUsers: filteredUsers,
          lastUpdated: new Date()
        };

        // Only update if component is still mounted
        if (isMountedRef.current) {
          setData(transformedData);
        }
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      if (isMountedRef.current && err instanceof Error && err.message !== 'No auth token') {
        setError(err.message || 'Failed to load analytics');
        if (!refreshing) {
          toast.error('שגיאה בטעינת הנתונים');
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [timeRange.value, refreshing, loading, router, setData, setLoading, setError, setRefreshing]);

  const refresh = useCallback(async () => {
    if (!refreshing) {
      setRefreshing(true);
      await fetchAnalytics();
    }
  }, [fetchAnalytics, refreshing, setRefreshing]);

  // Initial fetch and optional interval setup
  useEffect(() => {
    isMountedRef.current = true;
    
    // Small delay to prevent multiple simultaneous mounts
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        fetchAnalytics();
      }
    }, 100);
    
    let interval: NodeJS.Timeout | undefined;
    
    if (ENABLE_AUTO_REFRESH) {
      interval = setInterval(() => {
        if (isMountedRef.current && !refreshing) {
          refresh();
        }
      }, REFRESH_INTERVAL);
    }

    return () => {
      isMountedRef.current = false;
      clearTimeout(timeoutId);
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [timeRange.value, fetchAnalytics, refresh, refreshing]); // Include all dependencies

  return {
    data,
    loading,
    error,
    refreshing,
    refresh
  };
} 