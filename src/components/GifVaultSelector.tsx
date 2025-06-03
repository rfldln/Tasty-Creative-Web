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

  // Optimized download function with fallback
  const downloadFileWithProgress = async (url: string) => {
    try {
      // Try parallel chunk download first
      return await downloadFileInChunks(url);
    } catch (error) {
      console.warn('Chunk download failed, falling back to stream download:', error);
      // Fallback to stream download
      return await downloadFileStream(url);
    }
  };

  // Stream download with progress (fallback method)
  const downloadFileStream = async (url: string) => {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    
    if (!response.body) {
      // Final fallback: just get the blob
      const blob = await response.blob();
      setDownloadProgress(100);
      return blob;
    }
    
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedLength = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      receivedLength += value.length;
      
      if (total > 0) {
        const progress = Math.round((receivedLength / total) * 100);
        setDownloadProgress(progress);
      }
    }
    
    const chunksAll = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      chunksAll.set(chunk, position);
      position += chunk.length;
    }
    
    return new Blob([chunksAll]);
  };

  // Parallel chunk download function with better error handling
  const downloadFileInChunks = async (url: string, chunkSize: number = 1024 * 1024 * 2) => {
    // First, get the file size with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      const headResponse = await fetch(url, { 
        method: 'HEAD',
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      
      const contentLength = headResponse.headers.get('content-length');
      const acceptRanges = headResponse.headers.get('accept-ranges');
      
      if (!contentLength || acceptRanges !== 'bytes') {
        throw new Error('Server does not support range requests');
      }
      
      const totalSize = parseInt(contentLength, 10);
      const numChunks = Math.ceil(totalSize / chunkSize);
      const chunks: (ArrayBuffer | null)[] = new Array(numChunks).fill(null);
      let downloadedBytes = 0;
      
      // Download chunks with retry logic
      const downloadChunk = async (index: number, retries: number = 3): Promise<ArrayBuffer> => {
        const start = index * chunkSize;
        const end = Math.min(start + chunkSize - 1, totalSize - 1);
        
        try {
          const response = await fetch(url, {
            headers: {
              'Range': `bytes=${start}-${end}`
            }
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const arrayBuffer = await response.arrayBuffer();
          
          // Validate chunk
          if (!arrayBuffer || arrayBuffer.byteLength === 0) {
            throw new Error('Empty chunk received');
          }
          
          chunks[index] = arrayBuffer;
          downloadedBytes += arrayBuffer.byteLength;
          const progress = Math.round((downloadedBytes / totalSize) * 100);
          setDownloadProgress(progress);
          
          return arrayBuffer;
        } catch (error) {
          if (retries > 0) {
            console.warn(`Chunk ${index} failed, retrying...`, error);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return downloadChunk(index, retries - 1);
          }
          throw error;
        }
      };
      
      // Download chunks with limited concurrency
      const maxConcurrent = 2; // Reduced from 4 to avoid connection issues
      const downloadQueue: Promise<ArrayBuffer>[] = [];
      
      for (let i = 0; i < numChunks; i++) {
        while (downloadQueue.length >= maxConcurrent) {
          await Promise.race(downloadQueue).catch(() => {});
          downloadQueue.splice(
            downloadQueue.findIndex(p => p.catch(() => false)),
            1
          );
        }
        downloadQueue.push(downloadChunk(i));
      }
      
      // Wait for all chunks
      await Promise.all(downloadQueue);
      
      // Verify all chunks are downloaded
      const missingChunks = chunks.findIndex(chunk => chunk === null);
      if (missingChunks !== -1) {
        throw new Error('Some chunks failed to download');
      }
      
      // Combine chunks
      const combinedArray = new Uint8Array(totalSize);
      let offset = 0;
      
      for (const chunk of chunks) {
        if (chunk) {
          combinedArray.set(new Uint8Array(chunk), offset);
          offset += chunk.byteLength;
        }
      }
      
      return new Blob([combinedArray]);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  useEffect(() => {
    const fetchAndUploadFile = async () => {
      if (fullscreenItem) {
        setIsDownloading(true);
        setDownloadProgress(0);
        
        try {
          // Use the new download function with fallback
          const blob = await downloadFileWithProgress(fullscreenItem.src);
          
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
                  height: `${downloadProgress}%`,
                  boxShadow: 'inset 0 0 20px rgba(59, 130, 246, 0.5)'
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
                      animation: 'wave 3s linear infinite',
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
                  {downloadProgress}%
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