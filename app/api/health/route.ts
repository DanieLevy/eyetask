import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getConnectionStatus } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    // Basic database connection check
    const connectionStatus = getConnectionStatus();
    
    // Try to connect to verify database is accessible
    const { db } = await connectToDatabase();
    const isDbConnected = !!db;
    
    const health = {
      status: isDbConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: isDbConnected,
        connectionAge: connectionStatus.connectionAge ? `${Math.floor(connectionStatus.connectionAge / 1000)}s` : null,
        requestsServed: connectionStatus.requestsServed
      },
      uptime: process.uptime(),
      version: process.version
    };

    return NextResponse.json(health, { 
      status: isDbConnected ? 200 : 503 
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 