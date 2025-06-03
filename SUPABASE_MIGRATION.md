# Supabase Migration Documentation

## Overview
This document outlines the migration from local JSON file storage to Supabase cloud database for the EyeTask application.

## Environment Setup

### Environment Variables Required:
```env
NEXT_PUBLIC_SUPABASE_URL=[Your Supabase project URL]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Your Supabase anonymous key]
SUPABASE_SERVICE_KEY=[Your Supabase service role key]
```

**Security Note**: Never commit these values to version control. Use environment variables only.

## Database Schema

### Tables Created:

1. **projects**
   - `id` (uuid, primary key)
   - `name` (text, not null)
   - `description` (text, nullable)
   - `created_at` (timestamp with timezone)
   - `updated_at` (timestamp with timezone)

2. **tasks**
   - `id` (uuid, primary key)
   - `title` (text, not null)
   - `subtitle` (text, nullable)
   - `dataco_number` (text, nullable)
   - `description` (text, nullable)
   - `project_id` (uuid, foreign key)
   - `type` (text, nullable)
   - `locations` (text[], array)
   - `amount_needed` (numeric, not null, default 0)
   - `target_car` (text, nullable)
   - `lidar` (text, nullable)
   - `day_time` (text, nullable)
   - `priority` (text, nullable)
   - `is_visible` (boolean, default true)
   - `created_at` (timestamp with timezone)
   - `updated_at` (timestamp with timezone)

3. **subtasks**
   - `id` (uuid, primary key)
   - `task_id` (uuid, foreign key, not null)
   - `title` (text, not null)
   - `subtitle` (text, nullable)
   - `image` (text, nullable)
   - `dataco_number` (text, nullable)
   - `type` (text, nullable)
   - `amount_needed` (numeric, not null, default 0)
   - `labels` (text[], array)
   - `target_car` (text, nullable)
   - `weather` (text, nullable)
   - `scene` (text, nullable)
   - `created_at` (timestamp with timezone)
   - `updated_at` (timestamp with timezone)

4. **analytics**
   - `id` (uuid, primary key)
   - `total_visits` (integer, default 0)
   - `unique_visitors` (integer, default 0)
   - `daily_stats` (jsonb, default '{}')
   - `page_views` (jsonb, default '{}')
   - `last_updated` (timestamp with timezone)

5. **app_users** (legacy - replaced by Supabase Auth)
   - `id` (uuid, primary key)
   - `username` (text, unique, not null)
   - `email` (text, unique, not null)
   - `password_hash` (text, not null)
   - `role` (text, default 'user')
   - `created_at` (timestamp with timezone)
   - `last_login` (timestamp with timezone)

## Authentication Migration

### New Supabase Auth System:
- Uses Supabase's built-in authentication
- Admin user with real email address
- JWT tokens managed by Supabase
- User metadata for username and role

### Admin Credentials:
- Username: admin
- Password: admin123
- Email: [Real email address used for setup]

## API Changes

### Database Integration:
- All CRUD operations now use Supabase client
- Error handling with proper Supabase error codes
- Transaction support for complex operations
- Real-time subscriptions available

### Authentication:
- JWT token validation through Supabase
- Session management
- Role-based access control
- Secure password hashing

## Security Features

### Row Level Security (RLS):
- Enabled on all tables
- Admin-only access policies
- Secure API endpoints

### Environment Security:
- All sensitive data in environment variables
- No hardcoded credentials
- Production-ready configuration

## Migration Steps Completed

1. ✅ Created Supabase project
2. ✅ Set up database schema
3. ✅ Implemented database layer
4. ✅ Updated API routes
5. ✅ Migrated existing data
6. ✅ Set up authentication
7. ✅ Configured environment variables
8. ✅ Deployed to production

## Next Steps

1. Monitor performance and errors
2. Optimize queries if needed
3. Set up database backups
4. Consider adding more authentication methods

## Resources

- **Supabase Documentation**: https://supabase.com/docs
- **Next.js Integration**: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs

## Troubleshooting

### Common Issues:
1. **Environment Variables**: Ensure all required env vars are set
2. **Database Connection**: Check Supabase URL and keys
3. **Authentication**: Verify user setup in Supabase Auth
4. **CORS Issues**: Configure allowed origins in Supabase

### Debug Steps:
1. Check Supabase dashboard for errors
2. Review application logs
3. Verify environment variables
4. Test database connection 