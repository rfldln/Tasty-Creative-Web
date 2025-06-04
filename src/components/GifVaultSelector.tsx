import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import VaultCategoryItems from "./VaultCategoryItems";
import VaultCategoryList from "./VaultCategoryList";

const GifVaultSelector = ({
  isOpen,
  onClose,
  onUpload,
  vaultName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => void;
  vaultName?: string;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const [selectedClient, setSelectedClient] = useState<{
    id: number;
    email: string;
  } | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<{
    id: number;
    tag: string;
  } | null>(null);

  const [fullscreenItem, setFullscreenItem] = useState<{
    id: number;
    name: string;
    src: string;
    poster?: string;
    type: "image" | "video";
  } | null>(null);

  useEffect(() => {
    setIsLoading(true);

    fetch(`/api/be/client-name?name=${vaultName}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        // Only pick `id` and `email` from the full response
        setSelectedClient({
          id: data.id,
          email: data.email,
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => {
        setIsLoading(false);
        setError("");
      });
  }, [vaultName]);

  // Stream download with progress
  const downloadFileStream = async (url: string): Promise<Blob> => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      
      if (!response.body) {
        // Fallback: just get the blob if no readable stream
        const blob = await response.blob();
        setDownloadProgress(100);
        return blob;
      }
      
      // Create a reader from the response body stream
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let receivedLength = 0;
      
      // Read the stream chunk by chunk
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        // Update progress if we know the total size
        if (total > 0) {
          const progress = Math.round((receivedLength / total) * 100);
          setDownloadProgress(progress);
        } else {
          // If we don't know the total size, show indeterminate progress
          setDownloadProgress(-1);
        }
      }
      
      // Combine all chunks into a single Uint8Array
      const chunksAll = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
      }
      
      // Set final progress
      setDownloadProgress(100);
      
      return new Blob([chunksAll]);
    } catch (error) {
      console.error('Stream download failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchAndUploadFile = async () => {
      if (fullscreenItem) {
        setIsDownloading(true);
        setDownloadProgress(0);
        
        try {
          // Use stream download
          const blob = await downloadFileStream(fullscreenItem.src);
          
          const file = new File([blob], fullscreenItem.name, {
            type: blob.type || 'application/octet-stream',
          });
          
          onUpload(file);
          setIsDownloading(false);
          setDownloadProgress(0);
          onClose();
          setFullscreenItem(null);
        } catch (err) {
          setError("Failed to fetch file for upload.");
          console.error(err);
          setIsDownloading(false);
          setDownloadProgress(0);
        }
      }
    };

    fetchAndUploadFile();
  }, [fullscreenItem, onUpload, onClose]);

  console.log(selectedClient, "selectedClient");

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed p-24 inset-0 bg-black/90 z-[9999] flex flex-col overflow-hidden"
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Header */}
      <div className="flex rounded-t-lg items-center justify-between p-6 border-b border-gray-700 bg-gray-800 shadow-lg">
        <h2 className="text-white text-xl font-semibold">Vault Selector</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-700"
        >
          ✕
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden rounded-b-lg">
        {selectedClient !== null ? (
          <>
            <VaultCategoryList
              clientLoading={isLoading}
              selectedClient={selectedClient}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
            />
            <VaultCategoryItems
              selectedClient={selectedClient}
              selectedCategory={selectedCategory}
              setFullscreenItem={setFullscreenItem}
              type="video"
            />
          </>
        ) : isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-white text-lg animate-pulse">Loading...</div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-white text-lg">No account found</div>
          </div>
        )}
      </div>

      {/* Loading overlay with progress */}
      {isDownloading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="bg-gray-800 px-8 py-6 rounded-lg shadow-2xl min-w-[400px]">
            <div className="text-white text-xl mb-4">Downloading file...</div>
            
            {/* Watery progress bar container */}
            <div className="relative w-full h-20 bg-gray-900 rounded-2xl overflow-hidden shadow-inner">
              {/* Water fill */}
              <div 
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-500 ease-out"
                style={{ 
                  height: downloadProgress === -1 ? '100%' : `${downloadProgress}%`,
                  boxShadow: 'inset 0 0 20px rgba(59, 130, 246, 0.5)',
                  opacity: downloadProgress === -1 ? 0.7 : 1
                }}
              >
                {/* Animated waves */}
                <div className="absolute inset-0 overflow-hidden">
                  <div 
                    className="absolute -inset-x-full h-full"
                    style={{
                      background: `
                        repeating-linear-gradient(
                          45deg,
                          transparent,
                          transparent 10px,
                          rgba(255, 255, 255, 0.1) 10px,
                          rgba(255, 255, 255, 0.1) 20px
                        )
                      `,
                      animation: downloadProgress === -1 ? 'wave 1s linear infinite' : 'wave 3s linear infinite',
                    }}
                  />
                  <svg
                    className="absolute left-0 right-0 -top-2"
                    viewBox="0 0 1200 50"
                    preserveAspectRatio="none"
                    style={{ height: '20px', width: '200%', left: '-50%' }}
                  >
                    <path
                      d="M0,25 C200,45 400,5 600,25 C800,45 1000,5 1200,25 L1200,50 L0,50 Z"
                      fill="rgba(255, 255, 255, 0.1)"
                      style={{
                        animation: 'wave-move 2s linear infinite',
                      }}
                    />
                    <path
                      d="M0,25 C200,5 400,45 600,25 C800,5 1000,45 1200,25 L1200,50 L0,50 Z"
                      fill="rgba(255, 255, 255, 0.05)"
                      style={{
                        animation: 'wave-move 3s linear infinite reverse',
                      }}
                    />
                  </svg>
                </div>
                
                {/* Bubbles */}
                <div className="absolute inset-0">
                  <div 
                    className="absolute w-2 h-2 bg-white/20 rounded-full"
                    style={{
                      left: '20%',
                      animation: 'bubble 4s ease-in-out infinite',
                      animationDelay: '0s'
                    }}
                  />
                  <div 
                    className="absolute w-3 h-3 bg-white/15 rounded-full"
                    style={{
                      left: '50%',
                      animation: 'bubble 4s ease-in-out infinite',
                      animationDelay: '1s'
                    }}
                  />
                  <div 
                    className="absolute w-1 h-1 bg-white/25 rounded-full"
                    style={{
                      left: '80%',
                      animation: 'bubble 4s ease-in-out infinite',
                      animationDelay: '2s'
                    }}
                  />
                </div>
              </div>
              
              {/* Progress percentage overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-2xl font-bold drop-shadow-lg">
                  {downloadProgress === -1 ? 'Loading...' : `${downloadProgress}%`}
                </span>
              </div>
            </div>
            
            <style jsx>{`
              @keyframes wave {
                0% { transform: translateX(0); }
                100% { transform: translateX(50%); }
              }
              
              @keyframes wave-move {
                0% { transform: translateX(0); }
                100% { transform: translateX(-600px); }
              }
              
              @keyframes bubble {
                0% {
                  bottom: 0;
                  opacity: 0;
                }
                10% {
                  opacity: 1;
                }
                90% {
                  opacity: 1;
                }
                100% {
                  bottom: 100%;
                  opacity: 0;
                }
              }
            `}</style>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="absolute bottom-6 left-6 right-6 bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg">
          <p>{error}</p>
        </div>
      )}
    </div>
  );

  // Use a portal to render outside the parent container
  if (typeof window !== "undefined") {
    return createPortal(modalContent, document.body);
  }

  return null;
};

export default GifVaultSelector;