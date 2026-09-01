"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { PawPrint, Settings2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { COMPANIONS, resolveCompanionId } from "@/features/pokeden/companions";
import { usePokeDenStore } from "@/features/pokeden/pokeden-provider";

export function CompanionDock() {
  const router = useRouter();
  const companion = usePokeDenStore((state) => state.data.companionPreferences);

  const companionId = resolveCompanionId(companion.selected);
  const entry = COMPANIONS.find((item) => item.id === companionId) ?? COMPANIONS[0];

  return (
    <Card className="w-full rounded-2xl">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4 sm:flex-nowrap">
        <div className="flex min-w-0 items-center gap-4">
          <div className="size-[84px] shrink-0 overflow-hidden rounded-2xl bg-muted/50">
            <Image
              src={entry.image}
              alt={`${entry.name} profile`}
              width={1000}
              height={1000}
              unoptimized
              className="pokeden-pixelated size-full rounded-2xl object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{entry.name}</span>
              <Badge variant="secondary" className="gap-1">
                <PawPrint aria-hidden="true" />
                {entry.personality.charAt(0).toUpperCase() + entry.personality.slice(1)}
              </Badge>
            </div>
            <div className="mt-1 font-medium">Studying quietly</div>
            <div className="text-muted-foreground text-xs">{entry.tagline}</div>
            <div className="text-muted-foreground text-xs">Companions never interrupt your focus.</div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/settings")}>
          <Settings2 aria-hidden="true" />
          Companion settings
        </Button>
      </CardContent>
    </Card>
  );
}
