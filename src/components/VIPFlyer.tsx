"use client";

import { useState } from "react";
import ImageCropper from "./ImageCropper";
import Image from "next/image";

export default function FlyerGenerator() {
  const [formData, setFormData] = useState({
    croppedImage: null as string | null,
    templatePosition: "LEFT",
  });

  const handleCropComplete = (croppedImage: string) => {
    setFormData({
      ...formData,
      croppedImage,
    });
  };

  const generateFlyer = () => {};

  const positions = ["LEFT", "RIGHT", "BOTTOM"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6  text-white min-h-screen">
      <div className="bg-black/20 border border-white/10 p-6 rounded-lg">
        <h1 className="text-2xl font-bold mb-2">VIP Flyer Generation</h1>
        <p className="text-gray-300 mb-6">
          Create promotional materials for VIP subscription benefits
        </p>

        <form className="space-y-6">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Template Position
              </label>
              <div className="flex space-x-4">
                {positions.map((position) => (
                  <label key={position} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="templatePosition"
                      value={position}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          templatePosition: e.target.value,
                        })
                      }
                      className="text-gray-800"
                      checked={formData.templatePosition === position}
                    />
                    <span className="text-sm">{position}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Upload and Crop Image
            </label>
            <ImageCropper
              onCropComplete={handleCropComplete}
              aspectRatio={4 / 5} // For 1080:1350 aspect ratio
            />
          </div>

          <button
            onClick={generateFlyer}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-md font-medium hover:from-purple-600 hover:to-blue-600 transition-colors"
          >
            Generate Live Flyer
          </button>
        </form>
      </div>

      <div className="bg-black/20 border border-white/10 p-6 rounded-lg">
        <div className="flex flex-col gap-4 sticky top-8">
          <div>
            <h1 className="font-bold text-xl">Preview</h1>
            <p className="text-sm text-gray-400 mb-2">
              VIP flyer preview will appear here
            </p>
          </div>

          <div className="flex flex-wrap justify-between items-center gap-4">
            {/* Preview Image */}
            <div className="h-80 w-64 bg-black/60 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
              {formData.croppedImage || formData.templatePosition ? (
                <div className="relative w-full h-full">
                  {/* Cropped image */}
                  {formData.croppedImage && (
                    <Image
                      src={formData.croppedImage}
                      alt="Cropped preview"
                      className="max-h-full max-w-full object-contain z-10"
                      width={1080}
                      height={1350}
                    />
                  )}

                  {/* Template image */}
                  <Image
                    src={`/templates/TEMPLATE_${formData.templatePosition}.png`}
                    alt="Template"
                    className="absolute top-0 left-0 max-h-full max-w-full object-contain z-20"
                    width={1080}
                    height={1350}
                  />

                  {/* Image label */}
                  <div className="absolute z-30 bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                    1080x1350
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No image selected</p>
              )}
            </div>

            {/* Arrow */}
            <div className="text-3xl">➔</div>

            {/* Flyer Image */}
            <div className="h-80 w-64 bg-black/60 rounded-lg flex items-center justify-center flex-shrink-0">
              <p className="text-gray-500">Flyer not yet generated</p>
            </div>
          </div>

          {/* Button */}
          <button className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-md font-medium hover:from-blue-600 hover:to-purple-600 transition-colors">
            Create Event
          </button>
        </div>
      </div>
    </div>
  );
}
