import { NextRequest, NextResponse } from 'next/server';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { logger } from '@/lib/logger';
import { pushService } from '@/lib/services/pushNotificationService';

// POST /api/push/test - Send test push notification
export async function POST(request: NextRequest) {
  try {
    // Check for authentication
    const authHeader = request.headers.get('authorization');
    let user = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      user = await authService.getUserFromToken(token);
    }
    
    // Parse request body
    const body = await request.json();
    const { userId, title, body: notificationBody } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    logger.info('Sending test push notification', 'PUSH_TEST', {
      userId,
      title: title || 'Test Notification',
      sentBy: user?.username || 'system'
    });
    
    // Send test notification
    const result = await pushService.sendToUser(
      userId,
      {
        title: title || 'התראת בדיקה 🔔',
        body: notificationBody || 'זוהי התראת בדיקה מהמערכת. אם אתה רואה אותה, ההתראות עובדות כמו שצריך!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        url: '/',
        requireInteraction: true
      },
      user?.username || 'system'
    );
    
    logger.info('Test push notification result', 'PUSH_TEST', {
      success: result.success,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors
    });
    
    return NextResponse.json({
      success: result.success,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
      message: result.success ? 'Test notification sent successfully' : 'Failed to send test notification'
    });
  } catch (error) {
    logger.error('Test push notification error', 'PUSH_TEST', {
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    return NextResponse.json(
      { error: 'Failed to send test notification', details: (error as Error).message },
      { status: 500 }
    );
  }
}
