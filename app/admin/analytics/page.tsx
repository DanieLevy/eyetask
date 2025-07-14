'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCanViewAnalytics } from '@/hooks/usePermission';
import { useAuth } from '@/components/unified-header/AuthContext';
import AdminClientLayout from '@/components/AdminClientLayout';
import { AnalyticsProvider, useAnalytics } from './context/AnalyticsContext';
import { useAnalyticsData } from './hooks/useAnalyticsData';
import { MetricsCards } from './components/MetricsCards';
import { UserLeaderboard } from './components/UserLeaderboard';
import { ActivityFeed } from './components/ActivityFeed';
import { AnalyticsPageSkeleton } from './components/Skeletons';
import { TIME_RANGES } from './types/analytics';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

function AnalyticsContent() {
  const router = useRouter();
  const canViewAnalytics = useCanViewAnalytics();
  const { isLoading: authLoading } = useAuth();
  
  const { timeRange, setTimeRange, refreshing } = useAnalytics();
  const { data, loading, error, refresh } = useAnalyticsData();

  // Check permission
  useEffect(() => {
    if (!authLoading && !canViewAnalytics) {
      toast.error('אין לך הרשאה לצפות באנליטיקה');
      router.push('/admin/dashboard');
    }
  }, [authLoading, canViewAnalytics, router]);

  if (loading || authLoading) {
    return <AnalyticsPageSkeleton />;
  }

  if (!canViewAnalytics) {
    return null; // Will redirect in useEffect
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
                לוח בקרה אנליטיקס
              </h1>
              <p className="text-muted-foreground mt-1">ניתוח ביצועים ופעילות בזמן אמת</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={timeRange.value} onValueChange={handleTimeRangeChange}>
                <SelectTrigger className="w-32 border-0 shadow-sm">
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
                className="shadow-sm hover:shadow-md transition-all duration-200"
              >
                <RefreshCw className={cn(
                  "h-4 w-4",
                  refreshing && "animate-spin"
                )} />
              </Button>
            </div>
          </div>
        </div>

        {/* Metrics Cards - Now has its own margin */}
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
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
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