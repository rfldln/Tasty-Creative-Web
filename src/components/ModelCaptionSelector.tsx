import { MODELS_FINISHED_WEEKS_IDS } from "@/lib/lib";
import { sanitizeCaption } from "@/lib/utils";
import React, { useState, useEffect } from "react";

type ModelName = keyof typeof MODELS_FINISHED_WEEKS_IDS;

interface ModelCaptionSelectorProps {
  model: ModelName;
  onCaptionSelect?: (caption: string, id: string | undefined) => void;
  onToggleChange?: (isPaid: boolean, id: string | undefined) => void;
  selectedCaption: string;
  setSelectedCaption: (caption: string) => void;
  isPaid?: boolean;
  setIsPaid: (isPaid: boolean) => void;
}

const ModelCaptionSelector: React.FC<ModelCaptionSelectorProps> = ({
  model,
  onCaptionSelect,
  onToggleChange,
  selectedCaption,
  setSelectedCaption,
  isPaid,
  setIsPaid,
}) => {
  const [captions, setCaptions] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedDay, setSelectedDay] = useState<string>("#1A"); // Default to Monday

  // Day mappings
  const dayOptions = [
    { code: "#1A", day: "Monday", color: "bg-red-600" },
    { code: "#1B", day: "Tuesday", color: "bg-orange-600" },
    { code: "#1C", day: "Wednesday", color: "bg-yellow-600" },
    { code: "#1D", day: "Thursday", color: "bg-green-600" },
    { code: "#1E", day: "Friday", color: "bg-blue-600" },
    { code: "#1F", day: "Saturday", color: "bg-indigo-600" },
    { code: "#1G", day: "Sunday", color: "bg-purple-600" },
  ];

  const currentDayInfo = dayOptions.find((day) => day.code === selectedDay);

  // Get the current model's ID based on toggle state
  const currentModelObj = MODELS_FINISHED_WEEKS_IDS[model];
  const currentId =
    currentModelObj &&
    (isPaid
      ? (currentModelObj as { paid?: string }).paid
      : (currentModelObj as { free?: string }).free);

  const handleToggleChange = (checked: boolean) => {
    setIsPaid(checked);
    setSelectedCaption(""); // Reset selection when switching
    const modelObj = MODELS_FINISHED_WEEKS_IDS[model];
    let newId: string | undefined;
    if (checked && "paid" in modelObj) {
      newId = (modelObj as { paid: string }).paid;
    } else if (!checked && "free" in modelObj) {
      newId = (modelObj as { free: string }).free;
    }
    onToggleChange?.(checked, newId);
  };

  // Usage example with your existing handler
  const handleCaptionSelect = (caption: string) => {
    const cleanedCaption = sanitizeCaption(caption);
    setSelectedCaption(cleanedCaption);
    onCaptionSelect?.(cleanedCaption, currentId);
  };

  const handleDaySelect = (dayCode: string) => {
    setSelectedDay(dayCode);
    setSelectedCaption(""); // Reset selection when day changes
  };

  useEffect(() => {
    if (currentId) {
      setLoading(true);

      const fetchSheet = async () => {
        const response = await fetch("/api/models/captions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: currentId,
            code: selectedDay,
          }),
        });

        const data = await response.json();

        setCaptions(data.unlockedCaptions || []);
        setLoading(false);
      };

      fetchSheet();
    }
  }, [currentId, selectedDay]);

  if (!MODELS_FINISHED_WEEKS_IDS[model]) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
        <p className="text-red-700">
          Model &quot;{model}&quot; not found on &apos;✅ Finished Weeks&apos;
          for captions
        </p>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto p-6 bg-gray-900/60 rounded-xl shadow-lg border border-gray-700">
      {/* Day Selection */}
      <div className="mb-6">
        <div className="p-4 bg-gray-800 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Select Day</h3>
          <div className="grid grid-cols-7 gap-2">
            {dayOptions.map((day) => (
              <button
                key={day.code}
                onClick={() => handleDaySelect(day.code)}
                className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                  selectedDay === day.code
                    ? `${day.color} border-white/30 shadow-lg`
                    : "bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500"
                }`}
              >
                <div className="text-center">
                  <div
                    className={`text-lg font-bold ${
                      selectedDay === day.code ? "text-white" : "text-gray-300"
                    }`}
                  >
                    {day.code}
                  </div>
                  <div
                    className={`text-xs ${
                      selectedDay === day.code
                        ? "text-white/80"
                        : "text-gray-400"
                    }`}
                  >
                    {day.day.slice(0, 3)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toggle Switch */}
      <div className="mb-6">
        <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
          <div className="flex items-center space-x-3">
            <span
              className={`font-medium ${
                !isPaid ? "text-blue-400" : "text-gray-400"
              }`}
            >
              Free
            </span>
            <div
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out cursor-pointer ${
                isPaid ? "bg-blue-600" : "bg-gray-600"
              }`}
              onClick={() => handleToggleChange(!isPaid)}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
                  isPaid ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </div>
            <span
              className={`font-medium ${
                isPaid ? "text-blue-400" : "text-gray-400"
              }`}
            >
              Paid
            </span>
            {!currentId && (
              <p className="text-red-500 text-sm">No sheet ID found</p>
            )}
          </div>
        </div>
      </div>

      {/* Captions List */}
      {currentId && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-100 mb-3">
            Select a Caption for {currentDayInfo?.day}
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-400">Loading captions...</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto overflow-x-hidden pr-2">
              {captions.map((caption, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    selectedCaption === caption
                      ? "border-blue-500 bg-blue-900/50 shadow-md"
                      : "border-gray-700 bg-gray-800 hover:border-gray-600 hover:shadow-sm"
                  }`}
                  onClick={() => handleCaptionSelect(caption)}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`min-w-4 max-w-4 min-h-4 max-h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedCaption === caption
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-500"
                      }`}
                    >
                      {selectedCaption === caption && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <div className="w-full relative flex gap-2 justify-between ">
                      <p className="text-gray-300 flex-1 w-full truncate text-nowrap pr-8">
                        {caption}
                      </p>
                      {/* <Eye className="absolute right-5"/> */}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected Caption Display */}
      {selectedCaption && (
        <div
          className={`mt-6 p-4 border rounded-lg ${currentDayInfo?.color}/20 border-opacity-50`}
        >
          <h4 className="font-semibold text-white mb-2">
            Selected Caption for {currentDayInfo?.day} ({selectedDay}):
          </h4>
          <p className="text-gray-200">{selectedCaption}</p>
        </div>
      )}
    </div>
  );
};

export default ModelCaptionSelector;
