'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Eye, ImageIcon, ChevronRight, ChevronLeft, Plus, ZoomIn, ZoomOut, RotateCw, Download, Share2, Maximize2, Minimize2 } from 'lucide-react';

// =============================================
// ENHANCED IMAGE VIEWER MODAL
// =============================================

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  title?: string;
}

function ImageViewerModal({ 
  isOpen, 
  onClose, 
  images, 
  currentIndex, 
  onIndexChange,
  title 
}: ImageViewerModalProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset states when modal opens/closes or image changes
  useEffect(() => {
    if (isOpen) {
      setIsZoomed(false);
      setRotation(0);
      setIsLoading(true);
      setImageError(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (images.length > 1) {
            onIndexChange((currentIndex - 1 + images.length) % images.length);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (images.length > 1) {
            onIndexChange((currentIndex + 1) % images.length);
          }
          break;
        case ' ':
          e.preventDefault();
          setIsZoomed(!isZoomed);
          break;
        case 'r':
          e.preventDefault();
          setRotation(prev => (prev + 90) % 360);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length, onIndexChange, onClose, isZoomed]);

  // Fullscreen API
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      modalRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleImageLoad = () => {
    setIsLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setImageError(true);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = images[currentIndex];
    link.download = `image-${currentIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Image',
          url: images[currentIndex]
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback - copy to clipboard
      try {
        await navigator.clipboard.writeText(images[currentIndex]);
        alert('Image URL copied to clipboard!');
      } catch (error) {
        console.log('Error copying to clipboard:', error);
      }
    }
  };

  const nextImage = () => {
    if (images.length > 1) {
      onIndexChange((currentIndex + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (images.length > 1) {
      onIndexChange((currentIndex - 1 + images.length) % images.length);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={modalRef}
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm transition-all duration-300 ease-out"
      onClick={onClose}
    >
      {/* Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {title && (
              <h2 className="text-white text-lg font-medium">{title}</h2>
            )}
            {images.length > 1 && (
              <div className="text-white/80 text-sm bg-black/30 px-3 py-1 rounded-full">
                {currentIndex + 1} / {images.length}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsZoomed(!isZoomed);
              }}
              className="p-2 bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors"
              title={isZoomed ? 'Zoom Out' : 'Zoom In'}
            >
              {isZoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
            </button>

            {/* Rotate */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setRotation(prev => (prev + 90) % 360);
              }}
              className="p-2 bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors"
              title="Rotate"
            >
              <RotateCw className="h-5 w-5" />
            </button>

            {/* Download */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              className="p-2 bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors"
              title="Download"
            >
              <Download className="h-5 w-5" />
            </button>

            {/* Share */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              className="p-2 bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors"
              title="Share"
            >
              <Share2 className="h-5 w-5" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              className="p-2 bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>

            {/* Close */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2 bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/30 hover:bg-black/50 text-white rounded-full transition-all hover:scale-110"
            title="Previous Image"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/30 hover:bg-black/50 text-white rounded-full transition-all hover:scale-110"
            title="Next Image"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Image Container */}
      <div 
        className="flex items-center justify-center w-full h-full p-16"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative max-w-full max-h-full">
          {/* Loading Spinner */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          )}

          {/* Error State */}
          {imageError && (
            <div className="flex flex-col items-center justify-center text-white p-8">
              <ImageIcon className="h-16 w-16 mb-4 text-white/50" />
              <p className="text-lg">Failed to load image</p>
              <p className="text-sm text-white/70 mt-2">Please try again later</p>
            </div>
          )}

          {/* Main Image */}
          {!imageError && (
            <img
              src={images[currentIndex]}
              alt={`Image ${currentIndex + 1}`}
              className={`
                max-w-full max-h-full object-contain transition-all duration-300 cursor-pointer
                ${isZoomed ? 'scale-150' : 'scale-100'}
                ${isLoading ? 'opacity-0' : 'opacity-100'}
              `}
              style={{ 
                transform: `rotate(${rotation}deg) ${isZoomed ? 'scale(1.5)' : 'scale(1)'}`,
                transformOrigin: 'center'
              }}
              onLoad={handleImageLoad}
              onError={handleImageError}
              onClick={() => setIsZoomed(!isZoomed)}
              draggable={false}
            />
          )}
        </div>
      </div>

      {/* Thumbnail Strip (for multiple images) */}
      {images.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/50 to-transparent p-4">
          <div className="flex justify-center gap-2 overflow-x-auto max-w-full">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  onIndexChange(index);
                }}
                className={`
                  flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all
                  ${index === currentIndex 
                    ? 'border-white shadow-lg scale-110' 
                    : 'border-white/30 hover:border-white/60'
                  }
                `}
              >
                <img
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      <div className="absolute bottom-4 left-4 text-white/60 text-xs">
        <div>ESC: Close • ←/→: Navigate • Space: Zoom • R: Rotate</div>
      </div>
    </div>
  );
}

// =============================================
// SINGLE IMAGE UPLOAD COMPONENT
// =============================================

interface ImageUploadProps {
  onImageSelect: (imageUrl: string | null) => void;
  currentImage?: string | null;
  disabled?: boolean;
  className?: string;
}

export default function ImageUpload({ 
  onImageSelect, 
  currentImage, 
  disabled = false,
  className = '' 
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [showViewer, setShowViewer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (disabled || isUploading) return;

    setIsUploading(true);
    
    try {
      // Create preview immediately
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      const token = localStorage.getItem('adminToken');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const imageUrl = result.data.publicUrl;
        setPreview(imageUrl);
        onImageSelect(imageUrl);
      } else {
        throw new Error(result.error || `Server returned ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      alert('Failed to upload image. Please try again.');
      setPreview(currentImage || null);
    } finally {
      setIsUploading(false);
    }
  }, [disabled, isUploading, onImageSelect, currentImage]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleFileSelect(imageFile);
    }
  }, [disabled, handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleRemoveImage = useCallback(() => {
    if (disabled) return;
    
    setPreview(null);
    onImageSelect(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [disabled, onImageSelect]);

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg transition-all duration-200
          ${isDragging 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${preview ? 'p-2' : 'p-6'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
            <p className="text-sm text-muted-foreground">Uploading image...</p>
          </div>
        ) : preview ? (
          <div className="relative group">
            {/* Thumbnail */}
            <div className="relative w-full h-32 bg-muted rounded-lg overflow-hidden">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              
              {/* Overlay with controls */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowViewer(true);
                  }}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                  title="View Image"
                >
                  <Eye className="h-4 w-4 text-white" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage();
                  }}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                  title="Remove Image"
                  disabled={disabled}
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Click to replace or drag new image
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <div className="mb-3 p-3 bg-muted rounded-full">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground mb-1">
                Select image or drag here
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WebP up to 5MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Image Viewer Modal */}
      {showViewer && preview && (
        <ImageViewerModal
          isOpen={showViewer}
          onClose={() => setShowViewer(false)}
          images={[preview]}
          currentIndex={0}
          onIndexChange={() => {}}
        />
      )}
    </div>
  );
}

