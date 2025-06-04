import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractTokenFromHeader, requireAuthEnhanced } from '@/lib/auth';

// Initialize Supabase client for storage operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    const { authorized, user } = await requireAuthEnhanced(token);
    
    if (!authorized || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded', success: false },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.', success: false },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.', success: false },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `subtasks/${fileName}`;

    // Convert File to ArrayBuffer then to Uint8Array
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('subtask-images')
      .upload(filePath, uint8Array, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload image', success: false },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('subtask-images')
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      data: {
        fileName: fileName,
        filePath: filePath,
        publicUrl: urlData.publicUrl,
        fileSize: file.size,
        fileType: file.type
      },
      message: 'Image uploaded successfully'
    });

  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
} 