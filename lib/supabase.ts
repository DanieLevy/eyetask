import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';
import { readFileSync } from 'fs';
import { join } from 'path';

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

// Function to load service key from multiple sources - IMPROVED
function loadServiceKey(): string | undefined {
  // Try environment variable first
  let serviceKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (serviceKey && serviceKey.trim().length > 0) {
    logger.debug('Service key loaded from environment variable', 'SUPABASE_CONFIG', {
      keyLength: serviceKey.length,
      environment: process.env.NODE_ENV
    });
    return serviceKey.trim();
  }

  // For development, try reading from .env.local file directly
  if (process.env.NODE_ENV === 'development') {
    try {
      const envPath = join(process.cwd(), '.env.local');
      const envContent = readFileSync(envPath, 'utf-8');
      
      // More robust parsing for multi-line service key values
      const lines = envContent.split('\n');
      let serviceKeyLine = '';
      let inServiceKey = false;
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('SUPABASE_SERVICE_KEY=')) {
          inServiceKey = true;
          serviceKeyLine = trimmedLine.replace('SUPABASE_SERVICE_KEY=', '');
          
          // If the key is complete on one line, break
          if (serviceKeyLine && !trimmedLine.endsWith('\\')) {
            break;
          }
        } else if (inServiceKey && trimmedLine && !trimmedLine.includes('=')) {
          serviceKeyLine += trimmedLine;
        } else if (inServiceKey && (trimmedLine.includes('=') || !trimmedLine)) {
          break;
        }
      }
      
      if (serviceKeyLine && serviceKeyLine.trim().length > 0) {
        serviceKey = serviceKeyLine.trim();
        logger.debug('Service key loaded from .env.local file', 'SUPABASE_CONFIG', {
          keyLength: serviceKey.length,
          filePath: envPath
        });
        return serviceKey;
      } else {
        logger.warn('SUPABASE_SERVICE_KEY found in .env.local but appears empty', 'SUPABASE_CONFIG');
      }
    } catch (error) {
      logger.warn('Could not read .env.local file', 'SUPABASE_CONFIG', { error: (error as Error).message });
    }
  }

  // If we're in development and still no service key, this is a problem
  if (process.env.NODE_ENV === 'development') {
    logger.error('No SUPABASE_SERVICE_KEY found in development environment', 'SUPABASE_CONFIG', {
      envVarExists: !!process.env.SUPABASE_SERVICE_KEY,
      envVarLength: process.env.SUPABASE_SERVICE_KEY?.length || 0
    });
  }

  return undefined;
}

// Service role key for admin operations (server-side only)
export const supabaseServiceKey = loadServiceKey();

// Enhanced validation and logging
if (!supabaseServiceKey) {
  if (process.env.NODE_ENV === 'development') {
    logger.error('SUPABASE_SERVICE_KEY not available - admin operations will fail', 'SUPABASE_CONFIG', {
      environment: process.env.NODE_ENV,
      hasEnvVar: !!process.env.SUPABASE_SERVICE_KEY,
      envVarLength: process.env.SUPABASE_SERVICE_KEY?.length || 0
    });
  } else {
    logger.warn('SUPABASE_SERVICE_KEY not provided in production', 'SUPABASE_CONFIG');
  }
} else {
  logger.info('Service key loaded successfully', 'SUPABASE_CONFIG', {
    keyLength: supabaseServiceKey.length,
    environment: process.env.NODE_ENV
  });
}

// Create an admin client for server-side operations - IMPROVED
export function createAdminClient(): SupabaseClient {
  if (!supabaseServiceKey) {
    logger.error('Cannot create admin client - no service key available', 'SUPABASE_CONFIG');
    // Return regular client as fallback, but log the issue
    logger.warn('Falling back to regular client - operations may fail due to RLS policies', 'SUPABASE_CONFIG');
    return supabase;
  }
  
  try {
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    logger.debug('Admin client created successfully', 'SUPABASE_CONFIG');
    return adminClient;
  } catch (error) {
    logger.error('Failed to create admin client', 'SUPABASE_CONFIG', undefined, error as Error);
    return supabase; // Fallback to regular client
  }
}

// Create an authenticated client with user session
export async function createAuthenticatedClient(accessToken: string): Promise<SupabaseClient> {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  return client;
}

// Helper to get the appropriate client for operations
export async function getSupabaseClient(adminOperation = false, accessToken?: string): Promise<SupabaseClient> {
  if (adminOperation && supabaseServiceKey) {
    return createAdminClient();
  }
  
  if (accessToken) {
    return await createAuthenticatedClient(accessToken);
  }
  
  return supabase;
}

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