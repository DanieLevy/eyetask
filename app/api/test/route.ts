import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  console.log('🧪 [TEST API] Route called');
  console.log('🧪 [TEST API] Environment check:');
  console.log('  - NODE_ENV:', process.env.NODE_ENV);
  console.log('  - NETLIFY:', process.env.NETLIFY);
  console.log('  - Supabase URL present:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('  - Supabase Anon Key present:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  console.log('  - JWT Secret present:', !!process.env.JWT_SECRET);

  return NextResponse.json({
    success: true,
    message: 'Test API route working',
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      netlify: !!process.env.NETLIFY,
      supabaseConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      jwtConfigured: !!process.env.JWT_SECRET
    }
  });
} 