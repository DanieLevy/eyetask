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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">ניתוח נתונים</h1>
            <p className="text-sm text-muted-foreground mt-1">
              סקירה כללית של פעילות המערכת
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-2">
            <Select 
              value={timeRange.value} 
              onValueChange={(value) => {
                const selected = TIME_RANGES.find(t => t.value === value);
                if (selected) setTimeRange(selected);
              }}
            >
              <SelectTrigger className="w-32 h-9">
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
              size="sm"
              onClick={refresh}
              disabled={refreshing}
              className="h-9"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
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