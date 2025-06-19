import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, requireAuthEnhanced } from '@/lib/auth';
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
    const token = extractTokenFromHeader(authHeader);
    const { authorized, user, error } = await requireAuthEnhanced(token);
    
    if (!authorized || !user) {
      logger.warn('Unauthorized upload attempt', 'UPLOAD_API', { 
        authHeader: authHeader ? 'Present' : 'Missing',
        token: token ? 'Present' : 'Missing',
        error 
      });
      
      return NextResponse.json(
        { 
          error: 'Unauthorized', 
          success: false,
          debug: {
            hasAuthHeader: !!authHeader,
            hasToken: !!token,
            authError: error,
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
    const cloudinaryUrl = await saveFile(file, {
      folder: 'eyetask/uploads',
      tags: ['api-upload', user.username],
      context: {
        uploadedBy: user.username,
        uploadedAt: new Date().toISOString(),
        originalFileName: file.name
      }
    });

    // Generate unique filename for compatibility (though not used for storage)
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const executionTime = Date.now() - startTime;
    logger.info('Image upload successful', 'UPLOAD_API', {
      fileName,
      fileSize: file.size,
      fileType: file.type,
      method: 'cloudinary',
      cloudinaryUrl,
      username: user.username,
      executionTime: `${executionTime}ms`
    });

    return NextResponse.json({
      success: true,
      data: {
        fileName: fileName,
        filePath: cloudinaryUrl, // Return Cloudinary URL as filePath
        publicUrl: cloudinaryUrl, // Return Cloudinary URL as publicUrl
        fileSize: file.size,
        fileType: file.type,
        method: 'cloudinary'
      },
      message: 'Image uploaded successfully to Cloudinary'
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