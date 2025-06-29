import { NextRequest, NextResponse } from "next/server";
import { pushService } from "@/lib/services/pushNotificationService";
import { logger } from "@/lib/logger";

// GET /api/push/vapid-key - Get VAPID public key (public endpoint)
export async function GET(request: NextRequest) {
  try {
    // Deep logging for iOS
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const referer = request.headers.get('referer') || 'No referer';
    
    logger.info('[VAPID Key] Request received', 'VAPID_KEY', {
      userAgent,
      isIOS,
      referer,
      timestamp: new Date().toISOString()
    });
    
    // Check if request is from admin for detailed logging
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const isAdminRequest = !!token && token.startsWith('eyJ'); // Basic check for JWT token
    
    // VAPID public key is public information, no auth needed
    const publicKey = pushService.getPublicKey();

    if (isAdminRequest || isIOS) {
      logger.info('[VAPID Key] Sending public key', 'VAPID_KEY', {
        hasKey: !!publicKey,
        keyLength: publicKey?.length,
        keyType: typeof publicKey,
        firstTenChars: publicKey?.substring(0, 10),
        lastTenChars: publicKey?.substring(publicKey.length - 10),
        isIOS,
        isAdmin: isAdminRequest
      });
    }

    if (!publicKey) {
      logger.error('[VAPID Key] No public key configured', 'VAPID_KEY', {
        isIOS,
        userAgent
      });
      return NextResponse.json({
        error: "VAPID keys not configured",
        success: false
      }, { status: 500 });
    }

    logger.info('[VAPID Key] Successfully sent', 'VAPID_KEY', {
      isIOS,
      keyLength: publicKey.length
    });

    return NextResponse.json({
      success: true,
      publicKey
    });
  } catch (error) {
    logger.error('[VAPID Key] Error', 'VAPID_KEY', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      userAgent: request.headers.get('user-agent')
    });
    return NextResponse.json({
      error: "Failed to fetch VAPID key",
      success: false
    }, { status: 500 });
  }
} 