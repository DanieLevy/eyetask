#!/usr/bin/env node

/**
 * Script to start the server with enhanced debugging for performance analysis
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create timestamp for log file name
const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
const logFile = path.join(logsDir, `performance-debug-${timestamp}.log`);

// Start Next.js with environment variables for enhanced logging
console.log('🔍 Starting server with enhanced performance debugging...');
console.log(`📝 Logs will be saved to: ${logFile}`);

// Create write stream for logs
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Set environment variables
const env = {
  ...process.env,
  LOG_LEVEL: 'debug',
  NODE_ENV: 'development'
};

// Use npm to run the dev script instead of npx (works better on Windows)
const isWindows = process.platform === 'win32';
const command = isWindows ? 'npm.cmd' : 'npm';

// Spawn the Next.js dev server through npm
const nextDev = spawn(command, ['run', 'dev'], { 
  env,
  stdio: ['inherit', 'pipe', 'pipe']
});

// Add timestamp to each log line
function formatLog(data) {
  const lines = data.toString().split('\n');
  return lines.map(line => line ? `[${new Date().toISOString()}] ${line}` : line).join('\n');
}

// Pipe output to console and log file
nextDev.stdout.on('data', (data) => {
  const formattedData = formatLog(data);
  process.stdout.write(formattedData);
  logStream.write(formattedData);
});

nextDev.stderr.on('data', (data) => {
  const formattedData = formatLog(data);
  process.stderr.write(formattedData);
  logStream.write(formattedData);
});

nextDev.on('close', (code) => {
  console.log(`\n🛑 Server process exited with code ${code}`);
  logStream.end();
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Shutting down server...');
  nextDev.kill('SIGINT');
  
  // Give the server some time to shut down gracefully
  setTimeout(() => {
    console.log('👋 Server shutdown complete');
    logStream.end();
    process.exit(0);
  }, 1000);
}); 