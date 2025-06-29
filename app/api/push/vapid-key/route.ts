import { NextRequest, NextResponse } from "next/server";
import { pushService } from "@/lib/services/pushNotificationService";

// GET /api/push/vapid-key - Get VAPID public key (public endpoint)
export async function GET(request: NextRequest) {
  try {
    // VAPID public key is public information, no auth needed
    const publicKey = pushService.getPublicKey();

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
    return NextResponse.json({
      error: "Failed to fetch VAPID key",
      success: false
    }, { status: 500 });
  }
} 