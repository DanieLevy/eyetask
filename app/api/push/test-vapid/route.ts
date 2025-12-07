import { NextRequest, NextResponse } from "next/server";
import { pushService } from "@/lib/services/pushNotificationService";

// Test endpoint for debugging VAPID key issues
export async function GET(_request: NextRequest) {
  try {
    const publicKey = pushService.getPublicKey();
    
    if (!publicKey) {
      return NextResponse.json({
        error: "No VAPID key configured",
        success: false
      }, { status: 500 });
    }
    
    // Convert to Uint8Array to test conversion
    const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
    const base64 = (publicKey + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    
    // Decode base64
    const binaryString = Buffer.from(base64, 'base64').toString('binary');
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Check if it's a valid P-256 key
    const isValidUncompressed = bytes.length === 65 && bytes[0] === 0x04;
    const isValidCompressed = bytes.length === 33 && (bytes[0] === 0x02 || bytes[0] === 0x03);
    
    return NextResponse.json({
      success: true,
      publicKey,
      keyInfo: {
        originalLength: publicKey.length,
        paddedLength: base64.length,
        byteLength: bytes.length,
        firstByte: '0x' + bytes[0].toString(16).padStart(2, '0'),
        isValidP256: isValidUncompressed || isValidCompressed,
        format: isValidUncompressed ? 'uncompressed' : isValidCompressed ? 'compressed' : 'unknown',
        firstTenBytes: Array.from(bytes.slice(0, 10)).map(b => '0x' + b.toString(16).padStart(2, '0'))
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: "Test failed",
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
} 