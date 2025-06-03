import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeConfig {
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  callback: (payload: any) => void;
  filter?: string; // Optional filter like "taskId=eq.123"
}

export function useRealtime(configs: RealtimeConfig[]) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Create a unique channel name based on the configs
    const channelName = `realtime-${configs.map(c => `${c.table}-${c.event}`).join('-')}-${Date.now()}`;
    
    // Create the realtime channel
    const channel = supabase.channel(channelName);

    // Subscribe to each table/event combination
    configs.forEach((config) => {
      const { table, event, callback, filter } = config;
      
      if (event === '*') {
        // Listen to all events
        channel
          .on(
            'postgres_changes' as any,
            {
              event: 'INSERT',
              schema: 'public',
              table: table,
              filter: filter
            },
            callback
          )
          .on(
            'postgres_changes' as any,
            {
              event: 'UPDATE',
              schema: 'public',
              table: table,
              filter: filter
            },
            callback
          )
          .on(
            'postgres_changes' as any,
            {
              event: 'DELETE',
              schema: 'public',
              table: table,
              filter: filter
            },
            callback
          );
      } else {
        // Listen to specific event
        channel.on(
          'postgres_changes' as any,
          {
            event: event,
            schema: 'public',
            table: table,
            filter: filter
          },
          callback
        );
      }
    });

    // Subscribe to the channel
    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('❌ Realtime subscription error');
      } else if (status === 'TIMED_OUT') {
        console.error('⏰ Realtime subscription timed out');
      }
    });

    channelRef.current = channel;

    // Cleanup function
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [configs.length]); // Re-run if number of configs changes

  return channelRef.current;
}

// Specific hooks for common use cases
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