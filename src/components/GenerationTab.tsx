"use client";
import { ThemeProvider } from "next-themes";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "./ui/sidebar";
import { GenerationSidebar } from "./generation-sidebar";
import LiveFlyer from "./LiveFlyer";
import { useEffect, useState } from "react";
import VIPFlyer from "./VIPFlyer";
import FTTFlyer from "./FTTPage";
import TwitterAdsPage from "./TwitterAdsPage";
import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "./ui/breadcrumb";

const GenerationTab = () => {
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
  if (hash === "#live") {
    content = <LiveFlyer />;
  } else if (hash === "#vip") {
    content = <VIPFlyer />;
  } else if (hash === "#game") {
    content = null; // Or any content you want to render for #game
  } else if (hash === "#ftt") {
    content = <FTTFlyer />;
  } else if (hash === "#twitter") {
    content = <TwitterAdsPage />;
  }

  const formattedHash = () => {
    if (hash === "#live") return "Live";
    if (hash === "#vip") return "VIP";
    if (hash === "#game") return "Game";
    if (hash === "#ftt") return "FTT";
    if (hash === "#twitter") return "Twitter Ads";
    return "Generate"; // Default case if no hash is set
  };
  return (
    <div className="flex flex-col gap-2 sm:gap-3 md:gap-4 shadow-sm sm:shadow-md  relative overflow-hidden w-full bg-black/20 rounded-md sm:rounded-lg border border-white/10">
      <ThemeProvider defaultTheme="light" attribute="class">
        <SidebarProvider>
          <GenerationSidebar />
          <SidebarInset className="dark w-full max-w-full overflow-x-hidden ">
            <header className="flex h-12 sm:h-14 md:h-16 shrink-0 items-center gap-1 sm:gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-10 sm:group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4">
                <SidebarTrigger className="-ml-0.5 sm:-ml-1" />
                <div className="mx-1 sm:mr-2 h-3 sm:h-4 w-px bg-gray-300" />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#" className="text-sm md:text-base">
                        Generate
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
            {content}
          </SidebarInset>
        </SidebarProvider>
      </ThemeProvider>
    </div>
  );
};

export default GenerationTab;
