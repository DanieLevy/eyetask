# Performance Monitoring System

This document outlines the architecture and implementation of the performance monitoring system integrated into the application.

## Overview

The performance monitoring system provides real-time insights into application health, memory usage, and database connection efficiency. It consists of several interconnected components that work together to track, analyze, and present performance metrics, along with automated recovery mechanisms.

## Key Components

### 1. Memory Monitoring (`lib/memory-monitor.ts`)

This module tracks and analyzes memory usage patterns with the following features:
- **Real-time memory usage tracking** - Monitors RSS, heap usage, and arrayBuffers
- **Memory leak detection** - Analyzes growth patterns to identify potential memory leaks
- **Risk score calculation** - Quantifies memory leak risk based on multiple factors
- **Automatic recovery** - Triggers garbage collection and cache clearing when needed
- **Detailed metrics** - Provides comprehensive memory usage statistics and trends

### 2. Connection Monitoring (`lib/services/connectionMonitor.ts`)

This service monitors MongoDB connection health:
- **Connection pool statistics** - Tracks active, available, and total connections
- **Adaptive monitoring** - Falls back to client-side estimation when admin privileges aren't available
- **Usage trend analysis** - Monitors connection patterns over time
- **Threshold alerts** - Warns when connection usage exceeds defined thresholds
- **Idle connection management** - Releases idle connections when pool is stressed

### 3. Centralized Monitoring (`lib/services/monitoringService.ts`)

Coordinates the monitoring subsystems:
- **System health aggregation** - Combines metrics from multiple sources
- **Periodic health checks** - Runs automated system status checks
- **Capability detection** - Identifies available monitoring capabilities
- **Status reporting** - Provides unified health status reporting

### 4. Enhanced Logging (`lib/enhanced-logging.ts`)

Provides detailed logging for performance analysis:
- **Structured logging** - Organizes logs in a consistent, parseable format
- **Performance tracking** - Records operation durations and checkpoints
- **Context enrichment** - Adds relevant context to log entries
- **Targeted categories** - Separates logs by functional area

### 5. Health API (`app/api/health/route.ts`)

REST endpoint that exposes health metrics:
- **Comprehensive reporting** - Returns detailed system health information
- **MongoDB status** - Reports on database connectivity and connection pool
- **Memory metrics** - Provides current memory usage and leak risk assessment
- **Response timing** - Includes API response time measurements

### 6. Memory Recovery API (`app/api/health/gc/route.ts`)

API endpoint for manual memory recovery:
- **Garbage collection** - Triggers garbage collection when available
- **Cache clearing** - Clears application caches to free memory
- **Recovery metrics** - Reports on memory reclaimed during recovery

### 7. Monitoring Dashboard (`app/admin/performance-monitoring/page.tsx`)

Visual interface for monitoring system health:
- **Real-time updates** - Refreshes data automatically
- **Key metric visualization** - Presents important metrics in an easy-to-read format
- **Status indicators** - Shows system health status visually
- **Memory, connection, and response time tabs** - Organizes metrics by category
- **Memory-efficient design** - Implements techniques to avoid contributing to memory issues

## Implementation Details

### Memory Leak Prevention

The monitoring system is designed to be lightweight and avoid contributing to performance issues:
- **Controlled refresh rate** - Limits data fetching to reasonable intervals
- **Request abortion** - Cancels in-flight requests when new ones are started
- **Cache control headers** - Prevents response caching
- **Cleanup on unmount** - Properly releases resources when components unmount
- **Manual garbage collection** - Periodically triggers garbage collection

### Connection Pool Optimization

The MongoDB connection handling includes several optimizations:
- **Connection reuse** - Maximizes connection reuse to avoid cycling
- **Heartbeat mechanism** - Keeps important connections alive
- **Idle timeout management** - Configured to avoid premature connection closure
- **Operation tracking** - Carefully tracks pending operations to prevent premature release
- **Pool size configuration** - Optimized pool size based on application needs

### Error Handling and Resilience

The monitoring system gracefully handles various failure scenarios:
- **Permission limitations** - Works without admin database privileges
- **Network issues** - Handles connection problems gracefully
- **Memory pressure** - Implements recovery strategies under high memory conditions
- **Missing capabilities** - Adapts based on available system capabilities

## Usage

### Accessing the Monitoring Dashboard

The monitoring dashboard is available at `/admin/performance-monitoring` and requires admin login.

### API Endpoints

- `GET /api/health` - Returns comprehensive system health information
- `POST /api/health/gc` - Triggers memory recovery operations

### Configuration

The monitoring system uses these configurable thresholds:
- Memory warning threshold: 800MB RSS, 500MB heap, 500MB arrayBuffers
- Memory critical threshold: 950MB RSS, 700MB heap, 700MB arrayBuffers
- Connection warning threshold: 70% utilization
- Connection critical threshold: 85% utilization

## Interpreting Results

### System Status Levels

- **HEALTHY** - All metrics within normal ranges
- **WARNING** - Some metrics approaching critical thresholds
- **CRITICAL** - One or more metrics exceeding critical thresholds
- **ERROR** - System experiencing operational problems

### Memory Metrics

- **RSS (Resident Set Size)** - Total memory allocated to the process
- **Heap Used** - JavaScript heap memory in active use
- **Array Buffers** - Memory allocated for binary data storage
- **Memory Leak Risk** - Score from 0-100 indicating leak probability

### Connection Metrics

- **Current** - Number of active connections
- **Available** - Remaining connections in the pool
- **Utilization** - Percentage of connection pool in use
- **Requests Served** - Number of requests served by current connection 