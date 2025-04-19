"use client";
import React, { useEffect, useState } from "react";
import { Checkbox } from "./ui/checkbox";
import { cn } from "@/lib/utils";
import CountUp from "react-countup";

const LaunchPrep = () => {
  const [animatedWidth, setAnimatedWidth] = useState(0);
  const prepItems = [
    { item: "Share 3+ sexting scripts", status: "Done" },
    { item: "Set up & share Notion", status: "Pending" },
    { item: "Fill out Client Info tab", status: "Pending" },
    { item: "Confirm pricing with all teams", status: "Done" },
    { item: "Schedule social posts for launch", status: "Done" },
    { item: "Store passwords in client sheet", status: "Pending" },
    { item: "Notify teams of launch date", status: "Pending" },
    { item: "Complete Airtable profile", status: "Pending" },
  ];

  const completedCount = prepItems.filter(
    (item) => item.status === "Done"
  ).length;
  const totalCount = prepItems.length;
  const completionRate = Math.round((completedCount / totalCount) * 100);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimatedWidth(completionRate);
    }, 500);

    return () => clearTimeout(timeout);
  }, [completionRate]);

  return (
    <div className="w-full flex flex-col justify-center p-2 sm:p-3 md:px-6 lg:px-8">
      <h1 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-4">Launch Preparation</h1>
      <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
        Your model is currently in the launch preparation phase. Please wait
        while we finalize the details.
      </p>

      <div className="w-full bg-black/40 rounded-md p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
          <h1 className="text-lg sm:text-xl font-semibold">Model Name</h1>
          <div className="w-full sm:w-auto sm:min-w-40 md:min-w-60">
            <p className="text-xs sm:text-sm text-muted-foreground">
              <CountUp end={animatedWidth} />% of launch prep completed
            </p>
            <div className="bg-gray-500 h-2 sm:h-3 rounded-md">
              <div
                className="bg-gradient-to-r from-purple-600 to-blue-600 h-full rounded-md transition-all duration-500"
                style={{ width: `${animatedWidth}%` }}
              ></div>
            </div>
          </div>
        </div>
        <hr className="mb-2" />
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
          {prepItems.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <Checkbox
                id={`item-${index}`}
                className="w-4 h-4 sm:w-5 sm:h-5 
                dark:data-[state=checked]:bg-green-500 
                dark:data-[state=checked]:border-green-500 
                dark:data-[state=checked]:text-white
                disabled:opacity-90"
                disabled
                checked={item.status === "Done"}
              />
              <label
                htmlFor={`item-${index}`}
                className={cn("text-sm sm:text-base font-medium leading-none", {
                  "text-red-400": item.status === "Pending",
                  "text-green-500": item.status === "Done",
                })}
              >
                {item.item}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LaunchPrep;