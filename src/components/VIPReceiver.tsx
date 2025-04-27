"use client";
import { cn, convertToPreviewLink } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const VIPReceiver = () => {
  const [requestSent, setRequestSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingImage, setIsFetchingImage] = useState(false);
  const [error, setError] = useState("");
  const [webhookData, setWebhookData] = useState<WebhookResponse | null>(null);
  const [history, setHistory] = useState<WebhookResponse[]>([]);
  const lastCheckTimestamp = useRef(0);
  const checkInterval = useRef<NodeJS.Timeout | null>(null);
  const [itemReceived, setItemReceived] = useState(0);

  const [formData, setFormData] = useState<ModelFormData>({
    croppedImage: null,
    templatePosition: "LEFT",
    type: "VIP",
    options: ["NSFW", "Custom", "Calls"],
    customImage: true,
    noOfTemplate: 1,
  });

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

  return (
    <div className="bg-black/20 border border-white/10 p-6 rounded-lg">
      <div className="flex flex-col gap-4 sticky top-8">
        <div>
          <h1 className="font-bold text-xl">Preview</h1>
          <p className="text-sm text-gray-400 mb-2">
            VIP flyer preview will appear here
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
                    <span className="text-sm text-gray-500">Generating...</span>
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
          </>
        )}

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
                        className={cn(
                          "object-contain max-h-full rounded-md max-w-full cursor-pointer",
                          {
                            "cursor-not-allowed": isFetchingImage || isLoading,
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
  );
};

export default VIPReceiver;
