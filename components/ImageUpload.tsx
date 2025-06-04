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
    sm: 'w-20 h-16',
    md: 'w-32 h-24', 
    lg: 'w-48 h-32'
  };

  return (
    <>
      <div className={`relative group ${className}`}>
        <div className={`${sizeClasses[size]} bg-muted rounded-lg overflow-hidden shadow-sm border border-border/50`}>
          <img
            src={imageUrl}
            alt={alt}
            className="w-full h-full object-cover cursor-pointer transition-transform hover:scale-105"
            onClick={showExpand ? () => setShowFullImage(true) : undefined}
            loading="lazy"
          />
          
          {showExpand && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFullImage(true);
                }}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                title="הצג תמונה מלאה"
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
              className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300 transition-colors z-10"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={imageUrl}
              alt={alt}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
} 