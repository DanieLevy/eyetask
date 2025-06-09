'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Eye, ZoomIn, Download as DownloadIcon } from 'lucide-react';
import Lightbox from 'yet-another-react-lightbox';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import Download from 'yet-another-react-lightbox/plugins/download';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/counter.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import { toast } from 'sonner';

// =============================================
// IMAGE UTILITIES
// =============================================

// Shared lightbox styling for consistent appearance
export const lightboxStyles = {
  default: {
    container: { backgroundColor: "rgba(0, 0, 0, 0.85)" },
    button: { 
      filter: "none",
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      borderRadius: "50%",
      padding: "8px",
      margin: "8px"
    }
  },
  light: {
    container: { backgroundColor: "rgba(255, 255, 255, 0.95)" },
    button: { 
      filter: "none",
      backgroundColor: "rgba(0, 0, 0, 0.15)",
      borderRadius: "50%",
      padding: "8px",
      margin: "8px"
    }
  }
};

export const imageUtils = {
  // Validate file type and size
  validateImage: (file: File, maxSizeMB: number = 5): { valid: boolean; error?: string } => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    
    if (!validTypes.includes(file.type)) {
      return { valid: false, error: 'Please select a valid image file (JPG, PNG, WebP, GIF)' };
    }
    
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return { valid: false, error: `Image must be smaller than ${maxSizeMB}MB` };
    }
    
    return { valid: true };
  },

  // Create optimized preview URL
  createPreviewUrl: (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },

  // Get image dimensions
  getImageDimensions: (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.width, height: img.height });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  },

  // Format file size for display
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};

// =============================================
// SIMPLE IMAGE UPLOAD COMPONENT
// =============================================

interface ImageUploadProps {
  onImageSelect: (imageUrl: string | null) => void;
  currentImage?: string | null;
  disabled?: boolean;
  className?: string;
}

