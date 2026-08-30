"use client";

import { useSortable } from "@dnd-kit/sortable";

import type { Subject, Task } from "@/features/pokeden/domain";
import { cn } from "@/lib/utils";

import { TaskCard } from "./task-card";

interface SortableTaskCardProps {
  task: Task;
  subject: Subject | undefined;
  onOpenEdit: (task: Task) => void;
  onComplete: (task: Task) => void;
  onReopen: (task: Task) => void;
  onDelete: (task: Task) => void;
  busyTaskId?: string | null;
}

export function SortableTaskCard({
  task,
  subject,
  onOpenEdit,
  onComplete,
  onReopen,
  onDelete,
  busyTaskId,
}: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task" },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
      }}
      className={cn("touch-none", isDragging && "opacity-30")}
      {...attributes}
      {...listeners}
    >
      <TaskCard
        task={task}
        subject={subject}
        onOpenEdit={onOpenEdit}
        onComplete={onComplete}
        onReopen={onReopen}
        onDelete={onDelete}
        busy={busyTaskId === task.id}
      />
    </div>
  );
}
