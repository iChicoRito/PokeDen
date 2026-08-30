"use client";

import { useState } from "react";

import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  type Over,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import type { Subject, Task } from "@/features/pokeden/domain";

import type { BoardColumnId, BoardState } from "./board-types";
import { BOARD_COLUMNS, findTask, findTaskColumnId, isBoardColumnId } from "./board-types";
import { TaskBoardColumn } from "./task-board-column";
import { TaskCard } from "./task-card";

export interface TaskBoardProps {
  board: BoardState;
  subjects: Subject[];
  onRequestComplete: (task: Task) => void;
  onComplete: (task: Task) => void;
  onReopen: (task: Task) => void;
  onMove: (task: Task, status: BoardColumnId) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onAddCard: () => void;
  busyTaskId?: string | null;
}

function resolveOverColumn(board: BoardState, over: Over): BoardColumnId | null {
  if (over.data.current?.type === "column") {
    const columnId = String(over.id);
    return isBoardColumnId(columnId) ? columnId : null;
  }
  return findTaskColumnId(board, String(over.id));
}

export function TaskBoard({
  board,
  subjects,
  onRequestComplete,
  onComplete,
  onReopen,
  onMove,
  onEdit,
  onDelete,
  onAddCard,
  busyTaskId,
}: TaskBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type !== "task") return;
    setActiveTask(findTask(board, String(event.active.id)) ?? null);
  }

  function handleDragCancel() {
    setActiveTask(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const task = findTask(board, activeId);
    if (!task) return;

    const activeColumnId = findTaskColumnId(board, activeId);
    const overColumnId = resolveOverColumn(board, over);
    if (!activeColumnId || !overColumnId || activeColumnId === overColumnId) return;

    if (overColumnId === "completed") {
      if (task.subtasks.some((subtask) => !subtask.completed)) {
        onRequestComplete(task);
        return;
      }
      onComplete(task);
      return;
    }
    if (activeColumnId === "completed") {
      onReopen(task);
      return;
    }
    onMove(task, overColumnId);
  }

  return (
    <DndContext
      id="tasks-board"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="scrollbar-thin min-w-0 overflow-x-auto [scrollbar-color:var(--border)_transparent] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:h-1">
        <div className="inline-grid min-w-full grid-cols-[repeat(3,minmax(17rem,1fr))] gap-4">
          {BOARD_COLUMNS.map((column) => (
            <TaskBoardColumn
              key={column.id}
              column={column}
              tasks={board[column.id]}
              subjects={subjects}
              onAddCard={onAddCard}
              onOpenEdit={onEdit}
              // Card-level complete keeps the subtask-confirm flow (existing behavior);
              // only drag commits take the unguarded onComplete path.
              onComplete={onRequestComplete}
              onReopen={onReopen}
              onDelete={onDelete}
              busyTaskId={busyTaskId}
            />
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <TaskCard
            task={activeTask}
            subject={subjects.find((subject) => subject.id === activeTask.subjectId)}
            isOverlay
            onOpenEdit={onEdit}
            onComplete={onRequestComplete}
            onReopen={onReopen}
            onDelete={onDelete}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
