import { NextRequest, NextResponse } from 'next/server';
import { authSupabase as authService } from '@/lib/auth-supabase';

import { pushService } from '@/lib/services/pushNotificationService';
import { logger } from '@/lib/logger';
import { requireAdmin } from '@/lib/auth-utils';

// POST /api/push/send - Send push notification (admin only)
export async function POST(request: NextRequest) {
  try {
    const authUser = authService.extractUserFromRequest(request);
    const user = requireAdmin(authUser);

    const {
      title,
      body,
      icon,
      badge,
      image,
      url,
      tag,
      requireInteraction,
      actions,
      targetRoles,
      targetUsers,
      data
    } = await request.json();

    // Validate required fields
    if (!title || !body) {
      return NextResponse.json({
        error: 'Title and body are required',
        success: false
      }, { status: 400 });
    }

    // Send notification
    const result = await pushService.sendNotification(
      {
        title,
        body,
        icon,
        badge,
        image,
        url,
        tag,
        requireInteraction,
        actions,
        data
      },
      {
        targetRoles,
        targetUsers,
        saveToHistory: true
      },
      user.id
    );

    logger.info('Push notification sent', 'PUSH_API', {
      sentBy: user.username,
      ...result
    });

    return NextResponse.json({
      success: result.success,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
      message: result.success 
        ? `התראה נשלחה בהצלחה ל-${result.sent} משתמשים`
        : 'שליחת ההתראה נכשלה'
    });
  } catch (error) {
    logger.error('Push send error', 'PUSH_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to send push notification',
      success: false
    }, { status: 500 });
  }
} 