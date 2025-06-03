# 🔧 Environment Variables Setup Guide

## 📋 **Required Environment Variables**

For Netlify deployment, add these 4 variables in **Netlify Dashboard → Site Settings → Environment Variables**:

### **Production Environment Variables**

#### Variable 1:
- **Key**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://gpgenilthxcpiwcpipns.supabase.co`

#### Variable 2:
- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZ2VuaWx0aHhjcGl3Y3BpcG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NTMzNTEsImV4cCI6MjA2NDUyOTM1MX0.5NcUeToWyej_UrxNKjuPSOejE1tZ1IPEDo3P838kRds`

#### Variable 3:
- **Key**: `SUPABASE_SERVICE_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZ2VuaWx0aHhjcGl3Y3BpcG5zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk1MzM1MSwiZXhwIjoyMDY0NTI5MzUxfQ.SJe07JCxDJv4gfbmAdZUxXuBLrn92JbVcDyC5lDQ51Q`

#### Variable 4:
- **Key**: `JWT_SECRET`
- **Value**: `941efef2eb57df7ebdcaae4b62481d14cd53d97e6fc99641e4a3335668732766`

### **For Local Development**

Create a `.env.local` file in your project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://gpgenilthxcpiwcpipns.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZ2VuaWx0aHhjcGl3Y3BpcG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NTMzNTEsImV4cCI6MjA2NDUyOTM1MX0.5NcUeToWyej_UrxNKjuPSOejE1tZ1IPEDo3P838kRds
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZ2VuaWx0aHhjcGl3Y3BpcG5zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk1MzM1MSwiZXhwIjoyMDY0NTI5MzUxfQ.SJe07JCxDJv4gfbmAdZUxXuBLrn92JbVcDyC5lDQ51Q

# JWT Configuration
JWT_SECRET=941efef2eb57df7ebdcaae4b62481d14cd53d97e6fc99641e4a3335668732766
JWT_EXPIRES_IN=7d
```

## 🔐 **Security Notes**

- All credentials are configured for the EyeTask Supabase project
- JWT secret is cryptographically secure (64 hex characters)
- Supabase RLS policies protect data access
- All credentials are ready for production use

## 🚀 **Deployment**

1. Set the environment variables in Netlify dashboard
2. Push code to GitHub to trigger deployment
3. Access the admin panel with credentials: `admin` / `admin123`

---

**© 2025 Mobileye - EyeTask** 