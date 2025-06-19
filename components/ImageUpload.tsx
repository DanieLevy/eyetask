'use client';

import { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import CloudinaryImage from './CloudinaryImage';

// Helper function to get the correct auth token
const getAuthToken = (): string | null => {
  // Check for admin token first, then regular user token
  return localStorage.getItem('adminToken') || localStorage.getItem('token');
};


interface ImageUploadProps {
  onImageSelect: (imageUrl: string | null) => void;
  currentImage?: string;
}

export default function ImageUpload({ onImageSelect, currentImage }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Please select a JPEG, PNG, WebP, or GIF image.');
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('File too large. Maximum size is 10MB.');
      return;
    }

    setIsUploading(true);

    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload to our API (which uses Cloudinary)
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      if (result.success && result.data.publicUrl) {
        setPreview(result.data.publicUrl);
        onImageSelect(result.data.publicUrl);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreview(null);
    onImageSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
        disabled={isUploading}
      />
      {preview ? (
        <div className="relative group w-full h-48 rounded-lg overflow-hidden">
          <CloudinaryImage
            src={preview}
            alt="Project"
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
            crop="fill"
            quality="auto:good"
          />
          {/* Temporarily comment out overlay to debug black image issue */}
          {/* <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
            <button
              onClick={handleRemoveImage}
              disabled={isUploading}
              className="p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
              aria-label="Remove image"
            >
              <X className="w-5 h-5" />
            </button>
          </div> */}
          
          {/* Simple remove button without overlay */}
          <button
            onClick={handleRemoveImage}
            disabled={isUploading}
            className="absolute top-2 right-2 p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-full transition-opacity disabled:opacity-50"
            aria-label="Remove image"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div
          className={`relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors ${
            isUploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
            {isUploading ? (
              <>
                <div className="w-10 h-10 mb-2 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
                <p className="font-semibold">מעלה תמונה...</p>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 mb-2" />
                <p className="font-semibold">לחץ להעלאת תמונה</p>
                <p className="text-sm">PNG, JPG, WebP או GIF (עד 10MB)</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface MultipleImageUploadProps {
  onImagesChange: (imageUrls: string[]) => void;
  currentImages?: string[];
}

export function MultipleImageUpload({ onImagesChange, currentImages = [] }: MultipleImageUploadProps) {
  const [images, setImages] = useState<string[]>(currentImages);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate each file
    for (const file of files) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        alert(`Invalid file type for ${file.name}. Please select JPEG, PNG, WebP, or GIF images.`);
        return;
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return;
      }
    }

    setIsUploading(true);

    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload/image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`
          },
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }

        const result = await response.json();
        
        if (result.success && result.data.publicUrl) {
          return result.data.publicUrl;
        } else {
          throw new Error(result.error || `Upload failed for ${file.name}`);
        }
      });

      const newImageUrls = await Promise.all(uploadPromises);
      const updatedImages = [...images, ...newImageUrls];
      setImages(updatedImages);
      onImagesChange(updatedImages);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload one or more images. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const updatedImages = images.filter((_, index) => index !== indexToRemove);
    setImages(updatedImages);
    onImagesChange(updatedImages);
  };

  return (
    <div>
      <div
        className={`relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors mb-4 ${
          isUploading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept="image/*"
          className="hidden"
          disabled={isUploading}
        />
        <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
          {isUploading ? (
            <>
              <div className="w-10 h-10 mb-2 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
              <p className="font-semibold">מעלה תמונות...</p>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 mb-2" />
              <p className="font-semibold">לחץ או גרור לכאן תמונות</p>
              <p className="text-sm">העלה מספר תמונות (עד 10MB כל אחת)</p>
            </>
          )}
        </div>
      </div>
      
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group aspect-square">
              <CloudinaryImage
                src={image}
                alt={`Uploaded image ${index + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 20vw"
                className="object-cover rounded-lg shadow-md"
                crop="fill"
                quality="auto:good"
              />
              {/* Temporarily comment out overlay to debug black image issue */}
              {/* <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                <button
                  onClick={() => handleRemoveImage(index)}
                  disabled={isUploading}
                  className="absolute top-1 right-1 p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity scale-75 group-hover:scale-100 disabled:opacity-50"
                  aria-label="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div> */}
              
              {/* Simple remove button without overlay */}
              <button
                onClick={() => handleRemoveImage(index)}
                disabled={isUploading}
                className="absolute top-1 right-1 p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-full transition-opacity disabled:opacity-50"
                aria-label="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 