'use client';

import { useRefreshTrigger } from '@/hooks/usePageRefresh';
import PullToRefresh from './PullToRefresh';

interface GlobalPullToRefreshProps {
  children: React.ReactNode;
}

export default function GlobalPullToRefresh({ children }: GlobalPullToRefreshProps) {
  const triggerRefresh = useRefreshTrigger();

  return (
    <PullToRefresh onRefresh={triggerRefresh}>
      {children}
    </PullToRefresh>
  );
} 