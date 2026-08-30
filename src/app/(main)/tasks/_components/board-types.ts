import type { Task } from "@/features/pokeden/domain";

export type BoardColumnId = Task["status"];
export type BoardColumn = { id: BoardColumnId; title: string };
export type BoardState = Record<BoardColumnId, Task[]>;

export const BOARD_COLUMNS = [
  { id: "todo", title: "To Do" },
  { id: "in-progress", title: "In Progress" },
  { id: "completed", title: "Completed" },
] as const satisfies readonly BoardColumn[];

export function isBoardColumnId(value: string): value is BoardColumnId {
  return BOARD_COLUMNS.some((column) => column.id === value);
}

export function groupTasksByStatus(tasks: Task[]): BoardState {
  return {
    todo: tasks.filter((task) => task.status === "todo"),
    "in-progress": tasks.filter((task) => task.status === "in-progress"),
    completed: tasks.filter((task) => task.status === "completed"),
  };
}

export function findTask(board: BoardState, taskId: string): Task | undefined {
  for (const column of BOARD_COLUMNS) {
    const task = board[column.id].find((item) => item.id === taskId);
    if (task) return task;
  }
  return undefined;
}

export function findTaskColumnId(board: BoardState, taskId: string): BoardColumnId | null {
  for (const column of BOARD_COLUMNS) {
    if (board[column.id].some((task) => task.id === taskId)) return column.id;
  }
  return null;
}

export function formatDueDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
