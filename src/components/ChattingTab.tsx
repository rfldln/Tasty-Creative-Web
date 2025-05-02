"use client";
import { ThemeProvider } from "next-themes";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "./ui/sidebar";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "./ui/breadcrumb";
import { ChattingSideBar } from "./chatting-sidebar";
import ChattingManagersList from "./ChattingManagersList";

const ChattingTab = () => {
  const [hash, setHash] = useState<string>("");
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

  let content;
  if (hash === "#chatting-managers-list") {
    content = <ChattingManagersList />;
  }

  const formattedHash = () => {
    if (hash === "#chatting-managers-list") return "Chatting Managers List";

    return ""; // Default case if no hash is set
  };
  return (
    <div className="flex flex-col gap-2 sm:gap-3 md:gap-4 shadow-sm sm:shadow-md  relative overflow-hidden w-full bg-black/20 rounded-md sm:rounded-lg border border-white/10">
      <ThemeProvider defaultTheme="light" attribute="class">
        <SidebarProvider>
          <ChattingSideBar />
          <SidebarInset className="dark w-full max-w-full overflow-x-hidden ">
            <header className="flex h-12 sm:h-14 md:h-16 shrink-0 items-center gap-1 sm:gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-10 sm:group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4">
                <SidebarTrigger className="-ml-0.5 sm:-ml-1" />
                <div className="mx-1 sm:mr-2 h-3 sm:h-4 w-px bg-gray-300" />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#" className="text-sm md:text-base">
                        Chatting
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage
                        className={cn(
                          "text-sm md:text-base truncate max-w-28 sm:max-w-40 md:max-w-full cursor-pointer"
                        )}
                      >
                        {formattedHash()}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>
            <div className="px-5 pb-5">
              <div
                className={`rounded-xl px-5 transition-all duration-300 bg-gradient-to-b from-gray-800 to-gray-850 shadow-lg border border-gray-700/30 overflow-hidden`}
              >
                {content}
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ThemeProvider>
    </div>
  );
};

export default ChattingTab;
