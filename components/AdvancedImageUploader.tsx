'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// A more structured type for image state
export interface ImageState {
  id: string; // A unique ID for React keys and operations
  file?: File; // For new uploads
  url?: string; // For existing images
  preview: string; // Blob URL for new files, regular URL for existing
}

interface AdvancedImageUploaderProps {
  existingImages?: { id: string, url: string }[];
  onImagesUpdate: (imagesToUpload: File[], existingUrlsToKeep: string[]) => void;
  maxFiles?: number;
  maxSizeMb?: number;
}

export function AdvancedImageUploader({
  existingImages = [],
  onImagesUpdate,
  maxFiles = 5,
  maxSizeMb = 10
}: AdvancedImageUploaderProps) {
  const [images, setImages] = useState<ImageState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef(images);
  imagesRef.current = images;

  // Initialize state with existing images, but only once
  useEffect(() => {
    const initialState: ImageState[] = existingImages.map(img => ({
      ...img,
      preview: img.url,
    }));
    setImages(initialState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Runs only on mount to prevent wiping state on re-render.
  
  // This effect now handles notifying the parent component.
  useEffect(() => {
    const filesToUpload = images.map(img => img.file).filter((f): f is File => !!f);
    const urlsToKeep = images.map(img => img.url).filter((url): url is string => !!url);
    onImagesUpdate(filesToUpload, urlsToKeep);
  }, [images, onImagesUpdate]);

  // Revoke blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      imagesRef.current.forEach(image => {
        if (image.file) {
          URL.revokeObjectURL(image.preview);
        }
      });
    };
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    if (images.length + files.length > maxFiles) {
      setError(`לא ניתן להעלות יותר מ-${maxFiles} תמונות.`);
      return;
    }

    const newImages: ImageState[] = [];
    for (const file of files) {
      if (file.size > maxSizeMb * 1024 * 1024) {
        setError(`הקובץ "${file.name}" חורג מהגודל המקסימלי (${maxSizeMb}MB).`);
        continue;
      }
      const preview = URL.createObjectURL(file);
      newImages.push({
        id: `${file.name}-${file.lastModified}`,
        file,
        preview
      });
    }

    setImages(prev => [...prev, ...newImages]);

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleRemoveImage = (idToRemove: string) => {
    const imageToRemove = images.find(img => img.id === idToRemove);
    if (imageToRemove?.file) {
      URL.revokeObjectURL(imageToRemove.preview);
    }
    setImages(prev => prev.filter(img => img.id !== idToRemove));
  };

  return (
    <div>
      <div
        className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept="image/*"
          className="hidden"
          disabled={images.length >= maxFiles}
        />
        <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
          <Upload className="w-10 h-10 mb-2" />
          <p className="font-semibold">לחץ או גרור לכאן תמונות</p>
          <p className="text-sm">עד {maxFiles} תמונות, כל אחת עד {maxSizeMb}MB</p>
        </div>
      </div>

      {error && (
        <div className="mt-2 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
        </div>
      )}

      <AnimatePresence>
        {images.length > 0 && (
          <motion.div
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
          >
            {images.map((image) => (
              <motion.div
                layout
                key={image.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="relative group aspect-square"
              >
                <img
                  src={image.preview}
                  alt={image.file?.name || 'תמונה קיימת'}
                  className="w-full h-full object-cover rounded-lg shadow-md"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                    <button
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent triggering the file input
                            handleRemoveImage(image.id);
                        }}
                        className="absolute top-1 right-1 p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity scale-75 group-hover:scale-100"
                        aria-label="Remove image"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 