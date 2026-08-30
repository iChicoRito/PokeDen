"use client";

import { type FormEvent, useEffect, useId, useState } from "react";

import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";

import { LoadingButton } from "@/components/loading-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Subject, Subtask, Task } from "@/features/pokeden/domain";

export type TaskDraft = Pick<Task, "title" | "subjectId" | "description" | "dueAt" | "priority" | "status"> & {
  subtasks: Subtask[];
};

type TaskDialogProps = {
  open: boolean;
  task: Task | null;
  subjects: Subject[];
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: TaskDraft) => Promise<void>;
};

const emptyDraft: TaskDraft = {
  title: "",
  subjectId: null,
  description: "",
  dueAt: null,
  priority: "medium",
  status: "todo",
  subtasks: [],
};

function toLocalDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function TaskDialog({ open, task, subjects, isSubmitting, onOpenChange, onSubmit }: TaskDialogProps) {
  const titleId = useId();
  const subjectId = useId();
  const descriptionId = useId();
  const dueAtId = useId();
  const priorityId = useId();
  const statusId = useId();
  const newSubtaskId = useId();
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [dueAt, setDueAt] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [titleError, setTitleError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraft(
      task
        ? {
            title: task.title,
            subjectId: task.subjectId,
            description: task.description,
            dueAt: task.dueAt,
            priority: task.priority,
            status: task.status,
            subtasks: task.subtasks.map((subtask) => ({ ...subtask })),
          }
        : emptyDraft,
    );
    setDueAt(toLocalDateTime(task?.dueAt ?? null));
    setNewSubtask("");
    setTitleError("");
  }, [open, task]);

  const addSubtask = () => {
    const title = newSubtask.trim();
    if (!title) return;
    setDraft((current) => ({
      ...current,
      subtasks: [...current.subtasks, { id: crypto.randomUUID(), title, completed: false, completedAt: null }],
    }));
    setNewSubtask("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) {
      setTitleError("A task title is required.");
      return;
    }
    const parsedDueAt = dueAt ? new Date(dueAt) : null;
    if (parsedDueAt && Number.isNaN(parsedDueAt.getTime())) return;
    await onSubmit({
      ...draft,
      title,
      description: draft.description.trim(),
      dueAt: parsedDueAt?.toISOString() ?? null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSubmitting && onOpenChange(nextOpen)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "Create a task"}</DialogTitle>
          <DialogDescription>
            {task
              ? "Update the details and checklist for this task."
              : "Add a task and break it into manageable steps."}
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor={titleId}>Title</Label>
            <Input
              id={titleId}
              autoFocus
              maxLength={200}
              placeholder="What needs to get done?"
              value={draft.title}
              aria-invalid={Boolean(titleError)}
              aria-describedby={titleError ? `${titleId}-error` : undefined}
              onChange={(event) => {
                setDraft((current) => ({ ...current, title: event.target.value }));
                if (event.target.value.trim()) setTitleError("");
              }}
            />
            {titleError ? (
              <p id={`${titleId}-error`} className="text-sm text-destructive" role="alert">
                {titleError}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={subjectId}>Subject</Label>
              <Select
                value={draft.subjectId ?? "none"}
                onValueChange={(value) =>
                  setDraft((current) => ({ ...current, subjectId: value === "none" ? null : value }))
                }
              >
                <SelectTrigger id={subjectId} className="w-full">
                  <SelectValue placeholder="No subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No subject</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={dueAtId}>Due date and time</Label>
              <Input
                id={dueAtId}
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={priorityId}>Priority</Label>
              <Select
                value={draft.priority}
                onValueChange={(value: Task["priority"]) => setDraft((current) => ({ ...current, priority: value }))}
              >
                <SelectTrigger id={priorityId} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={statusId}>Status</Label>
              <Select
                value={draft.status}
                onValueChange={(value: Task["status"]) => setDraft((current) => ({ ...current, status: value }))}
              >
                <SelectTrigger id={statusId} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To do</SelectItem>
                  <SelectItem value="in-progress">In progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor={descriptionId}>Description</Label>
            <Textarea
              id={descriptionId}
              maxLength={2000}
              rows={4}
              placeholder="Notes, requirements, or helpful context"
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            />
          </div>

          <fieldset className="grid gap-3">
            <legend className="mb-1 text-sm font-medium">Subtasks</legend>
            {draft.subtasks.length ? (
              <div className="grid gap-2 rounded-lg border p-3">
                {draft.subtasks.map((subtask) => (
                  <div key={subtask.id} className="flex min-w-0 items-center gap-3">
                    <Checkbox
                      id={`subtask-${subtask.id}`}
                      checked={subtask.completed}
                      aria-label={`Mark ${subtask.title} ${subtask.completed ? "incomplete" : "complete"}`}
                      onCheckedChange={(checked) =>
                        setDraft((current) => ({
                          ...current,
                          subtasks: current.subtasks.map((item) =>
                            item.id === subtask.id
                              ? {
                                  ...item,
                                  completed: checked === true,
                                  completedAt: checked === true ? new Date().toISOString() : null,
                                }
                              : item,
                          ),
                        }))
                      }
                    />
                    <label
                      htmlFor={`subtask-${subtask.id}`}
                      className={`min-w-0 flex-1 break-words text-sm ${subtask.completed ? "text-muted-foreground line-through" : ""}`}
                    >
                      {subtask.title}
                    </label>
                    {subtask.completed ? (
                      <CheckCircle2 className="size-4 text-emerald-600" />
                    ) : (
                      <Circle className="size-4 text-muted-foreground" />
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${subtask.title}`}
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          subtasks: current.subtasks.filter((item) => item.id !== subtask.id),
                        }))
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="flex gap-2">
              <Input
                id={newSubtaskId}
                maxLength={160}
                placeholder="Add a checklist item"
                value={newSubtask}
                onChange={(event) => setNewSubtask(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addSubtask();
                  }
                }}
              />
              <Button type="button" variant="outline" disabled={!newSubtask.trim()} onClick={addSubtask}>
                <Plus /> Add
              </Button>
            </div>
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <LoadingButton type="submit" loading={isSubmitting} loadingLabel="Saving…">
              {task ? "Save changes" : "Create task"}
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