export function ImageUpload({ 
  onImageSelect, 
  currentImage, 
  disabled = false,
  className = '' 
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (disabled || isUploading) return;

    // Validate image first
    const validation = imageUtils.validateImage(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setIsUploading(true);
    
    try {
      // Create optimized preview
      const previewUrl = await imageUtils.createPreviewUrl(file);
      setPreview(previewUrl);

      // Get image dimensions for better handling
      const dimensions = await imageUtils.getImageDimensions(file);
      
      // Simulate upload - replace with your actual upload logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const imageUrl = URL.createObjectURL(file);
      setPreview(imageUrl);
      onImageSelect(imageUrl);
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image. Please try again.');
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
      <div
        className={`
          relative border-2 border-dashed rounded-lg transition-all duration-200
          ${isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-blue-400'
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
            <p className="text-sm text-gray-600">Uploading image...</p>
          </div>
        ) : preview ? (
          <ImagePreview 
            imageUrl={preview} 
            onRemove={handleRemoveImage}
            disabled={disabled}
          />
        ) : (
          <div className="flex flex-col items-center justify-center">
            <div className="mb-3 p-3 bg-gray-100 rounded-full">
              <Upload className="h-6 w-6 text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900 mb-1">
                Select image or drag here
              </p>
              <p className="text-xs text-gray-500">
                PNG, JPG, WebP up to 5MB
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================
// IMAGE PREVIEW COMPONENT
// =============================================

interface ImagePreviewProps {
  imageUrl: string;
  onRemove: () => void;
  disabled?: boolean;
}

function ImagePreview({ imageUrl, onRemove, disabled }: ImagePreviewProps) {
  const [showViewer, setShowViewer] = useState(false);

  return (
    <>
      <div className="relative group">
        <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
          <img
            src={imageUrl}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          
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
                onRemove();
              }}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              title="Remove Image"
              disabled={disabled}
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
        
        <p className="text-xs text-gray-500 mt-2 text-center">
          Click to replace or drag new image
        </p>
      </div>

      <Lightbox
        open={showViewer}
        close={() => setShowViewer(false)}
        slides={[{ src: imageUrl }]}
        plugins={[Counter, Download, Fullscreen, Zoom]}
        animation={{ fade: 400, swipe: 300 }}
        controller={{ 
          closeOnBackdropClick: true,
          closeOnPullDown: true,
          closeOnPullUp: true 
        }}
        zoom={{
          maxZoomPixelRatio: 4,
          zoomInMultiplier: 2,
          doubleTapDelay: 300,
          doubleClickDelay: 300,
          scrollToZoom: true
        }}
        counter={{
          container: { style: { top: "unset", bottom: 0 } },
        }}
        styles={lightboxStyles.default}
      />
    </>
  );
}

// =============================================
// MULTIPLE IMAGE UPLOAD COMPONENT
// =============================================

interface MultipleImageUploadProps {
  onImagesSelect?: (images: string[]) => void;
  onImagesChange?: (images: string[]) => void; // Backward compatibility
  currentImages?: string[];
  disabled?: boolean;
  className?: string;
  maxImages?: number;
}

export function MultipleImageUpload({ 
  onImagesSelect, 
  onImagesChange,
  currentImages = [], 
  disabled = false,
  className = '',
  maxImages = 10
}: MultipleImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>(currentImages);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Backward compatibility for onImagesChange
  const onSelect = onImagesSelect || onImagesChange;

  const handleFilesSelect = useCallback(async (files: File[]) => {
    if (disabled || isUploading) return;
    
    if (previews.length + files.length > maxImages) {
      toast.error(`You can only upload a maximum of ${maxImages} images.`);
      files = files.slice(0, maxImages - previews.length);
    }
    
    setIsUploading(true);
    
    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      const validation = imageUtils.validateImage(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    if (errors.length > 0) {
      toast.error(`Some files were rejected:\n${errors.join('\n')}`);
    }

    if (validFiles.length === 0) {
      setIsUploading(false);
      return;
    }

    try {
      const newPreviews = await Promise.all(validFiles.map(imageUtils.createPreviewUrl));
      setPreviews(prev => [...prev, ...newPreviews]);

      // Simulate upload
      await new Promise(resolve => setTimeout(resolve, 1000 * validFiles.length));

      const newImageUrls = validFiles.map(file => URL.createObjectURL(file));
      
      if (onSelect) {
        onSelect([...previews, ...newImageUrls]);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload some images. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [disabled, isUploading, onSelect, previews, maxImages]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
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
    handleFilesSelect(files);
  }, [disabled, handleFilesSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFilesSelect(Array.from(files));
    }
  }, [handleFilesSelect]);

  const handleRemoveImage = useCallback((index: number) => {
    if (disabled) return;
    const updatedImages = previews.filter((_, i) => i !== index);
    setPreviews(updatedImages);
    if (onSelect) {
      onSelect(updatedImages);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [disabled, previews, onSelect]);

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current && previews.length < maxImages) {
      fileInputRef.current.click();
    }
  }, [disabled, previews.length, maxImages]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg transition-all duration-200
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${previews.length > 0 ? 'p-3' : 'p-6'}
          ${previews.length >= maxImages ? 'opacity-50 cursor-not-allowed' : ''}
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
          disabled={disabled || previews.length >= maxImages}
        />

        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
            <p className="text-sm text-gray-600">Uploading images...</p>
          </div>
        ) : previews.length >= maxImages ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">Maximum {maxImages} images reached</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <div className="mb-3 p-3 bg-gray-100 rounded-full">
              <Upload className="h-6 w-6 text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900 mb-1">
                {previews.length > 0 ? 'Add more images' : 'Select images or drag here'}
              </p>
              <p className="text-xs text-gray-500">
                PNG, JPG, WebP up to 5MB ({previews.length}/{maxImages})
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Image Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {previews.map((imageUrl, index) => (
            <MultipleImagePreview
              key={`preview-${index}`}
              imageUrl={imageUrl}
              onRemove={() => handleRemoveImage(index)}
              disabled={disabled}
              index={index}
              allImages={previews}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================
// MULTIPLE IMAGE PREVIEW COMPONENT
// =============================================

interface MultipleImagePreviewProps {
  imageUrl: string;
  onRemove: () => void;
  disabled?: boolean;
  index: number;
  allImages: string[];
}

function MultipleImagePreview({ imageUrl, onRemove, disabled, index, allImages }: MultipleImagePreviewProps) {
  const [showViewer, setShowViewer] = useState(false);

  return (
    <>
      <div className="relative group">
        <div className="relative w-full h-24 bg-gray-100 rounded-lg overflow-hidden">
          <img
            src={imageUrl}
            alt={`Preview ${index + 1}`}
            className="w-full h-full object-cover"
          />
          
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
              <Eye className="h-3 w-3 text-white" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              title="Remove Image"
              disabled={disabled}
            >
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        </div>
        
        <p className="text-xs text-gray-500 mt-1 text-center">
          Image {index + 1}
        </p>
      </div>

      <Lightbox
        open={showViewer}
        close={() => setShowViewer(false)}
        slides={allImages.map(src => ({ src }))}
        index={index}
        plugins={[Counter, Download, Fullscreen, Zoom]}
        animation={{ fade: 400, swipe: 300 }}
        controller={{ 
          closeOnBackdropClick: true,
          closeOnPullDown: true,
          closeOnPullUp: true 
        }}
        zoom={{
          maxZoomPixelRatio: 4,
          zoomInMultiplier: 2,
          doubleTapDelay: 300,
          doubleClickDelay: 300,
          scrollToZoom: true
        }}
        counter={{
          container: { style: { top: "unset", bottom: 0 } },
        }}
        styles={lightboxStyles.default}
      />
    </>
  );
}

// =============================================
// IMAGE DISPLAY COMPONENT - For Task/Subtask Images
// =============================================

interface ImageDisplayProps {
  images: string[];
  title?: string;
  maxDisplay?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onImageClick?: (images: string[], index: number, title?: string) => void;
}

export function ImageDisplay({ 
  images, 
  title = '', 
  maxDisplay = 8,
  size = 'md',
  className = '',
  onImageClick
}: ImageDisplayProps) {
  const [showViewer, setShowViewer] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const gridClasses = {
    sm: 'grid-cols-6 md:grid-cols-8 lg:grid-cols-10',
    md: 'grid-cols-4 md:grid-cols-6 lg:grid-cols-8',
    lg: 'grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
  };

  const handleImageClick = (index: number) => {
    if (onImageClick) {
      onImageClick(images, index, title);
    } else {
      setCurrentIndex(index);
      setShowViewer(true);
    }
  };

  if (!images || images.length === 0) return null;

  return (
    <>
      <div className={`grid ${gridClasses[size]} gap-1.5 ${className}`}>
        {images.slice(0, maxDisplay).map((imageUrl, index) => (
          <div 
            key={`display-image-${index}`} 
            className={`relative group aspect-square bg-muted rounded-sm overflow-hidden cursor-pointer shadow-xs hover:shadow-sm transition-all duration-200 ${sizeClasses[size]}`}
            onClick={() => handleImageClick(index)}
          >
            <img 
              src={imageUrl} 
              alt={`${title} image ${index + 1}`} 
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
              draggable="false"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <Eye className="h-2.5 w-2.5 text-white" />
            </div>
            {index === maxDisplay - 1 && images.length > maxDisplay && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">+{images.length - maxDisplay}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <Lightbox
        open={showViewer}
        close={() => setShowViewer(false)}
        slides={images.map(src => ({ src }))}
        index={currentIndex}
        plugins={[Counter, Download, Fullscreen, Zoom]}
        animation={{ fade: 400, swipe: 300 }}
        controller={{ 
          closeOnBackdropClick: true,
          closeOnPullDown: true,
          closeOnPullUp: true 
        }}
        zoom={{
          maxZoomPixelRatio: 4,
          zoomInMultiplier: 2,
          doubleTapDelay: 300,
          doubleClickDelay: 300,
          scrollToZoom: true
        }}
        counter={{
          container: { style: { top: "unset", bottom: 0 } },
        }}
        styles={lightboxStyles.default}
      />
    </>
  );
}

// =============================================
// IMAGE GALLERY COMPONENT - For Admin Views
// =============================================

interface ImageGalleryProps {
  images: string[];
  title?: string;
  showExpand?: boolean;
  maxDisplay?: number;
  className?: string;
  onImageClick?: (images: string[], index: number, title?: string) => void;
}

export function ImageGallery({ 
  images, 
  title = '', 
  showExpand = true,
  maxDisplay = 12,
  className = '',
  onImageClick
}: ImageGalleryProps) {
  const [showViewer, setShowViewer] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleImageClick = (index: number) => {
    if (onImageClick) {
      onImageClick(images, index, title);
    } else {
      setCurrentIndex(index);
      setShowViewer(true);
    }
  };

  if (!images || images.length === 0) return null;

  return (
    <>
      <div className={`grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 ${className}`}>
        {images.slice(0, maxDisplay).map((imageUrl, index) => (
          <div 
            key={`gallery-image-${index}`} 
            className="relative group aspect-square bg-muted rounded-md overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all duration-200"
            onClick={() => handleImageClick(index)}
          >
            <img 
              src={imageUrl} 
              alt={`${title} image ${index + 1}`} 
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              draggable="false"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <Eye className="h-4 w-4 text-white" />
            </div>
            {index === maxDisplay - 1 && images.length > maxDisplay && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-sm font-bold">+{images.length - maxDisplay}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <Lightbox
        open={showViewer}
        close={() => setShowViewer(false)}
        slides={images.map(src => ({ src }))}
        index={currentIndex}
        plugins={[Counter, Download, Fullscreen, Zoom]}
        animation={{ fade: 400, swipe: 300 }}
        controller={{ 
          closeOnBackdropClick: true,
          closeOnPullDown: true,
          closeOnPullUp: true 
        }}
        zoom={{
          maxZoomPixelRatio: 4,
          zoomInMultiplier: 2,
          doubleTapDelay: 300,
          doubleClickDelay: 300,
          scrollToZoom: true
        }}
        counter={{
          container: { style: { top: "unset", bottom: 0 } },
        }}
        styles={lightboxStyles.default}
      />
    </>
  );
}

// =============================================
// SHARED IMAGE VIEWER COMPONENT 
// =============================================

interface SharedImageViewerProps {
  images: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  theme?: 'dark' | 'light' | 'blurred' | 'custom';
  customBackgroundColor?: string;
}

export const SharedImageViewer: React.FC<SharedImageViewerProps> = ({ 
  images, 
  currentIndex, 
  isOpen, 
  onClose,
  title = '',
  theme = 'dark',
  customBackgroundColor
}) => {
  const slides = images.map((src, index) => ({ 
    src,
    alt: `${title} תמונה ${index + 1} מתוך ${images.length}`,
    download: src // Enable download with original filename
  }));

  // Background theme options
  const getBackgroundColor = () => {
    if (customBackgroundColor) return customBackgroundColor;
    
    switch (theme) {
      case 'light':
        return 'rgba(255, 255, 255, 0.95)';
      case 'blurred':
        return 'rgba(255, 255, 255, 0.85)';
      case 'dark':
      default:
        return 'rgba(0, 0, 0, 0.85)'; // Lighter than before
    }
  };

  // Button colors based on theme
  const getButtonStyles = () => {
    const isLightTheme = theme === 'light' || theme === 'blurred';
    return {
      filter: "none",
      backgroundColor: isLightTheme ? "rgba(0, 0, 0, 0.15)" : "rgba(255, 255, 255, 0.15)",
      borderRadius: "50%",
      padding: "8px",
      margin: "8px",
      backdropFilter: theme === 'blurred' ? "blur(10px)" : "none"
    };
  };

  // Counter colors based on theme
  const getCounterStyles = () => {
    const isLightTheme = theme === 'light' || theme === 'blurred';
    return {
      top: "unset", 
      bottom: 0, 
      right: 0,
      left: "unset",
      padding: "12px 16px",
      backgroundColor: isLightTheme ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.8)",
      color: isLightTheme ? "#1f2937" : "#ffffff",
      borderRadius: "8px 0 0 0",
      fontSize: "14px",
      fontWeight: "500",
      backdropFilter: theme === 'blurred' ? "blur(10px)" : "none"
    };
  };

  return (
    <Lightbox
      open={isOpen}
      close={onClose}
      slides={slides}
      index={currentIndex}
      plugins={[Counter, Download, Fullscreen, Zoom]}
      animation={{ 
        fade: 400, 
        swipe: 300
      }}
      controller={{ 
        closeOnBackdropClick: true,
        closeOnPullDown: true,
        closeOnPullUp: true,
        preventDefaultWheelX: true,
        preventDefaultWheelY: true
      }}
      zoom={{
        maxZoomPixelRatio: 4,
        zoomInMultiplier: 2,
        doubleTapDelay: 300,
        doubleClickDelay: 300,
        doubleClickMaxStops: 2,
        keyboardMoveDistance: 50,
        wheelZoomDistanceFactor: 100,
        pinchZoomDistanceFactor: 100,
        scrollToZoom: true
      }}
      counter={{
        container: { 
          style: getCounterStyles()
        },
      }}
      styles={{
        container: { 
          backgroundColor: getBackgroundColor(),
          backdropFilter: theme === 'blurred' ? "blur(20px)" : "none"
        },
        button: getButtonStyles()
      }}
      carousel={{
        finite: false,
        preload: 2,
        padding: "16px",
        spacing: "30%",
        imageFit: "contain"
      }}
    />
  );
};

// Make ImageUpload the default export for backward compatibility
export { ImageUpload as default };

// =============================================
// USAGE EXAMPLES FOR DIFFERENT THEMES
// =============================================

/*
// Example 1: Default dark theme
<SharedImageViewer
  images={images}
  currentIndex={0}
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Gallery"
/>

// Example 2: Light theme
<SharedImageViewer
  images={images}
  currentIndex={0}
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Gallery"
  theme="light"
/>

// Example 3: Blurred backdrop theme
<SharedImageViewer
  images={images}
  currentIndex={0}
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Gallery"
  theme="blurred"
/>

// Example 4: Custom background color
<SharedImageViewer
  images={images}
  currentIndex={0}
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Gallery"
  theme="custom"
  customBackgroundColor="rgba(30, 58, 138, 0.9)" // Blue background
/>

// Available themes:
// - 'dark' (default): rgba(0, 0, 0, 0.85) - Semi-transparent black
// - 'light': rgba(255, 255, 255, 0.95) - Semi-transparent white  
// - 'blurred': rgba(255, 255, 255, 0.85) with backdrop blur
// - 'custom': Use customBackgroundColor prop
*/