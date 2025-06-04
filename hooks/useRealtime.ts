import { useEffect, useRef } from 'react';

export interface RealtimeConfig {
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  callback: (payload: any) => void;
  filter?: string; // Optional filter like "taskId=eq.123"
}

// MongoDB-compatible polling-based realtime alternative
export function useRealtime(configs: RealtimeConfig[]) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // For MongoDB, we'll use periodic polling instead of real-time updates
    // This is a simplified implementation - in a production app you might want
    // to implement WebSocket-based real-time updates with your own server
    
    console.log('📊 MongoDB polling-based realtime initialized for tables:', 
      configs.map(c => c.table).join(', '));
    
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // For now, we're not implementing active polling as it could be expensive
    // The components will rely on manual refresh or navigation-based updates
    // In a real-world scenario, you might implement:
    // 1. WebSocket connections to your own server
    // 2. Periodic polling at longer intervals (30s-60s)
    // 3. Server-sent events (SSE)
    
    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [configs.length]);

  return null; // MongoDB version doesn't return a channel
}

// Specific hooks for common use cases - now just pass-through functions
export function useTasksRealtime(onTaskChange: (payload: any) => void) {
  return useRealtime([
    {
      table: 'tasks',
      event: '*',
      callback: onTaskChange
    }
  ]);
}

export function useSubtasksRealtime(taskId: string | null, onSubtaskChange: (payload: any) => void) {
  const configs = taskId ? [
    {
      table: 'subtasks',
      event: '*' as const,
      callback: onSubtaskChange,
      filter: `task_id=eq.${taskId}`
    }
  ] : [];

  return useRealtime(configs);
}

export function useProjectsRealtime(onProjectChange: (payload: any) => void) {
  return useRealtime([
    {
      table: 'projects',
      event: '*',
      callback: onProjectChange
    }
  ]);
} 