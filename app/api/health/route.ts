import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Check Supabase connection
    const supabase = getSupabaseClient();
    
    // Try a simple query to verify database is accessible
    const { data, error } = await supabase
      .from('projects')
      .select('count')
      .limit(1)
      .single();
    
    const isDbConnected = !error;
    
    const health = {
      status: isDbConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: isDbConnected,
        type: 'supabase'
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