import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';
import { Database } from './database-types';

// Debug environment variables
console.log('🔗 [Supabase] Initializing connection...');
console.log('🔗 [Supabase] URL present:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('🔗 [Supabase] Anon key present:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
console.log('🔗 [Supabase] Service key present:', !!process.env.SUPABASE_SERVICE_KEY);

if (typeof window !== 'undefined') {
  console.log('🔗 [Supabase] Running in browser environment');
} else {
  console.log('🔗 [Supabase] Running in server environment');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Only throw error at runtime, not build time
const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.NETLIFY;
if (!isBuildTime && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
  console.error('❌ [Supabase] Missing environment variables!');
  console.error('❌ [Supabase] URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Present' : 'Missing');
  console.error('❌ [Supabase] Anon key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Present' : 'Missing');
  throw new Error('Missing Supabase environment variables');
}

console.log('✅ [Supabase] Creating client with URL:', supabaseUrl.substring(0, 30) + '...');

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

console.log('✅ [Supabase] Client created successfully');

// Test connection
export async function testSupabaseConnection() {
  console.log('🧪 [Supabase] Testing connection...');
  
  // Skip connection test during build
  if (isBuildTime) {
    console.log('⏭️ [Supabase] Skipping connection test during build');
    return true;
  }
  
  try {
    const { data, error } = await supabase.from('projects').select('count').limit(1);
    if (error) {
      console.error('❌ [Supabase] Connection test failed:', error.message);
      return false;
    }
    console.log('✅ [Supabase] Connection test successful');
    return true;
  } catch (error) {
    console.error('❌ [Supabase] Connection test error:', error);
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

// Service key for admin operations (should be in environment variables in production)
export const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || supabaseAnonKey; 