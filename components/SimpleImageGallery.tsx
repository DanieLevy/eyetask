// Install: npm install yet-another-react-lightbox

'use client';

import Image from 'next/image';
import { useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
// Optional plugins
import Download from 'yet-another-react-lightbox/plugins/download';
import Share from 'yet-another-react-lightbox/plugins/share';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/plugins/thumbnails.css';

interface ImageGalleryProps {
  images: string[];
  alt?: string;
  className?: string;
}

/**
 * Modern Image Gallery Component
 * Uses Next.js Image for optimized loading with proper lazy loading
 * Integrates with yet-another-react-lightbox for full-screen viewing
 */
export default function ModernImageGallery({ 
  images, 
  alt = 'Gallery image',
  className = ''
}: ImageGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Transform images for lightbox format
  const slides = images.map((src, index) => ({
    src,
    alt: `${alt} ${index + 1}`,
  }));

  return (
    <>
      {/* Thumbnail Grid - Using Next.js Image */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
        {images.map((image, index) => (
          <div
            key={index}
            className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
            onClick={() => {
              setPhotoIndex(index);
              setIsOpen(true);
            }}
          >
            <Image
              src={image}
              alt={`${alt} ${index + 1}`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-110"
            />
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/20 backdrop-blur-sm rounded-full p-2">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      <Lightbox
        open={isOpen}
        close={() => setIsOpen(false)}
        slides={slides}
        index={photoIndex}
        plugins={[Zoom, Download, Share, Thumbnails]}
        zoom={{
          maxZoomPixelRatio: 3,
          zoomInMultiplier: 2,
        }}
        thumbnails={{
          position: 'bottom',
          width: 80,
          height: 60,
          border: 0,
          borderRadius: 8,
          padding: 4,
          gap: 8,
        }}
        carousel={{
          finite: false,
          preload: 2,
          padding: 0,
        }}
        animation={{
          fade: 300,
          swipe: 500,
        }}
        controller={{
          closeOnPullDown: true,
          closeOnBackdropClick: true,
        }}
        // Custom styles
        styles={{
          container: { 
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(8px)',
          },
        }}
      />
    </>
  );
}

// Alternative: Optimized Gallery Component
export function NextJSImageGallery({ images, alt = 'Gallery image', className = '' }: ImageGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const slides = images.map((src, index) => ({
    src,
    alt: `${alt} ${index + 1}`,
  }));

  return (
    <>
      <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
        {images.map((image, index) => (
          <div
            key={index}
            className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl"
            onClick={() => {
              setPhotoIndex(index);
              setIsOpen(true);
            }}
          >
            <Image
              src={image}
              alt={`${alt} ${index + 1}`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-110"
            />
          </div>
        ))}
      </div>

      <Lightbox
        open={isOpen}
        close={() => setIsOpen(false)}
        slides={slides}
        index={photoIndex}
        plugins={[Zoom, Download, Thumbnails]}
        carousel={{
          padding: 0,
        }}
        styles={{
          container: {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
          },
        }}
      />
    </>
  );
}