'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function PerformanceMonitoringPage() {
  const router = useRouter();
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Counter for monitoring memory usage
  const refreshCountRef = useRef(0);

  // Function to fetch health data with memory leak prevention
  const fetchHealthData = useCallback(async () => {
    try {
      // Cancel any ongoing requests to prevent response data pile-up
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create a new abort controller for this request
      abortControllerRef.current = new AbortController();
      
      setLoading(true);
      const response = await fetch('/api/health', {
        signal: abortControllerRef.current.signal,
        // Add cache control headers to prevent browser caching
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching health data: ${response.statusText}`);
      }
      
      // Parse the response and immediately let the response be garbage collected
      const data = await response.json();
      
      // Track refresh count for diagnostics
      refreshCountRef.current += 1;
      
      // Update state with the new data
      setHealthData(data);
      setError(null);
      
      // Every 10 refreshes, force a garbage collection via the API
      // This can help clean up any accumulated memory
      if (refreshCountRef.current % 10 === 0 && isAutoRefreshing) {
        try {
          fetch('/api/health/gc', { method: 'POST' })
            .catch(() => {}); // Ignore errors here
        } catch (e) {
          // Ignore any errors
        }
      }
    } catch (err) {
      // Don't set errors for aborted requests
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message);
        toast.error(`Failed to fetch monitoring data: ${(err as Error).message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [isAutoRefreshing]);

  // Load health data on mount
  useEffect(() => {
    fetchHealthData();

    // Cleanup function to prevent memory leaks
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [fetchHealthData]);

  // Handle auto-refresh with proper cleanup
  const toggleAutoRefresh = useCallback(() => {
    if (isAutoRefreshing) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      setIsAutoRefreshing(false);
      toast.info('Auto-refresh disabled');
    } else {
      // Clear any existing interval first
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      
      // Create a new interval with a reference we can clean up
      refreshIntervalRef.current = setInterval(() => {
        fetchHealthData();
      }, 10000); // Refresh every 10 seconds
      
      setIsAutoRefreshing(true);
      toast.success('Auto-refresh enabled (10s)');
    }
  }, [isAutoRefreshing, fetchHealthData]);

  // Get badge color based on status
  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'HEALTHY':
        return 'bg-green-500 hover:bg-green-600';
      case 'WARNING':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'CRITICAL':
        return 'bg-red-500 hover:bg-red-600';
      case 'ERROR':
        return 'bg-red-500 hover:bg-red-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Performance Monitoring</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchHealthData} 
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button 
            variant={isAutoRefreshing ? "default" : "outline"}
            onClick={toggleAutoRefresh}
          >
            {isAutoRefreshing ? 'Disable Auto-refresh' : 'Enable Auto-refresh'}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {healthData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">System Status</CardTitle>
                <CardDescription>Current system health</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge className={getStatusColor(healthData.status)}>
                    {healthData.status || 'Unknown'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Uptime: {healthData.uptime?.formatted || 'Unknown'}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="pt-1 text-xs text-muted-foreground">
                Last updated: {new Date(healthData.timestamp).toLocaleString()}
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Database Connections</CardTitle>
                <CardDescription>MongoDB connection stats</CardDescription>
              </CardHeader>
              <CardContent>
                {healthData.database?.connected ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Current:</span>
                      <span className="font-medium">{healthData.database.connectionPool?.current || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Available:</span>
                      <span className="font-medium">{healthData.database.connectionPool?.available || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Utilization:</span>
                      <span className="font-medium">{healthData.database.connectionPool?.utilizationPercentage || '0%'}</span>
                    </div>
                    {healthData.database.connectionPool?.isEstimated && (
                      <div className="text-xs text-amber-600 mt-2">
                        * Values are estimated due to limited database permissions
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-red-500 font-medium">Database disconnected</div>
                )}
              </CardContent>
              <CardFooter className="pt-1 text-xs text-muted-foreground">
                Type: {healthData.database?.connectionType || 'Unknown'}
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Memory Usage</CardTitle>
                <CardDescription>Current memory allocation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>RSS:</span>
                    <span className="font-medium">{healthData.memory?.rss || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Heap Used:</span>
                    <span className="font-medium">{healthData.memory?.heapUsed || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Array Buffers:</span>
                    <span className="font-medium">{healthData.memory?.arrayBuffers || 'Unknown'}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-1 text-xs text-muted-foreground">
                Memory Leak Risk: {healthData.memory?.leakRiskScore || '0'}/100
              </CardFooter>
            </Card>
          </div>

          <Tabs defaultValue="memory" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="memory">Memory Details</TabsTrigger>
              <TabsTrigger value="connections">Connection Details</TabsTrigger>
              <TabsTrigger value="response">Response Time</TabsTrigger>
            </TabsList>
            
            <TabsContent value="memory" className="p-4 border rounded-md">
              <h3 className="text-xl font-semibold mb-4">Memory Allocation</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Metric</th>
                      <th className="text-left py-2 px-4">Value</th>
                      <th className="text-left py-2 px-4">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 px-4 font-medium">RSS</td>
                      <td className="py-2 px-4">{healthData.memory?.rss || 'Unknown'}</td>
                      <td className="py-2 px-4">Resident Set Size - total memory allocated</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4 font-medium">Heap Total</td>
                      <td className="py-2 px-4">{healthData.memory?.heapTotal || 'Unknown'}</td>
                      <td className="py-2 px-4">Total size of the allocated heap</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4 font-medium">Heap Used</td>
                      <td className="py-2 px-4">{healthData.memory?.heapUsed || 'Unknown'}</td>
                      <td className="py-2 px-4">Actual memory used during execution</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4 font-medium">External</td>
                      <td className="py-2 px-4">{healthData.memory?.external || 'Unknown'}</td>
                      <td className="py-2 px-4">Memory used by C++ objects bound to JavaScript</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4 font-medium">Array Buffers</td>
                      <td className="py-2 px-4">{healthData.memory?.arrayBuffers || 'Unknown'}</td>
                      <td className="py-2 px-4">Memory allocated for ArrayBuffers and SharedArrayBuffers</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4 font-medium">Memory Leak Risk</td>
                      <td className="py-2 px-4">{healthData.memory?.leakRiskScore || '0'}/100</td>
                      <td className="py-2 px-4">Risk score for potential memory leaks</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              {refreshCountRef.current > 0 && (
                <div className="mt-4 text-xs text-gray-500">
                  Refresh count: {refreshCountRef.current} | Auto-refresh: {isAutoRefreshing ? 'Enabled' : 'Disabled'}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="connections" className="p-4 border rounded-md">
              <h3 className="text-xl font-semibold mb-4">MongoDB Connection Details</h3>
              {healthData.database?.connected ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Metric</th>
                        <th className="text-left py-2 px-4">Value</th>
                        <th className="text-left py-2 px-4">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 px-4 font-medium">Current Connections</td>
                        <td className="py-2 px-4">{healthData.database.connectionPool?.current || '0'}</td>
                        <td className="py-2 px-4">Number of active connections</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4 font-medium">Available Connections</td>
                        <td className="py-2 px-4">{healthData.database.connectionPool?.available || '0'}</td>
                        <td className="py-2 px-4">Number of connections available</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4 font-medium">Total Connections</td>
                        <td className="py-2 px-4">{healthData.database.connectionPool?.total || '0'}</td>
                        <td className="py-2 px-4">Total connections in the pool</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4 font-medium">Utilization</td>
                        <td className="py-2 px-4">{healthData.database.connectionPool?.utilizationPercentage || '0%'}</td>
                        <td className="py-2 px-4">Percentage of connections in use</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4 font-medium">Connection Type</td>
                        <td className="py-2 px-4">{healthData.database.connectionType}</td>
                        <td className="py-2 px-4">Type of database connection</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-red-50 text-red-700 p-4 rounded">
                  Database is currently disconnected
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="response" className="p-4 border rounded-md">
              <h3 className="text-xl font-semibold mb-4">Response Time Analysis</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Metric</th>
                      <th className="text-left py-2 px-4">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 px-4 font-medium">Health Check Response Time</td>
                      <td className="py-2 px-4">{healthData.responseTime || 'Unknown'}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4 font-medium">Last Updated</td>
                      <td className="py-2 px-4">{new Date(healthData.timestamp).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {!healthData && !error && (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
            </div>
            <p className="mt-2">Loading performance data...</p>
          </div>
        </div>
      )}

      <div className="mt-8">
        <Button variant="outline" onClick={() => router.push('/admin/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
} 