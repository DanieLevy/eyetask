'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';
import { useImageZoom } from '@/hooks/useImageZoom';
import { createPortal } from 'react-dom';

interface ImageZoomViewerProps {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
  isOpen: boolean;
}

export default function ImageZoomViewer({
  images,
  initialIndex = 0,
  onClose,
  isOpen
}: ImageZoomViewerProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const swiperRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const currentTranslateX = useRef<number>(0);
  const [isSwipeable, setIsSwipeable] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { 
    zoom, 
    position, 
    imageRef, 
    zoomIn, 
    zoomOut, 
    reset 
  } = useImageZoom({
    maxZoom: 5,
    minZoom: 1,
    zoomStep: 0.5,
    onZoomChange: (newZoom) => {
      setIsSwipeable(newZoom <= 1);
    }
  });

  // Create portal for better stacking context
  useEffect(() => {
    setPortalElement(document.body);
    
    // Prevent body scroll
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowRight':
          if (isSwipeable) {
            navigateToImage(activeIndex + 1);
          }
          break;
        case 'ArrowLeft':
          if (isSwipeable) {
            navigateToImage(activeIndex - 1);
          }
          break;
        case '+':
          zoomIn();
          break;
        case '-':
          zoomOut();
          break;
        case '0':
          reset();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, zoomIn, zoomOut, reset, isSwipeable]);

  // Auto-hide controls after inactivity
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      
      controlsTimeoutRef.current = setTimeout(() => {
        if (zoom > 1) {
          setShowControls(false);
        }
      }, 2000);
    };
    
    if (isOpen) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('touchstart', handleMouseMove);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleMouseMove);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isOpen, zoom]);

  // Navigate to a specific image
  const navigateToImage = (index: number) => {
    if (index < 0 || index >= images.length) return;
    
    setActiveIndex(index);
    reset();
  };

  // Handle swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isSwipeable) return;
    
    touchStartX.current = e.touches[0].clientX;
    currentTranslateX.current = activeIndex * -100;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwipeable || !swiperRef.current) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX.current;
    const percentMove = (diff / window.innerWidth) * 100;
    
    // Limit overscroll
    const maxTranslate = 0;
    const minTranslate = -((images.length - 1) * 100);
    let newTranslate = currentTranslateX.current + percentMove;
    
    // Add resistance at edges
    if (newTranslate > maxTranslate) {
      newTranslate = maxTranslate + (newTranslate - maxTranslate) * 0.3;
    } else if (newTranslate < minTranslate) {
      newTranslate = minTranslate + (newTranslate - minTranslate) * 0.3;
    }
    
    swiperRef.current.style.transform = `translateX(${newTranslate}%)`;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isSwipeable || !swiperRef.current) return;
    
    const currentX = e.changedTouches[0].clientX;
    const diff = currentX - touchStartX.current;
    
    // If swipe is significant enough (20% of screen width), navigate
    if (Math.abs(diff) > window.innerWidth * 0.2) {
      if (diff > 0 && activeIndex > 0) {
        navigateToImage(activeIndex - 1);
      } else if (diff < 0 && activeIndex < images.length - 1) {
        navigateToImage(activeIndex + 1);
      } else {
        // Reset to current image if at edge
        swiperRef.current.style.transform = `translateX(${activeIndex * -100}%)`;
      }
    } else {
      // Not enough swipe, reset to current image
      swiperRef.current.style.transform = `translateX(${activeIndex * -100}%)`;
    }
  };

  // Handle download of current image
  const downloadImage = () => {
    const currentImage = images[activeIndex];
    
    // For base64 images, decode and create a blob
    if (currentImage.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = currentImage;
      a.download = `image-${activeIndex + 1}.png`;
      a.click();
    } else {
      // For remote URLs, create a link
      fetch(currentImage)
        .then(response => response.blob())
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `image-${activeIndex + 1}.jpg`;
          a.click();
          window.URL.revokeObjectURL(url);
        });
    }
  };

  if (!isOpen || !portalElement) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-black/40 to-black/30 backdrop-blur-xl transition-all duration-300"
      ref={containerRef}
      onClick={onClose}
      style={{
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        background: 'linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.2) 100%)'
      }}
    >
      {/* Zoom controls */}
      <div 
        className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2 bg-black/50 rounded-full p-1 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
      >
        <button 
          className="p-2 text-white hover:bg-white/20 rounded-full"
          onClick={(e) => { e.stopPropagation(); zoomOut(); }}
          disabled={zoom <= 1}
          aria-label="Zoom out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        
        <button 
          className="p-2 text-white hover:bg-white/20 rounded-full"
          onClick={(e) => { e.stopPropagation(); reset(); }}
          aria-label="Reset zoom"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        
        <button 
          className="p-2 text-white hover:bg-white/20 rounded-full"
          onClick={(e) => { e.stopPropagation(); zoomIn(); }}
          disabled={zoom >= 5}
          aria-label="Zoom in"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        
        <button 
          className="p-2 text-white hover:bg-white/20 rounded-full"
          onClick={(e) => { e.stopPropagation(); downloadImage(); }}
          aria-label="Download image"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>

      {/* Image counter */}
      <div 
        className={`absolute top-4 left-4 z-50 bg-black/50 text-white px-3 py-1 rounded-full text-sm transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {activeIndex + 1} / {images.length}
      </div>

      {/* Navigation buttons for desktop */}
      {images.length > 1 && isSwipeable && (
        <>
          <button 
            className={`absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/50 text-white rounded-full transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'} ${activeIndex === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
            onClick={(e) => { e.stopPropagation(); navigateToImage(activeIndex - 1); }}
            disabled={activeIndex === 0}
            aria-label="Previous image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          
          <button 
            className={`absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/50 text-white rounded-full transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'} ${activeIndex === images.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
            onClick={(e) => { e.stopPropagation(); navigateToImage(activeIndex + 1); }}
            disabled={activeIndex === images.length - 1}
            aria-label="Next image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      {/* Main swiper container */}
      <div 
        className="relative w-full h-full overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          ref={swiperRef}
          className="flex h-full w-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${-activeIndex * 100}%)` }}
        >
          {images.map((src, index) => (
            <div 
              key={index} 
              className="min-w-full h-full flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div 
                className="relative max-w-full max-h-full overflow-hidden"
                style={{ 
                  transform: zoom > 1 ? `scale(${zoom}) translate(${position.x}px, ${position.y}px)` : 'none',
                  transition: zoom > 1 ? 'none' : 'transform 0.3s ease-out'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <img 
                  ref={index === activeIndex ? imageRef : null}
                  src={src} 
                  alt={`Image ${index + 1}`}
                  className="max-h-[90vh] max-w-full object-contain rounded-lg shadow-2xl"
                  style={{ 
                    cursor: zoom > 1 ? 'grab' : 'zoom-in',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    portalElement
  );
} 