import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb, MongoAnalytics } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    // Test connection
    const db = await getMongoDb();
    
    // Test database connection
    const adminDb = db.admin();
    const result = await adminDb.ping();
    
    // Get database stats
    const stats = await db.stats();
    
    // Test analytics logging
    await MongoAnalytics.logEvent({
      event: 'mongodb_test',
      metadata: {
        test: true,
        testTime: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'MongoDB connection successful',
      database: stats.db,
      collections: stats.collections,
      dataSize: stats.dataSize,
      indexSize: stats.indexSize,
      ping: result
    });

  } catch (error: any) {
    console.error('MongoDB connection test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, userId, projectId, taskId, metadata } = body;

    // Log a test event
    await MongoAnalytics.logEvent({
      event: event || 'test_event',
      userId,
      projectId,
      taskId,
      metadata: {
        ...metadata,
        apiTest: true,
        testTime: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Event logged successfully'
    });

  } catch (error: any) {
    console.error('Failed to log event:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 