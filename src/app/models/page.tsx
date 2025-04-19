import { AppSidebar } from "@/components/app-sidebar";
import ModelTab from "@/components/ModelTab";
import { ThemeProvider } from "@/components/theme-provider";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

import React from "react";

const page = () => {
  return (
    <div className="flex flex-col gap-2 sm:gap-3 md:gap-4 shadow-sm sm:shadow-md  relative overflow-hidden w-full bg-black/20 rounded-md sm:rounded-lg border border-white/10">
      <ThemeProvider defaultTheme="light" attribute="class">
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="dark w-full max-w-full overflow-x-hidden ">
            <ModelTab />
          </SidebarInset>
        </SidebarProvider>
      </ThemeProvider>
    </div>
  );
};

export default page;
