import { logger } from './logger';
import { uploadToCloudinary, deleteFromCloudinary, isCloudinaryUrl, extractPublicIdFromUrl, type CloudinaryUploadResult } from './cloudinary-server';

/**
 * Enhanced file storage service using Cloudinary
 */

/**
 * Save a file using Cloudinary
 * @param file The file to upload
 * @param options Upload options including folder, tags, etc.
 * @returns Cloudinary URL and metadata
 */
export async function saveFile(
  file: File, 
  options: {
    folder?: string;
    tags?: string[];
    context?: Record<string, string>;
  } = {}
): Promise<string> {
  try {
    logger.info('Starting file upload to Cloudinary', 'FILE_STORAGE', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      folder: options.folder || 'drivertasks'
    });

    const result = await uploadToCloudinary(file, {
      folder: options.folder || 'drivertasks',
      tags: options.tags || ['file-upload'],
      context: options.context || {}
    });

    if (!result.success || !result.secureUrl) {
      throw new Error(result.error || 'Upload failed');
    }

    logger.info('File uploaded successfully to Cloudinary', 'FILE_STORAGE', {
      fileName: file.name,
      publicId: result.publicId,
      secureUrl: result.secureUrl,
      bytes: result.bytes,
      format: result.format
    });

    return result.secureUrl;
  } catch (error) {
    logger.error('Failed to upload file to Cloudinary', 'FILE_STORAGE', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    }, error as Error);
    throw error;
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
 * Handles Cloudinary URLs
 * @param fileUrl The URL of the file to delete
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  try {
    // Handle Cloudinary URLs
    if (isCloudinaryUrl(fileUrl)) {
      const publicId = extractPublicIdFromUrl(fileUrl);
      if (publicId) {
        logger.info('Deleting file from Cloudinary', 'FILE_STORAGE_DELETE', { 
          fileUrl, 
          publicId 
        });

        const result = await deleteFromCloudinary(publicId);
        
        if (!result.success) {
          logger.warn('Failed to delete file from Cloudinary', 'FILE_STORAGE_DELETE', {
            fileUrl,
            publicId,
            error: result.error
          });
        } else {
          logger.info('File deleted successfully from Cloudinary', 'FILE_STORAGE_DELETE', {
            publicId
          });
        }
      } else {
        logger.warn('Could not extract public ID from Cloudinary URL', 'FILE_STORAGE_DELETE', {
          fileUrl
        });
      }
    } else {
      logger.warn('Unknown file URL format for deletion', 'FILE_STORAGE_DELETE', {
        fileUrl
      });
    }
  } catch (error) {
    logger.error('Error deleting file', 'FILE_STORAGE_DELETE', {
      fileUrl
    }, error as Error);
    // Don't throw error for deletion failures to avoid breaking the application
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
  saveFile,
  saveMultipleFiles,
  deleteFile,
  deleteMultipleFiles,
  getFileInfo,
  saveFileToCloudinary: saveFile
}; 