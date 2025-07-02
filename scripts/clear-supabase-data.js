import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Supabase connection
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function clearTable(tableName) {
  console.log(`🗑️  Clearing table: ${tableName}...`);
  const { error, count } = await supabase
    .from(tableName)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
  
  if (error) {
    console.error(`❌ Error clearing ${tableName}:`, error);
    return 0;
  }
  
  console.log(`✅ Cleared ${tableName}`);
  return count || 0;
}

async function main() {
  console.log('🧹 Starting Supabase data cleanup...\n');
  
  try {
    // Test Supabase connection
    const { data, error } = await supabase.from('projects').select('count').single();
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw new Error(`Failed to connect to Supabase: ${error.message}`);
    }
    console.log('✅ Connected to Supabase\n');
    
    // Clear tables in reverse order of dependencies
    console.log('📋 Clearing tables in dependency order...\n');
    
    // Clear dependent tables first
    await clearTable('push_notifications');
    await clearTable('push_subscriptions');
    await clearTable('feedback_internal_notes');
    await clearTable('feedback_responses');
    await clearTable('feedback_tickets');
    await clearTable('activity_logs');
    await clearTable('user_sessions');
    await clearTable('daily_update_settings');
    await clearTable('daily_updates');
    await clearTable('analytics');
    await clearTable('subtasks');
    await clearTable('tasks');
    await clearTable('projects');
    await clearTable('app_users');
    
    console.log('\n✅ All data cleared successfully!');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run the cleanup
main().catch(console.error); 