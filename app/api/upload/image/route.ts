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

    // Validate file size (2MB limit for production compatibility)
    const maxSize = process.env.NODE_ENV === 'production' ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      logger.warn('File too large upload attempt', 'UPLOAD_API', { 
        fileSize: file.size,
        fileName: file.name,
        maxSize 
      });
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`, success: false },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    let publicUrl: string;
    let filePath: string;

    // Production: Use base64 data URL (embedded in database)
    // Development: Use local file system
    if (process.env.NODE_ENV === 'production' || process.env.NETLIFY) {
      // Convert to base64 data URL for production
      const base64 = buffer.toString('base64');
      publicUrl = `data:${file.type};base64,${base64}`;
      filePath = `base64:${fileName}`;
      
      logger.info('Image converted to base64 for production', 'UPLOAD_API', {
        fileName,
        fileSize: file.size,
        base64Length: base64.length
      });
    } else {
      // Local development: Save to file system
      try {
        const uploadsDir = join(process.cwd(), 'public', 'uploads', 'subtasks');
        await mkdir(uploadsDir, { recursive: true });
        
        const localFilePath = join(uploadsDir, fileName);
        await writeFile(localFilePath, buffer);
        
        publicUrl = `/uploads/subtasks/${fileName}`;
        filePath = `subtasks/${fileName}`;
        
        logger.info('Image saved to local file system', 'UPLOAD_API', {
          fileName,
          localFilePath
        });
      } catch (fsError) {
        logger.error('Local file system error, falling back to base64', 'UPLOAD_API', {}, fsError as Error);
        
        // Fallback to base64 even in development if file system fails
        const base64 = buffer.toString('base64');
        publicUrl = `data:${file.type};base64,${base64}`;
        filePath = `base64:${fileName}`;
      }
    }

    const executionTime = Date.now() - startTime;
    logger.info('Image upload successful', 'UPLOAD_API', {
      fileName,
      fileSize: file.size,
      fileType: file.type,
      method: filePath.startsWith('base64:') ? 'base64' : 'filesystem',
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
        method: filePath.startsWith('base64:') ? 'base64' : 'filesystem'
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