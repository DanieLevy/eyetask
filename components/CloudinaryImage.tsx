'use client';

import { useState, useCallback, useMemo } from 'react';
import { generateCloudinaryUrl, isCloudinaryUrl, getThumbnailUrl } from '@/lib/cloudinary-client';

interface CloudinaryImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  quality?: string | number;
  crop?: string;
  format?: string;
  transformation?: string;
  sizes?: string;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
  fill?: boolean;
  style?: React.CSSProperties;
  onClick?: () => void;
  onLoad?: () => void;
  onError?: () => void;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

/**
 * Enhanced image component that handles Cloudinary images with optimization
 * Automatically optimizes Cloudinary images and provides fallbacks
 */
export default function CloudinaryImage({
  src,
  alt,
  width,
  height,
  className = '',
  quality = 'auto:good',
  crop = 'limit',
  format = 'auto',
  transformation,
  sizes,
  priority = false,
  loading = 'lazy',
  fill = false,
  style,
  onClick,
  onLoad,
  onError,
  placeholder,
  blurDataURL
}: CloudinaryImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Handle image load
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  // Handle image error
  const handleError = useCallback(() => {
    setImageError(true);
    setIsLoading(false);
    onError?.();
  }, [onError]);

  // Generate optimized image URL
  const getOptimizedImageUrl = useCallback(() => {
    // Handle Cloudinary images with optimization
    if (isCloudinaryUrl(src)) {
      // For existing Cloudinary URLs without additional transformations, use as-is
      if (!width && !height && !transformation) {
        return src; // Use the original URL as-is
      }
      
      // Extract public ID from existing Cloudinary URL (improved regex)
      const publicIdMatch = src.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/) || 
                           src.match(/\/v\d+\/(.+?)(?:\.[^.]+)?$/) || 
                           src.match(/([^/]+?)(?:\.[^.]+)?$/);
      
      if (publicIdMatch) {
        let publicId = publicIdMatch[1];
        
        // Handle folder structure in public ID
        if (publicId.includes('/')) {
          // Keep folder structure intact
          publicId = publicId.replace(/\.[^.]+$/, ''); // Only remove final extension
        } else {
          publicId = publicId.replace(/\.[^.]+$/, ''); // Remove extension
        }
        
        return generateCloudinaryUrl(publicId, {
          width,
          height,
          quality: quality.toString(),
          crop,
          format,
          transformation
        });
      }
    }

    // Return original URL for other cases (non-Cloudinary URLs)
    return src;
  }, [src, width, height, quality, crop, format, transformation]);

  // Generate thumbnail for blur placeholder
  const thumbnailUrl = getThumbnailUrl(src);

  // Calculate optimized source URL
  const optimizedSrc = useMemo(() => {
    // For debugging: Use the original URL directly for Cloudinary images
    if (isCloudinaryUrl(src) && !width && !height && !transformation) {
      console.log('Using original Cloudinary URL:', src);
      return src;
    }
    return getOptimizedImageUrl();
  }, [src, width, height, transformation, getOptimizedImageUrl]);

  // Error fallback
  if (imageError) {
    return (
      <div 
        className={`bg-red-100 dark:bg-red-900 border-2 border-red-300 dark:border-red-700 flex items-center justify-center ${className}`}
        style={{ width, height, ...style }}
        onClick={onClick}
      >
        <div className="text-red-600 dark:text-red-400 text-center p-2">
          <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
          <span className="text-xs">Image failed to load</span>
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs mt-1 break-all">
              {src.substring(0, 50)}...
            </div>
          )}
        </div>
      </div>
    );
  }

  // Don't show loading state for now to debug the black image issue
  // if (isLoading) {
  //   return (
  //     <div 
  //       className={`bg-gray-100 dark:bg-gray-900 animate-pulse flex items-center justify-center ${className}`}
  //       style={{ width, height, ...style }}
  //     >
  //       <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
  //         <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
  //       </svg>
  //     </div>
  //   );
  // }

  // For Cloudinary and other URLs, use Next.js Image with optimization
  const imageProps: any = {
    src: optimizedSrc,
    alt,
    className,
    style: {
      ...style,
      // Override Next.js default styles that might cause transparency issues
      color: 'initial',
      background: 'none'
    },
    priority,
    loading,
    onClick,
    onLoad: handleLoad,
    onError: handleError,
    unoptimized: true // Force unoptimized for debugging
  };

  // Add dimensions or fill
  if (fill) {
    imageProps.fill = true;
    imageProps.sizes = sizes || '100vw';
  } else {
    imageProps.width = width;
    imageProps.height = height;
    if (sizes) imageProps.sizes = sizes;
  }

  // Skip blur placeholder for now during debugging
  // if (placeholder === 'blur' && thumbnailUrl) {
  //   imageProps.placeholder = 'blur';
  //   imageProps.blurDataURL = blurDataURL || thumbnailUrl;
  // }



  // Use regular img tag for ALL cases to fix black image issue
  // The issue is that Next.js Image component is applying problematic styles
  
  if (fill) {
    return (
      <img 
        src={optimizedSrc}
        alt={alt}
        className={`${className} absolute inset-0 w-full h-full object-cover`}
        style={{
          ...style,
          color: 'initial',
          background: 'none'
        }}
        onLoad={handleLoad}
        onError={handleError}
        onClick={onClick}
      />
    );
  } else {
    // Use regular img tag for width/height cases too
    return (
      <img 
        src={optimizedSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={{
          ...style,
          color: 'initial',
          background: 'none'
        }}
        onLoad={handleLoad}
        onError={handleError}
        onClick={onClick}
      />
    );
  }
}

