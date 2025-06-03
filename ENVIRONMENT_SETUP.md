# 🔧 Environment Variables Setup Guide

## 📋 **Required Environment Variables**

Copy these exact values to your environment configuration:

### **For Netlify Deployment**

Go to **Netlify Dashboard → Site Settings → Environment Variables** and add:

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

# Development Environment
NODE_ENV=development
LOG_LEVEL=debug
```

## 🧪 **Testing Configuration**

### **1. Test API Routes**

After setting environment variables, test these endpoints:

- **Health Check**: `GET /api/health`
- **Test Route**: `GET /api/test`
- **Login**: `POST /api/auth/login`

### **2. Expected Response from Test Route**

```json
{
  "success": true,
  "message": "Test API route working",
  "timestamp": "2025-01-31T13:15:00.000Z",
  "environment": {
    "nodeEnv": "production",
    "netlify": true,
    "supabaseConfigured": true,
    "jwtConfigured": true
  }
}
```

### **3. Browser Console Logs**

You should see these logs indicating successful Supabase connection:

```
🔗 [Supabase] Initializing connection...
🔗 [Supabase] URL present: true
🔗 [Supabase] Anon key present: true
🔗 [Supabase] Service key present: true
🔗 [Supabase] Running in browser environment
✅ [Supabase] Creating client with URL: https://gpgenilthxcpiwcpipns...
✅ [Supabase] Client created successfully
```

## 🚀 **Deployment Checklist**

- [ ] Environment variables added to Netlify dashboard
- [ ] Code pushed to GitHub
- [ ] Netlify deployment triggered
- [ ] Test API routes working
- [ ] Admin login working (`admin` / `admin123`)
- [ ] Supabase connection established
- [ ] Tasks and projects creation working

## 🔍 **Troubleshooting**

### **Common Issues**

1. **404 on API routes**: Environment variables not set in Netlify
2. **Supabase connection failed**: Check URL and keys are correct
3. **Login fails**: Verify JWT_SECRET is set
4. **Build fails**: Check TypeScript errors

### **Debug Steps**

1. Check `/api/test` endpoint for environment status
2. Check browser console for Supabase connection logs
3. Verify Netlify function logs in dashboard
4. Test local development with `.env.local`

## 🔐 **Security Notes**

- These keys are configured for the EyeTask Supabase project
- JWT secret is cryptographically secure (64 hex characters)
- Supabase RLS policies protect data access
- All credentials are ready for production use

---

**🎉 Ready for deployment!** All configuration values are properly integrated into the codebase with fallbacks. 