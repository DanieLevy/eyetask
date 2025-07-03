import { NextRequest, NextResponse } from 'next/server';
import { supabaseDb as db } from '@/lib/supabase-database';
import { authSupabase as authService } from '@/lib/auth-supabase';

import { logger } from '@/lib/logger';
import { cache } from '@/lib/cache';
import { requireAdmin } from '@/lib/auth-utils';

const SETTING_KEY = 'main-page-carousel-fallback-message';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache for settings
const CACHE_NAMESPACE = 'settings';

export async function GET(request: NextRequest) {
  try {
    // Try to get from cache first
    const cacheKey = `setting_${SETTING_KEY}`;
    const cachedSetting = cache.get<{ key: string, value: string }>(cacheKey, {
      namespace: CACHE_NAMESPACE,
      ttl: CACHE_TTL
    });

    if (cachedSetting) {
      logger.debug('Setting served from cache', 'SETTINGS_API', { key: SETTING_KEY });
      return NextResponse.json({ 
        success: true, 
        key: SETTING_KEY,
        value: cachedSetting.value,
        cached: true
      });
    }

    const setting = await db.getDailyUpdateSetting(SETTING_KEY);
    const value = setting ? setting.value : 'לא נמצאו עדכונים להצגה';

    // Cache the result
    cache.set(cacheKey, { key: SETTING_KEY, value }, {
      namespace: CACHE_NAMESPACE,
      ttl: CACHE_TTL
    });



    return NextResponse.json({ 
      success: true, 
      key: SETTING_KEY,
      value
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
    const user = authService.extractUserFromRequest(request);
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

    // Invalidate the cache
    cache.delete(`setting_${SETTING_KEY}`, { namespace: CACHE_NAMESPACE });

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