"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";

import Link from "next/link";

import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  ExternalLink,
  FileText,
  GraduationCap,
  LayoutDashboard,
  ListTodo,
  Pin,
  Plus,
  Timer,
  Trash2,
  Video,
} from "lucide-react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getExamCountdown, getExamReadiness, getSubjectProgress } from "@/features/pokeden/derivations";
import type { Subject } from "@/features/pokeden/domain";
import { materialLinkSchema } from "@/features/pokeden/domain";
import { usePokeDenStore } from "@/features/pokeden/pokeden-provider";
import { usePendingAction } from "@/hooks/use-pending-action";
import { plainPreview } from "@/lib/note-content";

type MaterialKind = "textbook" | "slides" | "video" | "practice" | "other";

const MATERIAL_KINDS: Array<{ value: MaterialKind; label: string }> = [
  { value: "textbook", label: "Textbook" },
  { value: "slides", label: "Slides" },
  { value: "video", label: "Video" },
  { value: "practice", label: "Practice" },
  { value: "other", label: "Other" },
];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

interface SubjectDetailDialogProps {
  subject: Subject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubjectDetailDialog({ subject, open, onOpenChange }: SubjectDetailDialogProps) {
  const data = usePokeDenStore((state) => state.data);
  const actions = usePokeDenStore((state) => state.actions);
  const { isPending, run } = usePendingAction();
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialUrl, setMaterialUrl] = useState("");
  const [materialKind, setMaterialKind] = useState<MaterialKind>("other");
  // Synchronous reentrancy guard (reopen-gated, same pattern as
  // subjects-manager.tsx:119-126): a second submit can fire in the SAME JS
  // task before React re-renders with isPending=true, so an async/state-only
  // guard still double-creates. Checked and set synchronously before any
  // await; released only when the dialog (re)opens or on validation/run
  // failure — NOT on settle, since Radix keeps the dialog mounted through
  // its exit animation and a submit landing in that window would double-create.
  const materialPendingRef = useRef(false);
  // Set when a submit is attempted with an empty title; cleared on edit/retry.
  const [titleError, setTitleError] = useState<string | null>(null);
  // Set when a submit is attempted with an invalid URL; cleared on edit/retry.
  const [urlError, setUrlError] = useState<string | null>(null);
  const [deleteMaterialId, setDeleteMaterialId] = useState<string | null>(null);

  // Keep the last known subject rendered while the dialog animates out, so the
  // content does not vanish before the close transition finishes.
  const lastSubjectRef = useRef<Subject | null>(null);
  if (subject) lastSubjectRef.current = subject;
  const renderSubject = subject ?? (open ? lastSubjectRef.current : null);

  const tasks = useMemo(
    () => (renderSubject ? data.tasks.filter((task) => task.subjectId === renderSubject.id) : []),
    [data.tasks, renderSubject],
  );
  const notes = useMemo(
    () => (renderSubject ? data.notes.filter((note) => note.subjectId === renderSubject.id) : []),
    [data.notes, renderSubject],
  );
  const sessions = useMemo(
    () => (renderSubject ? data.studySessions.filter((session) => session.subjectId === renderSubject.id) : []),
    [data.studySessions, renderSubject],
  );
  const exams = useMemo(
    () => (renderSubject ? data.exams.filter((exam) => exam.subjectId === renderSubject.id) : []),
    [data.exams, renderSubject],
  );

  if (!open || !renderSubject) return null;

  const progress = getSubjectProgress(data, renderSubject.id);
  const materialToDelete = renderSubject.materialLinks.find((material) => material.id === deleteMaterialId);

  const resetMaterialDraft = () => {
    setMaterialTitle("");
    setMaterialUrl("");
    setMaterialKind("other");
    setTitleError(null);
    setUrlError(null);
    materialPendingRef.current = false;
  };

  const handleMaterialDialogOpenChange = (dialogOpen: boolean) => {
    setMaterialDialogOpen(dialogOpen);
    if (!dialogOpen) {
      resetMaterialDraft();
    } else {
      setTitleError(null);
      setUrlError(null);
      materialPendingRef.current = false;
    }
  };

