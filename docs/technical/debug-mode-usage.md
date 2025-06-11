# Debug Mode Usage Guide

This document provides instructions on how to run the application with enhanced debugging capabilities to diagnose performance issues.

## Available Debug Methods

### 1. Direct Debug Mode

The simplest approach - uses cross-env to set LOG_LEVEL to debug:

```bash
npm run debug
```

This will:
- Set LOG_LEVEL to debug
- Run Next.js in development mode
- Output enhanced logs to the console

**Best for:** Quick debugging sessions, immediate visibility of issues.

### 2. Advanced Debug Mode with Logging

Run with full debug capabilities including log file output:

```bash
npm run dev:debug
```

This will:
- Set LOG_LEVEL to debug
- Run Next.js in development mode
- Save all output to a timestamped log file in the `logs` directory
- Display output in the console with timestamps

**Best for:** Thorough debugging sessions, preserving logs for later analysis.

### 3. Manual Environment Variables

For custom configurations:

```bash
# Windows CMD
set LOG_LEVEL=debug && npm run dev

# Windows PowerShell
$env:LOG_LEVEL="debug"; npm run dev

# Linux/macOS
LOG_LEVEL=debug npm run dev
```

**Best for:** Custom debugging needs.

## Log File Location

When using `npm run dev:debug`, logs are saved to:

```
logs/performance-debug-[TIMESTAMP].log
```

## What To Look For

After running in debug mode, analyze the logs for:

1. **MongoDB Connection Issues**
   - Multiple connections created for the same request
   - Connection pool statistics
   - Connection checkout failures

2. **API Performance**
   - Request timing breakdowns
   - Memory usage 
   - Response sizes

3. **Database Query Performance**
   - Individual query timing
   - Aggregation pipeline performance
   - Data size measurements

## Example Debug Output

### MongoDB Connection

```
[MONGODB_CONNECTION] Starting operation: connectToDatabase
[MONGODB_CONNECTION] Checkpoint: connection_start
[MONGODB_CONNECTION] MongoDB connected in 1325ms
[MONGODB_POOL] MongoDB connection pool created { maxPoolSize: 10, minPoolSize: 3, maxConnecting: 5 }
[MONGODB_CONNECTIONS] MongoDB connection pool details { poolSize: 5, checkedOut: 1, available: 4, maxPoolSize: 10, minPoolSize: 3, waitQueueSize: 0, utilizationPercentage: "10.0%" }
```

### API Request Timing

```
[HOMEPAGE_DATA_API] Starting operation: GET /api/homepage-data
[HOMEPAGE_DATA_API] Checkpoint: start_processing
[HOMEPAGE_DATA_API] Checkpoint: before_db_query
[HOMEPAGE_DATA_API] Checkpoint: after_db_query (took 1620.87ms)
[HOMEPAGE_DATA_API] Completed operation: GET /api/homepage-data (took 1750.36ms)
```

### Memory Usage

```
[MEMORY_USAGE] Memory usage stats { rss: "150.25 MB", heapTotal: "100.50 MB", heapUsed: "85.75 MB" }
```

## Next Steps

After gathering debug data:

1. Review the logs for patterns and bottlenecks
2. Identify the root causes of performance issues
3. Implement optimizations based on findings
4. Re-run in debug mode to verify improvements 