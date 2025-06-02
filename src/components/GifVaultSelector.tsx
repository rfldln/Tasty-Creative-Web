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
      .finally(() => setIsLoading(false));
  }, [vaultName]);

  useEffect(() => {
    const fetchAndUploadFile = async () => {
      if (fullscreenItem) {
        setIsDownloading(true);
        try {
          const response = await fetch(fullscreenItem.src);
          const blob = await response.blob();
          const file = new File([blob], fullscreenItem.name, {
            type: blob.type,
          });
          onUpload(file);
          setIsDownloading(false);
          onClose();
          setFullscreenItem(null);
        } catch (err) {
          setError("Failed to fetch file for upload.");
          console.error(err);
        }
      }
    };

    fetchAndUploadFile();
  }, [fullscreenItem]);

  console.log(selectedClient, "selectedClient");

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed p-24 inset-0 bg-black/90 z-[9999] flex flex-col overflow-hidden" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
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

        {/* Loading overlay */}
        {isDownloading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="text-white text-xl animate-pulse bg-gray-800 px-6 py-4 rounded-lg">
              Preparing file...
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
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
};

export default GifVaultSelector;