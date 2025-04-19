"use client";
import React, { Suspense, useEffect, useState } from "react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "./ui/sidebar";
import ModelCard from "./ModelCard";
import { cn } from "@/lib/utils";
import LaunchPrep from "./LaunchPrep";

const ModelTab = () => {
  const [hash, setHash] = useState<string>("");
  const [allModels, setAllModels] = useState<Model[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);

  // Handle hash change
  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash);
    };

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  // Fetch models only once
  useEffect(() => {
    const fetchModels = async () => {
      setLoadingModels(true);
      try {
        const response = await fetch("/api/models");
        const data = await response.json();
        if (Array.isArray(data)) {
          setAllModels(data);
        }
      } catch (error) {
        console.error("Error fetching models:", error);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModels();
  }, []);

  // Filter + sort based on hash (but don’t re-fetch)
  useEffect(() => {
    const filteredModels = allModels.filter((model) => {
      if (hash === "#active-models") {
        return model.status === "Active";
      } else if (hash === "#dropped-models") {
        return model.status === "Dropped";
      } else if (hash === "#onboarding-models") {
        return model.status === "Onboarding";
      }
      return true;
    });

    const sortedModels = filteredModels.sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    setModels(sortedModels);
  }, [hash, allModels]);

  const formattedHash = () => {
    if (hash === "#active-models") return "Active";
    if (hash === "#dropped-models") return "Dropped";
    if (hash === "#onboarding-models") return "Onboarding";
    return "All Models"; // Default case if no hash is set
  };
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="mr-2 h-4 w-px bg-gray-300" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">Models</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{formattedHash()}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div
          className={cn(
            "aspect-video rounded-xl transition-all duration-300 bg-muted/50 max-h-[75px] ",
            {
              "max-h-[300px]": formattedHash() === "Onboarding",
            }
          )}
        >
          {formattedHash() === "Onboarding" && <LaunchPrep />}
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          {loadingModels ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-video rounded-xl bg-muted/50 animate-pulse"
                ></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {models.map((model, index) => (
                <ModelCard key={index} model={model} />
              ))}
            </div>
          )}
        </Suspense>
      </div>
    </>
  );
};

export default ModelTab;
