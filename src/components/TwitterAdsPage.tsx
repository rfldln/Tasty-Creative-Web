import React, { useTransition } from "react";

import { useRef, useState } from "react";
import ImageCropper from "./ImageCropper";
import Image from "next/image";
import ModelsDropdown from "./ModelsDropdown";
import VideoFrameCropper from "./VideoFrameCropper";
import { ClientSideFFmpeg } from "./FFmpegComponent";
import { cn } from "@/lib/utils";

const TwitterAdsPage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingImage, setIsFetchingImage] = useState(false);
  const [webhookData, setWebhookData] = useState<WebhookResponse | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [useFrame, setUseFrame] = useState(true);
  const [combinedVideoUrl, setCombinedVideoUrl] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [urlLink, setUrlLink] = useState<string | null>(null);
  const [isUploading, startUploadingTransition] = useTransition();

  const [formData, setFormData] = useState<ModelFormData>({
    croppedImageLeft: null,
    croppedImageRight: null,
  });

  const handleCropCompleteLeft = (croppedImage: string) => {
    setFormData({
      ...formData,
      croppedImageLeft: croppedImage,
    });
  };
  const handleCropCompleteRight = (croppedImage: string) => {
    setFormData({
      ...formData,
      croppedImageRight: croppedImage,
    });
  };
  const downloadPreview = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !formData.croppedImageLeft || !formData.croppedImageRight)
      return;

    const width = 1000; // Adjust the width here as needed
    const height = 1000; // Fixed height

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    const leftImage = new window.Image();
    const rightImage = new window.Image();
    const playButton = new window.Image();

    await new Promise<void>((resolve) => {
      let loaded = 0;
      const checkLoaded = () => {
        loaded++;
        if (loaded === 3) resolve();
      };

      leftImage.onload = checkLoaded;
      rightImage.onload = checkLoaded;
      playButton.onload = checkLoaded;

      leftImage.src = formData.croppedImageLeft!;
      rightImage.src = formData.croppedImageRight!;
      playButton.src = "/playbutton.png";
    });

    if (!ctx) return;

    // Draw left panel
    ctx.drawImage(leftImage, 0, 0, width / 2, height);
    // Draw right panel
    ctx.drawImage(rightImage, width / 2, 0, width / 2, height);

    // Leave 80px margin on both sides of the play button inside the right panel
    const playButtonWidth = width / 2 - 151;

    // Maintain aspect ratio of the play button
    const playButtonHeight =
      playButtonWidth * (playButton.height / playButton.width);

    // Center the button inside the right panel with 80px side margins
    const playButtonX = width / 2 + 75.5;
    const playButtonY = height / 2 - playButtonHeight / 2;

    ctx.drawImage(
      playButton,
      playButtonX,
      playButtonY,
      playButtonWidth,
      playButtonHeight
    );

    const link = document.createElement("a");
    link.download = "collage.jpg";
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.click();
  };

  const uploadPreview = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !formData.croppedImageLeft || !formData.croppedImageRight)
      return;

    const width = 1000;
    const height = 1000;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    const leftImage = new window.Image();
    const rightImage = new window.Image();
    const playButton = new window.Image();

    await new Promise<void>((resolve) => {
      let loaded = 0;
      const checkLoaded = () => {
        loaded++;
        if (loaded === 3) resolve();
      };

      leftImage.onload = checkLoaded;
      rightImage.onload = checkLoaded;
      playButton.onload = checkLoaded;

      leftImage.src = formData.croppedImageLeft!;
      rightImage.src = formData.croppedImageRight!;
      playButton.src = "/playbutton.png";
    });

    if (!ctx) return;

    // Draw left and right images
    ctx.drawImage(leftImage, 0, 0, width / 2, height);
    ctx.drawImage(rightImage, width / 2, 0, width / 2, height);

    // Draw play button on right half
    const playButtonWidth = width / 2 - 160;
    const playButtonHeight =
      playButtonWidth * (playButton.height / playButton.width);
    const playButtonX = width / 2 + 80;
    const playButtonY = height / 2 - playButtonHeight / 2;

    ctx.drawImage(
      playButton,
      playButtonX,
      playButtonY,
      playButtonWidth,
      playButtonHeight
    );

    // Convert canvas to Blob (NOT Base64)
    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.95);
      });

      if (!blob) {
        alert("Failed to generate image blob.");
        return;
      }

      const formDataToUpload = new FormData();
      formDataToUpload.append("model", formData.model ?? "");
      formDataToUpload.append("image", blob, `${formData.model}_collage.jpg`);

      startUploadingTransition(async () => {
        const res = await fetch("/api/google-drive/upload-for-approval", {
          method: "POST",
          body: formDataToUpload,
        });

        const result = await res.json();
        if (res.ok) {
          // Set the result to successful and set the URL link
          const successResult = "Upload File Success"; // You can store or display this as needed
          const urlLink = result.uploads[0]?.link; // Assuming the first upload result has the link

          // You can now set these values in your application state or UI
          setResult(successResult); // Set result to "successful"
          setUrlLink(urlLink); // Set the URL link to the webViewLink
        } else {
          setResult(`Upload failed: ${result.error}`);
        }
      });
    } catch (err) {
      console.error("Upload error:", err);
      alert("Something went wrong during upload.");
    }
  };

  async function uploadGif(model: string, gifBlobUrl: string) {
    try {
      // Fetch the Blob from the blob URL
      const response = await fetch(gifBlobUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch the blob from the blob URL");
      }
  
      const gifBlob = await response.blob(); // Get the actual blob object
  
      // Prepare FormData for the upload
      const formData = new FormData();
      formData.append("model", model);
      formData.append("gif", gifBlob, `${model}_collage.gif`); // Add filename
  
      // 🔁 Replace this with your actual n8n webhook URL
      const webhookUrl = "https://n8n.tastycreative.xyz/webhook/8977d651-7cc1-4bd5-a67e-4f08d4da28c6";
  
      startUploadingTransition(async () => {
        const res = await fetch(webhookUrl, {
          method: "POST",
          body: formData,
        });
  
        const result = await res.json();
        if (res.ok) {
          const successResult = "Upload File Success";
          const urlLink = result.uploads?.[0]?.link || "";
  
          setResult(successResult);
          setUrlLink(urlLink);
        } else {
          setResult(`Upload failed: ${result.error}`);
        }
      });
    } catch (err) {
      console.error("Upload error:", err);
      alert("Something went wrong during upload.");
    }
  }
  

  const downloadCombinedVideo = () => {
    if (!combinedVideoUrl) return;

    const a = document.createElement("a");
    a.href = combinedVideoUrl;
    a.download = "combined-media.gif"; // ✅ change .mp4 to .gif
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-black/20 text-white p-6 rounded-lg">
      <canvas ref={canvasRef} className="hidden" />

      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Split Collage Maker
          </h1>
          <p className="text-gray-300 mt-2">
            Create stunning side-by-side collages for twitter ads
          </p>
        </header>

        <div className="bg-gray-800/50 rounded-xl p-6 mb-8 shadow-lg border border-gray-700/50 backdrop-blur-sm">
          <h2 className="text-xl font-semibold mb-4 text-blue-300">
            Select Model
          </h2>
          <ModelsDropdown
            formData={formData}
            setFormData={setFormData}
            isLoading={isLoading}
            isFetchingImage={isFetchingImage}
            webhookData={webhookData}
          />
        </div>

        <div className="flex flex-col md:flex-row gap-8 justify-between mb-10">
          <div className="w-full md:w-1/2 bg-gray-800/50 rounded-xl p-6 shadow-lg border border-gray-700/50 ">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">
              Left Panel
            </h2>
            <ImageCropper
              id="left-panel"
              onCropComplete={handleCropCompleteLeft}
              aspectRatio={1 / 2}
              model={formData.model}
              customRequest={formData.customRequest}
              setFormData={setFormData}
            />
          </div>

          <div className="w-full md:w-1/2 bg-gray-800/50 rounded-xl p-6 shadow-lg border border-gray-700/50 ">
            <h2 className="text-xl font-semibold mb-4 text-purple-400">
              Right Panel (Video/Image)
            </h2>
            {/* <ImageCropper
              id="right-panel"
              onCropComplete={handleCropCompleteRight}
              aspectRatio={1 / 2}
              model={formData.model}
              customRequest={formData.customRequest}
              setFormData={setFormData}
            /> */}
            <VideoFrameCropper
              onCropComplete={handleCropCompleteRight}
              videoUrl={videoUrl || ""}
              setVideoUrl={setVideoUrl}
              useFrame={useFrame}
              setUseFrame={setUseFrame}
              model={formData.model ?? ""}
            />
          </div>
        </div>

        <div className="mt-16 bg-gray-800/30 p-6 rounded-xl border border-gray-700/50 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Preview Your Collage
          </h2>

          <div className="w-full max-w-lg mx-auto bg-black rounded-lg shadow-2xl overflow-hidden border border-gray-700">
            <div className="flex w-full aspect-[1/1]">
              {formData.croppedImageLeft ? (
                <div className="w-1/2 h-full">
                  <Image
                    src={formData.croppedImageLeft}
                    alt="Left preview"
                    className="w-full h-full"
                    width={500}
                    height={1000}
                  />
                </div>
              ) : (
                <div className="w-1/2 h-full bg-gray-800 flex items-center justify-center">
                  <div className="text-gray-500 text-center px-4">
                    <svg
                      className="w-12 h-12 mx-auto mb-2 opacity-40"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4V5h12v10z"
                        clipRule="evenodd"
                      />
                      <path d="M8.5 7.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                      <path
                        fillRule="evenodd"
                        d="M6.5 11.5V10l2-2 4 4v1.5H6.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p>Left image will appear here</p>
                  </div>
                </div>
              )}

              {formData.croppedImageRight && useFrame ? (
                <div className="w-1/2 h-full relative group">
                  <div className="absolute w-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                    <img
                      src="/playbutton.png"
                      alt="playbutton"
                      className="w-full px-5"
                    />
                  </div>

                  <Image
                    src={formData.croppedImageRight}
                    alt="Right preview"
                    className="w-full h-full"
                    width={500}
                    height={1000}
                  />
                </div>
              ) : !useFrame && videoUrl ? (
                <div className="w-1/2 h-full relative group">
                  <video
                    src={videoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  ></video>
                </div>
              ) : (
                <div className="w-1/2 h-full bg-gray-800 flex items-center justify-center">
                  <div className="text-gray-500 text-center px-4">
                    <svg
                      className="w-12 h-12 mx-auto mb-2 opacity-40"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path>
                      <path d="M14 6a2 2 0 012-2h2a2 2 0 012 2v8a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z"></path>
                    </svg>
                    <p>Right video will appear here</p>
                  </div>
                </div>
              )}
            </div>
            {/* Add the client-side only MediaCombiner component */}
            {!useFrame && (
              <ClientSideFFmpeg
                croppedImageLeft={formData.croppedImageLeft ?? ""}
                videoUrl={videoUrl ?? ""}
                combinedVideoUrl={combinedVideoUrl}
                setCombinedVideoUrl={setCombinedVideoUrl}
              />
            )}
          </div>

          <div className="mt-6  justify-center flex gap-4">
            <div className="w-full flex justify-end">
              <button
                disabled={
                  ((!formData.croppedImageLeft ||
                    !formData.croppedImageRight) &&
                    !combinedVideoUrl) ||
                  !formData.model
                }
                className="px-8 py-4 bg-gradient-to-r from--600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-blue-500/20 flex items-center gap-2 transform hover:-translate-y-1"
                onClick={
                  !useFrame && combinedVideoUrl
                    ? downloadCombinedVideo
                    : downloadPreview
                }
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  ></path>
                </svg>
                {combinedVideoUrl
                  ? "Download Your Video"
                  : "Download Your Collage"}
              </button>
            </div>
            <div className="w-full">
              <button
                disabled={
                  ((!formData.croppedImageLeft ||
                    !formData.croppedImageRight) &&
                    !combinedVideoUrl) ||
                  !formData.model
                }
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purpled-600 hover:from-purple-500 hover:to-blue-500 rounded-lg font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-blue-500/20 flex items-center gap-2 transform hover:-translate-y-1"
                onClick={
                  !useFrame && combinedVideoUrl
                    ? () => uploadGif(formData.model ?? "", combinedVideoUrl)
                    : uploadPreview
                }
              >
                {isUploading ? (
                  <>
                    <svg
                      className="w-5 h-5 mr-2 animate-spin text-blue-500"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 4V16M12 4L8 8M12 4L16 8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M3 17V18C3 19.6569 4.34315 21 6 21H18C19.6569 21 21 19.6569 21 18V17"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Upload for Approval</span>
                  </>
                )}
              </button>
            </div>
          </div>
          {result && (
            <div
              className={cn(`mt-6 text-center  font-semibold `, {
                " text-green-500 ": result === "Upload File Success",
                " text-red-500": result !== "Upload File Success",
              })}
            >
              <p className="text-lg mb-2">{result}</p>
              {urlLink && (
                <a
                  href={urlLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-blue-600 hover:text-blue-800 underline transition-colors duration-200"
                >
                  Click here to view your collage
                </a>
              )}
            </div>
          )}

          <p className="text-gray-400 text-center mt-4 text-sm">
            Your collage will be saved in high resolution with your custom
            settings
          </p>
        </div>

        <footer className="mt-16 text-center text-gray-500 text-sm">
          <p>
            Create beautiful split-screen collages with our easy-to-use tool
          </p>
        </footer>
      </div>
    </div>
  );
};

export default TwitterAdsPage;
