# EyeTask PWA - Production Deployment Guide

## 🚀 Netlify Deployment Configuration

### Required Environment Variables

For the application to work properly in production, you **MUST** configure these environment variables in your Netlify dashboard:

#### 1. Database Configuration
```bash
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=drivershub
```

#### 2. **CRITICAL:** Authentication Configuration
```bash
# ⚠️ IMPORTANT: Set a strong, unique JWT secret for production
JWT_SECRET=your-super-secure-jwt-secret-key-here-minimum-32-characters

# Alternative variable names (the app checks all of these)
NEXTAUTH_SECRET=your-super-secure-jwt-secret-key-here-minimum-32-characters
SECRET_KEY=your-super-secure-jwt-secret-key-here-minimum-32-characters
```

#### 3. Application Configuration
```bash
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=EyeTask
NEXT_PUBLIC_APP_URL=https://your-app-name.netlify.app
NEXTAUTH_URL=https://your-app-name.netlify.app
```

#### 4. MongoDB MCP API (if using)
```bash
MDB_MCP_API_CLIENT_ID=your-client-id
MDB_MCP_API_CLIENT_SECRET=your-client-secret
```

### 🔧 How to Set Environment Variables in Netlify

1. **Go to your Netlify Dashboard**
2. **Select your site**
3. **Navigate to:** Site settings → Environment variables
4. **Add each variable** with the exact names and values above

### 🔐 JWT Secret Generation

Generate a secure JWT secret using one of these methods:

**Method 1: Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Method 2: OpenSSL**
```bash
openssl rand -hex 64
```

**Method 3: Online Generator**
Use a trusted password generator to create a 64+ character random string.

### 🚨 Common Production Issues & Solutions

#### Issue 1: Image Upload 401 Unauthorized Error
**Symptoms:** Image uploads work in development but fail with 401 in production
**Solution:** 
1. Ensure `JWT_SECRET` is properly set in Netlify environment variables
2. Make sure the secret is different from the development fallback
3. Redeploy the site after setting environment variables

#### Issue 2: Authentication Token Errors
**Symptoms:** Users can't log in or get logged out randomly
**Solution:**
1. Set a strong `JWT_SECRET` (minimum 32 characters)
2. Clear browser localStorage and try logging in again
3. Check Netlify function logs for authentication errors

#### Issue 3: Database Connection Issues
**Symptoms:** MongoDB connection timeouts or failures
**Solution:**
1. Verify `MONGODB_URI` is correctly formatted
2. Ensure your MongoDB cluster allows connections from Netlify's IP ranges
3. Check MongoDB Atlas network access settings

### 📁 File Storage in Production

The current implementation stores uploaded images in the `public/uploads/` directory. For production deployment:

1. **Static Files:** Images are stored locally in `/public/uploads/subtasks/`
2. **Backup:** Consider setting up automated backups of the uploads directory
3. **CDN:** For better performance, consider migrating to a cloud storage solution like AWS S3 or Cloudinary

### 🔍 Debug Mode

The application includes enhanced debugging for production issues:

1. **Console Logs:** Check browser console for detailed upload information
2. **API Logs:** Error responses include debug information in development mode
3. **Authentication Logs:** Server logs include detailed authentication flow information

### 🧪 Testing Production Build Locally

Before deploying, test the production build locally:

```bash
# Build the application
npm run build

# Start production server
npm start
```

Test image uploads and authentication to ensure everything works correctly.

### 📋 Pre-Deployment Checklist

- [ ] Set `JWT_SECRET` in Netlify environment variables
- [ ] Set `MONGODB_URI` with correct credentials
- [ ] Set `NODE_ENV=production`
- [ ] Set `NEXT_PUBLIC_APP_URL` to your Netlify domain
- [ ] Test production build locally
- [ ] Verify MongoDB Atlas network access settings
- [ ] Backup existing data before deployment

### 🔄 Redeployment Process

When you need to redeploy:

1. **Clear Cache:** Sometimes Netlify caches can cause issues
   - Go to Site settings → Build & deploy → Post processing
   - Clear cache and deploy
2. **Force Rebuild:** Trigger a manual deploy to ensure latest code is used
3. **Environment Variables:** Double-check all environment variables are set

### 📊 Monitoring & Maintenance

1. **Function Logs:** Monitor Netlify function logs for errors
2. **Database Performance:** Monitor MongoDB Atlas for connection and performance issues
3. **User Reports:** Set up a system to track and respond to user-reported issues

### 🆘 Troubleshooting Authentication Issues

If users experience authentication problems:

1. **Clear Browser Data:**
   ```javascript
   // Run in browser console to clear auth data
   localStorage.removeItem('adminToken');
   localStorage.removeItem('adminUser');
   location.reload();
   ```

