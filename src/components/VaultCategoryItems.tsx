import { Play, Image as ImageIcon } from "lucide-react";
import React, { useEffect, useState, useTransition } from "react";
import Image from "next/image";

type VaultCategoryItemsProps = {
  selectedCategory: { id: number; tag: string } | null;
  setFullscreenItem: (item: {
    id: number;
    name: string;
    src: string;
    poster?: string;
    type: "image" | "video";
  }) => void;
};

const VaultCategoryItems = ({
  selectedCategory,
  setFullscreenItem,
}: VaultCategoryItemsProps) => {
  const [vaultItemsLoading, startVaultItemsLoading] = useTransition();
  const [categoryItems, setCategoryItems] = useState<
    {
      id: number;
      name: string;
      src: string;
      poster: string;
      type: "image" | "video";
    }[]
  >([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedCategory) {
      setCategoryItems([]);
      startVaultItemsLoading(() => {
        fetch(
          `/api/be/vault-category-items?vaultId=${encodeURIComponent(
            selectedCategory.id
          )}`
        )
          .then((res) => {
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json();
          })
          .then((data) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const items = data.map((item: any) => ({
              id: item.id,
              name: item.filename,
              type: item.type,
              src: `/api/be/proxy?path=${btoa(item.local_url)}`,
              poster: `/api/be/proxy?path=${btoa(item.poster_url)}`,
            }));
            setCategoryItems(items);
          })
          .catch((err) => setError(err.message));
      });
    }
  }, [selectedCategory]);

  console.log(categoryItems, "categoryItems");

  return (
    <div className="flex-grow h-full bg-gray-800/40 overflow-y-auto p-4">
      {selectedCategory ? (
        <>
          <h2 className="font-bold mb-4">{selectedCategory.tag}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categoryItems.length > 0 ? (
              categoryItems.map((item) => (
                <div
                  key={item.id}
                  className="relative group cursor-pointer rounded-lg overflow-hidden"
                  onClick={() => setFullscreenItem(item)}
                >
                  {item.type === "image" ? (
                    <Image
                      src={item.src}
                      alt={item.name}
                      className="w-full h-32 object-cover bg-black"
                      width={500}
                      height={500}
                      loading="lazy"
                    />
                  ) : (
                    <>
                      <Image
                        src={item.poster}
                        alt={item.name}
                        className="w-full h-32 object-cover bg-black"
                        width={500}
                        height={500}
                        loading="lazy"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-90 group-hover:opacity-100">
                        <Play className="text-white" size={36} />
                      </div>
                    </>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-sm truncate">
                    {item.name}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-gray-400 italic text-sm">
                No items found in this category
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <ImageIcon className="mb-2" size={48} />
          <p>Select a category to view items</p>
        </div>
      )}
    </div>
  );
};

export default VaultCategoryItems;
