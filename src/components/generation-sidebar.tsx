"use client";

import * as React from "react";
import { AudioWaveform, Bot, Command, GalleryVerticalEnd } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

const data = {
  // teams: [
  //   {
  //     name: "Acme Inc",
  //     logo: GalleryVerticalEnd,
  //     plan: "Enterprise",
  //   },
  //   {
  //     name: "Acme Corp.",
  //     logo: AudioWaveform,
  //     plan: "Startup",
  //   },
  //   {
  //     name: "Evil Corp.",
  //     logo: Command,
  //     plan: "Free",
  //   },
  // ],
  navMain: [
    {
      title: "Generation",
      url: "#",
      icon: Bot,
      isActive: true,
      items: [
        {
          title: "Live",
          url: "#live",
        },
        {
          title: "VIP",
          url: "#vip",
        },
        {
          title: "Game",
          url: "#game",
        },
        {
          title: "FTT",
          url: "#ftt",
        },
        {
          title: "Twitter Ads",
          url: "#twitter",
        },
        {
          title: "GIF Maker",
          url: "#gif-maker",
        },
      ],
    },
  ],
  projects: [],
};

export function GenerationSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props} className="dark">
      {/* <SidebarHeader className="dark text-white">
        <TeamSwitcher  teams={data.teams} />
      </SidebarHeader> */}
      <SidebarContent className="dark text-white">
        <NavMain items={data.navMain} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      {/* <SidebarFooter className="dark">
        <NavUser user={data.user} />
      </SidebarFooter> */}
      <SidebarRail />
    </Sidebar>
  );
}
