"use client";

import { type FormEvent, useMemo, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { endOfDay, endOfWeek, format, isAfter, isBefore, parseISO, startOfDay, startOfWeek } from "date-fns";
import { CalendarDays, Plus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/app/(main)/_components/page-header";
import { PlannerSkeleton } from "@/app/(main)/_components/page-skeletons";
import { LoadingButton } from "@/components/loading-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getStudySessionProgress } from "@/features/pokeden/derivations";
import type { StudySession } from "@/features/pokeden/domain";
import { usePokeDenStore } from "@/features/pokeden/pokeden-provider";
import { exitPomodoroFullscreen, requestPomodoroFullscreen } from "@/features/pokeden/pomodoro-focus-mode";
import { usePendingAction } from "@/hooks/use-pending-action";

import { PlanCard, type PlanCardModel } from "./plan-card";

type PlannerView = "today" | "week";
type PlannerSession = StudySession & {
  notes?: string;
  priority?: "low" | "medium" | "high";
  topic?: string;
};

type SessionDraft = {
  date: string;
  notes: string;
  plannedMinutes: string;
  priority: "low" | "medium" | "high";
  subjectId: string;
  taskId: string;
  time: string;
  topic: string;
};

const EMPTY_DRAFT: SessionDraft = {
  date: format(new Date(), "yyyy-MM-dd"),
  notes: "",
  plannedMinutes: "30",
  priority: "medium",
  subjectId: "",
  taskId: "",
  time: "16:00",
  topic: "",
};

function sessionToDraft(session: PlannerSession): SessionDraft {
  const plannedStart = parseISO(session.plannedStart);
  return {
    date: format(plannedStart, "yyyy-MM-dd"),
    notes: session.notes ?? "",
    plannedMinutes: String(session.plannedMinutes),
    priority: session.priority ?? "medium",
    subjectId: session.subjectId ?? "",
    taskId: session.taskId ?? "",
    time: format(plannedStart, "HH:mm"),
    topic: session.topic ?? session.title,
  };
}

const STATUS_LABELS: Record<PlanCardModel["statusTone"], string> = {
  planned: "Planned",
  "in-progress": "In progress",
  completed: "Completed",
  skipped: "Skipped",
};

export function StudyPlannerScreen({ loading = false }: { loading?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const data = usePokeDenStore((state) => state.data);
  const isHydrated = usePokeDenStore((state) => state.isHydrated);
  const storageError = usePokeDenStore((state) => state.storageError);
  const actions = usePokeDenStore((state) => state.actions);
  const { isPending, run } = usePendingAction();
  const [view, setView] = useState<PlannerView>("today");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SessionDraft>(EMPTY_DRAFT);

  const selectedId = searchParams.get("session");
  const now = new Date();
  const rangeStart =
    view === "today" ? startOfDay(now) : startOfWeek(now, { weekStartsOn: data.studyPreferences.weekStartsOn });
  const rangeEnd =
    view === "today" ? endOfDay(now) : endOfWeek(now, { weekStartsOn: data.studyPreferences.weekStartsOn });
  const sessions = useMemo(
    () =>
      (data.studySessions as PlannerSession[])
        .filter((session) => {
          const date = parseISO(session.plannedStart);
          return !isBefore(date, rangeStart) && !isAfter(date, rangeEnd);
        })
        .sort((a, b) => a.plannedStart.localeCompare(b.plannedStart)),
    [data.studySessions, rangeEnd, rangeStart],
  );
  const planCards = useMemo(
    () =>
      sessions.map((session) => {
        const subject = data.subjects.find((item) => item.id === session.subjectId);
        return {
          sessionId: session.id,
          session,
          plan: {
            title: session.topic || session.title,
            description: session.notes ?? "",
            statusLabel: STATUS_LABELS[session.status],
            statusTone: session.status,
            progressPct: getStudySessionProgress(data, session.id),
            dueLabel: `Due ${format(parseISO(session.plannedStart), "MMM d")}`,
            accentColor: subject?.color ?? "var(--primary)",
            completed: session.status === "completed",
          } satisfies PlanCardModel,
        };
      }),
    [data, sessions],
  );
  const subjects = data.subjects.filter((subject) => subject.archivedAt === null);
  const availableTasks = data.tasks.filter(
    (task) => task.status !== "completed" && (!draft.subjectId || task.subjectId === draft.subjectId),
  );

  function setSelection(id: string | null) {
    const next = new URLSearchParams(searchParams.toString());
    if (id) next.set("session", id);
    else next.delete("session");
    router.replace(`?${next.toString()}`, { scroll: false });
  }

  function openCreate(date = new Date()) {
    setEditingId(null);
    setDraft({ ...EMPTY_DRAFT, date: format(date, "yyyy-MM-dd") });
    setEditorOpen(true);
  }

  function openEdit(session: PlannerSession) {
    setEditingId(session.id);
    setDraft(sessionToDraft(session));
    setSelection(session.id);
    setEditorOpen(true);
  }

  function updateDraft<K extends keyof SessionDraft>(key: K, value: SessionDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function saveSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const plannedMinutes = Number(draft.plannedMinutes);
    if (!draft.topic.trim() || !draft.date || !draft.time || !Number.isInteger(plannedMinutes) || plannedMinutes < 1) {
      toast.error("Check the session details and try again.");
      return;
    }
    const plannedStart = new Date(`${draft.date}T${draft.time}:00`).toISOString();
    const payload = {
      examId: null,
      examTopicId: null,
      notes: draft.notes.trim(),
      plannedMinutes,
      plannedStart,
      priority: draft.priority,
      subjectId: draft.subjectId || null,
      taskId: draft.taskId || null,
      title: draft.topic.trim(),
      topic: draft.topic.trim(),
    };
    void run(() => {
      if (editingId) {
        actions.updateStudySession(editingId, payload);
        toast.success("Study session updated.");
      } else {
        actions.createStudySession(payload);
        toast.success("Study session planned.");
      }
    })
      .then(() => setEditorOpen(false))
      .catch(() => toast.error("Could not save the study session."));
  }

  function startFocus(id: string) {
    setStartingId(id);
    const fullscreenRequest = requestPomodoroFullscreen(document);
    void run(() => actions.startStudySession(id), { minMs: 250 })
      .then(() => {
        toast.success("Focus session ready.");
        router.push("/pomodoro");
      })
      .catch(async () => {
        if (await fullscreenRequest) await exitPomodoroFullscreen(document);
        toast.error("Could not start this focus session.");
      })
      .finally(() => setStartingId(null));
  }

  if (loading || !isHydrated) {
    return <PlannerSkeleton />;
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Plan calm, focused study time"
        description="Turn upcoming work into manageable focus sessions for today and the week ahead."
        action={
          <Button onClick={() => openCreate()}>
            <Plus aria-hidden="true" /> Plan a session
          </Button>
        }
      />

      {storageError ? (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          Changes may not be saved. Your planner remains open so you can try again.
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={view} onValueChange={(value) => setView(value as PlannerView)}>
          <TabsList aria-label="Planner range">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="text-sm text-muted-foreground">
          {view === "today"
            ? format(now, "EEEE, MMMM d")
            : `${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d")}`}
        </p>
      </div>

      {sessions.length === 0 ? (
        <Empty className="min-h-80 border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarDays aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No study sessions planned</EmptyTitle>
            <EmptyDescription>
              {view === "today"
                ? "Your day is open. Plan a focused session when you are ready."
                : "Plan a session to shape your week into small, achievable steps."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => openCreate()}>
              <Plus aria-hidden="true" /> Plan a session
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {planCards.map(({ sessionId, session, plan }) => (
            <PlanCard
              key={sessionId}
              plan={plan}
              selected={selectedId === sessionId}
              busy={startingId !== null || isPending}
              actions={{
                onEdit: () => openEdit(session),
                onComplete: () => setCompletingId(sessionId),
                onDelete: () => setDeleteId(sessionId),
                onStartFocus: () => startFocus(sessionId),
                onSelect: () => setSelection(sessionId),
              }}
            />
          ))}
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit study session" : "Plan a study session"}</DialogTitle>
            <DialogDescription>
              Choose one clear topic and give it a realistic place in your schedule.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={saveSession}>
            <div className="grid gap-2">
              <Label htmlFor="session-topic">Topic</Label>
              <Input
                id="session-topic"
                value={draft.topic}
                onChange={(event) => updateDraft("topic", event.target.value)}
                placeholder="e.g. Review cell division"
                required
                autoFocus
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="session-subject">Subject</Label>
                <NativeSelect
                  id="session-subject"
                  className="w-full"
                  value={draft.subjectId}
                  onChange={(event) => {
                    updateDraft("subjectId", event.target.value);
                    updateDraft("taskId", "");
                  }}
                >
                  <NativeSelectOption value="">No subject</NativeSelectOption>
                  {subjects.map((subject) => (
                    <NativeSelectOption key={subject.id} value={subject.id}>
                      {subject.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="session-task">Related task</Label>
                <NativeSelect
                  id="session-task"
                  className="w-full"
                  value={draft.taskId}
                  onChange={(event) => updateDraft("taskId", event.target.value)}
                >
                  <NativeSelectOption value="">No related task</NativeSelectOption>
                  {availableTasks.slice(0, 250).map((task) => (
                    <NativeSelectOption key={task.id} value={task.id}>
                      {task.title}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="session-date">Date</Label>
                <Input
                  id="session-date"
                  type="date"
                  value={draft.date}
                  onChange={(event) => updateDraft("date", event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="session-time">Time</Label>
                <Input
                  id="session-time"
                  type="time"
                  value={draft.time}
                  onChange={(event) => updateDraft("time", event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="session-duration">Duration (minutes)</Label>
                <Input
                  id="session-duration"
                  type="number"
                  min={1}
                  max={720}
                  value={draft.plannedMinutes}
                  onChange={(event) => updateDraft("plannedMinutes", event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="session-priority">Priority</Label>
                <NativeSelect
                  id="session-priority"
                  className="w-full"
                  value={draft.priority}
                  onChange={(event) => updateDraft("priority", event.target.value as SessionDraft["priority"])}
                >
                  <NativeSelectOption value="low">Low</NativeSelectOption>
                  <NativeSelectOption value="medium">Medium</NativeSelectOption>
                  <NativeSelectOption value="high">High</NativeSelectOption>
                </NativeSelect>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="session-notes">Notes</Label>
              <Textarea
                id="session-notes"
                value={draft.notes}
                onChange={(event) => updateDraft("notes", event.target.value)}
                placeholder="Optional preparation notes"
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <LoadingButton type="submit" loading={isPending} loadingLabel={editingId ? "Saving…" : "Planning…"}>
                {editingId ? "Save changes" : "Plan session"}
              </LoadingButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this study session?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the plan permanently. Completed focus history is not changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep session</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                if (!deleteId) return;
                void run(() => actions.deleteStudySession(deleteId))
                  .then(() => {
                    if (selectedId === deleteId) setSelection(null);
                    setDeleteId(null);
                    toast.success("Study session deleted.");
                  })
                  .catch(() => toast.error("Could not delete the study session."));
              }}
            >
              {isPending ? (
                <>
                  <Spinner className="size-4" /> Deleting…
                </>
              ) : (
                "Delete session"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={completingId !== null} onOpenChange={(open) => !open && setCompletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this session complete?</AlertDialogTitle>
            <AlertDialogDescription>Confirm that you finished this planned study session.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (!completingId) return;
                void run(() => actions.completeStudySession(completingId))
                  .then(() => {
                    setCompletingId(null);
                    toast.success("Study session completed. Nice work!");
                  })
                  .catch(() => toast.error("Could not complete the study session."));
              }}
            >
              {isPending ? (
                <>
                  <Spinner className="size-4" /> Completing…
                </>
              ) : (
                "Mark complete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
