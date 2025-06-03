import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

// Require environment variables - fail if not provided
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables. Please check your .env.local file.');
}

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

if (!supabaseServiceKey) {
  logger.warn('SUPABASE_SERVICE_KEY not provided - admin operations may fail', 'SUPABASE_CONFIG');
} 