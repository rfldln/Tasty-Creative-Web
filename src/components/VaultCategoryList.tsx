import React, { useEffect, useState, useTransition } from "react";

type VaultCategoryListProps = {
  clientLoading: boolean;
  selectedClient: { id: number; email: string } | null;
  selectedCategory: { id: number; tag: string } | null;
  setSelectedCategory: (category: { id: number; tag: string } | null) => void;
};

type VaultCategory = {
  id: number;
  tag: string;
  clientId: number;
  client: {
    id: number;
    email: string;
  };
};

const VaultCategoryList = ({
  clientLoading,
  selectedClient,
  selectedCategory,
  setSelectedCategory,
}: VaultCategoryListProps) => {
  const [vaultCategoriesLoading, startVaultCategoriesLoading] = useTransition();
  const [vaultCategories, setVaultCategories] = useState<VaultCategory[]>([]);

  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedClient && selectedClient.email !== "Select a client") {
      startVaultCategoriesLoading(() => {
        fetch(
          `/api/be/vault-category-list?email=${encodeURIComponent(
            selectedClient.email
          )}`
        )
          .then((res) => {
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json();
          })
          .then((data) => setVaultCategories(data))
          .catch((err) => setError(err.message));
      });
    }
  }, [selectedClient, clientLoading, selectedCategory]);
  return (
    <div className="w-56 h-full bg-gray-800/40 border-r border-gray-700 overflow-y-auto">
      <div className="p-4 border-b border-gray-700">
        <h2 className="font-bold">Categories</h2>
      </div>
      <div>
        {vaultCategories.length > 0 ? (
          vaultCategories.map((category) => (
            <div
              key={category.id}
              className={`p-3 cursor-pointer hover:bg-gray-700 border-l-4 ${
                selectedCategory?.id === category.id
                  ? "border-blue-500 bg-gray-700"
                  : "border-transparent"
              }`}
              onClick={() => setSelectedCategory(category)}
            >
              {category.tag}
            </div>
          ))
        ) : (
          <div className="p-4 text-gray-400 italic text-sm">
            No categories found for this client
          </div>
        )}
        {!selectedClient && (
          <div className="p-4 text-gray-400 italic text-sm">
            Please select a client to view categories
          </div>
        )}
      </div>
    </div>
  );
};

export default VaultCategoryList;
