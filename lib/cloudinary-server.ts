import 'server-only';
import { v2 as cloudinary } from 'cloudinary';
import { logger } from './logger';

// Configure Cloudinary
cloudinary.config({
  cloudinary_url: process.env.CLOUDINARY_URL
});

export interface CloudinaryUploadResult {
  success: boolean;
  publicId?: string;
  secureUrl?: string;
  originalUrl?: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  error?: string;
  transformations?: {
    thumbnail: string;
    medium: string;
    large: string;
    optimized: string;
  };
}

export interface CloudinaryUploadOptions {
  folder?: string;
  transformation?: Record<string, unknown>;
  tags?: string[];
  context?: Record<string, string>;
  eager?: Array<Record<string, unknown>>;
  quality?: string | number;
  format?: string;
  crop?: string;
  width?: number;
  height?: number;
}

/**
 * Upload an image to Cloudinary (server-only)
 */
export async function uploadToCloudinary(
  file: File | Buffer | string,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  const startTime = Date.now();
  
  try {
    logger.info('Starting Cloudinary upload', 'CLOUDINARY_UPLOAD', {
      fileSize: file instanceof File ? file.size : (file instanceof Buffer ? file.length : 'buffer'),
      fileName: file instanceof File ? file.name : 'buffer',
      folder: options.folder || 'drivertasks',
      hasTransformation: !!options.transformation
    });

    // Default upload options with optimization - following official Cloudinary patterns
    const baseOptions: Record<string, unknown> = {
      folder: options.folder || 'drivertasks',
      resource_type: 'image' as const,
      quality: 'auto:good',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      tags: options.tags || ['drivertasks', 'auto-upload'],
      context: options.context || {}
    };

    // Add custom transformation if provided
    if (options.transformation) {
      baseOptions.transformation = options.transformation;
    }

    // Add eager transformations if provided, otherwise use basic optimized versions
    if (options.eager) {
      baseOptions.eager = options.eager;
    } else {
      // Simple eager transformations following Cloudinary best practices
      baseOptions.eager = [
        { width: 150, height: 150, crop: 'fill' }, // thumbnail
        { width: 500, height: 500, crop: 'limit' }, // medium
        { width: 1200, height: 1200, crop: 'limit' } // large
      ];
    }

    let uploadResult: { public_id: string; secure_url: string; url: string; width?: number; height?: number; format?: string; bytes?: number; eager?: Array<unknown> };
    
    if (file instanceof File) {
      // For File objects, convert to buffer and use upload_stream
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Use upload_stream for buffer uploads to avoid basename() issues
      uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          baseOptions,
          (error, result) => {
            if (error) reject(error);
            else if (result) resolve(result);
            else reject(new Error('Upload failed: no result returned'));
          }
        );
        uploadStream.end(buffer);
      });
    } else if (file instanceof Buffer) {
      // For Buffer objects, use upload_stream
      uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          baseOptions,
          (error, result) => {
            if (error) reject(error);
            else if (result) resolve(result);
            else reject(new Error('Upload failed: no result returned'));
          }
        );
        uploadStream.end(file);
      });
    } else if (typeof file === 'string') {
      // For string paths, use regular upload method
      const uploadOptions = {
        ...baseOptions,
        use_filename: true
      };
      uploadResult = await cloudinary.uploader.upload(file, uploadOptions);
    } else {
      throw new Error('Unsupported file type for upload');
    }
    
    const executionTime = Date.now() - startTime;
    
    // Generate transformation URLs using standard Cloudinary patterns
    const transformations = {
      thumbnail: cloudinary.url(uploadResult.public_id, {
        width: 150,
        height: 150,
        crop: 'fill'
      }),
      medium: cloudinary.url(uploadResult.public_id, {
        width: 500,
        height: 500,
        crop: 'limit'
      }),
      large: cloudinary.url(uploadResult.public_id, {
        width: 1200,
        height: 1200,
        crop: 'limit'
      }),
      optimized: cloudinary.url(uploadResult.public_id, {
        quality: 'auto:good'
      })
    };

    logger.info('Cloudinary upload successful', 'CLOUDINARY_UPLOAD', {
      publicId: uploadResult.public_id,
      secureUrl: uploadResult.secure_url,
      format: uploadResult.format,
      width: uploadResult.width,
      height: uploadResult.height,
      bytes: uploadResult.bytes,
      executionTime: `${executionTime}ms`,
      eagerCount: uploadResult.eager?.length || 0
    });

    return {
      success: true,
      publicId: uploadResult.public_id,
      secureUrl: uploadResult.secure_url,
      originalUrl: uploadResult.url,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
      transformations
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    logger.error('Cloudinary upload failed', 'CLOUDINARY_UPLOAD', {
      executionTime: `${executionTime}ms`,
      folder: options.folder,
      error: (error as Error).message
    }, error as Error);

    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * Delete an image from Cloudinary (server-only)
 */
export async function deleteFromCloudinary(publicId: string): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('Deleting from Cloudinary', 'CLOUDINARY_DELETE', { publicId });
    
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      logger.info('Cloudinary deletion successful', 'CLOUDINARY_DELETE', { publicId });
      return { success: true };
    } else {
      logger.warn('Cloudinary deletion failed', 'CLOUDINARY_DELETE', { 
        publicId, 
        result: result.result 
      });
      return { success: false, error: `Deletion failed: ${result.result}` };
    }
  } catch (error) {
    logger.error('Cloudinary deletion error', 'CLOUDINARY_DELETE', { publicId }, error as Error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Generate optimized URLs for different use cases (server-only)
 */
export function generateCloudinaryUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
    format?: string;
    transformation?: string;
  } = {}
): string {
  return cloudinary.url(publicId, {
    width: options.width,
    height: options.height,
    crop: options.crop,
    quality: options.quality,
    format: options.format,
    ...options
  });
}

/**
 * Extract public ID from Cloudinary URL
 */
export function extractPublicIdFromUrl(url: string): string | null {
  try {
    // Handle different Cloudinary URL formats
    const patterns = [
      /\/v\d+\/(.+)\.[^.]+$/, // Standard format with version
      /\/([^/]+)\.[^.]+$/, // Simple format
      /\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/ // Upload format
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  } catch {
    logger.warn('Failed to extract public ID from URL', 'CLOUDINARY_EXTRACT', { url });
    return null;
  }
}

/**
 * Check if URL is a Cloudinary URL
 */
export function isCloudinaryUrl(url: string): boolean {
  return url.includes('cloudinary.com') || url.includes('res.cloudinary.com');
}



/**
 * Get Cloudinary usage statistics (server-only)
 */
export async function getCloudinaryStats(): Promise<{
  usage: Record<string, unknown>;
  resources: number;
  transformations: number;
}> {
  try {
    const [usage, resources] = await Promise.all([
      cloudinary.api.usage(),
      cloudinary.api.resources({ max_results: 1 })
    ]);

    return {
      usage,
      resources: resources.total_count,
      transformations: usage.transformations?.usage || 0
    };
  } catch (error) {
    logger.error('Failed to get Cloudinary stats', 'CLOUDINARY_STATS', {}, error as Error);
    throw error;
  }
}

export { cloudinary };

export default {
  upload: uploadToCloudinary,
  delete: deleteFromCloudinary,
  generateUrl: generateCloudinaryUrl,
  extractPublicId: extractPublicIdFromUrl,
  isCloudinaryUrl,
  getStats: getCloudinaryStats
}; 