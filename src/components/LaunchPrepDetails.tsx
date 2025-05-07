import { cn } from "@/lib/utils";

import React, { useEffect, useState } from "react";
import CountUp from "react-countup";
import { Checkbox } from "./ui/checkbox";

type LaunchPrepDetailsProps = {
  dashboard?: boolean;
  modelDataLoading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedModelData: any; // Replace with the actual type if known
  selectedModel?: string | null;
  timestamp?: string | null;
  editedBy?: string | null;
  className?: string;
  triggerTabChange?: (value: string, model: string) => void;
};

const LaunchPrepDetails = ({
  modelDataLoading,
  selectedModelData,
  selectedModel,
  timestamp,
  editedBy,
  className,
  dashboard = false,
  triggerTabChange,
}: LaunchPrepDetailsProps) => {
  const [animatedWidth, setAnimatedWidth] = useState(0);
  const prepItems = selectedModelData
    ? Object.entries(selectedModelData)
        .filter(([key]) => key !== "Model" && key !== "Status")
        .map(([key, value]) => ({
          item: key,
          status: value === "TRUE" ? "Done" : "Pending",
        }))
    : [];

  const completedCount = prepItems.filter(
    (item) => item.status === "Done"
  ).length;
  const totalCount = prepItems.length;
  const completionRate =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimatedWidth(completionRate);
    }, 200);

    return () => clearTimeout(timeout);
  }, [completionRate]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatRelativeTime = (timestamp: any) => {
    const currentTime = new Date();
    const parsedTimestamp = new Date(timestamp).getTime();
    const timeDifference = currentTime.getTime() - parsedTimestamp; // Difference in milliseconds

    const seconds = Math.floor(timeDifference / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    // Use the relative time formatter
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

    if (days > 0) {
      return rtf.format(-days, "day");
    } else if (hours > 0) {
      return rtf.format(-hours, "hour");
    } else if (minutes > 0) {
      return rtf.format(-minutes, "minute");
    } else {
      return rtf.format(-seconds, "second");
    }
  };

  return (
    <div
      className={cn(
        "w-full bg-black/10 dark:bg-black/40 rounded-md p-3 sm:p-4 transition-all duration-300",
        className
      )}
    >
      {modelDataLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <p className="text-sm text-gray-500">Loading latest data...</p>
          </div>
        </div>
      ) : selectedModelData ? (
        <>
          <div>
            {timestamp && (
              <span className="flex items-center text-md text-muted-foreground mb-2">
                <span className="text-red-500 font-bold">NEW! </span> &nbsp;
                Updated {formatRelativeTime(timestamp)} by {editedBy}
              </span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <h1 className="text-lg text-white sm:text-xl font-semibold flex items-center flex-wrap gap-2">
              <span>{selectedModel || selectedModelData.Model}</span>
              <span className="text-xs py-1 px-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 rounded-full">
                <CountUp end={completionRate} />% Complete
              </span>
              {dashboard && (
                <div
                  onClick={() =>
                    triggerTabChange &&
                    triggerTabChange("onboarding", selectedModelData.Model)
                  }
                  className="underline cursor-pointer text-sm text-neutral-400"
                >
                  Click here for more details
                </div>
              )}
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

          {!dashboard && (
            <>
              <hr className="mb-4 opacity-30" />
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {prepItems.map((item, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center space-x-2 p-2 rounded-md",
                      item.status === "Done"
                        ? "bg-green-50 dark:bg-green-900/20"
                        : "bg-red-50 dark:bg-red-900/20"
                    )}
                  >
                    <Checkbox
                      id={`item-${index}`}
                      className={cn("w-4 h-4 sm:w-5 sm:h-5", {
                        "data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500":
                          item.status === "Done",
                        "border-red-400": item.status === "Pending",
                      })}
                      disabled
                      checked={item.status === "Done"}
                    />
                    <label
                      htmlFor={`item-${index}`}
                      className={cn(
                        "text-sm sm:text-base font-medium leading-none",
                        {
                          "text-red-600 dark:text-red-400":
                            item.status === "Pending",
                          "text-green-600 dark:text-green-500":
                            item.status === "Done",
                        }
                      )}
                    >
                      {item.item}
                    </label>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-40">
          <p className="text-gray-500 italic">
            Select a client to view details
          </p>
        </div>
      )}
    </div>
  );
};

export default LaunchPrepDetails;
