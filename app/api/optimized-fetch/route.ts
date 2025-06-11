import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { connectToDatabase, completeOperation } from '@/lib/mongodb';

/**
 * Optimized fetch API endpoint that includes monitoring integration
 * This provides cached and optimized data fetching with monitoring
 * POST /api/optimized-fetch
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const operationId = `optimized-fetch-${Date.now()}`;
  
  try {
    // Parse request
    const body = await req.json();
    const { endpoint, params, options = {} } = body;
    
    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
    }
    
    // Connect to MongoDB with monitoring
    const { db } = await connectToDatabase();
    
    // This is where you would fetch data from MongoDB or another source
    // For now, we'll just return a mock response with monitoring info
    
    const responseTime = Date.now() - startTime;
    
    logger.info(`Optimized fetch completed in ${responseTime}ms`, 'OPTIMIZED_FETCH', {
      endpoint,
      responseTime
    });
    
    // Properly complete the operation for connection monitoring
    completeOperation(operationId);
    
    return NextResponse.json({
      data: { message: 'Optimized fetch successful' },
      metadata: {
        cached: false,
        responseTime,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    const errorTime = Date.now() - startTime;
    
    logger.error('Optimized fetch failed', 'OPTIMIZED_FETCH', {
      error: error instanceof Error ? error.message : String(error),
      responseTime: errorTime
    });
    
    // Properly complete the operation even in error case
    completeOperation(operationId);
    
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
} 