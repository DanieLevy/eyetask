# 🛡️ Development Guidelines - Preventing Infinite Loops & Performance Issues

## 🚨 Critical Rules for Data Fetching

### ❌ **NEVER DO THIS:**

```typescript
// ❌ BAD: Including data in useCallback dependencies
const fetchData = useCallback(async () => {
  const result = await fetch('/api/data');
  setData(result);
}, [data]); // <- This creates infinite loops!

// ❌ BAD: Including function in useEffect dependencies
const fetchData = useCallback(async () => {
  // ... fetch logic
}, []);

useEffect(() => {
  fetchData();
}, [fetchData]); // <- This can cause loops!

// ❌ BAD: Rapid API calls without throttling
useEffect(() => {
  fetch('/api/data'); // Called on every render!
});
```

### ✅ **ALWAYS DO THIS:**

```typescript
// ✅ GOOD: Use safe data fetching hooks
import { useSafeDataFetching } from '@/hooks/useSafeDataFetching';

const { data, loading, error, refetch } = useSafeDataFetching('/api/data', {
  staleTime: 5 * 60 * 1000, // 5 minutes
  debugName: 'my-component-data'
});

// ✅ GOOD: Use specialized safe hooks
import { useSafeHomepageData, useSafeProjectData } from '@/hooks/useSafeDataFetching';

const { data: homepageData } = useSafeHomepageData();
const { data: projectData } = useSafeProjectData(projectName);

// ✅ GOOD: Use safe wrappers for custom hooks
import { useSafeEffect, useSafeCallback } from '@/lib/safeDataFetching';

const fetchData = useSafeCallback(async () => {
  // ... fetch logic
}, [], 'my-fetch-function');

useSafeEffect(() => {
  fetchData();
}, [], 'my-effect');
```

## 📋 Mandatory Checklist for Data Fetching

Before implementing any data fetching, check:

- [ ] **Am I using a safe data fetching hook?**
- [ ] **Are my useCallback dependencies minimal and safe?**
- [ ] **Are my useEffect dependencies free of functions that change frequently?**
- [ ] **Do I have proper throttling/debouncing for user-triggered requests?**
- [ ] **Have I tested for infinite loops in development?**
- [ ] **Is my component registered with the project guard?**

## 🔧 Required Tools and Monitoring

### 1. **Project Guard Monitor**
Add to your root layout:

```typescript
import ProjectGuardMonitor from '@/components/ProjectGuardMonitor';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <ProjectGuardMonitor />
      </body>
    </html>
  );
}
```

### 2. **Safe Data Fetching Pattern**
Replace all direct `fetch` calls with safe alternatives:

```typescript
// Instead of useOptimizedData, use:
import { useSafeDataFetching } from '@/hooks/useSafeDataFetching';

// Instead of raw fetch, use:
import { safeFetch } from '@/lib/safeDataFetching';
```

## 🎯 Component-Specific Guidelines

### Homepage Components
```typescript
// ✅ Use the specialized hook
import { useSafeHomepageData } from '@/hooks/useSafeDataFetching';

function HomePage() {
  const { data, loading, error, refetch } = useSafeHomepageData();
  // ... component logic
}
```

### Project Page Components
```typescript
// ✅ Use the specialized hook
import { useSafeProjectData } from '@/hooks/useSafeDataFetching';

function ProjectPage({ projectName }: { projectName: string }) {
  const { data, loading, error } = useSafeProjectData(projectName);
  // ... component logic
}
```

### Admin Components
```typescript
// ✅ Use safe fetching with proper configuration
import { useSafeDataFetching } from '@/hooks/useSafeDataFetching';

function AdminComponent() {
  const { data, loading, error } = useSafeDataFetching('/api/admin/data', {
    staleTime: 2 * 60 * 1000, // 2 minutes for admin data
    debugName: 'admin-component'
  });
  // ... component logic
}
```

## 🚨 Red Flags to Watch For

### Development Warnings
If you see these in console, **STOP and fix immediately**:

- `⚠️ Rapid useEffect re-execution detected`
- `⚠️ Request burst detected and blocked`
- `⚠️ Component excessive renders detected`
- `⚠️ Component excessive fetches detected`

### Browser Network Tab Patterns
- Multiple identical requests in quick succession
- Requests with timestamps very close together
- Requests that never stop coming

### Performance Indicators
- Page becomes unresponsive
- High CPU usage in dev tools
- Memory usage continuously increasing

## 🛠️ Testing Guidelines

### Manual Testing
1. **Open browser dev tools Network tab**
2. **Load the page**
3. **Wait 30 seconds**
4. **Check if requests have stopped**
5. **Refresh the page**
6. **Verify no duplicate requests**

### Automated Testing
```typescript
// Add to your test files
describe('Data Fetching', () => {
  it('should not make infinite requests', async () => {
    const { container } = render(<MyComponent />);
    
    // Wait for initial requests
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
    
    const initialCallCount = mockFetch.mock.calls.length;
    
    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Should not have made additional calls
    expect(mockFetch.mock.calls.length).toBe(initialCallCount);
  });
});
```

## 📊 Performance Monitoring

### Health Check Command
Add to package.json:
```json
{
  "scripts": {
    "health-check": "node scripts/health-check.js"
  }
}
```

### Development Dashboard
Access the project health report in development:
```typescript
import { projectGuard } from '@/lib/safeDataFetching';

// In browser console:
console.log(projectGuard.getHealthReport());
```

## 🔄 Migration Guide

### Step 1: Replace Existing Hooks
```typescript
// OLD:
import { useHomepageData } from '@/hooks/useOptimizedData';

// NEW:
import { useSafeHomepageData } from '@/hooks/useSafeDataFetching';
```

### Step 2: Fix Dependency Arrays
```typescript
// OLD:
useEffect(() => {
  fetchData();
}, [fetchData]);

// NEW:
useEffect(() => {
  fetchData();
}, []); // Remove function dependencies
```

### Step 3: Add Debug Names
```typescript
// NEW: Always add debug names for monitoring
const { data } = useSafeDataFetching('/api/data', {
  debugName: 'my-component-name'
});
```

## 🎯 Code Review Checklist

When reviewing code, ensure:

- [ ] No functions in useEffect dependency arrays
- [ ] No state setters in useCallback dependency arrays
- [ ] Safe data fetching hooks are used
- [ ] Debug names are provided
- [ ] Proper stale time configurations
- [ ] No direct fetch calls without protection

## 🆘 Emergency Response

If infinite loops are detected in production:

1. **Immediately check the health dashboard**
2. **Identify the problematic component from logs**
3. **Deploy emergency fix using circuit breaker patterns**
4. **Monitor request patterns until stable**

## 📚 Additional Resources

- [Safe Data Fetching Documentation](./lib/safeDataFetching.ts)
- [Project Guard Monitor](./components/ProjectGuardMonitor.tsx)
- [Infinite Loop Fix Summary](./INFINITE_LOOP_FIX_SUMMARY.md)

---

**Remember: Prevention is better than cure. Follow these guidelines religiously to maintain a stable, performant application.** 