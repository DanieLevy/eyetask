import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

// Get environment variables with fallbacks for production
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gpgenilthxcpiwcpipns.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZ2VuaWx0aHhjcGl3Y3BpcG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NTMzNTEsImV4cCI6MjA2NDUyOTM1MX0.5NcUeToWyej_UrxNKjuPSOejE1tZ1IPEDo3P838kRds';

// Validate that we have the required values
if (!supabaseUrl || supabaseUrl === 'your_supabase_url_here') {
  const errorMsg = 'NEXT_PUBLIC_SUPABASE_URL is not configured. Please set your Supabase URL.';
  logger.error(errorMsg, 'SUPABASE_CONFIG');
  throw new Error(errorMsg);
}

if (!supabaseAnonKey || supabaseAnonKey === 'your_anon_key_here') {
  const errorMsg = 'NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured. Please set your Supabase anon key.';
  logger.error(errorMsg, 'SUPABASE_CONFIG');
  throw new Error(errorMsg);
}

// Log configuration status (without exposing keys)
logger.info('Supabase client configuration', 'SUPABASE_CONFIG', {
  url: supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  anonKeyLength: supabaseAnonKey.length,
  environment: process.env.NODE_ENV
});

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Error handling helper
export function handleSupabaseError(error: any, operation: string) {
  const errorMessage = error?.message || error?.toString() || 'Unknown error';
  const errorCode = error?.code || 'UNKNOWN';
  const errorDetails = error?.details || error?.hint || '';
  
  logger.error(
    `Supabase ${operation} failed`,
    'SUPABASE_ERROR',
    {
      operation,
      errorCode,
      errorMessage,
      errorDetails
    },
    error
  );
}

// Test Supabase connection
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('projects').select('count').limit(1);
    
    if (error) {
      logger.error('Supabase connection test failed', 'SUPABASE_TEST', { error: error.message });
      return false;
    }
    
    logger.info('Supabase connection successful', 'SUPABASE_TEST');
    return true;
  } catch (error) {
    logger.error('Supabase connection test error', 'SUPABASE_TEST', undefined, error as Error);
    return false;
  }
}

// Service role key for admin operations (server-side only)
export const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey && process.env.NODE_ENV === 'development') {
  logger.warn('SUPABASE_SERVICE_KEY not provided - admin operations may fail', 'SUPABASE_CONFIG');
} 