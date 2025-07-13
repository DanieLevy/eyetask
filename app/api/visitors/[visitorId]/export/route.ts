import { NextRequest, NextResponse } from 'next/server';
import { supabaseDb as db } from '@/lib/supabase-database';
import { getSupabaseClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';

// Never cache this route
export const dynamic = 'force-dynamic';

// GET /api/visitors/[visitorId]/export - Export all visitor data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ visitorId: string }> }
) {
  try {
    const { visitorId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    // Get visitor profile
    const profile = await db.getVisitorProfile(visitorId);
    if (!profile) {
      return NextResponse.json({
        error: 'Visitor not found',
        success: false
      }, { status: 404 });
    }

    // Get all visitor data
    const activities = await db.getVisitorActivityLogs(visitorId, 10000); // Get all activities
    const sessions = await db.getVisitorSessions(visitorId);

    // Compile all visitor data
    const visitorData = {
      profile: {
        visitorId: profile.visitorId,
        name: profile.name,
        firstSeen: profile.firstSeen,
        lastSeen: profile.lastSeen,
        totalVisits: profile.totalVisits,
        totalActions: profile.totalActions,
        metadata: profile.metadata,
        deviceInfo: profile.deviceInfo,
        isActive: profile.isActive
      },
      activities: activities.map((activity: any) => ({
        id: activity.id,
        timestamp: activity.timestamp,
        action: activity.action,
        category: activity.category,
        target: activity.target,
        metadata: activity.metadata,
        severity: activity.severity
      })),
      sessions: sessions.map((session: any) => ({
        id: session.id,
        sessionId: session.sessionId,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        durationSeconds: session.durationSeconds,
        pageViews: session.pageViews,
        actions: session.actions,
        pagesVisited: session.pagesVisited,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        referrer: session.referrer
      })),
      exportMetadata: {
        exportDate: new Date().toISOString(),
        dataRetentionNotice: 'This data export contains all information stored about this visitor.',
        gdprCompliance: 'This export is provided in compliance with GDPR data portability requirements.'
      }
    };

    logger.info('Visitor data exported', 'VISITOR_API', {
      visitorId,
      format,
      recordCount: {
        activities: activities.length,
        sessions: sessions.length
      }
    });

    if (format === 'json') {
      // Return as JSON
      return NextResponse.json({
        success: true,
        data: visitorData
      });
    } else if (format === 'download') {
      // Return as downloadable JSON file
      const jsonString = JSON.stringify(visitorData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      return new NextResponse(blob, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="visitor_${visitorId}_data_export_${new Date().toISOString().split('T')[0]}.json"`
        }
      });
    } else {
      return NextResponse.json({
        error: 'Invalid format. Use format=json or format=download',
        success: false
      }, { status: 400 });
    }
  } catch (error) {
    logger.error('Error exporting visitor data', 'VISITOR_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to export visitor data',
      success: false
    }, { status: 500 });
  }
}

// DELETE /api/visitors/[visitorId]/export - Delete all visitor data (GDPR right to erasure)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ visitorId: string }> }
) {
  try {
    const { visitorId } = await params;
    const supabase = getSupabaseClient(true);

    // Check if visitor exists
    const profile = await db.getVisitorProfile(visitorId);
    if (!profile) {
      return NextResponse.json({
        error: 'Visitor not found',
        success: false
      }, { status: 404 });
    }

    // Delete visitor sessions
    const { error: sessionsError } = await supabase
      .from('visitor_sessions')
      .delete()
      .eq('visitor_id', visitorId);

    if (sessionsError) {
      throw new Error('Failed to delete visitor sessions');
    }

    // Delete visitor activity logs
    const { error: logsError } = await supabase
      .from('activity_logs')
      .delete()
      .eq('visitor_id', visitorId);

    if (logsError) {
      throw new Error('Failed to delete visitor activity logs');
    }

    // Delete visitor profile
    const { error: profileError } = await supabase
      .from('visitor_profiles')
      .delete()
      .eq('visitor_id', visitorId);

    if (profileError) {
      throw new Error('Failed to delete visitor profile');
    }

    logger.info('Visitor data deleted', 'VISITOR_API', {
      visitorId,
      visitorName: profile.name,
      deletedAt: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'All visitor data has been permanently deleted',
      deletedRecords: {
        profile: true,
        activities: true,
        sessions: true
      }
    });
  } catch (error) {
    logger.error('Error deleting visitor data', 'VISITOR_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to delete visitor data',
      success: false
    }, { status: 500 });
  }
} 