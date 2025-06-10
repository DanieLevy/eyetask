import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, requireAuthEnhanced } from '@/lib/auth';
import { logger } from '@/lib/logger';

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

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename (for reference only)
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    // Always convert to base64 data URL
    const base64 = buffer.toString('base64');
    const publicUrl = `data:${file.type};base64,${base64}`;
    const filePath = `base64:${fileName}`;
    
    logger.info('Image converted to base64', 'UPLOAD_API', {
      fileName,
      fileSize: file.size,
      base64Length: base64.length
    });

    const executionTime = Date.now() - startTime;
    logger.info('Image upload successful', 'UPLOAD_API', {
      fileName,
      fileSize: file.size,
      fileType: file.type,
      method: 'base64',
      username: user.username,
      executionTime: `${executionTime}ms`
    });

    return NextResponse.json({
      success: true,
      data: {
        fileName: fileName,
        filePath: filePath,
        publicUrl: publicUrl,
        fileSize: file.size,
        fileType: file.type,
        method: 'base64'
      },
      message: 'Image uploaded successfully'
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