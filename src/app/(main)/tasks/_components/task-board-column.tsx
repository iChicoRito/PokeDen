"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Subject, Task } from "@/features/pokeden/domain";
import { cn } from "@/lib/utils";

import type { BoardColumn } from "./board-types";
import { SortableTaskCard } from "./sortable-task-card";

export interface TaskBoardColumnProps {
  column: BoardColumn;
  tasks: Task[];
  subjects: Subject[];
  isOver?: boolean;
  onAddCard: () => void;
  onOpenEdit: (task: Task) => void;
  onComplete: (task: Task) => void;
  onReopen: (task: Task) => void;
  onDelete: (task: Task) => void;
  busyTaskId?: string | null;
  className?: string;
}

export function TaskBoardColumn({
  column,
  tasks,
  subjects,
  isOver,
  onAddCard,
  onOpenEdit,
  onComplete,
  onReopen,
  onDelete,
  busyTaskId,
  className,
}: TaskBoardColumnProps) {
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: column.id,
    data: { type: "column" },
  });
  const isHighlighted = isOver ?? isDroppableOver;

  return (
    <section
      className={cn(
        "flex min-h-0 w-full flex-col rounded-xl border bg-muted/40 transition-colors",
        isHighlighted && "border-primary/40 bg-primary/5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate font-medium text-sm">{column.title}</h2>
          <Badge variant="secondary" className="tabular-nums">
            {tasks.length}
          </Badge>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={`Add task to ${column.title}`} onClick={onAddCard}>
          <Plus />
        </Button>
      </div>

      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="scrollbar-thin flex min-h-28 flex-1 flex-col gap-3 overflow-y-auto rounded-b-xl px-3 pb-3 [scrollbar-color:var(--border)_transparent] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1"
        >
          {tasks.map((task) => {
            const subject = subjects.find((item) => item.id === task.subjectId);
            return (
              <SortableTaskCard
                key={task.id}
                task={task}
                subject={subject}
                onOpenEdit={onOpenEdit}
                onComplete={onComplete}
                onReopen={onReopen}
                onDelete={onDelete}
                busyTaskId={busyTaskId}
              />
            );
          })}
        </div>
      </SortableContext>
    </section>
  );
}
