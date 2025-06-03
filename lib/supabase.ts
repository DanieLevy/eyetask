import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';
import { Database } from './database-types';

// Use environment variables or fallback to production values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gpgenilthxcpiwcpipns.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZ2VuaWx0aHhjcGl3Y3BpcG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NTMzNTEsImV4cCI6MjA2NDUyOTM1MX0.5NcUeToWyej_UrxNKjuPSOejE1tZ1IPEDo3P838kRds';

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // For server-side usage
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Test connection
export async function testSupabaseConnection() {
  const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.NETLIFY;
  
  // Skip connection test during build
  if (isBuildTime) {
    return true;
  }
  
  try {
    const { data, error } = await supabase.from('projects').select('count').limit(1);
    if (error) {
      logger.error('Supabase connection test failed', 'SUPABASE', { error: error.message });
      return false;
    }
    return true;
  } catch (error) {
    logger.error('Supabase connection test error', 'SUPABASE', undefined, error as Error);
    return false;
  }
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

// Service key for admin operations
export const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZ2VuaWx0aHhjcGl3Y3BpcG5zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk1MzM1MSwiZXhwIjoyMDY0NTI5MzUxfQ.SJe07JCxDJv4gfbmAdZUxXuBLrn92JbVcDyC5lDQ51Q'; 