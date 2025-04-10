"use client";
import { cn, convertToPreviewLink, emailData } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";
import { useState, FormEvent, ChangeEvent, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { liveFlyerValidation } from "../../schema/zodValidationSchema";
import { TIMEZONES } from "@/lib/lib";
import { toast } from "sonner";
import ModelsDropdown from "./ModelsDropdown";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { DateTime } from "luxon";
import ServerOffline from "./ServerOffline";

export default function LiveFlyer() {
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
    type: "LIVE",
  });

  useEffect(() => {
    const { date, time, timezone } = formData;

    if (!date || !time || !timezone) return;

    try {
      // Combine the date and time, then parse it with the timezone
      const selectedDateTime = DateTime.fromFormat(
        `${date} ${time}`,
        "yyyy-MM-dd HH:mm",
        {
          zone: timezone,
        }
      );

      // Get "today" in the same timezone
      const nowInZone = DateTime.now().setZone(timezone);

      const isToday =
        selectedDateTime.hasSame(nowInZone, "day") &&
        selectedDateTime.hasSame(nowInZone, "month") &&
        selectedDateTime.hasSame(nowInZone, "year");

      setFormData((prev) => ({
        ...prev,
        header: isToday ? "Live Tonight" : "Going Live",
      }));
    } catch (err) {
      console.error("Invalid date/time/timezone format:", err);
    }
  }, [formData.date, formData.time, formData.timezone]);

  console.log("Form Data:", formData);

  // Check authentication status when component mounts
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const fetchWebhookData = async (requestId: string) => {
    try {
      const response = await fetch(`/api/webhook?requestId=${requestId}`);

      if (!response.ok) {
        console.error("Webhook data request failed:", response.statusText);
        return;
      }

      const result = await response.json();

      if (!result || !result.data) {
        console.warn("No data found for requestId:", requestId);
        return;
      }

      if (result.timestamp > lastCheckTimestamp.current) {
        setWebhookData(result.data);
        setFormData((prev) => ({
          ...prev,
          thumbnail: result.data.thumbnail,
          webViewLink: result.data.webViewLink,
        }));
        setHistory((prev) => [...prev, result.data]);
        lastCheckTimestamp.current = result.timestamp;
        setItemReceived((prev) => prev + 1);
        // setIsProcessing(false);
      }
    } catch (error) {
      console.error("Error fetching webhook data:", error);
    }
  };

  const startChecking = (requestId: string) => {
    if (checkInterval.current) {
      clearInterval(checkInterval.current);
      checkInterval.current = null;
    }

    checkInterval.current = setInterval(() => {
      fetchWebhookData(requestId);
    }, 2000);
  };

  // Effect to stop checking when webhookData is updated
  useEffect(() => {
    const totalTemplates = Number(formData.noOfTemplate);
    if (itemReceived === totalTemplates) {
      // setIsProcessing(false);

      stopChecking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webhookData]);

  // Check for initial data on mount

  const stopChecking = () => {
    if (checkInterval.current) {
      clearInterval(checkInterval.current);
      checkInterval.current = null;
    }
    setIsFetchingImage(false);
  };

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/google-drive/list");
      if (response.ok) {
        setIsAuthenticated(true);
        const data = await response.json();
        if (data.files) {
          setGoogleFiles(data.files);
          setCurrentFolder(data.currentFolder || null);
          setParentFolder(data.parentFolder || null);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setIsAuthenticated(false);
    }
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, type } = e.target;
    const value =
      type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : e.target.value;

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setIsFetchingImage(true);
    setItemReceived(0);

    // Validate form data
    const result = liveFlyerValidation.safeParse(formData);
    if (!result.success) {
      setError(JSON.stringify(result.error.format()));
      setIsLoading(false);
      return;
    }

    const requestId = uuidv4(); // Generate unique ID
    const webhookUrl = "/api/webhook-proxy";

    try {
      const formDataToSend = new FormData();

      // Append form data fields
      formDataToSend.append("customImage", String(formData.customImage));
      formDataToSend.append("date", formData.date || "");
      formDataToSend.append("model", formData.model || "");
      formDataToSend.append("paid", String(formData.paid));
      formDataToSend.append("time", formData.time || "");
      formDataToSend.append("timezone", formData.timezone || "");
      formDataToSend.append("imageId", formData.imageId || "");
      formDataToSend.append("requestId", requestId);
      formDataToSend.append("timestamp", new Date().toISOString());
      formDataToSend.append("imageName", formData.imageName || "");
      formDataToSend.append("noOfTemplate", String(formData.noOfTemplate));
      formDataToSend.append("isCustomRequest", String(formData.customRequest));
      formDataToSend.append("customDetails", formData.customDetails || "");
      formDataToSend.append("type", formData.type || "");
      formDataToSend.append("header", formData.header || "");

      // Append the file if it exists
      if (formDataToSend.has("imageFile")) {
        formDataToSend.delete("imageFile"); // Ensure only one instance
      }
      if (formData.imageFile && formData.customImage) {
        formDataToSend.append("imageFile", formData.imageFile);
      }

      // Make the API request
      const response = await fetch(webhookUrl, {
        method: "POST",
        body: formDataToSend, // Send as FormData (automatically sets correct headers)
      });

      console.log(response, "response");

      // Check for errors based on the status code
      if (!response.ok) {
        const errorText = await response.text();
        setResponse({
          error: `Failed to call webhook. Status: ${response.status} - ${errorText}`,
        });
        setError(errorText);
        setIsLoading(false);
        return;
      }

      // Read the response correctly (expect JSON response)
      const textData = await response.text();
      try {
        const jsonData = JSON.parse(textData);
        setResponse(jsonData); // Store the response in the state
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        setResponse({ error: "Invalid JSON response from webhook" });
        setError(textData); // Store the raw response if it's not JSON
        stopChecking(); // Stop checking if the response is invalid
        // Send email about the invalid response (server offline)
        const emailData = {
          to: "kentjohnliloc@gmail.com",
          subject: "Webhook Server Offline",
          text: `The webhook server returned an invalid response:\n\n${textData}`,
          html: `<p>The webhook server returned an invalid response:</p><pre>${textData}</pre>`,
        };

        // Send the email notification to admin about the issue
        try {
          await fetch("/api/sendEmail", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(emailData),
          });
        } catch (emailError) {
          console.error("Error sending email:", emailError);
        }
      }

      // Handle request-based logic
      if (formData.customRequest !== true) {
        startChecking(requestId); // Start checking using requestId
      } else {
        setIsFetchingImage(false);
        setIsLoading(false);
        setRequestSent(true);
      }
    } catch (error) {
      console.error("Error calling webhook:", error);
      setResponse({ error: "Failed to call webhook" });
      setError("An error occurred while making the request.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const sendEmail = async () => {
      stopChecking();

      try {
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emailData),
        });
        console.log("Email sent successfully");
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
    };
    if (response?.error === "Invalid JSON response from webhook") {
      sendEmail();
    }
  }, [response]);

  const handleCreateEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEventCreating(true);
    try {
      // Attempt to create the event directly
      const response = await fetch("/api/google-calendar/create-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      setSheetLink(result.spreadsheetLink);
      setCalendarLink(result.eventLink);

      // Handle authentication error (token expired or missing)
      if (response.status === 401 && result.requireAuth) {
        // Store form data in session storage to retrieve after authentication
        sessionStorage.setItem("calendarFormData", JSON.stringify(formData));

        // Get Google authentication URL and redirect
        const authResponse = await fetch("/api/google/auth");
        if (!authResponse.ok) {
          throw new Error("Failed to get authentication URL");
        }

        const authData = await authResponse.json();
        if (authData.authUrl) {
          window.location.href = authData.authUrl;
          return;
        }
      }

      // Handle successful event creation
      if (response.ok) {
        setEventCreated({
          success: true,
          message: result.message,
          eventLink: result.eventLink,
        });
        toast("Event created successfully!");
      } else {
        setEventCreated({
          success: false,
          message: result.message || "Failed to create event",
        });
        toast(result.message);
      }
    } catch (error) {
      console.error("Error creating event:", error);
      setEventCreated({
        success: false,
        message: "An error occurred while creating the event",
      });
      toast(String(error));
    } finally {
      setIsEventCreating(false);
    }
  };

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

  const handleOpenFolder = async (folder: GoogleDriveFile) => {
    try {
      setIsGooglePickerLoading(true);
      const response = await fetch(
        `/api/google-drive/list?folderId=${folder.id}`
      );

      if (!response.ok) {
        throw new Error("Failed to open folder");
      }

      const data = await response.json();
      setGoogleFiles(data.files);
      setCurrentFolder(data.currentFolder || null);
      setParentFolder(data.parentFolder || null);
    } catch (error) {
      console.error("Error opening folder:", error);
      alert("Failed to open folder");
    } finally {
      setIsGooglePickerLoading(false);
    }
  };

  const handleNavigateUp = async () => {
    if (parentFolder) {
      try {
        setIsGooglePickerLoading(true);
        const response = await fetch(
          `/api/google-drive/list?folderId=${parentFolder.id}`
        );

        if (!response.ok) {
          throw new Error("Failed to navigate up");
        }

        const data = await response.json();
        setGoogleFiles(data.files);
        setCurrentFolder(data.currentFolder || null);
        setParentFolder(data.parentFolder || null);
      } catch (error) {
        console.error("Error navigating up:", error);
        alert("Failed to navigate up");
      } finally {
        setIsGooglePickerLoading(false);
      }
    }
  };

  const handleFileSelected = (file: GoogleDriveFile) => {
    if (file.isFolder) {
      handleOpenFolder(file);
      return;
    }

    setSelectedImage(file);
    setFormData((prev) => ({
      ...prev,
      imageId: file.id,
      imageName: file.name,
    }));
    setShowFilePicker(false);
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

  const handleStopGenerating = () => {
    stopChecking();
  };
  console.log(response, "error");
  return (
    <div className="flex flex-col lg:flex-row gap-5">
      {response?.error === "Invalid JSON response from webhook" ? (
        <ServerOffline />
      ) : (
        <>
          <div className="flex flex-col gap-4 shadow-md  lg:max-w-lg w-full p-6 r bg-black/20 rounded-lg border border-white/10">
            <div>
              <h1 className="text-2xl font-bold text-start">
                Live Flyer Generation
              </h1>
              <p className="text-gray-400 text-sm">
                Create promotion flyers for upcoming live events
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
                                loading="lazy"
                                unoptimized
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
                              {
                                "cursor-not-allowed":
                                  isFetchingImage || isLoading,
                              }
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
              <div className="col-span-2 flex gap-2 items-center">
                <label
                  className={cn(
                    "relative inline-flex items-center cursor-pointer",
                    {
                      "cursor-not-allowed":
                        isLoading || isFetchingImage || webhookData,
                    }
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    name="paid"
                    onChange={handleInputChange}
                    checked={formData.paid}
                    disabled={isLoading || isFetchingImage || webhookData}
                  />
                  <div className="w-11 h-6 bg-black/60 peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-blue-500  rounded-full peer  peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
                <h1 className="text-sm text-gray-300 font-medium mb-0">
                  Paid Page
                </h1>
              </div>

              <div className="col-span-2">
                <div className="flex flex-col text-gray-300">
                  <label htmlFor="date" className="text-sm font-medium mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    className="bg-black/60 text-gray-400 border-white/10 rounded-lg w-full p-2 
                [&::-webkit-calendar-picker-indicator]:text-gray-400
                [&::-webkit-calendar-picker-indicator]:opacity-60"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading || isFetchingImage || webhookData}
                  />
                </div>
              </div>

              <div className="col-span-1">
                <div className="flex flex-col">
                  <label htmlFor="time" className="text-sm font-medium mb-1">
                    Time
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="time"
                      id="time"
                      name="time"
                      className="rounded-md p-2 flex-1 bg-black/50 text-gray-400 border-0 focus:outline-1 focus:outline-black"
                      value={formData.time}
                      onChange={handleInputChange}
                      required
                      disabled={isLoading || isFetchingImage || webhookData}
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-1">
                <div className="w-full mt-6">
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, timezone: value }))
                    }
                    disabled={isLoading || isFetchingImage || webhookData}
                  >
                    <SelectTrigger className="bg-black/50 cursor-pointer !h-[41px] border-white/10 p-2 text-gray-400 rounded-lg w-full">
                      <SelectValue placeholder="Select Timezone" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-white/10 text-gray-400 max-h-72">
                      {TIMEZONES.map((tz) => (
                        <SelectItem
                          key={tz.name}
                          value={tz.name}
                          className="flex items-center justify-between py-2"
                        >
                          {tz.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="col-span-2 flex w-full justify-between items-center h-full">
                <div className="flex flex-col">
                  <label
                    htmlFor="noOfTemplate"
                    className="text-sm font-medium mb-1"
                  >
                    No. of Flyers to generate (1-5)
                  </label>
                  <div className="flex gap-2 w-[40px]">
                    <input
                      type="number"
                      id="noOfTemplate"
                      name="noOfTemplate"
                      className="border-0 bg-black/50 text-gray-400  rounded-md p-2 flex-1 w-[50px] "
                      value={formData.noOfTemplate}
                      onChange={handleInputChange}
                      required
                      disabled={isLoading || isFetchingImage}
                      max={5}
                      min={1}
                    />
                  </div>
                </div>
                <div className=" flex gap-2 items-center relative">
                  <label
                    className={cn(
                      "relative inline-flex items-center cursor-pointer",
                      {
                        "cursor-not-allowed":
                          isLoading || isFetchingImage || webhookData,
                      }
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      name="customRequest"
                      onChange={handleInputChange}
                      checked={formData.customRequest}
                      disabled={isLoading || isFetchingImage || webhookData}
                    />
                    <div className="w-11 h-6 bg-black/60 peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-blue-500  rounded-full peer  peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                  <h1 className="text-sm text-gray-300 font-medium mb-0">
                    Custom Flyer
                  </h1>
                </div>
              </div>

              {formData.customRequest && (
                <div className="col-span-2">
                  <div className="flex flex-col">
                    <label
                      htmlFor="customDetails"
                      className="text-sm font-medium mb-1"
                    >
                      Custom request details:
                    </label>
                    <div className="flex gap-2">
                      <textarea
                        id="customDetails"
                        name="customDetails"
                        className="rounded-md p-2 flex-1 bg-black/50 text-gray-400 border-0 focus:outline-1 focus:outline-black resize-y"
                        value={formData.customDetails}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading || isFetchingImage || webhookData}
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-2 col-span-2">
                <button
                  type="submit"
                  className={`rounded-md px-5 w-full cursor-pointer bg-gradient-to-r from-purple-600 to-blue-600 py-2 text-white font-medium transition-colors  ${
                    isLoading || isFetchingImage
                      ? "opacity-60 cursor-not-allowed"
                      : "opacity-100"
                  }`}
                  // disabled={isLoading || isFetchingImage || requestSent}
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
                        : "Generate Live Flyer"}
                    </span>
                  )}
                </button>
              </div>
            </form>

            {/* File picker modal */}
            {showFilePicker && (
              <div className="fixed inset-0 px-4 lg:px-20 bg-black/60 flex items-center justify-center z-50">
                <div className="bg-black/80 rounded-lg px-6 pb-6  w-full max-h-[80vh] overflow-auto">
                  <div className="sticky top-0 pt-2 py-0.5 bg-black/60">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">
                        {currentFolder
                          ? `Folder: ${currentFolder.name}`
                          : "Select an image"}
                      </h3>
                      <button
                        onClick={() => setShowFilePicker(false)}
                        className="text-gray-500 hover:text-gray-700 cursor-pointer"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>

                    {/* Folder navigation */}
                    {parentFolder && (
                      <div className="mb-4 w-full h-full ">
                        <button
                          onClick={handleNavigateUp}
                          className="flex items-center text-sm text-blue-600 hover:text-blue-800"
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
                            className="mr-1"
                          >
                            <path d="M15 18l-6-6 6-6" />
                          </svg>
                          Back to {parentFolder.name}
                        </button>
                      </div>
                    )}
                  </div>

                  {isGooglePickerLoading ? (
                    <div className="flex justify-center items-center py-8 h-full w-full">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {googleFiles.length > 0 ? (
                        googleFiles.map((file) => (
                          <div
                            key={file.id}
                            className="border rounded-md p-2 cursor-pointer hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600"
                            onClick={() => handleFileSelected(file)}
                          >
                            <div className="h-24 bg-gray-100 flex items-center justify-center mb-2 overflow-hidden">
                              {file.isFolder ? (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="32"
                                  height="32"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="text-amber-500"
                                >
                                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                </svg>
                              ) : file.thumbnailLink ? (
                                <Image
                                  src={file.thumbnailLink}
                                  width={200}
                                  height={200}
                                  alt={file.name}
                                  className="max-h-full object-contain"
                                  loading="lazy"
                                  unoptimized
                                />
                              ) : (
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
                                  className="text-gray-300"
                                >
                                  <rect
                                    x="3"
                                    y="3"
                                    width="18"
                                    height="18"
                                    rx="2"
                                    ry="2"
                                  ></rect>
                                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                  <polyline points="21 15 16 10 5 21"></polyline>
                                </svg>
                              )}
                            </div>
                            <p className="text-xs truncate">
                              {file.isFolder ? `📁 ${file.name}` : file.name}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center col-span-full w-full text-gray-500">
                          No files found in this folder
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 shadow-md justify-between  w-full p-6 r bg-black/20 rounded-lg border border-white/10">
            <div>
              <h1 className="text-bold">Preview</h1>
              <p className="text-sm text-gray-400 mb-2">
                Live flyer preview will appear here
              </p>
            </div>
            {formData.customRequest === true && requestSent ? (
              <div className="flex items-center h-full justify-center w-full p-4">
                <div
                  className={cn(
                    " bg-opacity-50   border-opacity-50 rounded-lg p-4 text-center max-w-md w-full shadow-lg transition-all duration-300 ease-in-out",
                    { hidden: error }
                  )}
                >
                  <div className="text-2xl mb-2">
                    🎉 Successfully submitted request to Discord! 🚀
                  </div>
                  <p className="text-opacity-80">
                    Your message has been sent successfully! 📨✨
                  </p>
                </div>
                <div
                  className={cn(
                    "bg-red-100 bg-opacity overflow-hidden relative-50 border text-wrap h-full border-red-300 border-opacity-50 rounded-lg p-4 text-center max-w-md w-full shadow-lg transition-all duration-300 ease-in-out",
                    { hidden: !error }
                  )}
                >
                  <div className="text-2xl mb-2">
                    ⚠️ Webhook Communication Failed! 🚫
                  </div>
                  <p className="text-red-800 text-opacity-80">
                    Unable to send message to Discord. Please check your webhook
                    configuration. 🔧❌
                  </p>
                  <p className="h-full text-wrap">Details: {error}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col lg:flex-row items-center justify-center gap-4 w-full">
                  {selectedImage && selectedImage.thumbnailLink ? (
                    <div className="flex items-center justify-center h-[250px] w-full lg:w-[250px] border bg-black/40 rounded-md border-black">
                      {isCustomImage ? (
                        <Image
                          src={selectedImage.thumbnailLink}
                          alt={selectedImage.name}
                          width={400}
                          height={400}
                          className="object-contain max-h-full max-w-full"
                          loading="lazy"
                          unoptimized={selectedImage.thumbnailLink
                            .toLocaleLowerCase()
                            .endsWith(".heic")}
                        />
                      ) : (
                        <iframe
                          src={convertToPreviewLink(
                            selectedImage.webViewLink ?? ""
                          )}
                          width={400}
                          height={400}
                          frameBorder="0"
                          allowFullScreen
                          title="Live Flyer Preview"
                          className="object-contain max-h-full max-w-full rounded-md"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="h-[250px] w-full lg:w-[250px] bg-black/60 flex items-center justify-center border border-gradient-to-r border-purple-400 rounded-md">
                      <span className="text-sm text-gray-500 text-center px-2">
                        {selectedImage?.name || "No image selected"}
                      </span>
                    </div>
                  )}

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

                  {isFetchingImage ? (
                    <div className="w-full relative overflow-hidden lg:w-[250px] h-[250px] flex items-center justify-center  border border-gradient-to-r border-purple-600 rounded-md bg-black/40">
                      <div className="flex flex-col items-center justify-center">
                        <svg
                          className="animate-spin h-8 w-8 text-purple-500 mb-2"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <span className="text-sm text-gray-500">
                          Generating...
                        </span>
                        <button
                          type="button"
                          onClick={handleStopGenerating}
                          className="absolute bottom-0 py-2 w-full bg-black/60 text-gray-500 rounded-t-md cursor-pointer"
                        >
                          Stop Generating
                        </button>
                      </div>
                    </div>
                  ) : webhookData &&
                    webhookData.thumbnail &&
                    webhookData.webViewLink ? (
                    <div className="flex items-center justify-center h-[250px] w-full lg:w-[250px] rounded-md bg-black/40 border-1 border-gradient-to-r border-purple-600">
                      <Link
                        href={webhookData.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-full w-full flex items-center justify-center"
                        title="Click to view flyer"
                      >
                        <iframe
                          src={convertToPreviewLink(webhookData.webViewLink)}
                          width={400}
                          height={400}
                          frameBorder="0"
                          allowFullScreen
                          title="Live Flyer Preview"
                          className="object-contain max-h-full max-w-full rounded-md"
                        />
                      </Link>
                    </div>
                  ) : (
                    <div className="h-[250px] w-full lg:w-[250px] bg-black/60 flex items-center justify-center  border border-gradient-to-r border-purple-400 rounded-md">
                      <span className="text-sm text-gray-500 text-center px-2">
                        Flyer not yet generated
                      </span>
                    </div>
                  )}
                </div>
                {webhookData && (
                  <>
                    <div className="h-full flex flex-col gap-2">
                      <hr className="border-purple-400" />
                      <span className="text-gray-300">
                        {" "}
                        Generated: {history.length}
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 overflow-y-auto ">
                        {history.map((item, index) => (
                          <div
                            key={index}
                            className="border p-2 border-gradient-to-r border-purple-400 rounded-md flex flex-col items-center justify-center hover:bg-black/40"
                          >
                            <div className="w-24 h-24 rounded-md overflow-hidden ">
                              <Image
                                src={item.thumbnail}
                                alt="Generated Flyer"
                                width={200}
                                height={200}
                                unoptimized
                                className={cn(
                                  "object-contain max-h-full rounded-md max-w-full cursor-pointer",
                                  {
                                    "cursor-not-allowed":
                                      isFetchingImage || isLoading,
                                  }
                                )}
                                onClick={() => {
                                  if (!isFetchingImage || !isLoading) {
                                    setWebhookData(item);
                                  }
                                }}
                                loading="lazy"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                <div className="mt-2 col-span-2">
                  <button
                    type="button"
                    onClick={handleCreateEventSubmit}
                    className={`rounded-md px-5 w-full  bg-gradient-to-r from-blue-600 to-purple-600 py-2 text-white font-medium transition-colors  ${
                      isEventCreating ||
                      isFetchingImage ||
                      eventCreated?.success ||
                      !response
                        ? "opacity-60 cursor-not-allowed"
                        : "opacity-100 cursor-pointer"
                    }`}
                    disabled={
                      isEventCreating ||
                      isFetchingImage ||
                      eventCreated?.success ||
                      !response
                    }
                  >
                    {isEventCreating ? "Creating Event..." : "Create Event"}
                  </button>
                  {eventCreated && (
                    <div className="rounded-lg p-4 space-y-3">
                      <div className="flex items-center font-medium">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {eventCreated.message}{" "}
                        {eventCreated.message === "Event processing..." ? (
                          <div
                            className="text-sm text-blue-500"
                            onClick={handleCreateEventSubmit}
                          >
                            Try again
                          </div>
                        ) : (
                          ""
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-purple-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                            />
                          </svg>
                          <Link
                            href={sheetLink || ""}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:underline"
                          >
                            {sheetLink
                              ? "View Spreadsheet"
                              : "Failed to insert on spreadsheet"}
                          </Link>
                        </div>

                        <div className="flex items-center space-x-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-purple-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 11h14a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2z"
                            />
                          </svg>
                          <Link
                            href={calendarLink || ""}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:underline"
                          >
                            {calendarLink
                              ? "Open Calendar Event"
                              : "Failed to insert on calendar"}
                          </Link>
                        </div>

                        {calendarLink && (
                          <div className="text-sm text-gray-500">
                            Alternatively, navigate to the Calendar tab
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
