'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X } from 'lucide-react';

interface ImageUploadProps {
  onImageSelect: (base64: string | null) => void;
  currentImage?: string;
}

export default function ImageUpload({ onImageSelect, currentImage }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreview(base64String);
        onImageSelect(base64String);
      };
      reader.readAsDataURL(file);
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
      />
      {preview ? (
        <div className="relative group w-full h-48 rounded-lg overflow-hidden">
          <img src={preview} alt="Project" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
            <button
              onClick={handleRemoveImage}
              className="p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove image"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
            <Upload className="w-10 h-10 mb-2" />
            <p className="font-semibold">לחץ להעלאת תמונה</p>
            <p className="text-sm">PNG, JPG, או GIF</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface MultipleImageUploadProps {
    onImagesChange: (base64Images: string[]) => void;
    currentImages?: string[];
}

export function MultipleImageUpload({ onImagesChange, currentImages = [] }: MultipleImageUploadProps) {
    const [images, setImages] = useState<string[]>(currentImages);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        const imagePromises = files.map(file => {
            return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        });

        Promise.all(imagePromises).then(newImages => {
            const updatedImages = [...images, ...newImages];
            setImages(updatedImages);
            onImagesChange(updatedImages);
        });

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
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
                className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors mb-4"
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    accept="image/*"
                    className="hidden"
                />
                <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
                    <Upload className="w-10 h-10 mb-2" />
                    <p className="font-semibold">לחץ או גרור לכאן תמונות</p>
                    <p className="text-sm">העלה מספר תמונות</p>
                </div>
            </div>
            
            {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {images.map((image, index) => (
                        <div key={index} className="relative group aspect-square">
                            <img
                                src={image}
                                alt={`Uploaded image ${index + 1}`}
                                className="w-full h-full object-cover rounded-lg shadow-md"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                                <button
                                    onClick={() => handleRemoveImage(index)}
                                    className="absolute top-1 right-1 p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity scale-75 group-hover:scale-100"
                                    aria-label="Remove image"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
} 