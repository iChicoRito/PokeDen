"use client";

import { useMemo, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { CalendarClock, GraduationCap, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/app/(main)/_components/page-header";
import { ExamsSkeleton } from "@/app/(main)/_components/page-skeletons";
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
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { getExamCountdown, getExamReadiness } from "@/features/pokeden/derivations";
import { usePokeDenStore } from "@/features/pokeden/pokeden-provider";
import { usePendingAction } from "@/hooks/use-pending-action";

type ExamDraft = {
  title: string;
  subjectId: string;
  examDate: string;
  examTime: string;
  durationMinutes: string;
  description: string;
};

const EMPTY_DRAFT: ExamDraft = {
  title: "",
  subjectId: "",
  examDate: "",
  examTime: "",
  durationMinutes: "60",
  description: "",
};

function toLocalDateTime(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function ExamsScreen({ loading = false }: { loading?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const data = usePokeDenStore((state) => state.data);
  const isHydrated = usePokeDenStore((state) => state.isHydrated);
  const storageError = usePokeDenStore((state) => state.storageError);
  const actions = usePokeDenStore((state) => state.actions);
  const { isPending, run } = usePendingAction();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ExamDraft>(EMPTY_DRAFT);
  const [durationError, setDurationError] = useState(false);
  const [durationErrorMessage, setDurationErrorMessage] = useState("Duration must be at least 1 minute.");

  const exams = useMemo(() => [...data.exams].sort((a, b) => a.startsAt.localeCompare(b.startsAt)), [data.exams]);
  const subjects = data.subjects.filter((subject) => subject.archivedAt === null);

  const sourceExamId = searchParams.get("exam");
  useMemo(() => {
    if (!isHydrated || !sourceExamId) return;
    const exam = data.exams.find((item) => item.id === sourceExamId);
    if (exam) router.replace(`/exams/${exam.id}`);
  }, [data.exams, isHydrated, router, sourceExamId]);

  const openCreate = () => {
    setEditingId(null);
    const local = toLocalDateTime(new Date(Date.now() + 7 * 86400_000).toISOString());
    setDraft({ ...EMPTY_DRAFT, examDate: local.slice(0, 10), examTime: local.slice(11, 16) });
    setDialogOpen(true);
  };

  const openEdit = (id: string) => {
    const exam = data.exams.find((item) => item.id === id);
    if (!exam) return;
    setEditingId(id);
    const local = toLocalDateTime(exam.startsAt);
    setDraft({
      title: exam.title,
      subjectId: exam.subjectId ?? "",
      examDate: local.slice(0, 10),
      examTime: local.slice(11, 16),
      durationMinutes: String(exam.durationMinutes),
      description: exam.description,
    });
    setDialogOpen(true);
  };

  const submit = () => {
    if (!draft.title.trim() || !draft.examDate || !draft.examTime) {
      toast.error("Exam title, date, and time are required.");
      return;
    }
    const parsedDuration = Number(draft.durationMinutes);
    if (draft.durationMinutes.trim() === "" || !Number.isFinite(parsedDuration) || parsedDuration < 1) {
      setDurationError(true);
      setDurationErrorMessage("Duration must be at least 1 minute.");
      toast.error("Duration must be at least 1 minute.");
      return;
    }
    if (parsedDuration > 600) {
      setDurationError(true);
      setDurationErrorMessage("Duration must be 600 minutes or less.");
      toast.error("Duration must be 600 minutes or less.");
      return;
    }
    setDurationError(false);
    const startsAt = new Date(`${draft.examDate}T${draft.examTime}:00`).toISOString();
    const durationMinutes = Math.round(parsedDuration);
    const wasRounded = durationMinutes !== parsedDuration;
    void run(() => {
      if (editingId) {
        actions.updateExam(editingId, {
          title: draft.title.trim(),
          subjectId: draft.subjectId || null,
          startsAt,
          durationMinutes,
          description: draft.description.trim(),
        });
        toast.success("Exam updated.");
      } else {
        actions.createExam({
          title: draft.title.trim(),
          subjectId: draft.subjectId || null,
          startsAt,
          durationMinutes,
          description: draft.description.trim(),
        });
        toast.success("Exam added.");
      }
      if (wasRounded) toast.info(`Duration rounded to ${durationMinutes} minutes.`);
    })
      .then(() => setDialogOpen(false))
      .catch(() => toast.error("Could not save the exam."));
  };

  if (loading || !isHydrated) return <ExamsSkeleton />;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Exams"
        description="Track upcoming assessments and review topics"
        action={
          <Button size="lg" onClick={openCreate}>
            <Plus /> Add Exam
          </Button>
        }
      />

      {storageError ? (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          Changes may not be saved.
        </div>
      ) : null}

      {exams.length === 0 ? (
        <Empty className="min-h-72 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GraduationCap />
            </EmptyMedia>
            <EmptyTitle>No upcoming exams</EmptyTitle>
            <EmptyDescription>Add an exam to track topics, readiness, and countdowns.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={openCreate}>
              <Plus /> Add Exam
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {exams.map((exam) => {
            const subject = data.subjects.find((item) => item.id === exam.subjectId);
            const countdown = getExamCountdown(exam);
            const readiness = getExamReadiness(exam);
            return (
              <Card key={exam.id} className="flex flex-col">
                <CardHeader>
                  <div className="min-w-0">
                    <CardTitle className="truncate text-lg">
                      <Button
                        variant="link"
                        className="block h-auto max-w-full truncate p-0 text-left text-lg font-semibold"
                        onClick={() => router.push(`/exams/${exam.id}`)}
                      >
                        {exam.title}
                      </Button>
                    </CardTitle>
                    <CardDescription className="mt-1">{subject?.name ?? "No subject"}</CardDescription>
                  </div>
                  <CardAction>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${exam.title}`}>
                          <MoreVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onSelect={() => openEdit(exam.id)}>
                          <Pencil /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => setDeleteId(exam.id)}>
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarClock className="size-4 text-muted-foreground" aria-hidden="true" />
                    <span>
                      {new Intl.DateTimeFormat(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(exam.startsAt))}
                    </span>
                    <Badge variant={countdown.isPast ? "outline" : countdown.days === 0 ? "secondary" : "default"}>
                      {countdown.isPast ? "Past" : countdown.days === 0 ? "Today" : `${countdown.days}d left`}
                    </Badge>
                  </div>
                  {exam.result ? (
                    <Badge variant="outline" className="w-fit">
                      Result: {exam.result.score}/{exam.result.maxScore}
                    </Badge>
                  ) : null}
                  <div className="mt-auto space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Readiness</span>
                      <span className="font-medium">{readiness}%</span>
                    </div>
                    <Progress value={readiness} aria-label={`${exam.title} readiness ${readiness} percent`} />
                    <p className="text-xs text-muted-foreground">
                      {exam.topics.filter((topic) => topic.reviewedAt).length}/{exam.topics.length} topics reviewed
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit exam" : "Add exam"}</DialogTitle>
            <DialogDescription>Add the details students need to prepare.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="exam-title">Title</FieldLabel>
              <Input
                id="exam-title"
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                maxLength={120}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="exam-subject">Subject</Label>
                <NativeSelect
                  id="exam-subject"
                  className="w-full"
                  value={draft.subjectId}
                  onChange={(event) => setDraft({ ...draft, subjectId: event.target.value })}
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
                <Label htmlFor="exam-duration">Duration (minutes)</Label>
                <Input
                  id="exam-duration"
                  type="number"
                  min={1}
                  max={600}
                  value={draft.durationMinutes}
                  aria-invalid={durationError}
                  aria-describedby={durationError ? "exam-duration-error" : undefined}
                  onChange={(event) => {
                    setDraft({ ...draft, durationMinutes: event.target.value });
                    if (durationError) setDurationError(false);
                  }}
                />
                {durationError ? (
                  <p id="exam-duration-error" className="text-destructive text-sm" role="alert">
                    {durationErrorMessage}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="exam-date">Date</FieldLabel>
                <Input
                  id="exam-date"
                  type="date"
                  value={draft.examDate}
                  onChange={(event) => setDraft({ ...draft, examDate: event.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="exam-time">Time</FieldLabel>
                <Input
                  id="exam-time"
                  type="time"
                  value={draft.examTime}
                  onChange={(event) => setDraft({ ...draft, examTime: event.target.value })}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="exam-description">Description</FieldLabel>
              <Textarea
                id="exam-description"
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                rows={3}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <LoadingButton
              loading={isPending}
              loadingLabel={editingId ? "Saving…" : "Adding…"}
              onClick={submit}
              disabled={!draft.title.trim() || !draft.examDate || !draft.examTime}
            >
              {editingId ? "Save changes" : "Add exam"}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this exam?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the exam and its topics. Linked review sessions and focus history stay intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                if (!deleteId) return;
                void run(() => actions.deleteExam(deleteId))
                  .then(() => {
                    toast.success("Exam deleted.");
                    setDeleteId(null);
                  })
                  .catch(() => toast.error("Could not delete the exam."));
              }}
            >
              {isPending ? (
                <>
                  <Spinner className="size-4" /> Deleting…
                </>
              ) : (
                "Delete exam"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
