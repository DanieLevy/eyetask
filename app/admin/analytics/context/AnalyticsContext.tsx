'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { AnalyticsData, TimeRange, TIME_RANGES } from '../types/analytics';

interface AnalyticsContextType {
  data: AnalyticsData | null;
  loading: boolean;
  error: string | null;
  timeRange: TimeRange;
  refreshing: boolean;
  setData: (data: AnalyticsData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setTimeRange: (range: TimeRange) => void;
  setRefreshing: (refreshing: boolean) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>(TIME_RANGES[0]);
  const [refreshing, setRefreshing] = useState(false);

  const contextValue = useMemo(
    () => ({
      data,
      loading,
      error,
      timeRange,
      refreshing,
      setData,
      setLoading,
      setError,
      setTimeRange,
      setRefreshing
    }),
    [data, loading, error, timeRange, refreshing]
  );

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
} 