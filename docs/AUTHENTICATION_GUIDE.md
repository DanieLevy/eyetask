# Authentication Guide - Modern 2025 Best Practices

## Common Issues & Solutions

Based on industry best practices and common pitfalls outlined in [10 Reasons Why Push Notifications Fail](https://blog.flarelane.com/10-reasons-why-your-push-notifications-are-not-delivered-common-causes-and-solutions/) and [Web Push Notification Issues](https://darekkay.com/blog/web-push-notifications-issues/), here's how to avoid authentication errors in EyeTask.

## The Problem You Encountered

Your cache management page was making API requests without authentication headers, causing 401 errors:
```
ERROR [CACHE_API] Cache status check failed
Error: Authentication required
```

## Modern Solution: API Client Pattern

Instead of manually adding auth headers to every fetch call, use our centralized API client:

### ❌ Don't Do This:
```typescript
// Manual auth headers - error prone!
const response = await fetch('/api/admin/cache', {
  headers: {
    'Authorization': `Bearer ${token}` // Easy to forget!
  }
});
```

### ✅ Do This Instead:
```typescript
import { apiClient } from '@/lib/api-client';

// Automatic auth headers!
const data = await apiClient.get('/api/admin/cache');
const result = await apiClient.post('/api/admin/cache', { action: 'clear' });
```

## API Client Features (2025 Standards)

1. **Automatic Authentication**
   - Adds auth headers to all requests
   - Checks both admin and user tokens

2. **Error Handling**
   - Automatic retries (3x by default)
   - Timeout protection (30s default)
   - Clear error messages

3. **TypeScript Support**
   ```typescript
   const data = await apiClient.get<CacheStatus>('/api/admin/cache');
   ```

4. **Security**
   - Prevents auth token exposure
   - Automatic 401 handling
   - Token validation

## Quick Migration Guide

### Step 1: Import the API Client
```typescript
import { apiClient } from '@/lib/api-client';
```

### Step 2: Replace fetch() calls
```typescript
// Before:
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(data)
});
const result = await response.json();

// After:
const result = await apiClient.post('/api/endpoint', data);
```

### Step 3: Handle Errors
```typescript
try {
  const data = await apiClient.get('/api/data');
  // Success!
} catch (error: any) {
  if (error.status === 401) {
    // Redirect to login
    router.push('/admin');
  } else {
    // Show error message
    toast.error(error.message);
  }
}
```

## Authentication Checklist

- [ ] Use `apiClient` for all API calls
- [ ] Check `apiClient.isAuthenticated()` on protected pages
- [ ] Handle 401 errors with redirects
- [ ] Never store tokens in component state
- [ ] Use TypeScript for type safety

## Common Patterns

### Protected Page Component
```typescript
export default function AdminPage() {
  const router = useRouter();
  
  useEffect(() => {
    if (!apiClient.isAuthenticated()) {
      router.push('/admin');
    }
  }, [router]);
  
  // Your component code...
}
```

### API Call with Loading State
```typescript
const [loading, setLoading] = useState(false);

const fetchData = async () => {
  setLoading(true);
  try {
    const data = await apiClient.get('/api/data');
    // Handle success
  } catch (error: any) {
    toast.error(error.message);
  } finally {
    setLoading(false);
  }
};
```

### Public Endpoints (No Auth)
```typescript
// Skip authentication for public endpoints
const data = await apiClient.get('/api/public/data', {
  skipAuth: true
});
```

## Debugging Authentication Issues

1. **Check Browser Console**
   ```
   [API Client] Request failed: {
     status: 401,
     error: "Authentication required"
   }
   ```

2. **Verify Token Exists**
   ```typescript
   console.log('Has token:', apiClient.isAuthenticated());
   ```

3. **Check Network Tab**
   - Look for Authorization header
   - Verify token format: `Bearer <token>`

## Best Practices

1. **Centralized Auth Logic**: Use the API client for consistency
2. **Error Boundaries**: Handle auth errors at component level
3. **Token Refresh**: Implement token refresh logic (future enhancement)
4. **Secure Storage**: Tokens in localStorage (httpOnly cookies in future)
5. **Audit Logs**: Track authentication failures

## Related Issues

- [iOS Push Subscription Issues](https://dev.to/progressier/how-to-fix-ios-push-subscriptions-being-terminated-after-3-notifications-39a7)
- [Web Push Common Problems](https://darekkay.com/blog/web-push-notifications-issues/)

By following these patterns, you'll avoid the authentication errors you encountered and build a more robust application! 