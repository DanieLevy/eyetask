import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { pushService } from '@/lib/services/pushNotificationService';

// GET /api/push/vapid-key - Get VAPID public key
export async function GET(request: NextRequest) {
  try {
    const user = auth.extractUserFromRequest(request);
    if (!user) {
      return NextResponse.json({
        error: 'Authentication required',
        success: false
      }, { status: 401 });
    }

    const publicKey = pushService.getPublicKey();

    if (!publicKey) {
      return NextResponse.json({
        error: 'VAPID keys not configured',
        success: false
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      publicKey
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch VAPID key',
      success: false
    }, { status: 500 });
  }
} 