// =============================================
// IMAGE DISPLAY COMPONENT
// =============================================

interface ImageDisplayProps {
  imageUrl: string | null;
  alt?: string;
  className?: string;
  showExpand?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ImageDisplay({ 
  imageUrl, 
  alt = 'Image', 
  className = '',
  showExpand = true,
  size = 'md'
}: ImageDisplayProps) {
  const [showViewer, setShowViewer] = useState(false);

  if (!imageUrl) {
    return null;
  }

  const sizeClasses = {
    sm: 'h-20 w-20',
    md: 'h-32 w-32',
    lg: 'h-48 w-48'
  };

  return (
    <>
      <div className={`
        relative group cursor-pointer 
        ${sizeClasses[size]}
        ${className}
        bg-muted rounded-lg overflow-hidden
        flex items-center justify-center 
        shadow-sm hover:shadow-md transition-all duration-200
      `}
      onClick={() => showExpand && setShowViewer(true)}
      >
        <img 
          src={imageUrl} 
          alt={alt} 
          className="max-w-full max-h-full object-contain" 
          draggable="false" 
        />
        {showExpand && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <Eye className="h-6 w-6 text-white" />
          </div>
        )}
      </div>

      {/* Image Viewer Modal */}
      {showViewer && (
        <ImageViewerModal
          isOpen={showViewer}
          onClose={() => setShowViewer(false)}
          images={[imageUrl]}
          currentIndex={0}
          onIndexChange={() => {}}
          title={alt}
        />
      )}
    </>
  );
}

// =============================================
// MULTIPLE IMAGE UPLOAD COMPONENT
// =============================================

interface MultipleImageUploadProps {
  onImagesChange: (images: string[]) => void;
  currentImages?: string[];
  disabled?: boolean;
  className?: string;
  maxImages?: number;
}

