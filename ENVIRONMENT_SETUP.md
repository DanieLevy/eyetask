# Environment Setup Guide

This document outlines the environment variables and configuration needed for the Drivers Hub application.

## Required Environment Variables

### Supabase Configuration

- **Key**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: Your Supabase project URL
- **Description**: Public URL for your Supabase project

- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: Your Supabase anonymous/public key
- **Description**: Public key for client-side Supabase operations

- **Key**: `SUPABASE_SERVICE_KEY`
- **Value**: Your Supabase service role key
- **Description**: Service role key for admin operations (server-side only)

## Setup Instructions

### 1. Local Development

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here
```

### 2. Production Deployment (Netlify)

Add the environment variables to your Netlify dashboard:
1. Go to Site settings → Environment variables
2. Add each variable with its corresponding value

## Security Notes

- **Never commit API keys to version control**
- The anon key is safe to expose in client-side code
- The service key should only be used server-side
- All keys should be stored as environment variables
- Regenerate keys if they are accidentally exposed

## Getting Your Supabase Keys

1. Visit your Supabase dashboard
2. Go to Settings → API
3. Copy the URL and keys to your environment variables

---

**© 2025 Mobileye - Drivers Hub** 