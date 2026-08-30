"use client";

import { usePathname } from "next/navigation";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { POKEDEN_NAVIGATION_ITEMS } from "@/navigation/pokeden/navigation-items";

import { QuickCreateMenu } from "./quick-create-menu";
import { ThemeToggle } from "./theme-toggle";

export function PokeDenHeader() {
  const pathname = usePathname();
  const currentItem = POKEDEN_NAVIGATION_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return (
    <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center border-b bg-background/85 backdrop-blur-md">
      <div className="flex w-full min-w-0 items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger className="-ml-1" aria-label="Toggle navigation" />
          <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
          <h1 className="truncate font-medium text-sm">{currentItem?.title ?? "PokeDen"}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <QuickCreateMenu />
        </div>
      </div>
    </header>
  );
}
