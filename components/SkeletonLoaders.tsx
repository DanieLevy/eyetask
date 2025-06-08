import React from 'react';

interface SkeletonProps {
  className?: string;
  children?: React.ReactNode;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', children }) => {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] ${className}`}
      style={{
        animation: 'shimmer 2s infinite linear',
      }}
    >
      {children}
    </div>
  );
};

export const ProjectCardSkeleton: React.FC = () => {
  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32 rounded" />
        <Skeleton className="h-4 w-16 rounded" />
      </div>
      
      {/* Description */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-3/4 rounded" />
      </div>
      
      {/* Stats */}
      <div className="flex items-center gap-4 pt-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-8 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-8 rounded" />
        </div>
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Skeleton className="h-3 w-20 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </div>
  );
};

export const TaskCardSkeleton: React.FC = () => {
  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-5 w-40 rounded" />
          </div>
          <Skeleton className="h-4 w-24 rounded" />
        </div>
        <Skeleton className="h-8 w-8 rounded" />
      </div>
      
      {/* Content */}
      <div className="space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
          <Skeleton className="h-4 w-4/6 rounded" />
        </div>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-12 rounded" />
        </div>
        <Skeleton className="h-4 w-16 rounded" />
      </div>
    </div>
  );
};

export const HomepageLoadingSkeleton: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Daily Updates Skeleton */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-32 rounded" />
        </div>
        <Skeleton className="h-4 w-full rounded" />
      </div>
      
      {/* Projects Grid Skeleton */}
      <div>
        <Skeleton className="h-8 w-48 rounded mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      </div>
      
      {/* Add shimmer keyframes to global CSS */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};

export const ProjectPageLoadingSkeleton: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-8 w-48 rounded" />
        </div>
        <Skeleton className="h-4 w-96 rounded" />
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg">
        <Skeleton className="h-9 w-24 rounded" />
        <Skeleton className="h-9 w-24 rounded" />
        <div className="ml-auto">
          <Skeleton className="h-9 w-32 rounded" />
        </div>
      </div>
      
      {/* Tasks */}
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <TaskCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

export const InlineLoadingSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 flex-1 rounded" />
        </div>
      ))}
    </div>
  );
};

// Progressive enhancement - shows content as it loads
export const ProgressiveLoader: React.FC<{
  loading: boolean;
  error: Error | null;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  errorFallback?: React.ReactNode;
}> = ({ loading, error, skeleton, children, errorFallback }) => {
  if (error && errorFallback) {
    return <>{errorFallback}</>;
  }
  
  if (loading) {
    return <>{skeleton}</>;
  }
  
  return <>{children}</>;
}; 