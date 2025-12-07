import fs from 'fs/promises';
import path from 'path';
import { uploadToCloudinary, deleteFromCloudinary, isCloudinaryUrl, extractPublicIdFromUrl } from './cloudinary-server';
import { logger } from './logger';

/**
 * Enhanced file storage service using Cloudinary
 */

/**
 * Save a file to storage (local for development, Cloudinary for production)
 */
export async function saveFile(
  file: File,
  options: {
    folder?: string;
    tags?: string[];
  } = {}
): Promise<{ success: boolean; url?: string; publicId?: string; error?: string }> {
  try {
    logger.info('Starting file upload to Cloudinary', 'FILE_STORAGE', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      folder: options.folder || 'drivertasks/uploads'
    });

    // Check if Cloudinary is configured
    const isCloudinaryConfigured = !!process.env.CLOUDINARY_URL;
    
    if (!isCloudinaryConfigured) {
      // Fallback to local storage in development
      logger.warn('Cloudinary not configured, using local storage fallback', 'FILE_STORAGE');
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(7);
      const extension = path.extname(file.name);
      const filename = `${timestamp}-${randomString}${extension}`;
      const filepath = path.join(uploadsDir, filename);
      
      // Convert File to Buffer and save
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(filepath, buffer);
      
      // Return local URL
      const url = `/uploads/${filename}`;
      
      logger.info('File saved locally', 'FILE_STORAGE', {
        fileName: file.name,
        savedAs: filename,
        url
      });
      
      return {
        success: true,
        url,
        publicId: filename
      };
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(file, {
      folder: options.folder || 'drivertasks/uploads',
      tags: options.tags || ['drivertasks', 'user-upload'],
      quality: 'auto:good',
      eager: [
        { width: 150, height: 150, crop: 'fill', quality: 'auto' },
        { width: 500, height: 500, crop: 'limit', quality: 'auto' }
      ]
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }
    
    logger.info('File uploaded to Cloudinary successfully', 'FILE_STORAGE', {
      fileName: file.name,
      publicId: result.publicId,
      url: result.secureUrl
    });
    
    return {
      success: true,
      url: result.secureUrl,
      publicId: result.publicId
    };
  } catch (error) {
    logger.error('Failed to upload file', 'FILE_STORAGE', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    }, error as Error);
    
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * Save multiple files to Cloudinary
 * @param files Array of files to upload
 * @param options Upload options
 * @returns Array of Cloudinary URLs
 */
export async function saveMultipleFiles(
  files: File[],
  options: {
    folder?: string;
    tags?: string[];
    context?: Record<string, string>;
  } = {}
): Promise<string[]> {
  try {
    logger.info('Starting batch file upload to Cloudinary', 'FILE_STORAGE_BATCH', {
      fileCount: files.length,
      folder: options.folder || 'drivertasks'
    });

    const uploadPromises = files.map(async (file, index) => {
      const result = await uploadToCloudinary(file, {
        folder: options.folder || 'drivertasks',
        tags: [...(options.tags || []), `batch-${Date.now()}`, `index-${index}`],
        context: { ...options.context, originalIndex: index.toString() }
      });

      if (!result.success || !result.secureUrl) {
        throw new Error(`Upload failed for file ${file.name}: ${result.error}`);
      }

      return result.secureUrl;
    });

    const urls = await Promise.all(uploadPromises);

    logger.info('Batch file upload completed', 'FILE_STORAGE_BATCH', {
      fileCount: files.length,
      successCount: urls.length
    });

    return urls;
  } catch (error) {
    logger.error('Batch file upload failed', 'FILE_STORAGE_BATCH', {
      fileCount: files.length
    }, error as Error);
    throw error;
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(publicIdOrUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if it's a local file
    if (publicIdOrUrl.startsWith('/uploads/')) {
      // Local file deletion
      const filename = publicIdOrUrl.replace('/uploads/', '');
      const filepath = path.join(process.cwd(), 'public', 'uploads', filename);
      
      try {
        await fs.unlink(filepath);
        logger.info('Local file deleted', 'FILE_STORAGE', { filename });
        return { success: true };
      } catch (error) {
        logger.warn('Failed to delete local file', 'FILE_STORAGE', { 
          filename, 
          error: (error as Error).message 
        });
        return { success: false, error: 'File not found' };
      }
    }
    
    // Cloudinary deletion
    const result = await deleteFromCloudinary(publicIdOrUrl);
    
    if (result.success) {
      logger.info('File deleted from Cloudinary', 'FILE_STORAGE', { publicId: publicIdOrUrl });
    }
    
    return result;
  } catch (error) {
    logger.error('Failed to delete file', 'FILE_STORAGE', { publicIdOrUrl }, error as Error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * Delete multiple files from storage
 * @param fileUrls Array of file URLs to delete
 */
export async function deleteMultipleFiles(fileUrls: string[]): Promise<void> {
  try {
    logger.info('Starting batch file deletion', 'FILE_STORAGE_DELETE_BATCH', {
      fileCount: fileUrls.length
    });

    const deletionPromises = fileUrls.map(url => deleteFile(url));
    await Promise.allSettled(deletionPromises); // Use allSettled to continue even if some fail

    logger.info('Batch file deletion completed', 'FILE_STORAGE_DELETE_BATCH', {
      fileCount: fileUrls.length
    });
  } catch (error) {
    logger.error('Batch file deletion failed', 'FILE_STORAGE_DELETE_BATCH', {
      fileCount: fileUrls.length
    }, error as Error);
  }
}

/**
 * Get file information from URL
 * @param url File URL (Cloudinary URL)
 * @returns File information
 */
export function getFileInfo(url: string): {
  type: 'cloudinary' | 'unknown';
  publicId?: string;
  isLegacy: boolean;
} {
  if (isCloudinaryUrl(url)) {
    return {
      type: 'cloudinary',
      publicId: extractPublicIdFromUrl(url) || undefined,
      isLegacy: false
    };
  }

  return {
    type: 'unknown',
    isLegacy: true
  };
}

// Export legacy function name for backward compatibility
export { saveFile as saveFileToCloudinary };

// Export all functions as default
export default {
  save: saveFile,
  saveMultipleFiles,
  delete: deleteFile,
  deleteMultipleFiles,
  getFileInfo,
  saveFileToCloudinary: saveFile
}; 