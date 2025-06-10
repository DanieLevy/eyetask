import { logger } from './logger';

/**
 * Converts a file to a base64 data URL.
 * @param file The file to convert (from FormData).
 * @returns The base64 data URL of the file.
 */
export async function saveFile(file: File): Promise<string> {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Convert to base64 data URL
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;
    
    logger.info('Image converted to base64', 'FILE_STORAGE', {
      fileType: file.type,
      fileSize: file.size,
      base64Length: base64.length
    });
    
    return dataUrl;
  } catch (error) {
    logger.error('Failed to convert file to base64', 'FILE_STORAGE', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    }, error as Error);
    throw error;
  }
}

/**
 * Handles file deletion. For base64 URLs, this is a no-op since they're stored in the database.
 * For legacy file system URLs (if any still exist), this is also a no-op since we're not
 * using the file system for storage anymore.
 * @param fileUrl The URL of the file to delete.
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  // No-op function since we're only using base64 now
  // We keep the function to maintain compatibility with existing code
  return;
} 