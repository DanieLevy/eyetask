# MongoDB Connection Pool Optimization

This document outlines the optimization strategy implemented to address MongoDB connection pool limits and prevent "Connections % of configured limit has gone above 80" alerts.

## Problem Statement

Our application was hitting MongoDB connection limits in production, resulting in alerts about connections exceeding 80% of the configured limit. This issue was occurring with approximately 10 concurrent users, indicating inefficient connection management.

## Implemented Solution

### 1. Connection Pooling Optimization

We've implemented the following connection pool settings in `lib/mongodb.ts`:

```javascript
const CONNECTION_OPTIONS: MongoClientOptions = {
  maxPoolSize: 10,      // Limit max connections to avoid hitting limits
  minPoolSize: 3,       // Keep a minimum number of connections open for faster response
  connectTimeoutMS: 10000,  // 10 seconds connection timeout
  socketTimeoutMS: 45000,   // 45 seconds socket timeout for operations
  waitQueueTimeoutMS: 5000, // 5 seconds max wait time for connection from pool
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
};
```

These settings are optimized for a small team (around 10 users) with high reliability needs.

### 2. Singleton Connection Management

We've enhanced the MongoDB connection mechanism to properly maintain a singleton connection:

- Global caching of the MongoDB client
- Preventing duplicate connection attempts
- Proper connection waiting mechanism if a connection is already being established
- Comprehensive error handling

### 3. Connection Monitoring

We've implemented continuous connection monitoring:

- Real-time tracking of connection utilization
- Alerts when connection usage exceeds thresholds (70% warning, 85% critical)
- Automatic stats logging to help identify issues
- Enhanced health check endpoint that includes connection statistics

## Usage Instructions

### Health Check Endpoint

Monitor connection statistics using the health check endpoint:

```
GET /api/health
```

Example response:
```json
{
  "status": "OK",
  "timestamp": "2023-09-14T12:34:56.789Z",
  "uptime": {
    "seconds": 3600,
    "formatted": "1h 0m 0s"
  },
  "memory": {
    "rss": "120.45 MB",
    "heapTotal": "80.20 MB",
    "heapUsed": "65.10 MB",
    "external": "15.25 MB"
  },
  "database": {
    "connected": true,
    "connectionType": "MongoDB Atlas",
    "connectionPool": {
      "current": 8,
      "available": 92,
      "total": 100,
      "percentUsed": "8.0%",
      "status": "OK"
    }
  },
  "responseTime": "45ms"
}
```

### Connection Monitoring Service

The application automatically starts monitoring connections when the health check endpoint is accessed. You can also manually interact with the connection monitor:

```typescript
import { connectionMonitor } from '@/lib/services/connectionMonitor';

// Start monitoring
connectionMonitor.startMonitoring();

// Check current connection status
const stats = await connectionMonitor.checkConnections();
console.log(stats);

// Stop monitoring
connectionMonitor.stopMonitoring();
```

## Best Practices for Developers

1. **Never create new MongoDB clients** - Always use the singleton pattern via `connectToDatabase()`
2. **Close connections when appropriate** - In serverless functions or scripts, disconnect when done
3. **Use connection timeouts properly** - Set reasonable timeouts for operations
4. **Monitor health endpoint** - Check connection stats regularly

## Advanced Configuration

You can adjust the connection pooling settings in `lib/mongodb.ts` based on your specific requirements:

- **maxPoolSize**: Maximum number of connections created by this client. Default is 10.
- **minPoolSize**: Minimum number of connections to maintain in the pool. Default is 3.
- **connectTimeoutMS**: How long to wait for initial connection. Default is 10000 (10 seconds).
- **socketTimeoutMS**: How long to wait for socket operations. Default is 45000 (45 seconds).
- **waitQueueTimeoutMS**: How long to wait for a connection from the pool. Default is 5000 (5 seconds).

## Troubleshooting

### High Connection Usage

If you're seeing high connection usage:

1. Check for leaked connections (connections not being released)
2. Look for rapid creation/destruction of connections
3. Consider increasing `maxPoolSize` if your MongoDB plan allows it
4. Implement rate limiting if necessary

### Slow Operations

If operations are timing out:

1. Increase `socketTimeoutMS` for long-running operations
2. Optimize slow database queries
3. Consider adding indexes to frequently queried fields

## Performance Implications

The optimized connection pool provides:

- **Better scalability**: More efficient use of available connections
- **Increased stability**: Prevents connection limit errors
- **Improved reliability**: Better handling of connection issues
- **Enhanced monitoring**: Early detection of potential problems

These improvements ensure the application remains stable and responsive, even under load.

## Next Steps

Consider implementing:

1. **Connection load balancing** - For multiple database servers
2. **Smart retry mechanisms** - For transient connection issues
3. **Connection profiling** - To identify slow operations
4. **Circuit breakers** - To prevent cascading failures 