'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Download, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useImageZoom } from '@/hooks/useImageZoom';

interface ImprovedImageViewerProps {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
  isOpen: boolean;
  isRTL?: boolean;
}

export default function ImprovedImageViewer({
  images,
  initialIndex = 0,
  onClose,
  isOpen,
  isRTL = false
}: ImprovedImageViewerProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [isSwipeable, setIsSwipeable] = useState(true);
  const [isTouching, setIsTouching] = useState(false);
  
  const backgroundRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const swiperRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const currentTranslateX = useRef<number>(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasMoved = useRef<boolean>(false);

  // Use the image zoom hook
  const { 
    zoom, 
    position, 
    imageRef,
    containerRef,
    zoomIn: handleZoomIn,
    zoomOut: handleZoomOut, 
    reset: handleReset
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
        case 'ArrowLeft':
          isRTL ? navigateNext() : navigatePrev();
          break;
        case 'ArrowRight':
          isRTL ? navigatePrev() : navigateNext();
          break;
        case '+':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case '0':
          handleReset();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, images.length, onClose, isRTL, handleZoomIn, handleZoomOut, handleReset]);

  // Auto-hide controls after inactivity
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
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
  }, [isOpen]);

  // Improved background click handler
  const handleBackgroundClick = (e: React.MouseEvent) => {
    // Don't close if currently touching (mobile)
    if (isTouching) return;
    
    // Only close if clicking directly on the background
    if (e.target === backgroundRef.current) {
      console.log('Background clicked, closing viewer');
      onClose();
    }
  };

  // Navigation
  const navigatePrev = () => {
    if (activeIndex > 0) {
      navigateToImage(activeIndex - 1);
    }
  };

  const navigateNext = () => {
    if (activeIndex < images.length - 1) {
      navigateToImage(activeIndex + 1);
    }
  };

  const navigateToImage = (index: number) => {
    if (index < 0 || index >= images.length) return;
    
    setActiveIndex(index);
    handleReset();
    if (swiperRef.current) {
      swiperRef.current.style.transform = `translateX(${isRTL ? index * 100 : -index * 100}%)`;
    }
  };

  // Improved touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsTouching(true);
    hasMoved.current = false;
    
    // Skip if zoomed in - useImageZoom will handle touch events when zoomed
    if (zoom > 1) return;
    
    if (!isSwipeable || !swiperRef.current) return;
    
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    currentTranslateX.current = isRTL ? activeIndex * 100 : -activeIndex * 100;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isTouching) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartX.current);
    const deltaY = Math.abs(touch.clientY - touchStartY.current);
    
    // Determine if this is a horizontal swipe (for navigation) or vertical (for scrolling/zooming)
    if (deltaX > 10 || deltaY > 10) {
      hasMoved.current = true;
    }
    
    // Skip if zoomed in - useImageZoom will handle touch events when zoomed
    if (zoom > 1) return;
    
    if (!isSwipeable || !swiperRef.current) return;
    
    // Only handle horizontal swipes for navigation
    if (deltaX > deltaY && deltaX > 10) {
      e.preventDefault(); // Prevent scrolling during horizontal swipe
      
      const diff = touch.clientX - touchStartX.current;
      const percentMove = (diff / window.innerWidth) * 100;
      
      // Limit overscroll
      const maxTranslate = 0;
      const minTranslate = isRTL ? (images.length - 1) * 100 : -((images.length - 1) * 100);
      let newTranslate = currentTranslateX.current + (isRTL ? -percentMove : percentMove);
      
      // Add resistance at edges
      if (isRTL) {
        if (newTranslate < 0) {
          newTranslate = newTranslate * 0.3;
        } else if (newTranslate > minTranslate) {
          newTranslate = minTranslate + (newTranslate - minTranslate) * 0.3;
        }
      } else {
        if (newTranslate > maxTranslate) {
          newTranslate = maxTranslate + (newTranslate - maxTranslate) * 0.3;
        } else if (newTranslate < minTranslate) {
          newTranslate = minTranslate + (newTranslate - minTranslate) * 0.3;
        }
      }
      
      swiperRef.current.style.transform = `translateX(${newTranslate}%)`;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const wasMoving = hasMoved.current;
    
    // Reset touch state after a delay to prevent immediate click events
    setTimeout(() => {
      setIsTouching(false);
    }, 100);
    
    // Skip if zoomed in - useImageZoom will handle touch events when zoomed
    if (zoom > 1) return;
    
    if (!isSwipeable || !swiperRef.current) return;
    
    const touch = e.changedTouches[0];
    const diff = touch.clientX - touchStartX.current;
    const deltaY = Math.abs(touch.clientY - touchStartY.current);
    
    // Only process horizontal swipes
    if (Math.abs(diff) > deltaY && Math.abs(diff) > window.innerWidth * 0.2) {
      if (isRTL) {
        if (diff < 0 && activeIndex > 0) {
          navigateToImage(activeIndex - 1);
        } else if (diff > 0 && activeIndex < images.length - 1) {
          navigateToImage(activeIndex + 1);
        } else {
          // Reset to current image if at edge
          swiperRef.current.style.transform = `translateX(${activeIndex * 100}%)`;
        }
      } else {
        if (diff > 0 && activeIndex > 0) {
          navigateToImage(activeIndex - 1);
        } else if (diff < 0 && activeIndex < images.length - 1) {
          navigateToImage(activeIndex + 1);
        } else {
          // Reset to current image if at edge
          swiperRef.current.style.transform = `translateX(${-activeIndex * 100}%)`;
        }
      }
    } else {
      // Not enough swipe, reset to current image
      swiperRef.current.style.transform = `translateX(${isRTL ? activeIndex * 100 : -activeIndex * 100}%)`;
    }
  };

  // Handle download of current image
  const handleDownload = () => {
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
        })
        .catch(error => {
          console.error('Failed to download image:', error);
        });
    }
  };

  // Handle clicks on the image container area (outside the image)
  const handleContainerClick = (e: React.MouseEvent) => {
    // Don't close if currently touching (mobile)
    if (isTouching) return;
    
    // Close if clicking in the container but not on the image itself
    if (e.target === imageContainerRef.current) {
      onClose();
    }
  };

  if (!isOpen || !portalElement) return null;

  return createPortal(
    // Outer background container that handles click-to-close
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-black/40 to-black/30 backdrop-blur-xl transition-all duration-300"
      ref={backgroundRef}
      onClick={handleBackgroundClick}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        background: 'linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.2) 100%)'
      }}
    >
      {/* Explicit close button at bottom left */}
      <button 
        className="absolute bottom-4 left-4 z-50 p-3 bg-black/70 hover:bg-black/90 text-white rounded-full transition-all duration-300 flex items-center gap-2"
        onClick={onClose}
        aria-label="Close viewer"
      >
        <X className="w-5 h-5" />
        <span className="text-sm font-medium">Close</span>
      </button>

      {/* Zoom controls */}
      <div 
        className={`absolute bottom-4 ${isRTL ? 'right-1/2 translate-x-1/2' : 'left-1/2 -translate-x-1/2'} z-50 flex items-center gap-2 bg-black/50 rounded-full p-1 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        onClick={e => e.stopPropagation()} // Prevent closing when clicking controls
      >
        <button 
          className="p-2 text-white hover:bg-white/20 rounded-full disabled:opacity-50"
          onClick={handleZoomOut}
          disabled={zoom <= 1}
          aria-label="Zoom out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        
        <button 
          className="p-2 text-white hover:bg-white/20 rounded-full"
          onClick={handleReset}
          aria-label="Reset zoom"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        
        <button 
          className="p-2 text-white hover:bg-white/20 rounded-full disabled:opacity-50"
          onClick={handleZoomIn}
          disabled={zoom >= 5}
          aria-label="Zoom in"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        
        <button 
          className="p-2 text-white hover:bg-white/20 rounded-full"
          onClick={handleDownload}
          aria-label="Download image"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>

      {/* Image counter */}
      <div 
        className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'} z-50 bg-black/50 text-white px-3 py-1 rounded-full text-sm transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        onClick={e => e.stopPropagation()} // Prevent closing when clicking counter
      >
        {activeIndex + 1} / {images.length}
      </div>

      {/* Navigation buttons for desktop */}
      {images.length > 1 && isSwipeable && (
        <>
          <button 
            className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 p-3 bg-black/50 text-white rounded-full transition-opacity duration-300 hover:bg-black/70 ${showControls ? 'opacity-100' : 'opacity-0'} ${isRTL ? (activeIndex === images.length - 1 ? 'opacity-30 cursor-not-allowed' : '') : (activeIndex === 0 ? 'opacity-30 cursor-not-allowed' : '')}`}
            onClick={(e) => { 
              e.stopPropagation(); // Prevent closing when clicking nav buttons
              isRTL ? navigateNext() : navigatePrev();
            }}
            disabled={isRTL ? activeIndex === images.length - 1 : activeIndex === 0}
            aria-label={isRTL ? "Next image" : "Previous image"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          
          <button 
            className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 transform -translate-y-1/2 p-3 bg-black/50 text-white rounded-full transition-opacity duration-300 hover:bg-black/70 ${showControls ? 'opacity-100' : 'opacity-0'} ${isRTL ? (activeIndex === 0 ? 'opacity-30 cursor-not-allowed' : '') : (activeIndex === images.length - 1 ? 'opacity-30 cursor-not-allowed' : '')}`}
            onClick={(e) => { 
              e.stopPropagation(); // Prevent closing when clicking nav buttons
              isRTL ? navigatePrev() : navigateNext();
            }}
            disabled={isRTL ? activeIndex === 0 : activeIndex === images.length - 1}
            aria-label={isRTL ? "Previous image" : "Next image"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      {/* Main content container - this now allows background clicks */}
      <div 
        ref={containerRef}
        className="relative w-full h-full overflow-hidden"
        // Remove onClick here to allow clicks to bubble up to background
      >
        <div 
          ref={swiperRef}
          className="flex h-full w-full transition-transform duration-300 ease-out"
          style={{ 
            transform: `translateX(${isRTL ? activeIndex * 100 : -activeIndex * 100}%)`,
            flexDirection: isRTL ? 'row-reverse' : 'row'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {images.map((src, index) => (
            <div 
              key={index} 
              ref={index === activeIndex ? imageContainerRef : null}
              className="min-w-full h-full flex items-center justify-center p-4"
              onClick={handleContainerClick} // Handle clicks on the container (padding area)
            >
              <div 
                className="relative max-w-full max-h-full overflow-hidden"
                style={{ 
                  transform: zoom > 1 ? `scale(${zoom}) translate(${position.x}px, ${position.y}px)` : 'none',
                  transition: zoom > 1 ? 'none' : 'transform 0.3s ease-out'
                }}
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
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent container click when clicking on image
                    // Toggle zoom on click
                    if (zoom > 1) {
                      handleReset();
                    } else {
                      handleZoomIn();
                    }
                  }}
                  draggable={false} // Prevent unwanted drag behavior
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