import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { extractTokenFromHeader, requireAuthEnhanced } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Log the incoming request for debugging
    logger.info('Image upload request received', 'UPLOAD_API', {
      method: request.method,
      headers: {
        'content-type': request.headers.get('content-type'),
        'user-agent': request.headers.get('user-agent'),
        'origin': request.headers.get('origin'),
        'referer': request.headers.get('referer'),
        hasAuth: !!request.headers.get('authorization')
      }
    });

    // Enhanced authentication check
    const authHeader = request.headers.get('Authorization');
    logger.info('Auth header check', 'UPLOAD_API', { 
      hasAuthHeader: !!authHeader,
      authHeaderFormat: authHeader ? (authHeader.startsWith('Bearer ') ? 'Bearer format' : 'Other format') : 'None'
    });

    const token = extractTokenFromHeader(authHeader);
    logger.info('Token extraction', 'UPLOAD_API', { 
      hasToken: !!token,
      tokenLength: token ? token.length : 0
    });

    const { authorized, user, error } = await requireAuthEnhanced(token);
    
    logger.info('Authentication result', 'UPLOAD_API', {
      authorized,
      hasUser: !!user,
      userRole: user?.role,
      authError: error
    });
    
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

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      logger.warn('File too large upload attempt', 'UPLOAD_API', { 
        fileSize: file.size,
        fileName: file.name 
      });
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.', success: false },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'subtasks');
    try {
      await mkdir(uploadsDir, { recursive: true });
      logger.info('Upload directory ready', 'UPLOAD_API', { uploadsDir });
    } catch (error) {
      // Directory might already exist, which is fine
      logger.info('Upload directory already exists or creation failed', 'UPLOAD_API', { 
        uploadsDir,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Save file to local storage
    const filePath = join(uploadsDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await writeFile(filePath, buffer);

    // Generate public URL
    const publicUrl = `/uploads/subtasks/${fileName}`;

    const executionTime = Date.now() - startTime;
    logger.info('Image upload successful', 'UPLOAD_API', {
      fileName,
      fileSize: file.size,
      fileType: file.type,
      publicUrl,
      username: user.username,
      executionTime: `${executionTime}ms`
    });

    return NextResponse.json({
      success: true,
      data: {
        fileName: fileName,
        filePath: `subtasks/${fileName}`,
        publicUrl: publicUrl,
        fileSize: file.size,
        fileType: file.type
      },
      message: 'Image uploaded successfully'
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error('Image upload error', 'UPLOAD_API', {
      executionTime: `${executionTime}ms`
    }, error as Error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        success: false,
        debug: process.env.NODE_ENV === 'development' ? {
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        } : undefined
      },
      { status: 500 }
    );
  }
}