"use client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { liveFlyerValidation } from "../../schema/zodValidationSchema";

const STATIC_MODELS = [
  "Alaya", "Alix", "Ally Lotti", "Amber MG", "Angela", "Autumn", "Ava", "Bri",
  "Bronwin", "Coco", "Colby", "Cora", "Dan Dangler", "Emily Ray", "Emmie", "Essie",
  "Forrest", "Gabrielle", "Ivy Wolfe", "Ivy Wren", "Jaileen", "Julianna", "Kait",
  "Kass", "Kelly", "Kenzie", "Kimmy", "KKVSH", "Kyra", "Laila", "Lala", "McKinley",
  "Mel", "Michelle", "MJ", "Nicole Aniston", "Rubi Rose", "Sage", "Salah", "Sarah",
  "Sharna", "SINATRA", "Sirena", "Sky", "Sophie", "Tiauna", "Tita", "Victoria (V)",
  "Kay", "Swedish Bella", "Tayy", "Sarah ill", "Carter", "Diva", "Nika", "Angel",
  "Razz", "Sarah C", "Oakly", "Bella B", "Elsa", "Karmen", "Bentlee", "Mia", "Paige",
  "Charlotte P", "Elle", "Hailey", "Hannah", "Harriet", "Korina", "Niah", "Marcie",
  "Dakota", "Zoey", "Mia Swan", "Rebecca", "Tara West", "Swiggy", "Lolo",
  "Ali Patience", "Grace", "Madison", "Victoria Cakes", "Ashley"
];

const ModelsDropdown: React.FC<ModelsDropdownProps> = ({
  formData,
  setFormData,
  isLoading,
  isFetchingImage,
  webhookData,
  error,
  setFieldErrors,
}) => {
  return (
    <div className="flex flex-col">
      <label htmlFor="model" className="text-sm text-gray-300 font-medium mb-1">
        Select Model
      </label>

      <Select
        value={formData.model}
        onValueChange={(value) => {
          setFormData((prev) => ({ ...prev, model: value }));

          // Validate
          const fieldSchema = (liveFlyerValidation.shape as any)["model"];
          if (fieldSchema) {
            const result = fieldSchema.safeParse(value);

            setFieldErrors?.((prev) => ({
              ...prev,
              model: result.success ? "" : result.error.errors[0].message,
            }));
          }
        }}
        disabled={isLoading || isFetchingImage || !!webhookData}
      >
        <SelectTrigger
          className={cn(
            "bg-black/60 cursor-pointer border-white/10 p-2 text-gray-400 rounded-lg w-full",
            { "border-red-500 !text-red-500": error }
          )}
        >
          <SelectValue placeholder="Select Model" />
        </SelectTrigger>
        <SelectContent className="bg-black/90 border-white/10 text-gray-400 max-h-72 overflow-y-auto">
          {STATIC_MODELS.map((name, index) => (
            <SelectItem
              key={index}
              value={name}
              className="flex items-center justify-between py-2"
            >
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p className="text-red-500 text-[12px] mt-2 ">Select a Model!</p>
      )}
    </div>
  );
};

export default ModelsDropdown;
