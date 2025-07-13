import { NextRequest, NextResponse } from 'next/server';
import { supabaseDb as db } from '@/lib/supabase-database';
import { logger } from '@/lib/logger';

// Never cache this route
export const dynamic = 'force-dynamic';

// POST /api/visitors - Create or update visitor profile
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { visitorId, name, metadata } = body;

    if (!visitorId || !name) {
      return NextResponse.json({
        error: 'Visitor ID and name are required',
        success: false
      }, { status: 400 });
    }

    // Validate name length
    if (name.trim().length < 2 || name.trim().length > 50) {
      return NextResponse.json({
        error: 'Name must be between 2 and 50 characters',
        success: false
      }, { status: 400 });
    }

    // Create or update visitor profile
    const profile = await db.createOrUpdateVisitorProfile(visitorId, name.trim(), metadata);

    if (!profile) {
      return NextResponse.json({
        error: 'Failed to save visitor profile',
        success: false
      }, { status: 500 });
    }

    // Track the action
    await db.trackVisitorAction(
      visitorId,
      name,
      'נרשם למערכת',
      'system',
      { firstVisit: profile.totalVisits === 1 }
    );

    logger.info('Visitor profile created/updated', 'VISITOR_API', {
      visitorId,
      name,
      isNew: profile.totalVisits === 1
    });

    return NextResponse.json({
      success: true,
      profile,
      isNew: profile.totalVisits === 1
    });
  } catch (error) {
    logger.error('Error in visitor registration', 'VISITOR_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to process visitor registration',
      success: false
    }, { status: 500 });
  }
}

// GET /api/visitors - Get visitor profile or all profiles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const visitorId = searchParams.get('visitorId');

    if (visitorId) {
      // Get specific visitor profile
      const profile = await db.getVisitorProfile(visitorId);
      
      if (!profile) {
        return NextResponse.json({
          error: 'Visitor profile not found',
          success: false
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        profile
      });
    } else {
      // Get all visitor profiles (for admin)
      const limit = parseInt(searchParams.get('limit') || '100');
      const profiles = await db.getAllVisitorProfiles(limit);

      return NextResponse.json({
        success: true,
        profiles,
        count: profiles.length
      });
    }
  } catch (error) {
    logger.error('Error fetching visitor profiles', 'VISITOR_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to fetch visitor profiles',
      success: false
    }, { status: 500 });
  }
} 