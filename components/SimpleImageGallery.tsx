'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { X, Maximize } from 'lucide-react';
import Image from 'next/image';
import ImageZoomViewer from './ImageZoomViewer';

interface GalleryImage {
  id: string;
  url: string;
}

interface SimpleImageGalleryProps {
  images: GalleryImage[] | string[];
  onRemove?: (id: string) => void;
  removable?: boolean;
  maxHeight?: string;
  className?: string;
}

export default function SimpleImageGallery({ 
  images, 
  onRemove, 
  removable = false,
  maxHeight = '200px',
  className = ''
}: SimpleImageGalleryProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  
  // Handle both array of objects with id/url and array of string URLs
  const processedImages = useMemo(() => {
    return images.map((image, index) => {
      if (typeof image === 'string') {
        return {
          id: `image-${index}`,
          url: image
        };
      }
      return image as GalleryImage;
    });
  }, [images]);

  // Get all image URLs for the zoom viewer
  const imageUrls = useMemo(() => {
    return processedImages.map(img => img.url);
  }, [processedImages]);

  const handleImageLoaded = useCallback((url: string) => {
    setLoadedImages(prev => {
      const newSet = new Set(prev);
      newSet.add(url);
      return newSet;
    });
  }, []);

  const handleOpenViewer = (index: number) => {
    setActiveIndex(index);
  };

  const handleCloseViewer = () => {
    setActiveIndex(null);
  };

  // Check if URL is a base64 data URL
  const isBase64Image = (url: string) => {
    return url.startsWith('data:');
  };

  if (!processedImages.length) {
    return null;
  }

  return (
    <>
      <div 
        className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 ${className}`}
        ref={galleryRef}
      >
        {processedImages.map((image, index) => (
          <div 
            key={image.id} 
            className="relative group aspect-square rounded-md overflow-hidden shadow-sm border border-gray-200 dark:border-gray-800"
            style={{ maxHeight }}
          >
            {/* Use a wrapper div to maintain aspect ratio */}
            <div className="w-full h-full relative">
              {/* Use img for base64 images and next/image for regular URLs */}
              {isBase64Image(image.url) ? (
                <img
                  src={image.url}
                  alt="Gallery image"
                  className="w-full h-full object-cover"
                  loading="eager"
                  onLoad={() => handleImageLoaded(image.url)}
                  style={{ 
                    opacity: loadedImages.has(image.url) ? 1 : 0,
                    transition: 'opacity 0.3s ease-in-out'
                  }}
                />
              ) : (
                <Image
                  src={image.url}
                  alt="Gallery image"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                  loading="eager"
                  onLoad={() => handleImageLoaded(image.url)}
                  style={{ 
                    opacity: loadedImages.has(image.url) ? 1 : 0,
                    transition: 'opacity 0.3s ease-in-out'
                  }}
                />
              )}
              
              {/* Loading indicator */}
              {!loadedImages.has(image.url) && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            
            {/* Controls overlay */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
              {removable && onRemove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(image.id);
                  }}
                  className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => handleOpenViewer(index)}
                className="p-2 bg-white/80 text-gray-900 rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110"
                aria-label="View image"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Advanced Image Zoom Viewer */}
      <ImageZoomViewer
        images={imageUrls}
        initialIndex={activeIndex || 0}
        isOpen={activeIndex !== null}
        onClose={handleCloseViewer}
      />
    </>
  );
}