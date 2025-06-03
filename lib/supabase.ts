import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

// Supabase configuration with environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gpgenilthxcpiwcpipns.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZ2VuaWx0aHhjcGl3Y3BpcG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NTMzNTEsImV4cCI6MjA2NDUyOTM1MX0.5NcUeToWyej_UrxNKjuPSOejE1tZ1IPEDo3P838kRds';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Database types for TypeScript
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          subtitle: string | null;
          dataco_number: string;
          description: {
            main: string;
            howToExecute: string;
          };
          project_id: string;
          type: string[];
          locations: string[];
          amount_needed: number;
          target_car: string[];
          lidar: boolean;
          day_time: string[];
          priority: number;
          is_visible: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          subtitle?: string | null;
          dataco_number: string;
          description: {
            main: string;
            howToExecute: string;
          };
          project_id: string;
          type: string[];
          locations: string[];
          amount_needed?: number;
          target_car: string[];
          lidar?: boolean;
          day_time: string[];
          priority?: number;
          is_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          subtitle?: string | null;
          dataco_number?: string;
          description?: {
            main: string;
            howToExecute: string;
          };
          project_id?: string;
          type?: string[];
          locations?: string[];
          amount_needed?: number;
          target_car?: string[];
          lidar?: boolean;
          day_time?: string[];
          priority?: number;
          is_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      subtasks: {
        Row: {
          id: string;
          task_id: string;
          title: string;
          subtitle: string | null;
          image: string | null;
          dataco_number: string;
          type: 'events' | 'hours';
          amount_needed: number;
          labels: string[];
          target_car: string[];
          weather: 'Clear' | 'Fog' | 'Overcast' | 'Rain' | 'Snow' | 'Mixed' | null;
          scene: 'Highway' | 'Urban' | 'Rural' | 'Sub-Urban' | 'Test Track' | 'Mixed' | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          title: string;
          subtitle?: string | null;
          image?: string | null;
          dataco_number: string;
          type: 'events' | 'hours';
          amount_needed: number;
          labels: string[];
          target_car: string[];
          weather?: 'Clear' | 'Fog' | 'Overcast' | 'Rain' | 'Snow' | 'Mixed' | null;
          scene?: 'Highway' | 'Urban' | 'Rural' | 'Sub-Urban' | 'Test Track' | 'Mixed' | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          title?: string;
          subtitle?: string | null;
          image?: string | null;
          dataco_number?: string;
          type?: 'events' | 'hours';
          amount_needed?: number;
          labels?: string[];
          target_car?: string[];
          weather?: 'Clear' | 'Fog' | 'Overcast' | 'Rain' | 'Snow' | 'Mixed' | null;
          scene?: 'Highway' | 'Urban' | 'Rural' | 'Sub-Urban' | 'Test Track' | 'Mixed' | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      app_users: {
        Row: {
          id: string;
          username: string;
          email: string;
          password_hash: string;
          role: 'admin';
          created_at: string;
          last_login: string | null;
        };
        Insert: {
          id?: string;
          username: string;
          email: string;
          password_hash: string;
          role?: 'admin';
          created_at?: string;
          last_login?: string | null;
        };
        Update: {
          id?: string;
          username?: string;
          email?: string;
          password_hash?: string;
          role?: 'admin';
          created_at?: string;
          last_login?: string | null;
        };
      };
      analytics: {
        Row: {
          id: string;
          total_visits: number;
          unique_visitors: number;
          daily_stats: Record<string, number>;
          page_views: {
            homepage: number;
            projects: Record<string, number>;
            tasks: Record<string, number>;
            admin: number;
          };
          last_updated: string;
        };
        Insert: {
          id?: string;
          total_visits?: number;
          unique_visitors?: number;
          daily_stats?: Record<string, number>;
          page_views?: {
            homepage: number;
            projects: Record<string, number>;
            tasks: Record<string, number>;
            admin: number;
          };
          last_updated?: string;
        };
        Update: {
          id?: string;
          total_visits?: number;
          unique_visitors?: number;
          daily_stats?: Record<string, number>;
          page_views?: {
            homepage: number;
            projects: Record<string, number>;
            tasks: Record<string, number>;
            admin: number;
          };
          last_updated?: string;
        };
      };
    };
  };
}

// Helper function to handle Supabase errors
export function handleSupabaseError(error: any, context: string) {
  logger.error(`Supabase error in ${context}`, 'SUPABASE', { 
    error: error.message,
    code: error.code,
    details: error.details 
  });
  throw new Error(`Database operation failed: ${error.message}`);
}

// Service key for admin operations (should be in environment variables in production)
export const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || supabaseAnonKey; 