  const addMaterial = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // biome-ignore lint/suspicious/noUnnecessaryConditions: re-entrancy guard — the ref is mutated by other concurrent invocations, so it is not always falsy.
    if (materialPendingRef.current) return;
    const title = materialTitle.trim();
    const rawUrl = materialUrl.trim();
    if (!title || !rawUrl) {
      materialPendingRef.current = false;
      if (!title) setTitleError("Enter a title for this material.");
      if (!rawUrl) setUrlError("Enter a valid web address.");
      toast.error("Add a title and URL.");
      return;
    }

    const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    // Surface the domain zod rule (materialLinkSchema: url: z.url()) as a
    // field-level error and block persistence before touching the store.
    // z.url() alone accepts single-label hosts ("https://not-a-url"), so also
    // require a dotted hostname — study-material links need a real address.
    let hostnameOk = false;
    try {
      hostnameOk = new URL(url).hostname.includes(".");
    } catch {
      hostnameOk = false;
    }
    if (!hostnameOk || !materialLinkSchema.shape.url.safeParse(url).success) {
      materialPendingRef.current = false;
      setUrlError("Enter a valid web address, e.g. https://example.com/resource.");
      toast.error("Enter a valid web address.");
      return;
    }
    setTitleError(null);
    setUrlError(null);

    if (renderSubject.materialLinks.some((material) => material.url.toLowerCase() === url.toLowerCase())) {
      materialPendingRef.current = false;
      toast.error("That material is already linked.");
      return;
    }

