'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function MetricsCardsSkeleton() {
  return (
    <div className="flex gap-4 mb-6">
      {[1, 2].map((i) => (
        <Card key={i} className="flex-1 border border-gray-200 dark:border-gray-800 shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function UserLeaderboardSkeleton() {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
              <div className="text-right space-y-2">
                <Skeleton className="h-6 w-8" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ActivityFeedSkeleton() {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-lg border p-3">
              <div className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full max-w-sm" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsPageSkeleton() {
  return (
    <div className="animate-fade-in">
      {/* Header Skeleton */}
      <div className="mb-6">
        <Skeleton className="h-10 w-48 mb-2 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" />
        <Skeleton className="h-4 w-64 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" />
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <Card 
            key={i} 
            className="border-0 shadow-lg animate-pulse"
            style={{
              animationDelay: `${i * 100}ms`
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Users */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-8 w-24" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i} 
                className={cn(
                  "p-4 rounded-lg border animate-pulse",
                  i === 1 && "bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20"
                )}
                style={{
                  animationDelay: `${i * 50}ms`
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-6 w-12 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i} 
                className="p-3 rounded-lg animate-pulse"
                style={{
                  animationDelay: `${i * 50}ms`
                }}
              >
                <div className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 