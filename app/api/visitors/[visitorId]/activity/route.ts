import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { supabaseDb as db } from '@/lib/supabase-database';

// Never cache this route
export const dynamic = 'force-dynamic';

// GET /api/visitors/[visitorId]/activity - Get visitor activity logs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ visitorId: string }> }
) {
  try {
    const { visitorId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get visitor profile first
    const profile = await db.getVisitorProfile(visitorId);
    if (!profile) {
      return NextResponse.json({
        error: 'Visitor not found',
        success: false
      }, { status: 404 });
    }

    // Get activity logs
    const activities = await db.getVisitorActivityLogs(visitorId, limit);

    // Get sessions
    const sessions = await db.getVisitorSessions(visitorId);

    return NextResponse.json({
      success: true,
      visitor: profile,
      activities,
      sessions,
      stats: {
        totalActions: profile.totalActions,
        totalVisits: profile.totalVisits,
        totalSessions: sessions.length,
        averageSessionDuration: sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0) / (sessions.length || 1)
      }
    });
  } catch (error) {
    logger.error('Error fetching visitor activity', 'VISITOR_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to fetch visitor activity',
      success: false
    }, { status: 500 });
  }
}

// POST /api/visitors/[visitorId]/activity - Track visitor action
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ visitorId: string }> }
) {
  try {
    const { visitorId } = await params;
    const body = await request.json();
    const { action, category = 'view', metadata } = body;

    if (!action) {
      return NextResponse.json({
        error: 'Action is required',
        success: false
      }, { status: 400 });
    }

    // Get visitor profile
    const profile = await db.getVisitorProfile(visitorId);
    if (!profile) {
      return NextResponse.json({
        error: 'Visitor not found',
        success: false
      }, { status: 404 });
    }

    // Track the action
    await db.trackVisitorAction(
      visitorId,
      profile.name,
      action,
      category,
      metadata
    );

    return NextResponse.json({
      success: true,
      message: 'Action tracked successfully'
    });
  } catch (error) {
    logger.error('Error tracking visitor action', 'VISITOR_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to track visitor action',
      success: false
    }, { status: 500 });
  }
} 