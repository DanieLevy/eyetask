import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, requireAuthEnhanced } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import { saveFile } from '@/lib/fileStorage';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Log the incoming request for debugging
    logger.info('Image upload request received', 'UPLOAD_API', {
      method: request.method,
      environment: process.env.NODE_ENV,
      platform: process.env.VERCEL ? 'Vercel' : process.env.NETLIFY ? 'Netlify' : 'Local'
    });

    // Enhanced authentication check
    const authHeader = request.headers.get('Authorization');
    
    let user;
    try {
      user = await requireAuthEnhanced(authHeader);
    } catch (authError) {
      logger.warn('Unauthorized upload attempt', 'UPLOAD_API', { 
        authHeader: authHeader ? 'Present' : 'Missing',
        error: authError instanceof Error ? authError.message : 'Unknown error'
      });
      
      return NextResponse.json(
        { 
          error: 'Unauthorized', 
          success: false,
          debug: {
            hasAuthHeader: !!authHeader,
            authError: authError instanceof Error ? authError.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }
        },
        { status: 401 }
      );
    }

    // Get and validate the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      logger.warn('No file in upload request', 'UPLOAD_API');
      return NextResponse.json(
        { error: 'No file uploaded', success: false },
        { status: 400 }
      );
    }

    logger.info('File received', 'UPLOAD_API', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      logger.warn('Invalid file type upload attempt', 'UPLOAD_API', { 
        fileType: file.type,
        fileName: file.name 
      });
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.', success: false },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      logger.warn('File too large upload attempt', 'UPLOAD_API', { 
        fileSize: file.size,
        maxSize,
        fileName: file.name 
      });
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.', success: false },
        { status: 400 }
      );
    }

    // Upload to Cloudinary
    const uploadResult = await saveFile(file, {
      folder: 'drivertasks/uploads',
      tags: ['api-upload', user.username]
    });

    if (!uploadResult.success) {
      logger.error('Upload to storage failed', 'UPLOAD_API', {
        fileName: file.name,
        error: uploadResult.error
      });
      
      return NextResponse.json(
        { 
          error: uploadResult.error || 'Upload failed', 
          success: false 
        },
        { status: 500 }
      );
    }

    // Generate unique filename for compatibility (though not used for storage)
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const executionTime = Date.now() - startTime;
    logger.info('Image upload successful', 'UPLOAD_API', {
      fileName,
      fileSize: file.size,
      fileType: file.type,
      method: process.env.CLOUDINARY_URL ? 'cloudinary' : 'local',
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      username: user.username,
      executionTime: `${executionTime}ms`
    });

    return NextResponse.json({
      success: true,
      data: {
        fileName: fileName,
        filePath: uploadResult.url!, // Return storage URL as filePath
        publicUrl: uploadResult.url!, // Return storage URL as publicUrl
        fileSize: file.size,
        fileType: file.type,
        method: process.env.CLOUDINARY_URL ? 'cloudinary' : 'local'
      },
      message: process.env.CLOUDINARY_URL 
        ? 'Image uploaded successfully to Cloudinary' 
        : 'Image uploaded successfully to local storage'
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error('Image upload error', 'UPLOAD_API', {
      executionTime: `${executionTime}ms`,
      environment: process.env.NODE_ENV,
      platform: process.env.VERCEL ? 'Vercel' : process.env.NETLIFY ? 'Netlify' : 'Local'
    }, error as Error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        success: false,
        debug: process.env.NODE_ENV === 'development' ? {
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        } : undefined
      },
      { status: 500 }
    );
  }
}