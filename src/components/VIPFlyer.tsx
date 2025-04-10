"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import ImageCropper from "./ImageCropper";
import Image from "next/image";
import ModelsDropdown from "./ModelsDropdown";
import { useRouter, useSearchParams } from "next/navigation";
import { POSITIONS } from "@/lib/lib";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";
import { cn, convertToPreviewLink, emailData } from "@/lib/utils";
import ServerOffline from "./ServerOffline";

export default function FlyerGenerator() {
  const router = useRouter();

  const searchParams = useSearchParams();
  const tabValue = searchParams.get("tab") || "vip";
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingImage, setIsFetchingImage] = useState(false);
  interface WebhookResponse {
    thumbnail: string;
    webViewLink: string;
    imageId?: string;
    requestId?: string;
  }

  const [webhookData, setWebhookData] = useState<WebhookResponse | null>(null);
  const [itemReceived, setItemReceived] = useState(0);
  const [response, setResponse] = useState<{ error?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastCheckTimestamp = useRef(0);
  const checkInterval = useRef<NodeJS.Timeout | null>(null);
  const [history, setHistory] = useState<WebhookResponse[]>([]);

  const [formData, setFormData] = useState<ModelFormData>({
    croppedImage: null,
    templatePosition: "LEFT",
    type: "VIP",
    options: ["NSFW", "Custom", "Calls"],
    customImage: true,
    noOfTemplate: 1,
  });

  console.log("Form Data:", formData);

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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    // setIsProcessing(true);
    setIsFetchingImage(true);
    setItemReceived(0);
    // const result = liveFlyerValidation.safeParse(formData);
    // if (!result.success) {
    //   setError(JSON.stringify(result.error.format()));
    //   setIsLoading(false);
    //   return;
    // }

    const requestId = uuidv4(); // Generate unique ID
    const webhookUrl = "/api/webhook-proxy";

    try {
      const formDataToSend = new FormData();

      // Append text data
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
      formDataToSend.append("options", String(formData.options || []));
      formDataToSend.append("croppedImage", formData.croppedImage || "");
      formDataToSend.append(
        "templatePosition",
        formData.templatePosition || ""
      );

      // Append the file if it exists
      if (formDataToSend.has("imageFile")) {
        formDataToSend.delete("imageFile"); // Ensure only one instance
      }
      if (formData.imageFile && formData.customImage) {
        formDataToSend.append("imageFile", formData.imageFile);
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        body: formDataToSend, // Send as FormData (automatically sets correct headers)
      });

      // Read the response correctly
      const textData = await response.text();
      try {
        const jsonData = JSON.parse(textData);
        setResponse(jsonData);
      } catch {
        setResponse({ error: "Invalid JSON response from webhook" });
      }

      // if (formData.customRequest != true) {
      //   startChecking(requestId); // Start checking using requestId
      // }
      // if (formData.customRequest == true) {
      //   setIsFetchingImage(false);
      //   setIsLoading(false);
      //   setRequestSent(true);
      // }

      if (textData.includes("404")) {
        setResponse({ error: "Failed to call webhook" });
        setError(textData);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error calling webhook:", error);
      setResponse({ error: "Failed to call webhook" });
      // setIsProcessing(false);
    } finally {
      startChecking(requestId);
      setIsLoading(false);
    }
  };

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

  const handleStopGenerating = () => {
    stopChecking();
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6  text-white min-h-screen">
      {response?.error === "Invalid JSON response from webhook" ? (
        <ServerOffline />
      ) : (
        <>
          <div className="bg-black/20 border border-white/10 p-6 rounded-lg">
            <h1 className="text-2xl font-bold mb-2">VIP Flyer Generation</h1>
            <p className="text-gray-300 mb-6">
              Create promotional materials for VIP subscription benefits
            </p>

            <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit}>
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
                <ImageCropper
                  onCropComplete={handleCropComplete}
                  aspectRatio={4 / 5} // For 1080:1350 aspect ratio
                  model={formData.model}
                />
              </div>

              {/* Added Checkbox Options */}
              <div className="col-span-2 mt-2">
                <label className="block text-sm font-medium mb-2">
                  Options
                </label>
                <div className="flex flex-wrap gap-4">
                  {Object.entries({
                    NSFW: true,
                    Custom: true,
                    Calls: true,
                  }).map(([option, defaultValue]) => (
                    <label
                      key={option}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        name={option}
                        defaultChecked={defaultValue}
                        onChange={(e) => {
                          const currentOptions = [...(formData.options || [])];
                          if (e.target.checked) {
                            if (!currentOptions.includes(option)) {
                              setFormData({
                                ...formData,
                                options: [...currentOptions, option],
                              });
                            }
                          } else {
                            setFormData({
                              ...formData,
                              options: currentOptions.filter(
                                (item) => item !== option
                              ),
                            });
                          }
                        }}
                        className="cursor-pointer accent-purple-600 rounded"
                      />
                      <span className="text-sm">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 col-span-2">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Template Position
                  </label>
                  <div className="flex space-x-4">
                    {POSITIONS.map((position) => (
                      <label
                        key={position}
                        className="flex items-center cursor-pointer space-x-2"
                      >
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
                          className=" text-purple-600 accent-purple-600 cursor-pointer rounded"
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
                    isLoading || isFetchingImage || !formData.croppedImage
                      ? "opacity-60 cursor-not-allowed"
                      : "opacity-100"
                  }`}
                  disabled={
                    isLoading || isFetchingImage || !formData.croppedImage
                  }
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

              <div className="flex lg:flex-row flex-col justify-center items-center gap-4 ">
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
                {isFetchingImage ? (
                  <div className=" relative overflow-hidden h-80 w-64 flex items-center justify-center  border border-gradient-to-r border-purple-600 rounded-md bg-black/40">
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
                  <div className="flex items-center justify-center h-80 w-64 rounded-md bg-black/40 border-1 border-gradient-to-r border-purple-600">
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
                  <div className="h-80 w-64 bg-black/60 flex items-center justify-center  border border-gradient-to-r border-purple-400 rounded-md">
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

              {/* Button */}
              {/* <button
            className={`rounded-md px-5 w-full cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600 py-2 text-white font-medium transition-colors  ${
              isLoading || isFetchingImage
                ? "opacity-60 cursor-not-allowed"
                : "opacity-100"
            }`}
          >
            Create Event
          </button> */}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
