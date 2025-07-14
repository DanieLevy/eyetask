import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <Skeleton className="h-8 w-48 mb-6" />
      <Skeleton className="h-32 w-full mb-6" />
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
} 