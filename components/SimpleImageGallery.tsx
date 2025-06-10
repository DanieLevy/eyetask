'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { X, ZoomIn } from 'lucide-react';

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
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  
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

  const handleImageLoaded = useCallback((url: string) => {
    setLoadedImages(prev => {
      const newSet = new Set(prev);
      newSet.add(url);
      return newSet;
    });
  }, []);

  const handleImageClick = (url: string) => {
    setExpandedImage(url);
  };

  const handleCloseExpanded = () => {
    setExpandedImage(null);
  };

  if (!processedImages.length) {
    return null;
  }

  return (
    <>
      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 ${className}`}>
        {processedImages.map((image) => (
          <div 
            key={image.id} 
            className="relative group aspect-square rounded-md overflow-hidden shadow-sm border border-gray-200 dark:border-gray-800"
            style={{ maxHeight }}
          >
            {/* Use a wrapper div to maintain aspect ratio */}
            <div className="w-full h-full relative">
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
              
              {/* Loading indicator */}
              {!loadedImages.has(image.url) && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            
            {/* Controls overlay */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center">
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
                onClick={() => handleImageClick(image.url)}
                className="p-2 bg-white/80 text-gray-900 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Zoom image"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Image viewer modal */}
      {expandedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4" 
          onClick={handleCloseExpanded}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full overflow-hidden">
            <button 
              className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full z-10"
              onClick={handleCloseExpanded}
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={expandedImage} 
              alt="Expanded view" 
              className="max-h-[90vh] max-w-full object-contain mx-auto rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}