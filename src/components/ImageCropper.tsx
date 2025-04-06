// components/ImageCropper.tsx
"use client";

import Image from 'next/image';
import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropperProps {
  onCropComplete: (croppedImage: string) => void;
  aspectRatio?: number; // Optional to allow flexibility, but we'll default to 4:5
}

export default function ImageCropper({ 
  onCropComplete, 
  aspectRatio = 4 / 5 // 1080:1350 ratio (width:height)
}: ImageCropperProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // Function to center and create aspect ratio crop
  function centerAspectCrop(
    mediaWidth: number,
    mediaHeight: number,
    aspect: number
  ) {
    return centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspect,
        mediaWidth,
        mediaHeight
      ),
      mediaWidth,
      mediaHeight
    );
  }

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setImageSize({ width, height });
    
    // Initialize with a centered crop of the correct aspect ratio
    setCrop(centerAspectCrop(width, height, aspectRatio));
  };

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setSelectedImage(reader.result as string);
        // Reset crop when new image is loaded
        setCrop(undefined);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const generateCroppedImage = useCallback(() => {
    if (!completedCrop || !imageRef.current) return;

    const image = imageRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    // For output size, we'll scale to exactly 1080x1350
    const outputWidth = 1080;
    const outputHeight = 1350;
    
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw the cropped portion of the image, scaled to our desired output size
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      outputWidth,
      outputHeight
    );

    const croppedImageUrl = canvas.toDataURL('image/jpeg', 0.92); // Higher quality JPEG
    onCropComplete(croppedImageUrl);
  }, [completedCrop, onCropComplete]);

  return (
    <div className="flex flex-col gap-4">
      <input 
        type="file" 
        accept="image/*" 
        onChange={onSelectFile}
        className="block w-full text-sm text-slate-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-full file:border-0
          file:text-sm file:font-semibold
          file:bg-violet-50 file:text-violet-700
          hover:file:bg-violet-100"
      />
      
      {selectedImage && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-xs text-gray-300">
            Crop area will maintain a 4:5 ratio (1080x1350px)
          </p>
          
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              minWidth={100} // Prevent tiny crops
            >
              <Image
                ref={imageRef}
                src={selectedImage}
                alt="Selected"
                className="max-h-96 max-w-full"
                onLoad={onImageLoad}
                width={1080}
                height={1350}
              />
            </ReactCrop>
          </div>
          
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              type="button"
              onClick={generateCroppedImage}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={!completedCrop}
            >
              Apply Crop
            </button>
            
            <div className="text-sm text-gray-300">
              {imageSize.width > 0 && (
                <span>
                  Selected area will be exported at 1080×1350px
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}