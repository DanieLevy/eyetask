'use client';

/**
 * Client-safe Cloudinary utilities
 * These functions don't require the Cloudinary Node.js SDK
 */

/**
 * Extract public ID from Cloudinary URL
 */
export function extractPublicIdFromUrl(url: string): string | null {
  try {
    // Handle different Cloudinary URL formats with better folder support
    const patterns = [
      /\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/, // Standard upload with optional version
      /\/v\d+\/(.+?)(?:\.[^.]+)?$/, // Simple version format
      /([^/]+?)(?:\.[^.]+)?$/, // Simplest format
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        let publicId = match[1];
        
        // Remove file extension from the end only
        publicId = publicId.replace(/\.[^.]+$/, '');
        
        return publicId;
      }
    }
    
    return null;
  } catch {
    console.warn('Failed to extract public ID from URL', { url });
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
 * Generate optimized Cloudinary URLs (client-safe)
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
  const cloudName = 'dwbu6wc62'; // Your cloud name from the CLOUDINARY_URL
  const baseUrl = `https://res.cloudinary.com/${cloudName}/image/upload`;
  
  const transformations = [];
  
  if (options.width) transformations.push(`w_${options.width}`);
  if (options.height) transformations.push(`h_${options.height}`);
  if (options.crop) transformations.push(`c_${options.crop}`);
  if (options.quality) transformations.push(`q_${options.quality}`);
  if (options.format) transformations.push(`f_${options.format}`);
  
  // Add default optimizations
  if (!options.quality) transformations.push('q_auto:good');
  if (!options.format) transformations.push('f_auto');
  transformations.push('fl_progressive');
  
  const transformationString = transformations.length > 0 ? transformations.join(',') + '/' : '';
  
  return `${baseUrl}/${transformationString}${publicId}`;
}



/**
 * Get optimized image URL for different sizes
 */
export function getOptimizedImageUrl(
  src: string,
  size: 'thumbnail' | 'medium' | 'large' | 'original' = 'original',
  options: {
    quality?: string;
    format?: string;
  } = {}
): string {
  // Handle Cloudinary images with optimization
  if (isCloudinaryUrl(src)) {
    // Extract public ID using the improved function
    const publicId = extractPublicIdFromUrl(src);
    
    if (!publicId) {
      console.warn('Could not extract public ID from URL:', src);
      return src;
    }

    const sizeConfigs = {
      thumbnail: { width: 150, height: 150, crop: 'fill' },
      medium: { width: 500, height: 500, crop: 'limit' },
      large: { width: 1200, height: 1200, crop: 'limit' },
      original: {}
    };

    return generateCloudinaryUrl(publicId, {
      ...sizeConfigs[size],
      quality: options.quality || 'auto:good',
      format: options.format || 'auto'
    });
  }

  // Return original URL for non-Cloudinary URLs
  return src;
}

/**
 * Generate thumbnail URL for blur placeholder
 */
export function getThumbnailUrl(src: string): string | undefined {
  if (isCloudinaryUrl(src)) {
    const publicId = extractPublicIdFromUrl(src);
    
    if (!publicId) {
      return undefined;
    }

    return generateCloudinaryUrl(publicId, {
      width: 20,
      height: 20,
      quality: 'auto:low',
      crop: 'fill',
      format: 'auto',
      transformation: 'e_blur:300'
    });
  }
  return undefined;
}

/**
 * Generate download URL for Cloudinary images
 */
export function getDownloadUrl(src: string): string {
  if (isCloudinaryUrl(src)) {
    const publicIdMatch = src.match(/\/v\d+\/(.+)\.[^.]+$/) || src.match(/\/([^/]+)\.[^.]+$/);
    if (publicIdMatch) {
      const publicId = publicIdMatch[1];
      return `https://res.cloudinary.com/dwbu6wc62/image/upload/fl_attachment/${publicId}`;
    }
  }
  return src;
}

export default {
  extractPublicId: extractPublicIdFromUrl,
  isCloudinaryUrl,
  generateUrl: generateCloudinaryUrl,
  getOptimizedImageUrl,
  getThumbnailUrl,
  getDownloadUrl
}; 