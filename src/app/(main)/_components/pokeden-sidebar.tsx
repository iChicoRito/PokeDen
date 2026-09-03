"use client";

import Image from "next/image";
import Link from "next/link";

import { PawPrint, Sparkles } from "lucide-react";

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
import { COMPANION_CATALOG, resolveCompanionId } from "@/features/pokeden/companions";
import { usePokeDenStore } from "@/features/pokeden/pokeden-provider";

import { CompanionLevelMeter } from "./companion-level-meter";
import { PokeDenNav } from "./pokeden-nav";

export function PokeDenSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const companionPreferences = usePokeDenStore((state) => state.data.companionPreferences);
  const companionId = resolveCompanionId(companionPreferences.selected);
  const entry = COMPANION_CATALOG.find((candidate) => candidate.id === companionId) ?? COMPANION_CATALOG[0];

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
          <div className="flex items-center gap-2 px-1 pb-2">
            {companionPreferences.visible ? (
              <div className="size-10 shrink-0 overflow-hidden rounded-md bg-sidebar-accent">
                <Image
                  src={entry.image}
                  alt={`${entry.name} profile`}
                  width={96}
                  height={96}
                  unoptimized
                  className="pokeden-pixelated size-full rounded-md object-cover"
                />
              </div>
            ) : (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-sidebar-accent">
                <PawPrint aria-hidden="true" className="size-4 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-xs">Companion dock</p>
              <p className="truncate text-muted-foreground text-xs">Your companion is ready and studying with you.</p>
            </div>
          </div>
          <CompanionLevelMeter />
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="sm">
                <Link href="/companions">
                  <PawPrint aria-hidden="true" />
                  View companion
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
