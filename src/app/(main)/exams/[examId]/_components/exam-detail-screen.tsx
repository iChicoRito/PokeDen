"use client";

import { useMemo, useState } from "react";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { ArrowLeft, CalendarPlus, Check, GraduationCap, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ExamDetailSkeleton } from "@/app/(main)/_components/page-skeletons";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { getExamCountdown, getExamReadiness } from "@/features/pokeden/derivations";
import { usePokeDenStore } from "@/features/pokeden/pokeden-provider";
import { usePendingAction } from "@/hooks/use-pending-action";

export function ExamDetailScreen() {
  const params = useParams<{ examId: string }>();
  const router = useRouter();
  const data = usePokeDenStore((state) => state.data);
  const isHydrated = usePokeDenStore((state) => state.isHydrated);
  const actions = usePokeDenStore((state) => state.actions);
  const { isPending, run } = usePendingAction();
  const [planningTopicId, setPlanningTopicId] = useState<string | null>(null);
  const [planDate, setPlanDate] = useState("");
  const [planTime, setPlanTime] = useState("16:00");
  const [resultOpen, setResultOpen] = useState(false);
  const [score, setScore] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const exam = useMemo(() => data.exams.find((item) => item.id === params.examId), [data.exams, params.examId]);

  if (!isHydrated) return <ExamDetailSkeleton />;

  if (!exam) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col items-start gap-6 p-4 sm:p-6 lg:p-8">
        <Button variant="ghost" asChild>
          <Link href="/exams">
            <ArrowLeft /> Exams
          </Link>
        </Button>
        <Empty className="min-h-72 w-full border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GraduationCap />
            </EmptyMedia>
            <EmptyTitle>Exam not found</EmptyTitle>
            <EmptyDescription>This exam may have been removed.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const subject = data.subjects.find((item) => item.id === exam.subjectId);
  const countdown = getExamCountdown(exam);
  const readiness = getExamReadiness(exam);
  const reviewed = exam.topics.filter((topic) => topic.reviewedAt).length;

  const submitPlan = () => {
    if (!planningTopicId || !planDate || !planTime) return;
    const plannedStart = new Date(`${planDate}T${planTime}:00`).toISOString();
    void run(() => {
      actions.planExamTopic(exam.id, planningTopicId, plannedStart);
      toast.success("Review session planned.");
    })
      .then(() => setPlanningTopicId(null))
      .catch(() => toast.error("Could not plan the session."));
  };

  const submitResult = () => {
    const scoreValue = Number(score);
    const maxValue = Number(maxScore);
    if (!Number.isFinite(scoreValue) || !Number.isFinite(maxValue) || maxValue <= 0 || scoreValue < 0) {
      toast.error("Enter a valid score.");
      return;
    }
    void run(() => {
      actions.recordExamResult(exam.id, scoreValue, maxValue);
      toast.success("Result recorded.");
    })
      .then(() => setResultOpen(false))
      .catch(() => toast.error("Could not save the result."));
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3">
        <Button variant="ghost" className="w-fit" asChild>
          <Link href="/exams">
            <ArrowLeft /> Exams
          </Link>
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-3xl font-semibold tracking-tight break-words">{exam.title}</h1>
              <Badge variant={countdown.isPast ? "outline" : countdown.days === 0 ? "secondary" : "default"}>
                {countdown.isPast ? "Past" : countdown.days === 0 ? "Today" : `${countdown.days} days left`}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {subject?.name ?? "No subject"} ·{" "}
              {new Intl.DateTimeFormat(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }).format(new Date(exam.startsAt))}
            </p>
            {exam.description ? (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{exam.description}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setScore(exam.result ? String(exam.result.score) : "");
                setMaxScore(exam.result ? String(exam.result.maxScore) : "100");
                setResultOpen(true);
              }}
            >
              {exam.result ? "Edit result" : "Record result"}
            </Button>
            <Button variant="ghost" size="icon" aria-label="Delete exam" onClick={() => setDeleteOpen(true)}>
              <Trash2 />
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Preparation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Readiness</span>
            <span className="font-medium">
              {readiness}% · {reviewed}/{exam.topics.length} topics reviewed
            </span>
          </div>
          <Progress value={readiness} aria-label={`Readiness ${readiness} percent`} />
          {exam.topics.length === 0 ? (
            <p className="text-sm text-muted-foreground">No topics yet. Add topics as you prepare.</p>
          ) : (
            <ul className="grid gap-2">
              {exam.topics.map((topic) => (
                <li key={topic.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Checkbox
                      id={`topic-${topic.id}`}
                      checked={topic.reviewedAt !== null}
                      aria-label={`Mark ${topic.title} reviewed`}
                      onCheckedChange={() => {
                        actions.toggleExamTopic(exam.id, topic.id);
                      }}
                    />
                    <div className="min-w-0">
                      <Label
                        htmlFor={`topic-${topic.id}`}
                        className={topic.reviewedAt ? "text-muted-foreground line-through" : ""}
                      >
                        {topic.title}
                      </Label>
                      <div className="text-xs text-muted-foreground">
                        {topic.reviewedAt ? "Reviewed" : "Not reviewed"}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {topic.reviewedAt ? (
                      <Badge variant="outline">
                        <Check /> Reviewed
                      </Badge>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPlanningTopicId(topic.id);
                        setPlanDate(new Date().toISOString().slice(0, 10));
                        setPlanTime("16:00");
                      }}
                    >
                      <CalendarPlus /> Plan review
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Result</CardTitle>
        </CardHeader>
        <CardContent>
          {exam.result ? (
            <div className="flex items-center gap-3">
              <span className="text-2xl font-semibold">
                {exam.result.score}/{exam.result.maxScore}
              </span>
              <span className="text-muted-foreground text-sm">
                ({Math.round((exam.result.score / exam.result.maxScore) * 100)}%)
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No result recorded yet.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={planningTopicId !== null} onOpenChange={(open) => !open && setPlanningTopicId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Plan a review session</DialogTitle>
            <DialogDescription>This adds a planned study session linked to this exam topic.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="plan-date">Date</Label>
              <Input
                id="plan-date"
                type="date"
                value={planDate}
                onChange={(event) => setPlanDate(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plan-time">Time</Label>
              <Input
                id="plan-time"
                type="time"
                value={planTime}
                onChange={(event) => setPlanTime(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanningTopicId(null)}>
              Cancel
            </Button>
            <LoadingButton
              loading={isPending}
              loadingLabel="Planning…"
              onClick={submitPlan}
              disabled={!planDate || !planTime}
            >
              Plan session
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record result</DialogTitle>
            <DialogDescription>Add or update the score for this exam.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="result-score">Score</FieldLabel>
                <Input
                  id="result-score"
                  type="number"
                  min={0}
                  value={score}
                  onChange={(event) => setScore(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="result-max">Max score</FieldLabel>
                <Input
                  id="result-max"
                  type="number"
                  min={1}
                  value={maxScore}
                  onChange={(event) => setMaxScore(event.target.value)}
                />
              </Field>
            </div>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResultOpen(false)}>
              Cancel
            </Button>
            <LoadingButton loading={isPending} loadingLabel="Saving…" onClick={submitResult}>
              Save result
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
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
                void run(() => actions.deleteExam(exam.id))
                  .then(() => {
                    toast.success("Exam deleted.");
                    router.push("/exams");
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