export function MultipleImageUpload({ 
  onImagesChange, 
  currentImages = [], 
  disabled = false,
  className = '',
  maxImages = 5
}: MultipleImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: boolean}>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    if (disabled || isUploading) return;

    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    if (currentImages.length + imageFiles.length > maxImages) {
      alert(`You can upload up to ${maxImages} images. Currently have ${currentImages.length} images.`);
      return;
    }

    if (imageFiles.length === 0) {
      alert('Please select image files only');
      return;
    }

    setIsUploading(true);

    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const newImages: string[] = [];
      
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const fileKey = `${file.name}-${file.size}`;
        
        try {
          setUploadProgress(prev => ({ ...prev, [fileKey]: true }));

          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/upload/image', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          const result = await response.json();

          if (response.ok && result.success) {
            newImages.push(result.data.publicUrl);
          } else {
            throw new Error(result.error || `Failed to upload ${file.name}`);
          }
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          alert(`Error uploading ${file.name}: ${error instanceof Error ? error.message : 'Unexpected error'}`);
        } finally {
          setUploadProgress(prev => {
            const updated = { ...prev };
            delete updated[fileKey];
            return updated;
          });
        }
      }

      if (newImages.length > 0) {
        const updatedImages = [...currentImages, ...newImages];
        onImagesChange(updatedImages);
      }

    } catch (error) {
      console.error('Multiple image upload error:', error);
      alert('Error uploading images');
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  }, [disabled, isUploading, onImagesChange, currentImages, maxImages]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [disabled, handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
    e.target.value = '';
  }, [handleFileSelect]);

  const handleRemoveImage = useCallback((index: number) => {
    if (disabled) return;
    
    const updatedImages = currentImages.filter((_, i) => i !== index);
    onImagesChange(updatedImages);
  }, [disabled, currentImages, onImagesChange]);

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const canAddMore = currentImages.length < maxImages;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Images Grid */}
      {currentImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {currentImages.map((imageUrl, index) => (
            <div key={`image-${index}`} className="relative group">
              <ImageDisplay 
                imageUrl={imageUrl}
                alt={`Image ${index + 1}`}
                className="w-full h-24"
                size="md"
              />
              
              {!disabled && (
                <button
                  onClick={() => handleRemoveImage(index)}
                  className="absolute -top-2 -right-2 p-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
                  title="Remove image"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      {canAddMore && (
        <div
          className={`
            relative border-2 border-dashed rounded-lg transition-all duration-200 p-6
            ${isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleInputChange}
            className="hidden"
            disabled={disabled}
          />

          {isUploading ? (
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
              <p className="text-sm text-muted-foreground text-center">Uploading images...</p>
              {Object.keys(uploadProgress).length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Uploading {Object.keys(uploadProgress).length} images
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <Upload className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">
                Drag images here or click to select
              </p>
              <p className="text-xs text-muted-foreground">
                You can upload {maxImages - currentImages.length} more images
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supported: JPEG, PNG, WebP, GIF
              </p>
            </div>
          )}
        </div>
      )}

      {/* Upload Info */}
      <div className="text-xs text-muted-foreground text-center">
        {currentImages.length} of {maxImages} images
      </div>
    </div>
  );
}

// =============================================
// IMAGE GALLERY COMPONENT
// =============================================

interface ImageGalleryProps {
  images: string[];
  className?: string;
  showExpand?: boolean;
  maxDisplay?: number;
  title?: string;
}

export function ImageGallery({ 
  images, 
  className = '',
  showExpand = true,
  maxDisplay = 4,
  title
}: ImageGalleryProps) {
  const [showViewer, setShowViewer] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return null;
  }

  const openGallery = (index: number) => {
    if (!showExpand) return;
    setCurrentIndex(index);
    setShowViewer(true);
  };

  const displayImages = images.slice(0, maxDisplay);
  const remainingImagesCount = images.length - maxDisplay;

  return (
    <div className={className}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {displayImages.map((imageUrl, index) => (
          <div 
            key={`gallery-${index}`} 
            className="relative group aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all duration-200"
            onClick={() => openGallery(index)}
          >
            <img 
              src={imageUrl} 
              alt={`Gallery image ${index + 1}`} 
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              draggable="false"
            />
            {showExpand && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <Eye className="h-6 w-6 text-white" />
              </div>
            )}
            {index === maxDisplay - 1 && remainingImagesCount > 0 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-xl font-bold">+{remainingImagesCount}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Image Viewer Modal */}
      {showViewer && (
        <ImageViewerModal
          isOpen={showViewer}
          onClose={() => setShowViewer(false)}
          images={images}
          currentIndex={currentIndex}
          onIndexChange={setCurrentIndex}
          title={title}
        />
      )}
    </div>
  );
} 