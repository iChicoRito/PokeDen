"use client";

import Link from "next/link";

import { Clock3, Sparkles } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";

import { PokeDenNav } from "./pokeden-nav";

export function PokeDenSidebar(props: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip={APP_CONFIG.name}>
              <Link href="/dashboard">
                <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Sparkles aria-hidden="true" className="size-4" />
                </span>
                <span className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">{APP_CONFIG.name}</span>
                  <span className="truncate text-muted-foreground text-xs">Study workspace</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <PokeDenNav />
      </SidebarContent>
      <SidebarFooter>
        <div className="rounded-lg border bg-sidebar-accent/40 p-2 group-data-[collapsible=icon]:hidden">
          <p className="px-1 font-medium text-xs">Companion dock</p>
          <p className="px-1 pb-2 text-muted-foreground text-xs">Ready for your next focus session.</p>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="sm">
                <Link href="/pomodoro">
                  <Clock3 aria-hidden="true" />
                  Start focusing
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
