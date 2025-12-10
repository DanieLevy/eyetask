'use client';

import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import AdminClientLayout from '@/components/AdminClientLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/components/unified-header/AuthContext';
import { useCanViewAnalytics } from '@/hooks/usePermission';
import { cn } from '@/lib/utils';
import { ActivityFeed } from './components/ActivityFeed';
import { MetricsCards } from './components/MetricsCards';
import { AnalyticsPageSkeleton } from './components/Skeletons';
import { UserLeaderboard } from './components/UserLeaderboard';
import { AnalyticsProvider, useAnalytics } from './context/AnalyticsContext';
import { useAnalyticsData } from './hooks/useAnalyticsData';
import { TIME_RANGES } from './types/analytics';

function AnalyticsContent() {
  const router = useRouter();
  const canViewAnalytics = useCanViewAnalytics();
  const { isLoading: authLoading } = useAuth();
  
  const { timeRange, setTimeRange, refreshing } = useAnalytics();
  const { data, loading, error, refresh } = useAnalyticsData();

  // Check permission - only redirect once when auth is loaded and permission is denied
  useEffect(() => {
    if (!authLoading && canViewAnalytics === false) {
      toast.error('אין לך הרשאה לצפות באנליטיקה');
      router.push('/admin/dashboard');
    }
  }, [authLoading, canViewAnalytics, router]);

  // Show loading while checking auth or loading data
  if (loading || authLoading) {
    return <AnalyticsPageSkeleton />;
  }

  // Don't render if no permission (will redirect in useEffect)
  if (!canViewAnalytics) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">שגיאה בטעינת הנתונים</p>
          <Button onClick={refresh} variant="outline">
            נסה שנית
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const handleTimeRangeChange = (value: string) => {
    const selected = TIME_RANGES.find(t => t.value === value);
    if (selected) setTimeRange(selected);
  };

  const handleRefresh = () => {
    refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-light text-slate-700">
                לוח בקרה אנליטיקס
              </h1>
              <p className="text-sm text-slate-600 mt-1">ניתוח ביצועים ופעילות בזמן אמת</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={timeRange.value} onValueChange={handleTimeRangeChange}>
                <SelectTrigger className="w-32 border border-slate-200 shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
                className="border border-slate-200 shadow-sm hover:bg-slate-100 transition-colors"
              >
                <RefreshCw className={cn(
                  "h-4 w-4 text-slate-600",
                  refreshing && "animate-spin"
                )} />
              </Button>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <MetricsCards metrics={data.metrics} />

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Top Users */}
          <UserLeaderboard 
            users={data.topUsers} 
            activities={data.recentActivities}
          />

          {/* Right Column - Activity Feed */}
          <ActivityFeed activities={data.recentActivities} />
        </div>

        {/* Last Updated */}
        <div className="mt-12 pt-6 border-t border-slate-200">
          <p className="text-xs text-slate-500 text-center">
            עודכן לאחרונה: {new Date(data.lastUpdated).toLocaleString('he-IL')}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <AdminClientLayout>
      <AnalyticsProvider>
        <AnalyticsContent />
      </AnalyticsProvider>
    </AdminClientLayout>
  );
} 