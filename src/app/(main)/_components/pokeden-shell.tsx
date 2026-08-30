import type { ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { SidebarCollapsible, SidebarVariant } from "@/lib/preferences/layout";
import { cn } from "@/lib/utils";

import { PokeDenHeader } from "./pokeden-header";
import { PokeDenSidebar } from "./pokeden-sidebar";

interface PokeDenShellProps {
  readonly children: ReactNode;
  readonly defaultOpen: boolean;
  readonly variant: SidebarVariant;
  readonly collapsible: SidebarCollapsible;
}

export function PokeDenShell({ children, defaultOpen, variant, collapsible }: PokeDenShellProps) {
  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 64)",
        } as React.CSSProperties
      }
    >
      <PokeDenSidebar variant={variant} collapsible={collapsible} />
      <SidebarInset
        className={cn(
          "min-w-0 overflow-x-hidden peer-data-[variant=inset]:border",
          "[html[data-content-layout=centered]_&>*]:mx-auto",
          "[html[data-content-layout=centered]_&>*]:w-full",
          "[html[data-content-layout=centered]_&>*]:max-w-screen-2xl",
        )}
      >
        <PokeDenHeader />
        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
