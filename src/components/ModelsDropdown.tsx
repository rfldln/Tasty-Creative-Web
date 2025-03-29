"use client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";

const ModelsDropdown: React.FC<ModelsDropdownProps> = ({
  formData,
  setFormData,
  isLoading,
  isFetchingImage,
  webhookData,
}) => {
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch("/api/models");
        const data = await response.json();
        if (Array.isArray(data)) {
          const uniqueSortedModels = [...new Set(data)].sort((a, b) =>
            a.localeCompare(b)
          );
          setModels(uniqueSortedModels);
        }
      } catch (error) {
        console.error("Error fetching models:", error);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModels();
  }, []);
  
  return (
    <div className="flex flex-col">
      <label htmlFor="model" className="text-sm text-gray-300 font-medium mb-1">
        Select Model
      </label>

      <Select
        value={formData.model}
        onValueChange={(value) =>
          setFormData((prev) => ({ ...prev, model: value }))
        }
        disabled={
          isLoading || isFetchingImage || !!webhookData || loadingModels
        }
      >
        <SelectTrigger className="bg-black/60 cursor-pointer border-white/10 p-2 text-gray-400 rounded-lg w-full">
          <SelectValue
            placeholder={loadingModels ? "Loading models..." : "Select Model"}
          />
        </SelectTrigger>
        <SelectContent className="bg-black/90 border-white/10 text-gray-400 max-h-72">
          {models.map((model, index) => (
            <SelectItem
              key={index}
              value={model}
              className="flex items-center justify-between py-2"
            >
              {model}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ModelsDropdown;