/**
 * Cloudinary Image Gallery Component
 * Optimized for displaying multiple images with different sizes
 */
interface CloudinaryImageGalleryProps {
  images: string[];
  alt?: string;
  className?: string;
  imageClassName?: string;
  onImageClick?: (index: number) => void;
  sizes?: {
    thumbnail?: { width: number; height: number };
    medium?: { width: number; height: number };
    large?: { width: number; height: number };
  };
}

export function CloudinaryImageGallery({
  images,
  alt = 'Gallery image',
  className = '',
  imageClassName = '',
  onImageClick,
  sizes = {
    thumbnail: { width: 150, height: 150 },
    medium: { width: 500, height: 500 },
    large: { width: 1200, height: 1200 }
  }
}: CloudinaryImageGalleryProps) {
  if (!images.length) return null;

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 ${className}`}>
      {images.map((image, index) => (
        <div
          key={index}
          className="relative aspect-square cursor-pointer overflow-hidden rounded-md border border-gray-200 dark:border-gray-800"
          onClick={() => onImageClick?.(index)}
        >
          <CloudinaryImage
            src={image}
            alt={`${alt} ${index + 1}`}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className={`object-cover transition-transform hover:scale-105 ${imageClassName}`}
            crop="fill"
            quality="auto:good"
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Responsive Cloudinary Image Component
 * Automatically serves different sizes based on viewport
 */
interface ResponsiveCloudinaryImageProps extends Omit<CloudinaryImageProps, 'width' | 'height'> {
  publicId?: string;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'landscape';
  breakpoints?: {
    mobile: { width: number; height: number };
    tablet: { width: number; height: number };
    desktop: { width: number; height: number };
  };
}

export function ResponsiveCloudinaryImage({
  src,
  publicId,
  alt,
  aspectRatio = 'landscape',
  breakpoints = {
    mobile: { width: 400, height: 300 },
    tablet: { width: 800, height: 600 },
    desktop: { width: 1200, height: 900 }
  },
  ...props
}: ResponsiveCloudinaryImageProps) {
  const aspectRatios = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
    landscape: 'aspect-[4/3]'
  };

  return (
    <div className={`relative ${aspectRatios[aspectRatio]} ${props.className || ''}`}>
      <CloudinaryImage
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        quality="auto:good"
        crop="fill"
        {...props}
        className="object-cover"
      />
    </div>
  );
} 