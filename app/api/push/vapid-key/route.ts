import { NextRequest, NextResponse } from "next/server";
import { pushService } from "@/lib/services/pushNotificationService";

// GET /api/push/vapid-key - Get VAPID public key (public endpoint)
export async function GET(request: NextRequest) {
  try {
    // Check if request is from admin for detailed logging
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const isAdminRequest = !!token && token.startsWith('eyJ'); // Basic check for JWT token
    
    // VAPID public key is public information, no auth needed
    const publicKey = pushService.getPublicKey();

    if (isAdminRequest) {
      console.log('[VAPID Admin] Public key being sent:', publicKey);
      console.log('[VAPID Admin] Key length:', publicKey?.length);
      console.log('[VAPID Admin] Key type:', typeof publicKey);
      console.log('[VAPID Admin] First 50 chars:', publicKey?.substring(0, 50));
    }

    if (!publicKey) {
      return NextResponse.json({
        error: "VAPID keys not configured",
        success: false
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      publicKey
    });
  } catch (error) {
    console.error('[VAPID] Error:', error);
    return NextResponse.json({
      error: "Failed to fetch VAPID key",
      success: false
    }, { status: 500 });
  }
} 