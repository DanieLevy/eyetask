import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { auth, requireAdmin } from '@/lib/auth';
import { logger } from '@/lib/logger';

const SETTING_KEY = 'main-page-carousel-fallback-message';

export async function GET(request: NextRequest) {
  try {
    const setting = await db.getDailyUpdateSetting(SETTING_KEY);

    // Return default message if setting doesn't exist yet
    if (!setting) {
      return NextResponse.json({ 
        success: true, 
        key: SETTING_KEY,
        value: 'לא נמצאו עדכונים להצגה'
      });
    }

    logger.info('Fallback message setting fetched', 'SETTINGS_API', { key: SETTING_KEY });

    return NextResponse.json({ 
      success: true, 
      key: SETTING_KEY,
      value: setting.value 
    });
  } catch (error) {
    logger.error('Error fetching fallback message setting', 'SETTINGS_API', { key: SETTING_KEY }, error as Error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      // Always return a default value even in case of errors
      value: 'לא נמצאו עדכונים להצגה'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check authentication - admin required for updating settings
    const user = auth.extractUserFromRequest(request);
    requireAdmin(user);

    const body = await request.json();
    const { value } = body;

    if (value === undefined || value === null || typeof value !== 'string') {
      return NextResponse.json({ 
        error: 'Value is required and must be a string' 
      }, { status: 400 });
    }

    // Upsert the setting in MongoDB
    const success = await db.upsertDailyUpdateSetting(SETTING_KEY, value.trim());

    if (!success) {
      logger.error('Failed to update fallback message setting', 'SETTINGS_API', { key: SETTING_KEY, userId: user?.id });
      return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
    }

    logger.info('Fallback message setting updated', 'SETTINGS_API', { 
      key: SETTING_KEY, 
      userId: user?.id 
    });

    return NextResponse.json({ 
      success: true, 
      key: SETTING_KEY,
      value: value.trim()
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({
        error: error.message,
        success: false
      }, { status: 401 });
    }

    logger.error('Error updating fallback message setting', 'SETTINGS_API', { key: SETTING_KEY }, error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 