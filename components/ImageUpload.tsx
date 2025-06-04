'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Eye, ImageIcon, ChevronRight } from 'lucide-react';

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
  const [showFullImage, setShowFullImage] = useState(false);
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

      // Enhanced authentication check
      const token = localStorage.getItem('adminToken');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      // Enhanced upload logic with retry and better error handling
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        attempts++;
        
        try {
          console.log(`🔄 Upload attempt ${attempts}/${maxAttempts}:`, {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            hasToken: !!token,
            tokenLength: token ? token.length : 0,
            timestamp: new Date().toISOString(),
            environment: typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'development' : 'production'
          });

          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/upload/image', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          console.log('📡 Upload response:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries())
          });

          const result = await response.json();
          console.log('📋 Upload result:', result);

          if (response.ok && result.success) {
            console.log('✅ Upload successful:', {
              fileName: result.data.fileName,
              fileSize: result.data.fileSize,
              method: result.data.method,
              publicUrl: result.data.publicUrl?.substring(0, 100) + (result.data.publicUrl?.length > 100 ? '...' : ''),
              timestamp: new Date().toISOString()
            });

            // Handle both file system URLs and base64 data URLs
            const imageUrl = result.data.publicUrl;
            setPreview(imageUrl);
            
            onImageSelect(imageUrl);
            
            break; // Success - exit retry loop
          } else {
            throw new Error(result.error || `Server returned ${response.status}: ${response.statusText}`);
          }
        } catch (error) {
          console.log(`❌ Upload attempt ${attempts} failed:`, error);
          
          if (attempts === maxAttempts) {
            console.error('💥 All upload attempts failed:', error);
            throw error;
          } else {
            // Wait before retry (exponential backoff)
            const delay = Math.pow(2, attempts) * 1000; // 2s, 4s, 8s
            console.log(`⏳ Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    } catch (error) {
      console.error('💥 Image upload error:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to upload image. ';
      
      if (error instanceof Error) {
        if (error.message.includes('Authentication failed') || error.message.includes('log in again')) {
          errorMessage = error.message;
          // Redirect to login after showing error
          setTimeout(() => {
            window.location.href = '/admin';
          }, 3000);
        } else if (error.message.includes('Network')) {
          errorMessage += 'Please check your internet connection and try again.';
        } else if (error.message.includes('Server error')) {
          errorMessage += 'Server is temporarily unavailable. Please try again in a moment.';
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += 'An unexpected error occurred. Please try again.';
      }
      
      alert(errorMessage);
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
            <p className="text-sm text-muted-foreground">מעלה תמונה...</p>
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
                    setShowFullImage(true);
                  }}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                  title="הצג תמונה"
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
                  title="הסר תמונה"
                  disabled={disabled}
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mt-2 text-center">
              לחץ להחלפה או גרור תמונה חדשה
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <div className="mb-3 p-3 bg-muted rounded-full">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground mb-1">
                בחר תמונה או גרור לכאן
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WebP עד 5MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Full Image Modal */}
      {showFullImage && preview && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowFullImage(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowFullImage(false)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={preview}
              alt="Full size preview"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Utility component for displaying images with click-to-expand
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
  const [showFullImage, setShowFullImage] = useState(false);

  if (!imageUrl) {
    return null;
  }

  // Size configurations
  const sizeClasses = {
    sm: 'h-20 w-20',
    md: 'h-32 w-32',
    lg: 'h-48 w-48'
  };

  return (
    <>
      <div className={`
        relative group cursor-pointer bg-muted rounded-lg overflow-hidden
        ${sizeClasses[size]}
        ${className}
      `}>
        <img
          src={imageUrl}
          alt={alt}
          className="w-full h-full object-cover"
          onClick={() => showExpand && setShowFullImage(true)}
        />
        
        {showExpand && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <button
              onClick={() => setShowFullImage(true)}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              title="הצג תמונה"
            >
              <Eye className="h-4 w-4 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* Full Image Modal */}
      {showFullImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4">
          <div className="relative max-w-4xl max-h-full bg-white rounded-lg overflow-hidden">
            <button
              onClick={() => setShowFullImage(false)}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white z-10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={imageUrl}
              alt={alt}
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}

// Multiple Image Upload Component
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
    
    // Check if adding these images would exceed the limit
    if (currentImages.length + imageFiles.length > maxImages) {
      alert(`ניתן להעלות עד ${maxImages} תמונות. כרגע יש ${currentImages.length} תמונות.`);
      return;
    }

    if (imageFiles.length === 0) {
      alert('אנא בחר קבצי תמונה בלבד');
      return;
    }

    setIsUploading(true);

    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const newImages: string[] = [];
      
      // Upload files one by one
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
          alert(`שגיאה בהעלאת ${file.name}: ${error instanceof Error ? error.message : 'שגיאה לא צפויה'}`);
        } finally {
          setUploadProgress(prev => {
            const updated = { ...prev };
            delete updated[fileKey];
            return updated;
          });
        }
      }

      // Update the images array
      if (newImages.length > 0) {
        const updatedImages = [...currentImages, ...newImages];
        onImagesChange(updatedImages);
      }

    } catch (error) {
      console.error('Multiple image upload error:', error);
      alert('שגיאה בהעלאת התמונות');
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
    // Reset input value to allow selecting the same files again
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
    <div className={`space-y-3 ${className}`}>
      {/* Current Images Gallery */}
      {currentImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {currentImages.map((imageUrl, index) => (
            <div key={`image-${index}`} className="relative group">
              <ImageDisplay 
                imageUrl={imageUrl}
                alt={`תמונה ${index + 1}`}
                className="w-full h-24"
                size="md"
              />
              
              {!disabled && (
                <button
                  onClick={() => handleRemoveImage(index)}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  title="הסר תמונה"
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
              <p className="text-sm text-muted-foreground text-center">מעלה תמונות...</p>
              {Object.keys(uploadProgress).length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  מעלה {Object.keys(uploadProgress).length} תמונות
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <Upload className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">
                גרור תמונות לכאן או לחץ לבחירה
              </p>
              <p className="text-xs text-muted-foreground">
                ניתן להעלות עד {maxImages - currentImages.length} תמונות נוספות
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                תמונות יכולות להיות: JPEG, PNG, WebP, GIF
              </p>
            </div>
          )}
        </div>
      )}

      {/* Upload Limit Info */}
      <div className="text-xs text-muted-foreground text-center">
        {currentImages.length} מתוך {maxImages} תמונות
      </div>
    </div>
  );
}

// Image Gallery Component for displaying multiple images
interface ImageGalleryProps {
  images: string[];
  className?: string;
  showExpand?: boolean;
  maxDisplay?: number;
}

export function ImageGallery({ 
  images, 
  className = '',
  showExpand = true,
  maxDisplay = 4
}: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  if (!images || images.length === 0) return null;

  const displayImages = images.slice(0, maxDisplay);
  const remainingCount = images.length - maxDisplay;

  const resetImageTransform = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const nextImage = () => {
    const newIndex = (currentIndex + 1) % images.length;
    setCurrentIndex(newIndex);
    setSelectedImage(images[newIndex]);
    resetImageTransform();
  };

  const prevImage = () => {
    const newIndex = (currentIndex - 1 + images.length) % images.length;
    setCurrentIndex(newIndex);
    setSelectedImage(images[newIndex]);
    resetImageTransform();
  };

  const openGallery = (imageUrl: string, index: number) => {
    setSelectedImage(imageUrl);
    setCurrentIndex(index);
    resetImageTransform();
  };

  const closeGallery = () => {
    setSelectedImage(null);
    resetImageTransform();
  };

  // Touch/mouse event handlers for zoom and pan
  const getTouchDistance = (touches: React.TouchList): number => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      // Pinch start
      setLastTouchDistance(getTouchDistance(e.touches));
    } else if (e.touches.length === 1 && scale > 1) {
      // Pan start
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2 && lastTouchDistance !== null) {
      // Pinch move
      const newTouchDistance = getTouchDistance(e.touches);
      const newScale = scale * (newTouchDistance / lastTouchDistance);
      setScale(Math.min(Math.max(newScale, 0.5), 5)); // Min 0.5x, Max 5x
      setLastTouchDistance(newTouchDistance);
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      // Pan move
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setLastTouchDistance(null);
    
    // Reset position if zoomed out too much
    if (scale < 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleChange = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale * scaleChange, 0.5), 4);
    setScale(newScale);
    
    if (newScale <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!selectedImage) return;
    
    switch (e.key) {
      case 'Escape':
        closeGallery();
        break;
      case 'ArrowLeft':
        if (images.length > 1) prevImage();
        break;
      case 'ArrowRight':
        if (images.length > 1) nextImage();
        break;
      case '=':
      case '+':
        e.preventDefault();
        setScale(Math.min(scale * 1.2, 4));
        break;
      case '-':
        e.preventDefault();
        const newScale = Math.max(scale * 0.8, 0.5);
        setScale(newScale);
        if (newScale <= 1) setPosition({ x: 0, y: 0 });
        break;
      case '0':
        e.preventDefault();
        resetImageTransform();
        break;
    }
  };

  // Add/remove keyboard event listener
  React.useEffect(() => {
    if (selectedImage) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedImage, scale, images.length, currentIndex]);

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    if (selectedImage) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'auto';
      };
    }
  }, [selectedImage]);

  return (
    <>
      <div className={`space-y-2 ${className}`}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {displayImages.map((imageUrl, index) => (
            <div 
              key={`gallery-image-${index}`} 
              className="relative group cursor-pointer overflow-hidden rounded-lg bg-muted aspect-square hover:scale-105 transition-transform duration-200"
              onClick={() => showExpand && openGallery(imageUrl, index)}
            >
              <img
                src={imageUrl}
                alt={`תמונה ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Eye className="h-6 w-6 text-white drop-shadow-lg" />
                </div>
              </div>
              
              {/* Show remaining count on last image */}
              {index === maxDisplay - 1 && remainingCount > 0 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-lg font-bold">+{remainingCount}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced Gallery Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[9999] flex items-center justify-center"
          onClick={closeGallery}
        >
          {/* Modal Container */}
          <div 
            className="relative w-full h-full flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
              <div className="flex items-center gap-4">
                {/* Image Counter */}
                <div className="px-3 py-1 bg-black/50 text-white text-sm rounded-full backdrop-blur-sm">
                  {currentIndex + 1} מתוך {images.length}
                </div>
                
                {/* Zoom Level */}
                {scale !== 1 && (
                  <div className="px-3 py-1 bg-black/50 text-white text-sm rounded-full backdrop-blur-sm">
                    {Math.round(scale * 100)}%
                  </div>
                )}
              </div>
              
              {/* Close Button */}
              <button
                onClick={closeGallery}
                className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all duration-200 backdrop-blur-sm hover:scale-110"
                title="סגור (ESC)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Buttons */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white z-20 transition-all duration-200 backdrop-blur-sm hover:scale-110"
                  title="תמונה קודמת (←)"
                >
                  <ChevronRight className="h-6 w-6 rotate-180" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white z-20 transition-all duration-200 backdrop-blur-sm hover:scale-110"
                  title="תמונה הבאה (→)"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Image Container */}
            <div 
              className="relative max-w-full max-h-full overflow-hidden cursor-grab active:cursor-grabbing"
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.2s ease-out'
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            >
              <img
                src={selectedImage}
                alt={`תמונה ${currentIndex + 1}`}
                className="max-w-[90vw] max-h-[90vh] object-contain select-none"
                draggable={false}
              />
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center p-4 bg-gradient-to-t from-black/50 to-transparent">
              <div className="flex items-center gap-2 bg-black/50 rounded-full px-4 py-2 backdrop-blur-sm">
                {/* Zoom Out */}
                <button
                  onClick={() => {
                    const newScale = Math.max(scale * 0.8, 0.5);
                    setScale(newScale);
                    if (newScale <= 1) setPosition({ x: 0, y: 0 });
                  }}
                  className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                  title="הקטן (-)"
                  disabled={scale <= 0.5}
                >
                  <span className="text-lg font-bold">−</span>
                </button>
                
                {/* Reset Zoom */}
                <button
                  onClick={resetImageTransform}
                  className="px-3 py-1 text-white hover:bg-white/20 rounded transition-colors text-sm"
                  title="איפוס (0)"
                >
                  {Math.round(scale * 100)}%
                </button>
                
                {/* Zoom In */}
                <button
                  onClick={() => setScale(Math.min(scale * 1.2, 4))}
                  className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                  title="הגדל (+)"
                  disabled={scale >= 4}
                >
                  <span className="text-lg font-bold">+</span>
                </button>
              </div>
            </div>

            {/* Instructions overlay for first time users */}
            {scale === 1 && (
              <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-white/70 text-sm text-center pointer-events-none">
                <div className="bg-black/30 rounded-lg p-3 backdrop-blur-sm">
                  <p>🔍 גלגל העכבר או פינץ' לזום</p>
                  <p>🖱️ גרור כדי להזיז</p>
                  <p>⌨️ ESC לסגירה, ← → לניווט</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
} 