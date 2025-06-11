#!/usr/bin/env node

/**
 * Script to test performance optimizations
 * 
 * This script makes multiple requests to test endpoints to verify
 * the optimizations are working as expected
 */

// Import ES modules dynamically
const { promises: fs } = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
require('dotenv').config({ path: '.env.local' });

// Get the base URL from environment or use default localhost
const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

// Configuration
const iterations = 5;

// Define endpoints to test with real IDs from your environment
const endpoints = [
  '/api/homepage-data',
  '/api/project-data/DC3%2FSV62', // Use an actual project ID (URL encoded)
  '/api/daily-updates',
  '/api/settings/main-page-carousel-fallback-message'
];

// Results storage
const results = {};

async function runTest() {
  // Dynamically import node-fetch (ESM module)
  const { default: fetch } = await import('node-fetch');
  
  console.log('Starting optimization tests...');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Test iterations: ${iterations}`);
  console.log(`Endpoints: ${JSON.stringify(endpoints, null, 2)}`);
  console.log('\nRunning tests...');

  // Initialize results object
  endpoints.forEach(endpoint => {
    results[endpoint] = {
      requests: [],
      uncachedRequests: [],
      cachedRequests: [],
      errors: []
    };
  });

  // Run iterations
  for (let i = 1; i <= iterations; i++) {
    console.log(`\nIteration ${i}/${iterations}`);
    
    // Test each endpoint
    for (const endpoint of endpoints) {
      await testEndpoint(endpoint, i, fetch);
    }
    
    // Small delay between iterations to avoid overwhelming the server
    if (i < iterations) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Output results
  console.log('\n=== Results ===');
  
  let totalRequests = 0;
  let totalTime = 0;
  
  for (const endpoint of endpoints) {
    const endpointResults = results[endpoint];
    
    console.log(`\n=== Results for ${endpoint} ===`);
    console.log(`Requests: ${endpointResults.requests.length}`);
    
    if (endpointResults.requests.length > 0) {
      const avgTime = endpointResults.requests.reduce((sum, time) => sum + time, 0) / endpointResults.requests.length;
      const minTime = Math.min(...endpointResults.requests);
      const maxTime = Math.max(...endpointResults.requests);
      
      console.log(`Average response time: ${avgTime.toFixed(2)}ms`);
      console.log(`Min response time: ${minTime.toFixed(2)}ms`);
      console.log(`Max response time: ${maxTime.toFixed(2)}ms`);
      
      // Cached vs uncached comparison if we have both
      if (endpointResults.cachedRequests.length > 0 && endpointResults.uncachedRequests.length > 0) {
        const avgCachedTime = endpointResults.cachedRequests.reduce((sum, time) => sum + time, 0) / endpointResults.cachedRequests.length;
        const avgUncachedTime = endpointResults.uncachedRequests.reduce((sum, time) => sum + time, 0) / endpointResults.uncachedRequests.length;
        
        console.log(`Cached responses: ${endpointResults.cachedRequests.length}`);
        console.log(`Uncached responses: ${endpointResults.uncachedRequests.length}`);
        console.log(`Average cached response time: ${avgCachedTime.toFixed(2)}ms`);
        console.log(`Average uncached response time: ${avgUncachedTime.toFixed(2)}ms`);
        console.log(`Cache performance improvement: ${((1 - avgCachedTime / avgUncachedTime) * 100).toFixed(2)}%`);
      }
      
      totalRequests += endpointResults.requests.length;
      totalTime += endpointResults.requests.reduce((sum, time) => sum + time, 0);
    }
    
    if (endpointResults.errors.length > 0) {
      console.log(`Errors: ${endpointResults.errors.length}`);
      console.log(`Last error: ${endpointResults.errors[endpointResults.errors.length - 1]}`);
    }
  }
  
  // Overall stats
  console.log('\n=== Overall Statistics ===');
  console.log(`Total requests: ${totalRequests}`);
  console.log(`Total request time: ${totalTime.toFixed(2)}ms`);
  console.log(`Total test duration: ${testDuration}ms`);
  console.log(`Average request time: ${(totalTime / totalRequests).toFixed(2)}ms`);
  
  // Endpoint comparison
  console.log('\n=== Endpoint Comparison ===');
  endpoints.forEach(endpoint => {
    const endpointResults = results[endpoint];
    if (endpointResults.requests.length > 0) {
      const avgTime = endpointResults.requests.reduce((sum, time) => sum + time, 0) / endpointResults.requests.length;
      console.log(`${endpoint}: ${avgTime.toFixed(2)}ms avg (${endpointResults.requests.length} requests)`);
    }
  });
}

async function testEndpoint(endpoint, iteration, fetch) {
  console.log(`  Testing ${endpoint}...`);
  
  try {
    // Add cache-busting parameter for forcing uncached responses on first iteration
    const url = `${baseUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}_t=${Date.now()}`;
    
    const start = performance.now();
    const response = await fetch(url);
    const responseTime = performance.now() - start;
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const data = await response.json();
    
    results[endpoint].requests.push(responseTime);
    
    // Check if the response was cached
    if (data.cached) {
      results[endpoint].cachedRequests.push(responseTime);
      console.log(`    Response time: ${responseTime.toFixed(2)}ms (cached)`);
    } else {
      results[endpoint].uncachedRequests.push(responseTime);
      console.log(`    Response time: ${responseTime.toFixed(2)}ms (uncached)`);
    }
  } catch (error) {
    console.log(`    Error testing ${endpoint}: ${error.message}`);
    results[endpoint].errors.push(error.message);
  }
}

// Start timing total test duration
const testStartTime = performance.now();
let testDuration = 0;

// Run the test
runTest()
  .then(() => {
    testDuration = performance.now() - testStartTime;
  })
  .catch(error => {
    console.error('Test failed:', error);
  }); 