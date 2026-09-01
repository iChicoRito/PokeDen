"use client";

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
import { resolveCompanionId } from "@/features/pokeden/companions";
import { usePokeDenStore } from "@/features/pokeden/pokeden-provider";
import { FIRST_EVOLUTION_BY_COMPANION, SPRITE_SHEETS } from "@/features/pokeden/sprite-sheets";

import { PokeDenNav } from "./pokeden-nav";

export function PokeDenSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const companionPreferences = usePokeDenStore((state) => state.data.companionPreferences);
  const companionId = resolveCompanionId(companionPreferences.selected);
  const companionSheet = SPRITE_SHEETS[FIRST_EVOLUTION_BY_COMPANION[companionId]];
  // Frame 0 of the sheet is a horizontal idle pose; rendered at 2x scale for a crisp pixel portrait.
  const companionFrameSize = companionSheet.frameWidth * 2;

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
              <div
                aria-hidden="true"
                className="pokeden-pixelated size-10 shrink-0 rounded-md bg-sidebar-accent"
                style={{
                  backgroundImage: `url(${companionSheet.sheetUrl})`,
                  backgroundSize: `${companionSheet.frameCount * companionFrameSize}px ${companionSheet.frameHeight * 2}px`,
                  backgroundPosition: "0 0",
                  backgroundRepeat: "no-repeat",
                }}
              />
            ) : (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-sidebar-accent">
                <PawPrint aria-hidden="true" className="size-4 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-medium text-xs">Companion dock</p>
              <p className="truncate text-muted-foreground text-xs">Your companion is ready and studying with you.</p>
            </div>
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="sm">
                <Link href="/settings">
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
