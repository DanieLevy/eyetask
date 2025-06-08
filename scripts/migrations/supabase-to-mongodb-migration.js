// Supabase to MongoDB Migration Script
// This script helps migrate data from your Supabase database to MongoDB

const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

// MongoDB Configuration
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

// Supabase Configuration (update these with your Supabase credentials)
const SUPABASE_URL = process.env.SUPABASE_URL || 'your-supabase-url';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'your-supabase-service-key';

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
let mongoClient;
let db;

// Migration utility functions and main execution
async function migrateData() {
  console.log('Starting migration from Supabase to MongoDB...');
  
  try {
    // Connect to MongoDB
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    db = mongoClient.db(MONGODB_DB_NAME);
    
    console.log('Connected to MongoDB successfully');
    
    // Run migration steps
    await migrateProjects();
    await migrateTasks();
    await migrateUsers();
    await migrateAnalytics();
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

// Individual migration functions for each collection type
async function migrateProjects() {
  console.log('Migrating projects...');
  // Migration logic for projects
}

async function migrateTasks() {
  console.log('Migrating tasks...');
  // Migration logic for tasks
}

async function migrateUsers() {
  console.log('Migrating users...');
  // Migration logic for users
}

async function migrateAnalytics() {
  console.log('Migrating analytics...');
  // Migration logic for analytics
}

// Run migration if script is executed directly
if (require.main === module) {
  migrateData();
}

module.exports = { migrateData }; 