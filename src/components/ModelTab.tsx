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
import { SidebarTrigger, useSidebar } from "./ui/sidebar";
import ModelCard from "./ModelCard";
import { cn } from "@/lib/utils";
import LaunchPrep from "./LaunchPrep";
import { useRouter, useSearchParams } from "next/navigation";
import ModelHero from "./ModelHero";

const ModelTab = () => {
  const router = useRouter();

  const searchParams = useSearchParams();
  const tabValue = searchParams.get("tab") || "model";

  const [hash, setHash] = useState<string>("");
  const [allModels, setAllModels] = useState<Model[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const { selectedModel, setSelectedModel } = useSidebar();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/google/check-auth");
        const data = await res.json();

        if (!data.authenticated) {
          // Get the current tab from URL or default to 'live'
          const currentTab = tabValue || "model";

          // Include the current tab in the auth request
          const authRes = await fetch(
            `/api/google/auth?tab=${encodeURIComponent(currentTab)}`
          );
          const authData = await authRes.json();

          if (authData.authUrl) {
            // Append the tab parameter to the auth URL
            const authUrlWithTab = new URL(authData.authUrl);
            authUrlWithTab.searchParams.set(
              "state",
              JSON.stringify({ tab: currentTab })
            );

            window.location.href = authUrlWithTab.toString();
          }
        }
      } catch (error) {
        console.error("Authentication check failed", error);
      }
    };

    checkAuth();
  }, [router]);

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
      <header className="flex h-12 sm:h-14 md:h-16 shrink-0 items-center gap-1 sm:gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-10 sm:group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4">
          <SidebarTrigger className="-ml-0.5 sm:-ml-1" />
          <div className="mx-1 sm:mr-2 h-3 sm:h-4 w-px bg-gray-300" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#" className="text-sm md:text-base">
                  Models
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage
                  className={cn("text-sm md:text-base truncate max-w-28 sm:max-w-40 md:max-w-full cursor-pointer",{"text-gray-400": selectedModel})}
                  onClick={() => setSelectedModel(null)}
                >
                  {formattedHash()}
                </BreadcrumbPage>
              </BreadcrumbItem>
              {selectedModel && (
                <BreadcrumbSeparator className="hidden md:block" />
              )}
              <BreadcrumbPage className="text-sm md:text-base truncate max-w-28 sm:max-w-40 md:max-w-full">
                {selectedModel}
              </BreadcrumbPage>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4 pt-0">
        <div
          className={cn(
            "rounded-lg sm:rounded-xl transition-all duration-300 bg-muted/50",
            "h-[60px]",
            {
              "h-auto": formattedHash() != "Onboarding" && selectedModel,
            },
            {
              "h-auto": formattedHash() === "Onboarding",
            }
          )}
        >
          {formattedHash() === "Onboarding" ? (
            <LaunchPrep />
          ) : (
            <ModelHero selectedModel={selectedModel ?? null} />
          )}
        </div>
        {!selectedModel && (
          <Suspense
            fallback={<div className="text-sm md:text-base">Loading...</div>}
          >
            {loadingModels ? (
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="aspect-video rounded-lg sm:rounded-xl bg-muted/50 animate-pulse"
                  ></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                {models.map((model, index) => (
                  <ModelCard
                    key={index}
                    model={model}
                    selectedModel={selectedModel ?? null}
                    setSelectedModel={setSelectedModel ?? (() => {})}
                  />
                ))}
              </div>
            )}
          </Suspense>
        )}
      </div>
    </>
  );
};

export default ModelTab;
