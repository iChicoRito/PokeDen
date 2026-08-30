import { CalendarClock, Check, CheckCircle2, MoreVertical, Pencil, Play, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type PlanCardModel = {
  title: string; // session.topic || session.title
  description: string; // session.notes (may be empty → render nothing)
  statusLabel: string; // "Planned" | "In progress" | "Completed" | "Skipped"
  statusTone: "planned" | "in-progress" | "completed" | "skipped";
  progressPct: number; // 0..100
  dueLabel: string; // e.g. `Due Mar 4`
  accentColor: string; // subject?.color ?? "var(--primary)"
  completed: boolean;
};

export type PlanCardActions = {
  onEdit: () => void;
  onComplete: () => void;
  onDelete: () => void;
  onStartFocus: () => void;
  onSelect: () => void; // selection-ring click target
};

export function PlanCard({
  plan,
  actions,
  busy = false,
  selected = false,
}: {
  plan: PlanCardModel;
  actions: PlanCardActions;
  busy?: boolean;
  selected?: boolean;
}) {
  return (
    <Card className={cn("h-full shadow-xs", selected && "ring-2 ring-primary/50", plan.completed && "bg-muted/20")}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarClock aria-hidden="true" className="size-4 text-muted-foreground" />
          <span className={cn("line-clamp-2", plan.completed && "text-muted-foreground line-through")}>
            {plan.title}
          </span>
        </CardTitle>
        <CardAction className="flex items-center gap-1">
          <Badge variant="outline">{plan.statusLabel}</Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Card actions"
                onClick={(event) => event.stopPropagation()}
              >
                <MoreVertical aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => actions.onEdit()}>
                <Pencil aria-hidden="true" />
                Edit
              </DropdownMenuItem>
              {!plan.completed && (
                <DropdownMenuItem onSelect={() => actions.onComplete()}>
                  <Check aria-hidden="true" />
                  Mark complete
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => actions.onDelete()}>
                <Trash2 aria-hidden="true" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1">
        <button
          type="button"
          className="flex h-full w-full min-w-0 cursor-pointer flex-col justify-end gap-1 text-left"
          onClick={actions.onSelect}
        >
          {plan.description.trim().length > 0 && (
            <div className="min-w-0 max-w-[20ch] truncate text-sm leading-snug">{plan.description}</div>
          )}
          <div className="flex items-center gap-3">
            <Progress value={plan.progressPct} className="h-2" />
            <span className="shrink-0 text-sm">{plan.progressPct}%</span>
          </div>
        </button>
      </CardContent>
      <CardFooter className="mt-auto justify-between py-2.5">
        <span className="text-muted-foreground">{plan.dueLabel}</span>
        {plan.completed ? (
          <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
            <CheckCircle2 aria-hidden="true" className="size-4" />
            Completed
          </span>
        ) : (
          <Button size="sm" variant="outline" onClick={actions.onStartFocus} disabled={busy}>
            {busy ? (
              <>
                <Spinner className="size-4" aria-hidden="true" />
                Starting…
              </>
            ) : (
              <>
                <Play aria-hidden="true" />
                Start focus
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