2. **Check Environment Variables:**
   - Verify `JWT_SECRET` is set and not the fallback value
   - Ensure the secret is consistent across deployments

3. **Check Logs:**
   - Look for authentication errors in Netlify function logs
   - Check browser console for detailed error messages

### 🔒 Security Considerations

1. **JWT Secret:** Use a strong, unique secret for production
2. **Environment Variables:** Never commit secrets to version control
3. **HTTPS Only:** Ensure your production site uses HTTPS
4. **Session Management:** Consider implementing session refresh mechanisms

---

## 🎯 Quick Fix for Current Image Upload Issue

If you're experiencing image upload 401 errors right now:

1. **Go to Netlify Dashboard → Your Site → Site Settings → Environment Variables**
2. **Add this variable:**
   - Key: `JWT_SECRET`
   - Value: Generate a secure random string (64+ characters)
3. **Redeploy your site**
4. **Clear browser cache and localStorage**
5. **Log in again and test image upload**

This should resolve the authentication issue immediately.

## 🚀 Netlify Deployment

### What Was Fixed

Your app was failing on Netlify because it was using **file-based JSON storage** which doesn't work in serverless environments. Here's what we changed:

#### 1. Database Layer Abstraction
- Created `lib/database.ts` with an in-memory database that works in serverless environments
- Updated `lib/data.ts` to use the new database abstraction instead of file system operations
- All data is now stored in memory and resets with each function invocation

#### 2. Netlify Configuration
- Added `netlify.toml` with proper Next.js plugin configuration
- Updated `next.config.ts` for serverless compatibility
- Removed file system dependencies

#### 3. Build Optimizations
- Fixed TypeScript build errors
- Optimized webpack for serverless functions
- Added proper headers for API routes

### Current Limitations

⚠️ **Important**: The current setup uses **in-memory storage** which means:
- Data resets when the serverless function restarts
- No persistent storage between sessions
- Good for testing and MVP, but not for production use

### Deployment Steps

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Fix Netlify deployment with in-memory database"
   git push origin main
   ```

2. **Deploy to Netlify**:
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Connect your GitHub repository
   - Netlify will automatically detect the Next.js configuration
   - Deploy with these settings:
     - Build command: `npm run build`
     - Publish directory: `.next`

3. **Environment Variables** (if needed):
   - Add any environment variables in Netlify dashboard
   - `JWT_SECRET`: Your JWT secret key
   - `LOG_LEVEL`: Set to `info` for production

### Testing the Deployment

After deployment, test these features:
- ✅ Login to admin dashboard (`/admin`)
- ✅ Create new projects
- ✅ Create new tasks
- ✅ View public project pages

Default login credentials:
- Username: `admin`
- Password: `admin123`

## 🔧 Production Upgrade Options

For a production deployment with persistent data, consider these options:

### Option 1: External Database (Recommended)
```bash
# Install database dependencies
npm install @planetscale/database  # or
npm install @supabase/supabase-js  # or
npm install mongodb
```

### Option 2: Netlify Blob Storage
```bash
npm install @netlify/blobs
```

### Option 3: External Storage API
Use services like:
- Supabase (PostgreSQL)
- PlanetScale (MySQL)
- MongoDB Atlas
- Firebase Firestore

## 📝 Current Status

✅ **Working**:
- Authentication
- Admin dashboard
- CRUD operations for projects/tasks/subtasks
- Public project viewing
- Responsive design
- Hebrew/English font support

⚠️ **Limitations**:
- Data is not persistent (resets on function restart)
- No file uploads (images)
- No real-time updates

## 🔍 Troubleshooting

### Common Issues

1. **500 Error on API calls**:
   - Check function logs in Netlify dashboard
   - Verify all environment variables are set
   - Check if API routes are working locally first

2. **Data not persisting**:
   - This is expected with the current in-memory setup
   - Upgrade to a proper database for persistence

3. **Build failures**:
   - Check that all dependencies are in `package.json`
   - Verify Node.js version compatibility (18+)

### Debugging

Check Netlify function logs:
1. Go to your Netlify site dashboard
2. Navigate to "Functions" tab
3. Click on any function to see logs
4. Look for error messages

### Local Testing

To test the production build locally:
```bash
npm run build
npm run start
```

Visit http://localhost:3000 to test all functionality.

## 🎯 Next Steps

1. **Immediate**: Test all functionality on your deployed site
2. **Short-term**: Implement proper database storage
3. **Long-term**: Add file upload functionality for task images

Your deployment should now work correctly at: https://drivershub.netlify.app/ 