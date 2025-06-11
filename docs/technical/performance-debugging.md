# Performance Debugging Guide

This document provides instructions for running the application with enhanced debug logging to help diagnose MongoDB connection and API performance issues.

## Enabling Enhanced Logging

To run the application with full debug logging enabled:

```bash
# Set the environment to development mode and enable debug logs
LOG_LEVEL=debug npm run dev
```

## What to Look For

The enhanced logging has been added to track:

1. **MongoDB Connection Issues**
   - Multiple connections being created
   - Connection pool usage and limits
   - Connection checkout failures
   - Connection time metrics

2. **API Performance**
   - Breakdown of time spent in different phases of request handling
   - Memory usage statistics
   - Query execution time
   - Response size

3. **Database Query Performance**
   - Detailed timing of aggregation pipelines
   - Data size measurements
   - Query plan information

## Interpreting the Logs

### MongoDB Connection Logs

```
[MONGODB_CONNECTION] Establishing MongoDB connection
[MONGODB_CONNECTION] MongoDB connected in 1325ms
[MONGODB_POOL] MongoDB connection pool created { maxPoolSize: 10, minPoolSize: 3, maxConnecting: 5 }
[MONGODB_CONNECTIONS] MongoDB connection pool details { poolSize: 5, checkedOut: 1, available: 4, maxPoolSize: 10, minPoolSize: 3, waitQueueSize: 0, utilizationPercentage: "10.0%" }
[MONGODB_SERVER] MongoDB server status { version: "5.0.14", connections: {...}, uptime: "72 hours", opcounters: {...} }
[MONGODB_CONNECTION] MongoDB connection established successfully
```

Look for:
- Multiple "Establishing MongoDB connection" logs for the same request
- High "utilizationPercentage" values
- Growing "poolSize" or "checkedOut" values
- "connectionPoolCleared" or "connectionCheckOutFailed" warnings

### API Performance Logs

```
[HOMEPAGE_DATA_API] Starting operation: GET /api/homepage-data
[HOMEPAGE_DATA_API] Checkpoint: start_processing
[HOMEPAGE_DATA_API] Checkpoint: before_db_query
[QUERY_PROFILE] Starting operation: getHomepageData
[DB_HOMEPAGE_DATA] Starting homepage data aggregation
[DB_HOMEPAGE_DATA] Homepage data aggregation pipeline created { pipelineStages: 4 }
[DB_HOMEPAGE_DATA] Starting parallel queries for homepage data
[DB_HOMEPAGE_DATA] Homepage data aggregation completed { projectCount: 5, taskCount: 12, aggregationTime: "1250.45ms", totalTime: "1580.23ms" }
[QUERY_PROFILE] Completed operation: getHomepageData (took 1620.87ms)
[HOMEPAGE_DATA_API] Checkpoint: after_db_query
[MEMORY_USAGE_API_MEMORY] Memory usage stats { rss: "150.25 MB", heapTotal: "100.50 MB", heapUsed: "85.75 MB" }
[HOMEPAGE_DATA_API] Checkpoint: before_response
[HOMEPAGE_DATA_API] Completed operation: GET /api/homepage-data (took 1750.36ms)
```

Look for:
- High "totalTime" values in API operations
- Slow individual checkpoints
- Growing memory usage
- Large response sizes

### Database Query Performance Logs

```
[DB_PROJECT_DATA] Starting project data retrieval for: ProjectX
[DB_PROJECT_DATA] Project lookup completed { projectName: "ProjectX", found: true, lookupTime: "250.45ms" }
[DB_PROJECT_DATA] Building tasks aggregation pipeline for project: ProjectX
[DB_PROJECT_DATA] Starting tasks aggregation for project: ProjectX { pipelineSetupTime: "15.23ms" }
[DB_PROJECT_DATA] Tasks aggregation completed { projectId: "...", taskCount: 25, aggregationTime: "8500.67ms" }
[DB_PROJECT_DATA] Project data processing completed { projectName: "ProjectX", taskCount: 25, subtaskCount: 150, processingTime: "350.89ms", totalTime: "9150.45ms" }
```

Look for:
- Which part of the query takes the most time (check breakdownPercentages)
- Tasks with many subtasks causing long processing times
- Large result sizes

## Common Performance Issues and Solutions

### Multiple MongoDB Connections

**Problem**: Each API route creates a new MongoDB connection
**Solution**: Properly reuse the existing connection from the global cache

### Slow Aggregation Queries

**Problem**: Aggregation pipelines with $lookup operations taking too long
**Solution**: 
- Add indexes for commonly queried fields
- Use more selective filters before $lookup
- Implement server-side caching

### Memory Usage Issues

**Problem**: High and growing memory usage
**Solution**:
- Reduce payload sizes by using projections
- Implement pagination
- Clean up large objects when done

## Next Steps After Gathering Data

After gathering data with enhanced logging:

1. Identify the slowest operations
2. Compare with normal usage patterns
3. Implement optimizations targeting the bottlenecks
4. Consider implementing caching for frequently accessed data
5. Consider database indexing strategy changes 