"use client";
import React, { useEffect, useState, useMemo } from "react";
import { Checkbox } from "./ui/checkbox";
import { cn } from "@/lib/utils";
import CountUp from "react-countup";
import { Input } from "./ui/input"; 
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { prepFields } from "@/lib/lib";

const LaunchPrep = () => {
  const [animatedWidth, setAnimatedWidth] = useState(0);
  interface OnBoardingModel {
    Model: string;
    [key: string]: string; // Allow other dynamic fields
  }

  const [onBoardingModels, setOnBoardingModels] = useState<OnBoardingModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modelDataLoading, setModelDataLoading] = useState(false);
  const [selectedModelData, setSelectedModelData] = useState<OnBoardingModel | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  const ITEMS_PER_PAGE = viewMode === "grid" ? 15 : 10;

  // Fetch all models initially
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch("/api/google/onboarding");
        const data = await res.json();
        setOnBoardingModels(data);
        // Set the first model as default selected if models exist
        if (data.length > 0) {
          setSelectedModel(data[0].Model);
        }
      } catch (err) {
        console.error("Failed to fetch models:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  // Fetch specific model data when selection changes
  useEffect(() => {
    if (!selectedModel) return;

    const fetchModelData = async () => {
      setModelDataLoading(true);
      try {
        // Fetch fresh data for the selected model
        const res = await fetch(`/api/google/onboarding?model=${encodeURIComponent(selectedModel)}`);
        const data = await res.json();
        
        // Find the selected model in the returned data
        const modelData = Array.isArray(data) 
          ? data.find((model: OnBoardingModel) => model.Model === selectedModel)
          : data;
          
        setSelectedModelData(modelData || null);
      } catch (err) {
        console.error("Failed to fetch model data:", err);
        setSelectedModelData(null);
      } finally {
        setModelDataLoading(false);
      }
    };

    fetchModelData();
  }, [selectedModel]);

  const prepItems = selectedModelData
    ? prepFields.map((field) => ({
        item: field,
        status: selectedModelData[field] === "TRUE" ? "Done" : "Pending",
      }))
    : [];

  const completedCount = prepItems.filter(
    (item) => item.status === "Done"
  ).length;
  const totalCount = prepItems.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimatedWidth(completionRate);
    }, 200);

    return () => clearTimeout(timeout);
  }, [completionRate]);

  const handleModelSelect = (modelName: string) => {
    setSelectedModel(modelName);
  };

  // Filter and paginate models
  const filteredModels = useMemo(() => {
    return onBoardingModels.filter(model => 
      model.Model.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [onBoardingModels, searchQuery]);

  const totalPages = Math.ceil(filteredModels.length / ITEMS_PER_PAGE);
  
  const paginatedModels = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredModels.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredModels, currentPage, ITEMS_PER_PAGE]);

  // Navigation functions
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="w-full flex flex-col justify-center p-2 sm:p-3 md:px-6 lg:px-8">
      <h1 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-4">
        Launch Preparation
      </h1>
      <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
        Select a client to view their real-time launch preparation status.
      </p>

      {/* Client Selection Area */}
      <div className="w-full bg-black/5 rounded-md p-3 sm:p-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
          <h2 className="text-lg font-medium">Onboarding Clients</h2>
          
          <div className="flex gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-grow sm:w-60">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {/* View Toggle */}
            <div className="flex rounded-md overflow-hidden border">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "px-2 py-1 text-xs font-medium",
                  viewMode === "grid" 
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" 
                    : "bg-white dark:bg-gray-800"
                )}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "px-2 py-1 text-xs font-medium",
                  viewMode === "list" 
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" 
                    : "bg-white dark:bg-gray-800"
                )}
              >
                List
              </button>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-gray-500 mb-2">No clients match your search</p>
            <button 
              onClick={() => setSearchQuery("")}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear search
            </button>
          </div>
        ) : (
          <>
            {/* Grid View */}
            {viewMode === "grid" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {paginatedModels.map((model,index) => (
                  <div
                    key={index}
                    onClick={() => handleModelSelect(model.Model)}
                    className={cn(
                      "cursor-pointer p-3 rounded-md transition-all duration-200 border-2",
                      selectedModel === model.Model
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                        : "border-transparent hover:bg-gray-100 dark:hover:bg-gray-800/50"
                    )}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center mb-2">
                        <span className="text-white font-bold text-lg">
                          {model.Model.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium truncate max-w-full">
                        {model.Model}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* List View */}
            {viewMode === "list" && (
              <div className="flex flex-col divide-y">
                {paginatedModels.map((model) => (
                  <div
                    key={model.Model}
                    onClick={() => handleModelSelect(model.Model)}
                    className={cn(
                      "cursor-pointer p-2 transition-all duration-200",
                      selectedModel === model.Model
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800/50"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {model.Model.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium">
                        {model.Model}
                      </span>
                      {selectedModel === model.Model && (
                        <span className="ml-auto text-xs py-1 px-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 rounded-full">
                          Selected
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-gray-500">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredModels.length)} of {filteredModels.length} clients
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={goToPrevPage}
                    disabled={currentPage === 1}
                    className="p-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Launch Prep Details Area */}
      <div className="w-full bg-black/10 dark:bg-black/40 rounded-md p-3 sm:p-4 transition-all duration-300">
        {modelDataLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-sm text-gray-500">Loading latest data...</p>
            </div>
          </div>
        ) : selectedModelData ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <h1 className="text-lg sm:text-xl font-semibold flex items-center flex-wrap gap-2">
                <span>{selectedModel}</span>
                <span className="text-xs py-1 px-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 rounded-full">
                  <CountUp end={completionRate}/>% Complete
                </span>
              </h1>
              <div className="w-full sm:w-auto sm:min-w-40 md:min-w-60">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  <CountUp end={completedCount} /> of {totalCount} tasks completed
                </p>
                <div className="bg-gray-300 dark:bg-gray-700 h-2 sm:h-3 rounded-md">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-blue-600 h-full rounded-md transition-all duration-500"
                    style={{ width: `${animatedWidth}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <hr className="mb-4 opacity-30" />
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {prepItems.map((item, index) => (
                <div 
                  key={index} 
                  className={cn(
                    "flex items-center space-x-2 p-2 rounded-md", 
                    item.status === "Done" ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"
                  )}
                >
                  <Checkbox
                    id={`item-${index}`}
                    className={cn("w-4 h-4 sm:w-5 sm:h-5", {
                      "data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500": item.status === "Done",
                      "border-red-400": item.status === "Pending"
                    })}
                    disabled
                    checked={item.status === "Done"}
                  />
                  <label
                    htmlFor={`item-${index}`}
                    className={cn("text-sm sm:text-base font-medium leading-none", {
                      "text-red-600 dark:text-red-400": item.status === "Pending",
                      "text-green-600 dark:text-green-500": item.status === "Done",
                    })}
                  >
                    {item.item}
                  </label>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-40">
            <p className="text-gray-500 italic">Select a client to view details</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LaunchPrep;