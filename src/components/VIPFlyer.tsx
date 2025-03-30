import Image from "next/image";
import ModelsDropdown from "./ModelsDropdown";
import { FormEvent, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";

const VIPFlyer = () => {
  const router = useRouter();

  const searchParams = useSearchParams();
  const tabValue = searchParams.get("tab") || "live";

  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/google/check-auth");
        const data = await res.json();

        if (!data.authenticated) {
          // Get the current tab from URL or default to 'live'
          const currentTab = tabValue || "live";

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

  const [isGooglePickerLoading, setIsGooglePickerLoading] =
    useState<boolean>(false);
  const [response, setResponse] = useState<WebhookResponse | null>(null);
  const [selectedImage, setSelectedImage] = useState<GoogleDriveFile | null>(
    null
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [googleFiles, setGoogleFiles] = useState<GoogleDriveFile[]>([]);
  const [currentFolder, setCurrentFolder] = useState<FolderInfo | null>(null);
  const [parentFolder, setParentFolder] = useState<FolderInfo | null>(null);
  const [showFilePicker, setShowFilePicker] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [webhookData, setWebhookData] = useState<any>(null);
  // const [isProcessing, setIsProcessing] = useState(false);
  const lastCheckTimestamp = useRef(0);
  const checkInterval = useRef<NodeJS.Timeout | null>(null);
  const [isFetchingImage, setIsFetchingImage] = useState(false);
  const [history, setHistory] = useState<WebhookResponse[]>([]);
  const [isCustomImage, setIsCustomImage] = useState(false);
  const [isEventCreating, setIsEventCreating] = useState(false);
  const [itemReceived, setItemReceived] = useState(0);
  const [requestSent, setRequestSent] = useState(false);
  const [sheetLink, setSheetLink] = useState<string | null>(null);
  const [calendarLink, setCalendarLink] = useState<string | null>(null);

  const [eventCreated, setEventCreated] = useState<{
    success: boolean;
    message: string;
    eventLink?: string;
  } | null>(null);

  const [formData, setFormData] = useState<ModelFormData>({
    model: "",
    date: "",
    time: "",
    timezone: "",
    paid: false,
    customImage: false,
    imageId: "",
    noOfTemplate: 1,
    customRequest: false,
    customDetails: "",
    type: "VIP",
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {};
  function uuidv4(): string {
    throw new Error("Function not implemented.");
  }

  const handleGoogleDriveAuth = async () => {
    try {
      const response = await fetch("/api/google-drive/auth");
      const { authUrl } = await response.json();
      // Redirect to Google's OAuth consent screen
      window.location.href = authUrl;
    } catch (error) {
      console.error("Error starting Google authentication:", error);
      alert("Failed to connect to Google Drive");
    }
  };

  const handleGoogleDriveSelect = async () => {
    if (!isAuthenticated) {
      handleGoogleDriveAuth();
      return;
    }

    try {
      setIsGooglePickerLoading(true);

      // If a model is selected, try to find its folder
      let url = "/api/google-drive/list";
      if (formData.model) {
        url += `?folderName=${formData.model}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthenticated(false);
          handleGoogleDriveAuth();
          return;
        }
        throw new Error("Failed to fetch Google Drive files");
      }

      const data = await response.json();

      if (data.files) {
        setGoogleFiles(data.files);
        setCurrentFolder(data.currentFolder || null);
        setParentFolder(data.parentFolder || null);
        setShowFilePicker(true);
      } else {
        alert("No images found in the selected folder");
      }
    } catch (error) {
      console.error("Error selecting from Google Drive:", error);
      alert("Failed to connect to Google Drive");
    } finally {
      setIsGooglePickerLoading(false);
    }
  };

  const handleRemoveImage = () => {
    // Revoke the object URL to free up memory
    if (selectedImage && selectedImage.thumbnailLink && isCustomImage) {
      URL.revokeObjectURL(selectedImage.thumbnailLink);
    }

    setSelectedImage(null);
    setFormData((prev) => {
      const newData = { ...prev };
      delete newData.imageUrl;
      delete newData.imageFile;
      return newData;
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      <div className="flex flex-col gap-4 shadow-md  lg:max-w-lg w-full p-6 r bg-black/20 rounded-lg border border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-start">
            VIP Flyer Generation
          </h1>
          <p className="text-gray-400 text-sm">
            Create promotional materials for VIP subscription benefits
          </p>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <ModelsDropdown
              formData={formData}
              setFormData={setFormData}
              isLoading={isLoading}
              isFetchingImage={isFetchingImage}
              webhookData={webhookData}
            />
          </div>

          {formData.model && (
            <div className="col-span-2">
              <div className="flex flex-col">
                <label htmlFor="image" className="text-sm font-medium mb-1">
                  Select Image
                </label>
                <div className="space-x-1 flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="customImage"
                    className={cn("cursor-pointer accent-purple-600", {
                      "cursor-not-allowed": isLoading || isFetchingImage,
                    })}
                    checked={isCustomImage}
                    disabled={isLoading || isFetchingImage}
                    onChange={() => {
                      setIsCustomImage((prev) => {
                        const newCustomImageState = !prev;

                        setFormData((formData) => ({
                          ...formData,
                          customImage: newCustomImageState,
                        }));

                        // If turning off custom image, clean up any selected image

                        // Clean up object URL if it exists
                        if (selectedImage && selectedImage.thumbnailLink) {
                          URL.revokeObjectURL(selectedImage.thumbnailLink);
                        }

                        // Reset the image selection
                        setSelectedImage(null);

                        // Clean up image data in the form
                        setFormData((prev) => {
                          const newData = { ...prev };
                          delete newData.imageUrl;
                          delete newData.imageName;
                          return newData;
                        });

                        return newCustomImageState;
                      });
                    }}
                  />
                  <label
                    htmlFor="customImage"
                    className={cn("cursor-pointer text-sm", {
                      "cursor-not-allowed": isLoading || isFetchingImage,
                    })}
                  >
                    Custom Image
                  </label>
                </div>
                <div className="flex flex-col gap-2">
                  {!selectedImage && !isCustomImage ? (
                    <button
                      onClick={handleGoogleDriveSelect}
                      type="button"
                      disabled={
                        isGooglePickerLoading ||
                        formData.model === "" ||
                        isLoading ||
                        isFetchingImage
                      }
                      className={cn(
                        "border-2 border-dashed cursor-pointer border-black/60 rounded-md p-4 flex flex-col items-center justify-center hover:bg-black/40",
                        { "border-red-500": error?.includes("imageId") }
                      )}
                    >
                      {isGooglePickerLoading ? (
                        <span className="text-sm text-gray-500">
                          Loading...
                        </span>
                      ) : (
                        <>
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
                            className={cn("text-gray-300 mb-2", {
                              "text-red-500": error?.includes("imageId"),
                            })}
                          >
                            <path d="M12 5v14M5 12h14"></path>
                          </svg>
                          <span
                            className={cn("text-gray-300 text-sm", {
                              "text-red-500": error?.includes("imageId"),
                            })}
                          >
                            {isAuthenticated
                              ? formData.model
                                ? `Select from ${formData.model} folder`
                                : "Select from Google Drive"
                              : "Connect to Google Drive"}
                          </span>
                        </>
                      )}
                    </button>
                  ) : !selectedImage && isCustomImage ? (
                    <div>
                      <label
                        htmlFor="selectImage"
                        className={cn(
                          "border-2 border-dashed cursor-pointer border-black/60 rounded-md p-4 flex flex-col items-center justify-center hover:bg-black/40",
                          { "border-red-500": error?.includes("imageId") }
                        )}
                      >
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
                          className={cn("text-gray-300 mb-2", {
                            "text-red-500": error?.includes("imageId"),
                          })}
                        >
                          <path d="M12 5v14M5 12h14"></path>
                        </svg>
                        <span
                          className={cn("text-gray-300 text-sm", {
                            "text-red-500": error?.includes("imageId"),
                          })}
                        >
                          Upload Image
                        </span>
                      </label>
                      <input
                        type="file"
                        className="hidden"
                        id="selectImage"
                        accept=".png,.jpg,.heic,.jpeg"
                        max={1}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Create a URL for the file preview
                            const previewUrl = URL.createObjectURL(file);

                            setSelectedImage({
                              id: uuidv4(),
                              name: file.name,
                              mimeType: file.type,
                              thumbnailLink: previewUrl, // Add the preview URL here
                            });

                            setFormData((prev) => ({
                              ...prev,
                              imageFile: file,
                              imageId: uuidv4(),
                              imageName: file.name,
                            }));
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="w-full h-32 bg-black/40 rounded-md overflow-hidden">
                        {selectedImage && selectedImage.thumbnailLink ? (
                          <Image
                            src={selectedImage.thumbnailLink}
                            alt={selectedImage.name}
                            width={200}
                            height={200}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-sm text-gray-500">
                              {selectedImage?.name || "No image selected"}
                            </span>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isFetchingImage && !isLoading) {
                            handleRemoveImage();
                          }
                        }}
                        className={cn(
                          "absolute top-1 cursor-pointer right-1 bg-black/70 rounded-full p-1 shadow-sm",
                          { "cursor-not-allowed": isFetchingImage || isLoading }
                        )}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className=""
                        >
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default VIPFlyer;
