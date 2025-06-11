# Performance Debugging Tools

This document describes the enhanced performance debugging tools added to help diagnose MongoDB connection and API performance issues.

## Overview of Changes

We've added detailed performance monitoring capabilities to:

1. **MongoDB Connection Handling**
   - Track connection pooling stats
   - Monitor connection reuse
   - Log connection checkout and pool events
   - Track connection lifetimes
   
2. **API Request Performance**
   - Checkpoint-based request profiling
   - Request timing breakdowns
   - Response size monitoring
   
3. **Database Query Performance**
   - Per-stage query timing
   - Detailed aggregation pipeline monitoring
   - Data size tracking

## How to Use the Debug Tools

### Running the Debug Server

```bash
# Use the NPM script to run with enhanced logging
npm run dev:debug

# This will start the server with debug logging and save output to a timestamped file in the logs directory
```

### What Data Will Be Collected

The debug mode will collect:

- MongoDB connection pool statistics
- Detailed timing of database operations
- Memory usage statistics
- API request/response timing
- Database query execution metrics

### Analyzing the Results

After gathering data in debug mode:

1. Review the logs for patterns of poor performance
2. Look for the specific phases where most time is spent
3. Identify any connection pooling issues
4. Check for memory leaks or excessive memory usage
5. Note any queries that are particularly slow

## Next Steps for Optimization

Based on the debug data, likely optimizations include:

1. **MongoDB Connection Pooling**
   - Ensure connections are properly reused
   - Adjust pool size settings if needed
   - Add monitoring for connection limit issues

2. **Query Optimization**
   - Add indexes for frequently queried fields
   - Use more selective filters in aggregation pipelines
   - Consider restructuring complex queries

3. **Caching Implementation**
   - Add server-side caching for frequent queries
   - Implement stale-while-revalidate strategies
   - Use memory caching for high-frequency, low-change data

4. **API Route Optimization**
   - Combine multiple data fetches into single optimized endpoints
   - Use pagination for large result sets
   - Optimize payload sizes with field selection

## Further Documentation

For more detailed information, see:

- [Performance Debugging Guide](./performance-debugging.md) - How to interpret the logs
- [MongoDB Connection Optimization](./mongodb-connection-optimization.md) - Guide to MongoDB connection improvements
- [API Performance Optimization](./api-performance-optimization.md) - Strategies for API performance

## Script Files Added

- `lib/enhanced-logging.ts` - Core logging utilities
- `scripts/debug-performance.js` - Script to run server with debug logging

## Changes to Existing Files

- `lib/mongodb.ts` - Enhanced connection tracking
- `lib/database.ts` - Added detailed query profiling
- `app/api/homepage-data/route.ts` - Added performance tracking
- `app/api/project-data/[projectName]/route.ts` - Added performance tracking 