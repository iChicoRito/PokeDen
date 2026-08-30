import { ArrowDown, ArrowUp, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const GREEN_CLASSES =
  "rounded-sm border-green-600/50 bg-green-500/10 px-1 font-normal text-green-700 text-xs dark:border-green-800/50 dark:bg-green-500/15 dark:text-green-300";

const RED_CLASSES =
  "rounded-sm border-red-600/50 bg-red-500/10 px-1 font-normal text-red-700 text-xs dark:border-red-800/50 dark:bg-red-500/15 dark:text-red-300";

export type KpiCardModel = {
  title: string;
  value: string;
  footnote: string;
  badge?: { tone: "up" | "down"; label: string } | null;
};

export function KpiCards({ cards }: { cards: KpiCardModel[] }) {
  return (
    <section className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardTitle className="text-sm">{card.title}</CardTitle>
              <CardAction>
                <Info className="size-3 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-3xl text-foreground leading-none tracking-tight">{card.value}</span>
                {card.badge ? (
                  <Badge className={card.badge.tone === "up" ? GREEN_CLASSES : RED_CLASSES}>
                    {card.badge.tone === "up" ? <ArrowUp /> : <ArrowDown />}
                    {card.badge.label}
                  </Badge>
                ) : null}
              </div>
              <div className="text-right text-muted-foreground text-xs">{card.footnote}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
