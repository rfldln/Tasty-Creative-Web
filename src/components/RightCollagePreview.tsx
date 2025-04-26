import { useEffect, useRef, useState } from 'react';

export const RightCollagePreview = ({ preview, setPreview }: {
  preview: string | null;
  setPreview: (url: string | null) => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCaptured, setIsCaptured] = useState(false);

  const handleCaptureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/png');
        setPreview(imageData);
        setIsCaptured(true);
      }
    }
  };

  useEffect(() => {
    setIsCaptured(false);
  }, [preview]);

  return (
    <div className="flex-1 relative">
      {preview ? (
        preview.startsWith('data:video') && !isCaptured ? (
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              src={preview}
              controls
              className="w-full h-full object-cover"
            />
            <button
              onClick={handleCaptureFrame}
              className="absolute bottom-4 right-4 bg-white/80 text-black px-3 py-1 rounded shadow hover:bg-white"
            >
              Capture Frame
            </button>
          </div>
        ) : (
          <img
            src={preview}
            className="w-full h-full object-cover"
            alt="Right Collage Preview"
          />
        )
      ) : (
        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
          No image/video
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
