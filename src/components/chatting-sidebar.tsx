"use client";

import * as React from "react";
import { AudioWaveform, Bot, Command, GalleryVerticalEnd } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { Sidebar, SidebarContent, SidebarRail } from "@/components/ui/sidebar";

const hideManage = true; // Set this to true or false to toggle visibility

const data = {
  navMain: [
    {
      title: "Chatting Managers",
      url: "#",
      icon: Bot,
      isActive: true,
      items: [
        { title: "List", url: "#chatting-managers-list" },
        { title: "Manage", url: "#chatting-managers-manage" },
      ],
    },
  ],
};

const navMain = data.navMain.map((navItem) => {
  if (navItem.title === "Chatting Managers") {
    return {
      ...navItem,
      items: navItem.items.filter(
        (item) => !(hideManage && item.title === "Manage")
      ),
    };
  }
  return navItem;
});

export function ChattingSideBar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props} className="dark">
      <SidebarContent className="dark text-white">
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
