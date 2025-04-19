import { AppSidebar } from "@/components/app-sidebar";
import ModelTab from "@/components/ModelTab";
import { ThemeProvider } from "@/components/theme-provider";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

import React from "react";

const page = () => {
  return (
    <div className="flex flex-col gap-4 shadow-md relative overflow-hidden  w-full  r bg-black/20 rounded-lg border border-white/10">
      <ThemeProvider defaultTheme="light" attribute="class">
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="dark">
            <ModelTab />
          </SidebarInset>
        </SidebarProvider>
      </ThemeProvider>
    </div>
  );
};

export default page;
