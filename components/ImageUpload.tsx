'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Eye } from 'lucide-react';
import ImageViewer from 'react-simple-image-viewer';

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

    setIsUploading(true);
    
    try {
      // Create preview immediately
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPreview(result);
      };
      reader.readAsDataURL(file);

      // Simulate upload - replace with your actual upload logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const imageUrl = URL.createObjectURL(file);
      setPreview(imageUrl);
      onImageSelect(imageUrl);
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

      {showViewer && (
        <ImageViewer
          src={[imageUrl]}
          currentIndex={0}
          onClose={() => setShowViewer(false)}
          disableScroll={false}
          closeOnClickOutside={true}
        />
      )}
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

  // Unified callback function for backward compatibility
  const handleImagesUpdate = useCallback((images: string[]) => {
    if (onImagesSelect) onImagesSelect(images);
    if (onImagesChange) onImagesChange(images);
  }, [onImagesSelect, onImagesChange]);

  const handleFilesSelect = useCallback(async (files: File[]) => {
    if (disabled || isUploading) return;

    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    const remainingSlots = maxImages - previews.length;
    const filesToProcess = imageFiles.slice(0, remainingSlots);

    if (filesToProcess.length === 0) return;

    setIsUploading(true);
    
    try {
      const newImageUrls: string[] = [];
      
      // Process each file
      for (const file of filesToProcess) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const imageUrl = URL.createObjectURL(file);
        newImageUrls.push(imageUrl);
      }
      
      const updatedImages = [...previews, ...newImageUrls];
      setPreviews(updatedImages);
      handleImagesUpdate(updatedImages);
    } catch (error) {
      console.error('Multiple image upload error:', error);
      alert('Failed to upload some images. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [disabled, isUploading, previews, maxImages, handleImagesUpdate]);

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
    handleImagesUpdate(updatedImages);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [disabled, previews, handleImagesUpdate]);

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

      {showViewer && (
        <ImageViewer
          src={allImages}
          currentIndex={index}
          onClose={() => setShowViewer(false)}
          disableScroll={false}
          closeOnClickOutside={true}
        />
      )}
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

      {showViewer && (
        <ImageViewer
          src={images}
          currentIndex={currentIndex}
          onClose={() => setShowViewer(false)}
          disableScroll={false}
          closeOnClickOutside={true}
        />
      )}
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

      {showViewer && (
        <ImageViewer
          src={images}
          currentIndex={currentIndex}
          onClose={() => setShowViewer(false)}
          disableScroll={false}
          closeOnClickOutside={true}
        />
      )}
    </>
  );
}

// Make ImageUpload the default export for backward compatibility
export { ImageUpload as default };