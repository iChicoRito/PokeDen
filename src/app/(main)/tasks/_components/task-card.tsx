"use client";

import {
  ArrowUpRight,
  CalendarClock,
  Check,
  Clock3,
  Flame,
  ListChecks,
  type LucideIcon,
  Minus,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import type { Subject, Task } from "@/features/pokeden/domain";
import { cn } from "@/lib/utils";

import { formatDueDate } from "./board-types";

const priorityBadgeConfig: Record<
  Task["priority"],
  { icon: LucideIcon; variant: "destructive" | "secondary"; className: string }
> = {
  high: {
    icon: Flame,
    variant: "destructive",
    className: "border-transparent",
  },
  medium: {
    icon: ArrowUpRight,
    variant: "secondary",
    className: "bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  },
  low: {
    icon: Minus,
    variant: "secondary",
    className: "bg-slate-500/10 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
  },
};

export interface TaskCardProps {
  task: Task;
  subject: Subject | undefined;
  isOverlay?: boolean;
  onOpenEdit: (task: Task) => void;
  onComplete: (task: Task) => void;
  onReopen: (task: Task) => void;
  onDelete: (task: Task) => void;
  busy?: boolean;
}

export function TaskCard({
  task,
  subject,
  isOverlay = false,
  onOpenEdit,
  onComplete,
  onReopen,
  onDelete,
  busy = false,
}: TaskCardProps) {
  const isCompleted = task.status === "completed";
  const doneSubtasks = task.subtasks.filter((subtask) => subtask.completed).length;
  const dueDate = task.dueAt ? new Date(task.dueAt) : null;
  const isOverdue = !isCompleted && dueDate !== null && dueDate.getTime() < Date.now();
  const isDisabled = busy === true;
  const priorityConfig = priorityBadgeConfig[task.priority];
  const PriorityIcon = priorityConfig.icon;

  return (
    <article
      aria-busy={busy}
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-xs",
        isOverlay && "w-72 rotate-1 shadow-lg ring-2 ring-primary/40",
      )}
    >
      <div className="min-w-0 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            className={cn(
              "min-w-0 max-w-full break-words text-left font-medium text-sm underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isCompleted && "text-muted-foreground line-through",
            )}
            onClick={() => onOpenEdit(task)}
          >
            {task.title}
          </button>
          <Badge
            variant={priorityConfig.variant}
            className={cn("shrink-0 rounded-md border-transparent px-2 font-medium", priorityConfig.className)}
          >
            <PriorityIcon data-icon="inline-start" />
            {task.priority}
          </Badge>
        </div>
        {task.description ? (
          <p className="line-clamp-2 break-words text-muted-foreground text-sm leading-5">{task.description}</p>
        ) : null}
      </div>

      <div className="space-y-1.5 text-muted-foreground text-xs">
        {subject ? (
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: subject.color }} />
            {subject.name}
            {subject.archivedAt ? " (archived)" : ""}
          </span>
        ) : (
          <span className="block">No subject</span>
        )}
        {task.dueAt ? (
          <span
            className={cn(
              "flex items-center gap-1.5",
              isOverdue && "font-medium text-destructive",
              isCompleted && "font-medium text-emerald-600 dark:text-emerald-400",
            )}
          >
            <CalendarClock aria-hidden="true" className="size-3.5 shrink-0" />
            {isOverdue ? "Overdue · " : isCompleted ? "Completed · " : "Due · "}
            {formatDueDate(task.dueAt)}
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <Clock3 aria-hidden="true" className="size-3.5 shrink-0" /> No due date
          </span>
        )}
      </div>

      {task.subtasks.length > 0 ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <ListChecks aria-hidden="true" className="size-3.5" />
            <span className="tabular-nums">
              {doneSubtasks}/{task.subtasks.length} subtasks
            </span>
          </div>
          <Progress value={Math.round((doneSubtasks / task.subtasks.length) * 100)} className="h-1" />
        </div>
      ) : null}

      <Separator />

      <div className="flex items-center justify-between">
        {busy ? (
          <Spinner className="size-5 text-muted-foreground" aria-label="Working…" />
        ) : (
          <Checkbox
            className="size-5 rounded-full"
            checked={isCompleted}
            aria-label={isCompleted ? `Reopen ${task.title}` : `Complete ${task.title}`}
            onCheckedChange={() => (isCompleted ? onReopen(task) : onComplete(task))}
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${task.title}`} disabled={isDisabled}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={() => onOpenEdit(task)}>
              <Pencil /> Edit
            </DropdownMenuItem>
            {isCompleted ? (
              <DropdownMenuItem onSelect={() => onReopen(task)}>
                <RotateCcw /> Reopen
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => onComplete(task)}>
                <Check /> Complete
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(task)}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
