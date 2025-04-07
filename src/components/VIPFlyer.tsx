"use client";

import { useEffect, useState } from "react";
import ImageCropper from "./ImageCropper";
import Image from "next/image";
import ModelsDropdown from "./ModelsDropdown";
import { useRouter, useSearchParams } from "next/navigation";

export default function FlyerGenerator() {
  const router = useRouter();

  const searchParams = useSearchParams();
  const tabValue = searchParams.get("tab") || "vip";
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingImage, setIsFetchingImage] = useState(false);
  const [webhookData, setWebhookData] = useState(null);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState<ModelFormData>({
    croppedImage: null,
    templatePosition: "LEFT",
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/google/check-auth");
        const data = await res.json();

        if (!data.authenticated) {
          // Get the current tab from URL or default to 'live'
          const currentTab = tabValue || "vip";

          // Include the current tab in the auth request
          const authRes = await fetch(
            `/api/google/auth?tab=${encodeURIComponent(currentTab)}`
          );
          const authData = await authRes.json();

          if (authData.authUrl) {
            // Append the tab parameter to the auth URL
            const authUrlWithTab = new URL(authData.authUrl);
            authUrlWithTab.searchParams.set(
              "state",
              JSON.stringify({ tab: currentTab })
            );

            window.location.href = authUrlWithTab.toString();
          }
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Authentication check failed", error);
      }
    };

    checkAuth();
  }, [router]);

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

        <form className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <ModelsDropdown
              formData={formData}
              setFormData={setFormData}
              isLoading={isLoading}
              isFetchingImage={isFetchingImage}
              webhookData={webhookData}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">
              Download and Crop Image
            </label>
            <ImageCropper
              onCropComplete={handleCropComplete}
              aspectRatio={4 / 5} // For 1080:1350 aspect ratio
              model={formData.model}
            />
          </div>

          <div className="flex gap-4 col-span-2">
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

          <div className="mt-2 col-span-2">
            <button
              type="submit"
              className={`rounded-md px-5 w-full cursor-pointer bg-gradient-to-r from-purple-600 to-blue-600 py-2 text-white font-medium transition-colors  ${
                isLoading || isFetchingImage
                  ? "opacity-60 cursor-not-allowed"
                  : "opacity-100"
              }`}
              disabled={isLoading || isFetchingImage}
            >
              {formData.customRequest ? (
                <span>
                  {isLoading || isFetchingImage
                    ? "Sending..."
                    : "Send Custom Request"}
                </span>
              ) : (
                <span>
                  {isLoading || isFetchingImage
                    ? "Generating..."
                    : "Generate VIP Flyer"}
                </span>
              )}
            </button>
          </div>
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
                      unoptimized
                    />
                  )}

                  {/* Template image */}
                  <Image
                    src={`/templates/TEMPLATE_${formData.templatePosition}.png`}
                    alt="Template"
                    className="absolute top-0 left-0 max-h-full max-w-full object-contain z-20"
                    width={1080}
                    height={1350}
                    unoptimized
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

            <div className="flex items-center justify-center rotate-90 lg:rotate-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </div>

            {/* Flyer Image */}
            <div className="h-80 w-64 bg-black/60 rounded-lg flex items-center justify-center flex-shrink-0">
              <p className="text-gray-500">Flyer not yet generated</p>
            </div>
          </div>

          {/* Button */}
          <button
            className={`rounded-md px-5 w-full cursor-pointer bg-gradient-to-r from-purple-600 to-blue-600 py-2 text-white font-medium transition-colors  ${
              isLoading || isFetchingImage
                ? "opacity-60 cursor-not-allowed"
                : "opacity-100"
            }`}
          >
            Create Event
          </button>
        </div>
      </div>
    </div>
  );
}
