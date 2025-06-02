import { useState, useEffect } from "react";
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col  justify-center z-50 p-4">
      <div className="flex flex-1">
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
              onClose={onClose}
            />
          </>
        ) : isLoading ? (
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/80 z-50">
            <div className="text-white text-lg animate-pulse">Loading...</div>
          </div>
        ) : (
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/80 z-50">
            <div className="text-white text-lg animate-pulse">No account found</div>
          </div>
        )}
      </div>

      {isDownloading && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/80 z-50">
          <div className="text-white text-lg animate-pulse">
            Preparing file...
          </div>
        </div>
      )}

      {/* {error && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/90 text-red-500">
          <p>{error}</p>
        </div>
      )} */}
    </div>
  );
};
export default GifVaultSelector;
