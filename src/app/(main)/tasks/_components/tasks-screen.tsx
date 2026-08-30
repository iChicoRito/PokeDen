"use client";

import { useEffect, useMemo, useState } from "react";

import { useSearchParams } from "next/navigation";

import { AlertCircle, CheckCircle2, ChevronDown, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/app/(main)/_components/page-header";
import { TasksSkeleton } from "@/app/(main)/_components/page-skeletons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Subject, Task } from "@/features/pokeden/domain";
import { usePokeDenStore } from "@/features/pokeden/pokeden-provider";
import { usePendingAction } from "@/hooks/use-pending-action";

import { type BoardColumnId, groupTasksByStatus } from "./board-types";
import { TaskBoard } from "./task-board";
import { TaskDialog, type TaskDraft } from "./task-dialog";

type TaskTab = "all" | "today" | "upcoming" | "completed";
type DueFilter = "any" | "overdue" | "today" | "week" | "none";
type Confirmation = { task: Task; kind: "delete" | "complete" } | null;

const PAGE_SIZE = 50;

function isToday(date: Date, now: Date): boolean {
  return (
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
  );
}

function endOfToday(now: Date): Date {
  const result = new Date(now);
  result.setHours(23, 59, 59, 999);
  return result;
}

function endOfWeek(now: Date): Date {
  const result = endOfToday(now);
  result.setDate(result.getDate() + 7);
  return result;
}

function matchesDueFilter(task: Task, filter: DueFilter, now: Date): boolean {
  if (filter === "any") return true;
  if (filter === "none") return task.dueAt === null;
  if (!task.dueAt) return false;
  const dueAt = new Date(task.dueAt);
  if (filter === "overdue") return task.status !== "completed" && dueAt < now;
  if (filter === "today") return isToday(dueAt, now);
  return dueAt >= now && dueAt <= endOfWeek(now);
}

function getSubject(subjects: Subject[], subjectId: string | null): Subject | undefined {
  return subjects.find((subject) => subject.id === subjectId);
}

export function TasksScreen({ loading = false }: { loading?: boolean }) {
  const searchParams = useSearchParams();
  const data = usePokeDenStore((state) => state.data);
  const isHydrated = usePokeDenStore((state) => state.isHydrated);
  const storageError = usePokeDenStore((state) => state.storageError);
  const actions = usePokeDenStore((state) => state.actions);
  const { isPending, run } = usePendingAction();
  const [tab, setTab] = useState<TaskTab>("all");
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("any");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [handledSourceId, setHandledSourceId] = useState<string | null>(null);

  const sourceTaskId = searchParams.get("task");
  useEffect(() => {
    if (!isHydrated || !sourceTaskId || sourceTaskId === handledSourceId) return;
    const sourceTask = data.tasks.find((task) => task.id === sourceTaskId);
    setHandledSourceId(sourceTaskId);
    if (sourceTask) {
      setEditingTask(sourceTask);
      setDialogOpen(true);
    } else {
      toast.error("Task not found", { description: "The linked task may have been removed." });
    }
  }, [data.tasks, handledSourceId, isHydrated, sourceTaskId]);

  const subjectOptions = useMemo(
    () => [...data.subjects].sort((a, b) => a.name.localeCompare(b.name)),
    [data.subjects],
  );
  const activeSubjects = useMemo(
    () => subjectOptions.filter((subject) => subject.archivedAt === null),
    [subjectOptions],
  );
  const dialogSubjects = useMemo(() => {
    if (!editingTask?.subjectId) return activeSubjects;
    const historical = subjectOptions.find((subject) => subject.id === editingTask.subjectId);
    return historical && historical.archivedAt !== null ? [...activeSubjects, historical] : activeSubjects;
  }, [activeSubjects, editingTask, subjectOptions]);

  const filteredTasks = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    const currentNow = new Date();
    return [...data.tasks]
      .filter((task) => {
        const dueAt = task.dueAt ? new Date(task.dueAt) : null;
        if (tab === "today" && (!dueAt || !isToday(dueAt, currentNow) || task.status === "completed")) return false;
        if (tab === "upcoming" && (!dueAt || dueAt <= endOfToday(currentNow) || task.status === "completed"))
          return false;
        if (tab === "completed" && task.status !== "completed") return false;
        if (subjectFilter !== "all" && task.subjectId !== subjectFilter) return false;
        if (statusFilter !== "all" && task.status !== statusFilter) return false;
        if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
        if (!matchesDueFilter(task, dueFilter, currentNow)) return false;
        if (!normalizedSearch) return true;
        const subject = getSubject(data.subjects, task.subjectId);
        return `${task.title} ${task.description} ${subject?.name ?? ""}`
          .toLocaleLowerCase()
          .includes(normalizedSearch);
      })
      .sort((a, b) => {
        if (a.status === "completed" && b.status !== "completed") return 1;
        if (a.status !== "completed" && b.status === "completed") return -1;
        if (a.dueAt === null && b.dueAt !== null) return 1;
        if (a.dueAt !== null && b.dueAt === null) return -1;
        return (a.dueAt ?? a.createdAt).localeCompare(b.dueAt ?? b.createdAt);
      });
  }, [data.subjects, data.tasks, dueFilter, priorityFilter, search, statusFilter, subjectFilter, tab]);

  const filtersActive =
    subjectFilter !== "all" || statusFilter !== "all" || priorityFilter !== "all" || dueFilter !== "any";
  const clearFilters = () => {
    setSubjectFilter("all");
    setStatusFilter("all");
    setPriorityFilter("all");
    setDueFilter("any");
  };
  const openCreate = () => {
    setEditingTask(null);
    setDialogOpen(true);
  };
  const openEdit = (task: Task) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const runMutation = async (taskId: string, operation: () => void | Promise<void>, success: string) => {
    if (mutatingId) return;
    setMutatingId(taskId);
    try {
      await operation();
      toast.success(success);
    } catch (error) {
      toast.error("Could not update task", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setMutatingId(null);
    }
  };

  const requestComplete = (task: Task) => {
    if (task.subtasks.some((subtask) => !subtask.completed)) {
      setConfirmation({ task, kind: "complete" });
      return;
    }
    void runMutation(task.id, () => actions.completeTask(task.id), "Task completed");
  };

  // Drag commits bypass the mutatingId guard on purpose: a drag must never deadlock on a
  // pending mutation, so failures just toast and the store state stands.
  const commitTaskAction = (operation: () => void, success: string) => {
    try {
      operation();
      toast.success(success);
    } catch (error) {
      toast.error("Could not update task", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };
  const completeTaskFromBoard = (task: Task) => {
    commitTaskAction(() => actions.completeTask(task.id), "Task completed");
  };
  const reopenTaskFromBoard = (task: Task) => {
    commitTaskAction(() => actions.reopenTask(task.id), "Task reopened");
  };
  const moveTaskFromBoard = (task: Task, status: BoardColumnId) => {
    commitTaskAction(() => actions.updateTask(task.id, { status }), "Task updated");
  };

  const handleDialogSubmit = async (draft: TaskDraft) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editingTask) {
        await actions.updateTask(editingTask.id, draft);
        toast.success("Task updated");
      } else {
        await actions.createTask({
          ...draft,
          completedAt: draft.status === "completed" ? new Date().toISOString() : null,
        });
        toast.success("Task created");
      }
      setDialogOpen(false);
      setEditingTask(null);
    } catch (error) {
      toast.error(editingTask ? "Could not update task" : "Could not create task", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const displayTasks = filteredTasks.slice(0, visibleCount);
  const board = useMemo(() => groupTasksByStatus(displayTasks), [displayTasks]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Tasks"
        description="Keep assignments, deadlines, and next steps in one place."
        action={
          <Button size="lg" onClick={openCreate}>
            <Plus /> Add Task
          </Button>
        }
      />

      {storageError ? (
        <div
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive text-sm"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div>
            <strong>Changes may not be saved.</strong>
            <p className="text-destructive/80">{storageError}</p>
          </div>
        </div>
      ) : null}

      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value as TaskTab);
          setVisibleCount(PAGE_SIZE);
        }}
      >
        <div className="overflow-x-auto pb-1">
          <TabsList className="min-w-max" variant="line" aria-label="Task views">
            <TabsTrigger value="all">All Tasks</TabsTrigger>
            <TabsTrigger value="today">Due Today</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      <section className="grid gap-3" aria-label="Search and filter tasks">
        <div className="relative">
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="h-10 pr-10 pl-9"
            type="search"
            aria-label="Search tasks"
            placeholder="Search tasks, descriptions, or subjects…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
          />
          {search ? (
            <Button
              className="absolute top-1/2 right-1 -translate-y-1/2"
              size="icon-sm"
              variant="ghost"
              aria-label="Clear search"
              onClick={() => setSearch("")}
            >
              <X />
            </Button>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-full md:w-44" aria-label="Filter by subject">
              <SelectValue placeholder="All subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjectOptions.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                  {subject.archivedAt ? " (archived)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="todo">To do</SelectItem>
              <SelectItem value="in-progress">In progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full md:w-40" aria-label="Filter by priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="high">High priority</SelectItem>
              <SelectItem value="medium">Medium priority</SelectItem>
              <SelectItem value="low">Low priority</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dueFilter} onValueChange={(value: DueFilter) => setDueFilter(value)}>
            <SelectTrigger className="w-full md:w-40" aria-label="Filter by due date">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any due date</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="today">Due today</SelectItem>
              <SelectItem value="week">Next 7 days</SelectItem>
              <SelectItem value="none">No due date</SelectItem>
            </SelectContent>
          </Select>
          {filtersActive ? (
            <Button className="col-span-2 md:col-span-1" variant="ghost" onClick={clearFilters}>
              <X /> Clear filters
            </Button>
          ) : null}
        </div>
      </section>

      {loading || !isHydrated ? (
        <TasksSkeleton />
      ) : filteredTasks.length === 0 ? (
        <Empty className="min-h-72 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CheckCircle2 />
            </EmptyMedia>
            <EmptyTitle>Nothing due right now.</EmptyTitle>
            <EmptyDescription>
              {search || filtersActive
                ? "Try clearing your search or filters, or add something new."
                : "You’re all caught up. Add a task when something comes to mind."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={openCreate}>
              <Plus /> Add Task
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <p className="text-muted-foreground text-sm" aria-live="polite">
            Showing {Math.min(visibleCount, filteredTasks.length)} of {filteredTasks.length}{" "}
            {filteredTasks.length === 1 ? "task" : "tasks"}
          </p>
          <TaskBoard
            board={board}
            subjects={data.subjects}
            busyTaskId={mutatingId}
            onRequestComplete={requestComplete}
            onComplete={completeTaskFromBoard}
            onReopen={reopenTaskFromBoard}
            onMove={moveTaskFromBoard}
            onEdit={openEdit}
            onDelete={(task) => setConfirmation({ task, kind: "delete" })}
            onAddCard={openCreate}
          />
          {visibleCount < filteredTasks.length ? (
            <Button
              className="self-center"
              variant="outline"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            >
              <ChevronDown /> Show more
            </Button>
          ) : null}
        </>
      )}

      <TaskDialog
        open={dialogOpen}
        task={editingTask}
        subjects={dialogSubjects}
        isSubmitting={submitting}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingTask(null);
        }}
        onSubmit={handleDialogSubmit}
      />

      <AlertDialog open={confirmation !== null} onOpenChange={(open) => !open && setConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className={confirmation?.kind === "delete" ? "text-destructive" : "text-amber-600"}>
              {confirmation?.kind === "delete" ? <Trash2 /> : <AlertCircle />}
            </AlertDialogMedia>
            <AlertDialogTitle>
              {confirmation?.kind === "delete" ? "Delete this task?" : "Complete with unfinished subtasks?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmation?.kind === "delete"
                ? `“${confirmation.task.title}” will be permanently removed. This cannot be undone.`
                : `${confirmation?.task.subtasks.filter((subtask) => !subtask.completed).length ?? 0} subtasks are still unfinished. You can still complete the task now.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={confirmation?.kind === "delete" ? "destructive" : "default"}
              onClick={(event) => {
                event.preventDefault();
                if (!confirmation) return;
                const { task, kind } = confirmation;
                void run(() => (kind === "delete" ? actions.deleteTask(task.id) : actions.completeTask(task.id)))
                  .then(() => {
                    toast.success(kind === "delete" ? "Task deleted" : "Task completed");
                    setConfirmation(null);
                  })
                  .catch(() => toast.error("Could not update task", { description: "Please try again." }));
              }}
            >
              {isPending ? (
                <>
                  <Spinner className="size-4" /> Working…
                </>
              ) : confirmation?.kind === "delete" ? (
                "Delete task"
              ) : (
                "Complete anyway"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
