import { NextRequest, NextResponse } from 'next/server';
import { supabaseServiceKey } from '@/lib/supabase';

// DEBUG endpoint - only available in development
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Debug endpoint only available in development' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    environment: process.env.NODE_ENV,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
    anonKeyExists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    anonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    serviceKeyExists: !!process.env.SUPABASE_SERVICE_KEY,
    serviceKeyLength: process.env.SUPABASE_SERVICE_KEY?.length || 0,
    serviceKeyLoadedByLib: !!supabaseServiceKey,
    serviceKeyLoadedLength: supabaseServiceKey?.length || 0,
    timestamp: new Date().toISOString()
  });
} 