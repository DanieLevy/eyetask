'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Eye, ImageIcon } from 'lucide-react';

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

      // Upload to server
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        onImageSelect(result.data.publicUrl);
      } else {
        throw new Error(result.error || 'Upload failed');
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
}

export function ImageDisplay({ 
  imageUrl, 
  alt = 'Image', 
  className = '',
  showExpand = true 
}: ImageDisplayProps) {
  const [showFullImage, setShowFullImage] = useState(false);

  if (!imageUrl) {
    return null;
  }

  return (
    <>
      <div className={`relative group ${className}`}>
        <div className="relative w-full h-24 bg-muted rounded-lg overflow-hidden">
          <img
            src={imageUrl}
            alt={alt}
            className="w-full h-full object-cover cursor-pointer"
            onClick={showExpand ? () => setShowFullImage(true) : undefined}
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
      </div>

      {/* Full Image Modal */}
      {showFullImage && (
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
              src={imageUrl}
              alt={alt}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
} 