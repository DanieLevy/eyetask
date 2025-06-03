import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gpgenilthxcpiwcpipns.supabase.co';

// Function to load service key - SERVER SIDE ONLY
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
      const fs = require('fs');
      const path = require('path');
      
      const envPath = path.join(process.cwd(), '.env.local');
      const envContent = fs.readFileSync(envPath, 'utf-8');
      
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

// Create an admin client for server-side operations
export function createAdminClient(): SupabaseClient {
  if (!supabaseServiceKey) {
    throw new Error('Cannot create admin client - no service key available');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
} 