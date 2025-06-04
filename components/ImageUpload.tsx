'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Eye, ImageIcon, ChevronRight, ChevronLeft, Plus } from 'lucide-react';

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
                  className="p-2 bg-background/20 hover:bg-background/30 rounded-full transition-colors"
                  title="הצג תמונה"
                >
                  <Eye className="h-4 w-4 text-foreground" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage();
                  }}
                  className="p-2 bg-background/20 hover:bg-background/30 rounded-full transition-colors"
                  title="הסר תמונה"
                  disabled={disabled}
                >
                  <X className="h-4 w-4 text-foreground" />
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
              className="absolute -top-10 right-0 p-2 text-foreground hover:text-muted-foreground transition-colors"
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

  const handleCloseModal = () => {
    setShowFullImage(false);
  };

  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Size configurations
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
        shadow-sm hover:shadow-md transition-shadow
      `}
      onClick={() => showExpand && setShowFullImage(true)}
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

      {showFullImage && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 cursor-zoom-out"
          onClick={handleCloseModal} // Click on backdrop closes modal
        >
          <div 
            className="relative max-w-[90vw] max-h-[90vh] cursor-default"
            onClick={handleModalContentClick} // Clicks on content area (image) don't close modal
          >
            <img 
              src={imageUrl} 
              alt={alt} 
              className="block w-full h-full object-contain shadow-2xl rounded-lg" 
              draggable="false"
            />
            <button 
                onClick={(e) => {
                    e.stopPropagation(); // Prevent modal close
                    handleCloseModal(); // Explicitly close
                }}
                className="absolute -top-3 -right-3 sm:top-2 sm:right-2 z-10 p-2 bg-background/80 hover:bg-background/90 rounded-full text-foreground shadow-lg transition-colors"
                title="Close image"
                aria-label="Close image"
            >
                <X className="h-5 w-5" />
            </button>
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
                  className="absolute -top-2 -right-2 p-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
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
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (!images || images.length === 0) {
    return null;
  }

  const openGallery = (imageUrl: string, index: number) => {
    if (!showExpand) return;
    setSelectedImageIndex(index);
    setIsGalleryOpen(true);
  };

  const closeGallery = () => {
    setIsGalleryOpen(false);
  };
  
  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const nextImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedImageIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedImageIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isGalleryOpen) return;
    if (e.key === 'Escape') closeGallery();
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
  }, [isGalleryOpen, images.length]); // Added images.length dependency

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const displayImages = images.slice(0, maxDisplay);
  const remainingImagesCount = images.length - maxDisplay;

  return (
    <div className={` ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {displayImages.map((imageUrl, index) => (
          <div 
            key={`gallery-thumb-${imageUrl}-${index}`} 
            className="relative group aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow"
            onClick={() => openGallery(imageUrl, index)}
          >
            <img 
              src={imageUrl} 
              alt={`Gallery image ${index + 1}`} 
              className="w-full h-full object-cover"
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

      {isGalleryOpen && images[selectedImageIndex] && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 cursor-default"
          onClick={closeGallery} // Click on backdrop closes modal
        >
          <div 
            className="relative w-full h-full flex items-center justify-center cursor-default"
            onClick={handleModalContentClick} // Clicks on content area (image + controls) don't close modal
          >
            {/* Image container */}
            <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center">
              <img 
                src={images[selectedImageIndex]} 
                alt={`Enlarged gallery image ${selectedImageIndex + 1}`} 
                className="block object-contain shadow-2xl rounded-lg max-w-full max-h-full" 
                draggable="false"
              />
            </div>

            {/* Close Button */}
            <button 
              onClick={(e) => { // Ensure stopPropagation for this button too
                e.stopPropagation();
                closeGallery();
              }}
              className="absolute top-4 right-4 z-[10001] p-2 bg-background/80 hover:bg-background/90 rounded-full text-foreground shadow-lg transition-colors"
              title="Close gallery"
              aria-label="Close gallery"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Prev Button */}
            {images.length > 1 && (
              <button 
                onClick={prevImage} // stopPropagation is handled inside prevImage
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-[10000] p-2 bg-background/50 hover:bg-background/70 rounded-full text-foreground shadow-lg transition-all hover:scale-110"
                title="Previous image"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
              </button>
            )}

            {/* Next Button */}
            {images.length > 1 && (
              <button 
                onClick={nextImage} // stopPropagation is handled inside nextImage
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-[10000] p-2 bg-background/50 hover:bg-background/70 rounded-full text-foreground shadow-lg transition-all hover:scale-110"
                title="Next image"
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 