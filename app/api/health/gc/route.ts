import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to trigger garbage collection
 * This is used by the monitoring page to help manage memory usage
 * POST /api/health/gc
 */
export async function POST(request: NextRequest) {
  try {
    // Check if garbage collection is available
    if (typeof global.gc === 'function') {
      // Trigger garbage collection
      global.gc();
      
      return NextResponse.json({
        success: true,
        message: 'Garbage collection triggered successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Garbage collection not available. Run with --expose-gc flag.',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to trigger garbage collection',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 