# Scripts Directory

This directory contains utility scripts for the EyeTask application.

## Available Scripts

### 1. JWT Secret Generator
```bash
node generate-jwt-secret.js
```
Generates a secure JWT secret for authentication.

### 2. VAPID Keys Generator
```bash
node generate-vapid-keys.js
```
Generates VAPID keys for push notifications.

### 3. MongoDB Connection Check
```bash
node dev/check-mongodb.js
```
Tests the MongoDB connection and lists available collections.

### 4. Analytics Migration
```bash
node dev/migrate-analytics.js
```
Migrates analytics data structure in MongoDB.

### 5. MongoDB to Supabase Migration
```bash
# First install dependencies
cd scripts
npm install

# Run the migration
npm run migrate
# or
node migrate-mongodb-to-supabase.js
```

Migrates all data from MongoDB to Supabase. This script:
- Connects to both MongoDB and Supabase using credentials from `.env.local`
- Migrates all collections in the correct order (respecting foreign key dependencies)
- Tracks already migrated data using `mongodb_id` to avoid duplicates
- Handles data transformation and relationship mapping
- Provides detailed progress logging

**Collections migrated:**
- app_users
- projects
- tasks
- subtasks
- analytics
- daily_updates
- daily_update_settings
- user_sessions
- activity_logs
- feedback_tickets (including responses and internal notes)
- push_subscriptions
- push_notifications

**Important:** This script does NOT delete any data from MongoDB - it only copies to Supabase.

## Development Scripts

Scripts in the `dev/` subdirectory are for development and testing purposes.

## Production Scripts

### generate-vapid-keys.js
Generates VAPID keys for web push notifications. Run this when setting up push notifications for the first time.

```bash
node scripts/generate-vapid-keys.js
```

### generate-jwt-secret.js
Generates a secure JWT secret for authentication. Use this when deploying to production.

```bash
node scripts/generate-jwt-secret.js
```

## Development Scripts (in `dev/` subfolder)

### dev/check-mongodb.js
Utility to check MongoDB connection and inspect collections. Useful for debugging database issues.

```bash
node scripts/dev/check-mongodb.js
```

### dev/migrate-analytics.js
One-time migration script for analytics data structure. Only needed when migrating from old analytics format.

```bash
node scripts/dev/migrate-analytics.js
```

## Notes

- Always set proper environment variables before running these scripts
- Production scripts should be run with care as they generate sensitive keys
- Development scripts are for debugging and migration purposes only 