import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseAnonKey) {
  logger.error('Missing Supabase configuration', 'SUPABASE', {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey
  });
  throw new Error('Missing Supabase configuration');
}

// Create Supabase client for client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Application-Name': 'EyeTask'
    }
  }
});

// Create Supabase admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public'
      }
    })
  : null;

// Connection status checker
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('projects').select('count').limit(0);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is fine
      logger.error('Supabase connection check failed', 'SUPABASE', { error: error.message });
      return false;
    }
    
    logger.info('Supabase connection successful', 'SUPABASE');
    return true;
  } catch (error) {
    logger.error('Supabase connection error', 'SUPABASE', { error: (error as Error).message });
    return false;
  }
}

// Helper to get the appropriate client based on context
export function getSupabaseClient(requireAdmin: boolean = false) {
  if (requireAdmin && supabaseAdmin) {
    return supabaseAdmin;
  }
  return supabase;
}

// Type exports for Supabase database
export type Database = {
  public: {
    Tables: {
      app_users: {
        Row: {
          id: string;
          username: string;
          email: string;
          password_hash: string;
          role: 'admin' | 'data_manager' | 'driver_manager';
          is_active: boolean;
          last_login: string | null;
          created_by: string | null;
          last_modified_by: string | null;
          last_modified_at: string | null;
          created_at: string;
          updated_at: string;
          mongodb_id: string | null;
        };
        Insert: Omit<Database['public']['Tables']['app_users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['app_users']['Insert']>;
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          color: string | null;
          priority: number;
          client_name: string | null;
          client_email: string | null;
          client_phone: string | null;
          notes: string | null;
          image: string | null;
          created_at: string;
          updated_at: string;
          mongodb_id: string | null;
        };
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['projects']['Insert']>;
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          subtitle: string | null;
          images: string[] | null;
          dataco_number: string;
          description: Record<string, any>;
          type: string[] | null;
          locations: string[] | null;
          amount_needed: number | null;
          target_car: string[] | null;
          lidar: boolean;
          day_time: string[] | null;
          priority: number;
          is_visible: boolean;
          created_at: string;
          updated_at: string;
          mongodb_id: string | null;
        };
        Insert: Omit<Database['public']['Tables']['tasks']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>;
      };
      subtasks: {
        Row: {
          id: string;
          task_id: string;
          title: string;
          subtitle: string | null;
          images: string[] | null;
          dataco_number: string;
          type: 'events' | 'hours';
          amount_needed: number | null;
          labels: string[] | null;
          target_car: string[] | null;
          weather: 'Clear' | 'Fog' | 'Overcast' | 'Rain' | 'Snow' | 'Mixed' | null;
          scene: 'Highway' | 'Urban' | 'Rural' | 'Sub-Urban' | 'Test Track' | 'Mixed' | null;
          day_time: string[] | null;
          is_visible: boolean;
          created_at: string;
          updated_at: string;
          mongodb_id: string | null;
        };
        Insert: Omit<Database['public']['Tables']['subtasks']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['subtasks']['Insert']>;
      };
      analytics: {
        Row: {
          id: string;
          visits: Record<string, any>;
          unique_visitors: Record<string, any>;
          daily_stats: Record<string, any>;
          counters: Record<string, any>;
          last_updated: string;
          created_at: string;
          updated_at: string;
          mongodb_id: string | null;
        };
        Insert: Omit<Database['public']['Tables']['analytics']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['analytics']['Insert']>;
      };
      // Additional tables to be typed as needed...
    };
  };
};

// Helper function to create ObjectId-compatible strings
export function createObjectId(str?: string): string {
  // For Supabase, we use UUID format instead of MongoDB ObjectIds
  if (str) {
    // If it's already a valid UUID, return it
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(str)) {
      return str;
    }
    // Otherwise, return the string as-is (for compatibility)
    return str;
  }
  
  // Generate a new UUID if no string provided
  return crypto.randomUUID();
} 