    // Set synchronously before any await — second submit in the same task is dropped.
    materialPendingRef.current = true;
    void run(() =>
      actions.updateSubject(renderSubject.id, {
        materialLinks: [
          ...renderSubject.materialLinks,
          {
            id: `material-${Date.now()}`,
            title,
            url,
            kind: materialKind,
          },
        ],
      }),
    )
      .then(() => {
        handleMaterialDialogOpenChange(false);
        toast.success("Material added.");
      })
      .catch(() => {
        materialPendingRef.current = false;
        toast.error("Could not add the material.");
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 font-heading text-xl">
            <span className="break-words">{renderSubject.name}</span>
            {renderSubject.archivedAt ? <Badge variant="secondary">Archived</Badge> : <Badge>Active</Badge>}
          </DialogTitle>
          <DialogDescription>Tasks, notes, study sessions, exams, and materials for this subject.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4 pb-4">
            {renderSubject.description ? (
              <p className="text-muted-foreground text-sm">{renderSubject.description}</p>
            ) : null}
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} aria-label={`${renderSubject.name} progress ${progress} percent`} />
            </div>
          </div>

          <Tabs defaultValue="overview">
            <div className="overflow-x-auto pb-2">
              <TabsList className="min-w-max justify-start" variant="line" aria-label="Subject sections">
                <TabsTrigger value="overview">
                  <LayoutDashboard /> Overview
                </TabsTrigger>
                <TabsTrigger value="tasks">
                  <ListTodo /> Tasks <Badge variant="secondary">{tasks.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="notes">
                  <FileText /> Notes <Badge variant="secondary">{notes.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="sessions">
                  <Timer /> Study Sessions <Badge variant="secondary">{sessions.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="exams">
                  <GraduationCap /> Exams <Badge variant="secondary">{exams.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="materials">
                  <BookOpen /> Materials <Badge variant="secondary">{renderSubject.materialLinks.length}</Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="mt-2 px-1 pb-2">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="shadow-xs">
                  <CardHeader>
                    <CardTitle>Class schedule</CardTitle>
                    <CardDescription>Your recurring weekly classes</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-0">
                    {renderSubject.classSchedules.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No scheduled classes.</p>
                    ) : (
                      <div className="divide-y">
                        {renderSubject.classSchedules.map((schedule) => (
                          <div key={schedule.id} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                              <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium text-sm leading-none">
                                {schedule.label || "Class"}
                              </div>
                              <div className="mt-1 text-muted-foreground text-xs">
                                {
                                  ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
                                    schedule.weekday
                                  ]
                                }
                                {" · "}
                                {schedule.startTime}–{schedule.endTime}
                              </div>
                              {schedule.room ? (
                                <div className="text-muted-foreground text-xs">{schedule.room}</div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-xs">
                  <CardHeader>
                    <CardTitle>At a glance</CardTitle>
                    <CardDescription>Current activity for {renderSubject.name}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-x-4 gap-y-5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                        <ListTodo className="size-4 text-muted-foreground" aria-hidden="true" />
                      </div>
                      <div>
                        <div className="font-semibold text-xl leading-none">
                          {tasks.filter((task) => task.status !== "completed").length}
                        </div>
                        <div className="mt-1 text-muted-foreground text-xs">Open tasks</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                        <Timer className="size-4 text-muted-foreground" aria-hidden="true" />
                      </div>
                      <div>
                        <div className="font-semibold text-xl leading-none">
                          {sessions.filter((session) => session.status === "completed").length}
                        </div>
                        <div className="mt-1 text-muted-foreground text-xs">Sessions done</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                        <GraduationCap className="size-4 text-muted-foreground" aria-hidden="true" />
                      </div>
                      <div>
                        <div className="font-semibold text-xl leading-none">{exams.length}</div>
                        <div className="mt-1 text-muted-foreground text-xs">Exams</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                        <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
                      </div>
                      <div>
                        <div className="font-semibold text-xl leading-none">{notes.length}</div>
                        <div className="mt-1 text-muted-foreground text-xs">Notes</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="mt-2 px-1 pb-2">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-lg">Tasks</h2>
                  <p className="text-muted-foreground text-sm">Assignments and next actions for this subject.</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/tasks">
                    Manage tasks <ExternalLink />
                  </Link>
                </Button>
              </div>
              {tasks.length === 0 ? (
                <Empty className="min-h-56 border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ListTodo />
                    </EmptyMedia>
                    <EmptyTitle>No tasks for {renderSubject.name}</EmptyTitle>
                    <EmptyDescription>Add a task and connect it to this subject.</EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button asChild>
                      <Link href="/tasks">Open Tasks</Link>
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
                  <div className="divide-y">
                    {tasks.map((task) => (
                      <Link
                        key={task.id}
                        href={`/tasks?task=${task.id}`}
                        className="flex items-start gap-3 p-4 transition-colors hover:bg-muted/30"
                      >
                        {task.status === "completed" ? (
                          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                        ) : task.status === "in-progress" ? (
                          <Clock3 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                        ) : (
                          <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <span
                              className={
                                task.status === "completed"
                                  ? "truncate text-muted-foreground text-sm line-through"
                                  : "truncate font-medium text-sm"
                              }
                            >
                              {task.title}
                            </span>
                            <Badge
                              variant={
                                task.priority === "high"
                                  ? "destructive"
                                  : task.priority === "medium"
                                    ? "secondary"
                                    : "outline"
                              }
                              className="w-fit capitalize"
                            >
                              {task.priority} priority
                            </Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
                            <span className="capitalize">{task.status.replace("-", " ")}</span>
                            <span>{task.dueAt ? `Due ${formatDate(task.dueAt)}` : "No due date"}</span>
                            {task.subtasks.length ? (
                              <span>
                                {task.subtasks.filter((subtask) => subtask.completed).length}/{task.subtasks.length}{" "}
                                subtasks
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="mt-2 px-1 pb-2">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-lg">Notes</h2>
                  <p className="text-muted-foreground text-sm">Reference material and ideas linked to this subject.</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/notes">
                    Manage notes <ExternalLink />
                  </Link>
                </Button>
              </div>
              {notes.length === 0 ? (
                <Empty className="min-h-56 border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FileText />
                    </EmptyMedia>
                    <EmptyTitle>No notes yet</EmptyTitle>
                    <EmptyDescription>Create a note and assign it to {renderSubject.name}.</EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button asChild>
                      <Link href="/notes">Open Notes</Link>
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {notes.map((note) => (
                    <Card key={note.id} className="shadow-xs transition-colors hover:bg-muted/20">
                      <CardHeader>
                        <CardTitle className="min-w-0">
                          <Link className="block truncate hover:underline" href={`/notes?note=${note.id}`}>
                            {note.title}
                          </Link>
                        </CardTitle>
                        <CardDescription>{formatDate(note.updatedAt)}</CardDescription>
                        {note.pinned ? (
                          <CardAction>
                            <Badge variant="secondary">
                              <Pin /> Pinned
                            </Badge>
                          </CardAction>
                        ) : null}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="line-clamp-3 text-muted-foreground text-sm">
                          {plainPreview(note.content) || "Empty note"}
                        </p>
                        {note.tags.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {note.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="font-normal">
                                {tag.replace(/^#+/, "")}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sessions" className="mt-2 px-1 pb-2">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-lg">Study sessions</h2>
                  <p className="text-muted-foreground text-sm">Planned and completed focus blocks for this subject.</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/study-planner">
                    Open planner <ExternalLink />
                  </Link>
                </Button>
              </div>
              {sessions.length === 0 ? (
                <Empty className="min-h-56 border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Timer />
                    </EmptyMedia>
                    <EmptyTitle>No study sessions</EmptyTitle>
                    <EmptyDescription>Plan a focused session for {renderSubject.name}.</EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button asChild>
                      <Link href="/study-planner">Plan a Session</Link>
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {sessions.map((session) => (
                    <Card key={session.id} className="shadow-xs transition-colors hover:bg-muted/20">
                      <CardHeader>
                        <CardTitle className="min-w-0">
                          <Link
                            href={`/study-planner?session=${session.id}`}
                            className="block truncate hover:underline"
                          >
                            {session.topic || session.title}
                          </Link>
                        </CardTitle>
                        <CardDescription>{formatDate(session.plannedStart)}</CardDescription>
                        <CardAction>
                          <Badge
                            variant={
                              session.status === "completed"
                                ? "secondary"
                                : session.status === "in-progress"
                                  ? "default"
                                  : "outline"
                            }
                            className="capitalize"
                          >
                            {session.status.replace("-", " ")}
                          </Badge>
                        </CardAction>
                      </CardHeader>
                      <CardContent className="flex flex-wrap items-center gap-3 text-muted-foreground text-sm">
                        <span className="flex items-center gap-1.5">
                          <Clock3 className="size-4" aria-hidden="true" /> {session.plannedMinutes} min
                        </span>
                        <Badge variant="outline" className="capitalize">
                          {session.priority} priority
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="exams" className="mt-2 px-1 pb-2">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-lg">Exams</h2>
                  <p className="text-muted-foreground text-sm">Upcoming assessments and topic readiness.</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/exams">
                    Manage exams <ExternalLink />
                  </Link>
                </Button>
              </div>
              {exams.length === 0 ? (
                <Empty className="min-h-56 border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <GraduationCap />
                    </EmptyMedia>
                    <EmptyTitle>No exams</EmptyTitle>
                    <EmptyDescription>Add an assessment for {renderSubject.name}.</EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button asChild>
                      <Link href="/exams">Open Exams</Link>
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {exams.map((exam) => {
                    const readiness = getExamReadiness(exam);
                    const countdown = getExamCountdown(exam);
                    return (
                      <Card key={exam.id} className="shadow-xs">
                        <CardHeader>
                          <CardTitle className="min-w-0">
                            <Link
                              className="flex min-w-0 items-center gap-2 hover:underline"
                              href={`/exams/${exam.id}`}
                            >
                              <GraduationCap className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                              <span className="truncate">{exam.title}</span>
                            </Link>
                          </CardTitle>
                          <CardAction>
                            <Badge variant={readiness >= 75 ? "default" : "outline"}>{readiness}% ready</Badge>
                          </CardAction>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="line-clamp-2 text-muted-foreground text-sm">
                            {exam.description || `${exam.durationMinutes}-minute assessment`}
                          </p>
                          <div className="flex items-center gap-3">
                            <Progress
                              value={readiness}
                              className="h-2"
                              aria-label={`${exam.title} readiness ${readiness} percent`}
                            />
                            <span className="shrink-0 text-sm">{readiness}%</span>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {exam.topics.filter((topic) => topic.reviewedAt).length}/{exam.topics.length} topics
                            reviewed
                          </p>
                        </CardContent>
                        <CardFooter className="flex items-center justify-between gap-3 py-2.5">
                          <span className="truncate text-muted-foreground">{formatDate(exam.startsAt)}</span>
                          <span className="shrink-0 font-medium">
                            {countdown.isPast ? "Past" : countdown.days === 0 ? "Today" : `${countdown.days}d left`}
                          </span>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="materials" className="mt-2 px-1 pb-2">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-lg">Materials</h2>
                  <p className="text-muted-foreground text-sm">Books, slides, videos, and practice resources.</p>
                </div>
                <Button size="sm" onClick={() => setMaterialDialogOpen(true)}>
                  <Plus /> Add material
                </Button>
              </div>
              {renderSubject.materialLinks.length === 0 ? (
                <Empty className="min-h-56 border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <BookOpen />
                    </EmptyMedia>
                    <EmptyTitle>No materials yet</EmptyTitle>
                    <EmptyDescription>Add resources while editing this subject.</EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button onClick={() => setMaterialDialogOpen(true)}>
                      <Plus /> Add Material
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
                  <div className="divide-y">
                    {renderSubject.materialLinks.map((material) => {
                      const MaterialIcon =
                        material.kind === "video" ? Video : material.kind === "textbook" ? BookOpen : FileText;
                      return (
                        <div key={material.id} className="flex items-center transition-colors hover:bg-muted/30">
                          <Link
                            href={material.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex min-w-0 flex-1 items-center gap-4 p-4"
                          >
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                              <MaterialIcon className="size-5 text-muted-foreground" aria-hidden="true" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium text-sm">{material.title}</div>
                              <div className="mt-1 text-muted-foreground text-xs">Opens in a new tab</div>
                            </div>
                            <Badge variant="outline" className="hidden shrink-0 capitalize sm:inline-flex">
                              {material.kind}
                            </Badge>
                            <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          </Link>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="mr-3 shrink-0"
                            aria-label={`Remove ${material.title}`}
                            onClick={() => setDeleteMaterialId(material.id)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>

      <Dialog open={materialDialogOpen} onOpenChange={handleMaterialDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add material</DialogTitle>
            <DialogDescription>Add a resource link to {renderSubject.name}.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={addMaterial} noValidate>
            <div className="grid gap-2" data-invalid={titleError ? true : undefined}>
              <Label htmlFor="material-title">Title</Label>
              <Input
                id="material-title"
                value={materialTitle}
                onChange={(event) => {
                  setMaterialTitle(event.target.value);
                  if (titleError) setTitleError(null);
                }}
                placeholder="Chapter 4 slides"
                maxLength={120}
                aria-invalid={titleError ? true : undefined}
                aria-describedby={titleError ? "material-title-error" : undefined}
              />
              {titleError ? (
                <div id="material-title-error" role="alert" className="text-destructive text-sm">
                  {titleError}
                </div>
              ) : null}
            </div>
            <div className="grid gap-2" data-invalid={urlError ? true : undefined}>
              <Label htmlFor="material-url">URL</Label>
              <Input
                id="material-url"
                value={materialUrl}
                onChange={(event) => {
                  setMaterialUrl(event.target.value);
                  if (urlError) setUrlError(null);
                }}
                placeholder="https://example.com/resource"
                inputMode="url"
                aria-invalid={urlError ? true : undefined}
                aria-describedby={urlError ? "material-url-error" : undefined}
              />
              {urlError ? (
                <div id="material-url-error" role="alert" className="text-destructive text-sm">
                  {urlError}
                </div>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="material-kind">Type</Label>
              <NativeSelect
                id="material-kind"
                className="w-full"
                value={materialKind}
                onChange={(event) => setMaterialKind(event.target.value as MaterialKind)}
              >
                {MATERIAL_KINDS.map((kind) => (
                  <NativeSelectOption key={kind.value} value={kind.value}>
                    {kind.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleMaterialDialogOpenChange(false)}>
                Cancel
              </Button>
              <LoadingButton loading={isPending} loadingLabel="Adding…" type="submit">
                <Plus /> Add material
              </LoadingButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteMaterialId !== null}
        onOpenChange={(alertOpen) => !alertOpen && setDeleteMaterialId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this material?</AlertDialogTitle>
            <AlertDialogDescription>
              {materialToDelete?.title ?? "This resource"} will be removed from {renderSubject.name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                if (!deleteMaterialId) return;
                void run(() =>
                  actions.updateSubject(renderSubject.id, {
                    materialLinks: renderSubject.materialLinks.filter((material) => material.id !== deleteMaterialId),
                  }),
                )
                  .then(() => {
                    toast.success("Material removed.");
                    setDeleteMaterialId(null);
                  })
                  .catch(() => toast.error("Could not remove the material."));
              }}
            >
              {isPending ? (
                <>
                  <Spinner className="size-4" /> Removing…
                </>
              ) : (
                "Remove material"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
