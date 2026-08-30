"use client";

import Link from "next/link";

import { BookOpen, FilePlus2, ListPlus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const QUICK_CREATE_ITEMS = [
  { label: "New task", href: "/tasks?create=task", icon: ListPlus },
  { label: "New note", href: "/notes?create=note", icon: FilePlus2 },
  { label: "New subject", href: "/subjects?create=subject", icon: BookOpen },
] as const;

export function QuickCreateMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus aria-hidden="true" />
          <span className="hidden sm:inline">Create</span>
          <span className="sr-only sm:hidden">Quick create</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Quick create</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {QUICK_CREATE_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={item.href} asChild>
              <Link href={item.href}>
                <Icon aria-hidden="true" />
                {item.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
