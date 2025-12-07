import { NextRequest, NextResponse } from 'next/server';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { requireAdmin } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import { supabaseDb as db } from '@/lib/supabase-database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;

    const setting = await db.getDailyUpdateSetting(key);

    if (!setting) {
      logger.warn('Daily update setting not found', 'DAILY_UPDATES_SETTINGS_API', { key });
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
    }

    logger.info('Daily update setting fetched successfully', 'DAILY_UPDATES_SETTINGS_API', { key });

    return NextResponse.json({ 
      success: true, 
      key,
      value: setting.value 
    });
  } catch (error) {
    logger.error('Error fetching daily update setting', 'DAILY_UPDATES_SETTINGS_API', { key: (await params).key }, error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    // Check authentication - admin required for updating settings
    const user = authService.extractUserFromRequest(request);
    requireAdmin(user);

    const { key } = await params;
    const body = await request.json();
    const { value } = body;

    if (!value || typeof value !== 'string') {
      return NextResponse.json({ 
        error: 'Value is required and must be a string' 
      }, { status: 400 });
    }

    // Upsert the setting in MongoDB
    const success = await db.upsertDailyUpdateSetting(key, value.trim());

    if (!success) {
      logger.error('Failed to update daily update setting', 'DAILY_UPDATES_SETTINGS_API', { key, userId: user?.id });
      return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
    }

    logger.info('Daily update setting updated successfully', 'DAILY_UPDATES_SETTINGS_API', { 
      key, 
      userId: user?.id 
    });

    return NextResponse.json({ 
      success: true, 
      key,
      value: value.trim()
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({
        error: error.message,
        success: false
      }, { status: 401 });
    }

    logger.error('Error updating daily update setting', 'DAILY_UPDATES_SETTINGS_API', { key: (await params).key }, error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 