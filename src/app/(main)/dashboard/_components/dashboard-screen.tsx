"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowRight, CalendarDays, GraduationCap, ListTodo, Play, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/app/(main)/_components/page-header";
import { DashboardSkeleton } from "@/app/(main)/_components/page-skeletons";
import { LoadingButton } from "@/components/loading-button";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import {
  getCompletedTaskCount,
  getDailyFocusMinutes,
  getDailyFocusSessionCount,
  getExamCountdown,
  getExamReadiness,
  getOverdueTasks,
  getRecommendedStudy,
  getSubjectProgress,
  getTasksDueToday,
  getTodayClasses,
} from "@/features/pokeden/derivations";
import { usePokeDenStore } from "@/features/pokeden/pokeden-provider";
import { exitPomodoroFullscreen, requestPomodoroFullscreen } from "@/features/pokeden/pomodoro-focus-mode";
import { usePendingAction } from "@/hooks/use-pending-action";

import { CalendarPanel } from "./calendar-panel";
import { KpiCards } from "./kpi-cards";

const FIRST_RUN_HINT_KEY = "pokademia:onboarding:firstRunHint:v1";

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatExamDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function DashboardScreen() {
  const router = useRouter();
  const data = usePokeDenStore((state) => state.data);
  const isHydrated = usePokeDenStore((state) => state.isHydrated);
  const storageError = usePokeDenStore((state) => state.storageError);
  const actions = usePokeDenStore((state) => state.actions);
  const { isPending, run } = usePendingAction();

  // Dismissible first-run hint shown once after onboarding.
  const [showFirstRunHint, setShowFirstRunHint] = useState(false);
  useEffect(() => {
    if (!isHydrated) return;
    try {
      if (localStorage.getItem(FIRST_RUN_HINT_KEY) === "1") return;
    } catch {
      // Ignore storage read failures (private mode).
    }
    setShowFirstRunHint(true);
  }, [isHydrated]);

  const dismissFirstRunHint = () => {
    setShowFirstRunHint(false);
    try {
      localStorage.setItem(FIRST_RUN_HINT_KEY, "1");
    } catch {
      // Ignore storage write failures (private mode).
    }
  };

  const now = useMemo(() => new Date(), []);
  const todayClasses = useMemo(() => getTodayClasses(data, now), [data, now]);
  const overdue = useMemo(() => getOverdueTasks(data, now), [data, now]);
  const dueToday = useMemo(() => getTasksDueToday(data, now), [data, now]);
  const upcomingExams = useMemo(
    () =>
      [...data.exams]
        .filter((exam) => new Date(exam.startsAt) >= now)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .slice(0, 3),
    [data.exams, now],
  );
  const recommendation = useMemo(() => getRecommendedStudy(data, now), [data, now]);
  const activeSubjects = data.subjects.filter((subject) => subject.archivedAt === null);

  const startRecommended = () => {
    if (!recommendation) return;
    const planned = data.studySessions.find(
      (session) => session.subjectId === recommendation.subjectId && session.status === "planned",
    );
    const fullscreenRequest = requestPomodoroFullscreen(document);
    void run(
      () => {
        if (planned) actions.startStudySession(planned.id);
        else
          actions.startTimer({
            mode: "focus",
            targetMinutes: data.studyPreferences.defaultFocusMinutes,
            subjectId: recommendation.subjectId,
          });
        toast.success("Focus session ready.");
      },
      { minMs: 250 },
    )
      .then(() => router.push("/pomodoro"))
      .catch(async () => {
        if (await fullscreenRequest) await exitPomodoroFullscreen(document);
        toast.error("Could not start the session.");
      });
  };

  if (!isHydrated) return <DashboardSkeleton />;

  const hasAnyContent =
    data.subjects.length > 0 || data.tasks.length > 0 || data.studySessions.length > 0 || data.exams.length > 0;

  if (!hasAnyContent) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-6 p-4 sm:p-6 lg:p-8">
        <div className="space-y-1 text-center">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Welcome to your Den</h1>
          <p className="text-muted-foreground text-sm">Everything about today, in one place.</p>
        </div>
        {showFirstRunHint ? (
          <Card className="w-full border-primary/30">
            <CardContent className="flex flex-col items-start gap-4 p-6">
              <div className="flex w-full items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="pokeden-chip size-10 rounded-xl">
                    <Sparkles className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="font-medium">What&apos;s next?</div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Your den is set up. Start with one task or a single focused session.
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={dismissFirstRunHint} aria-label="Dismiss">
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => router.push("/tasks")}>
                  <ListTodo /> Add a task
                </Button>
                <Button variant="outline" onClick={() => router.push("/study-planner")}>
                  <CalendarDays /> Plan a session
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
        <Empty className="min-h-80 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Sparkles />
            </EmptyMedia>
            <EmptyTitle>Your Den is ready. Add your first task or plan a study session.</EmptyTitle>
            <EmptyDescription>Start small — one task or one focused session is enough.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row flex-wrap justify-center">
            <Button onClick={() => router.push("/tasks")}>
              <ListTodo /> Add a task
            </Button>
            <Button variant="outline" onClick={() => router.push("/study-planner")}>
              <CalendarDays /> Plan a session
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const dailyFocusMinutes = getDailyFocusMinutes(data, now);
  const dailyFocusSessions = getDailyFocusSessionCount(data, now);
  const dailyGoalPercent =
    data.studyPreferences.dailyGoalMinutes > 0
      ? Math.min(100, Math.round((dailyFocusMinutes / data.studyPreferences.dailyGoalMinutes) * 100))
      : null;
  const tasksDueCount = dueToday.length + overdue.length;
  const nextExamCountdown = upcomingExams.length > 0 ? getExamCountdown(upcomingExams[0], now) : null;
  const completedTaskCount = getCompletedTaskCount(data);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title={`Good to see you, ${data.profile.displayName || "student"}`}
        description="Here's what needs attention today."
        action={
          <Button onClick={() => router.push("/pomodoro")}>
            <Play /> Quick focus
          </Button>
        }
      />

      {storageError ? (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          Some data may be out of date.
        </div>
      ) : null}

      {showFirstRunHint ? (
        <Card className="border-primary/30">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="pokeden-chip size-10 rounded-xl">
                <Sparkles className="size-5" aria-hidden="true" />
              </div>
              <div>
                <div className="font-medium">Welcome aboard!</div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Your den is set up. Try a quick focus session or plan your first study block.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => router.push("/pomodoro")}>
                <Play /> Quick focus
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push("/study-planner")}>
                <CalendarDays /> Plan a session
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={dismissFirstRunHint} aria-label="Dismiss">
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <KpiCards
        cards={[
          {
            title: "Today's focus",
            value: `${Math.floor(dailyFocusMinutes / 60)}h ${dailyFocusMinutes % 60}m`,
            footnote: `${dailyFocusSessions} sessions today`,
            badge: dailyGoalPercent !== null ? { tone: "up", label: `${dailyGoalPercent}% of goal` } : null,
          },
          {
            title: "Tasks due today",
            value: String(tasksDueCount),
            footnote: `${overdue.length} overdue · ${dueToday.length} due today`,
            badge: overdue.length > 0 ? { tone: "down", label: `${overdue.length} overdue` } : null,
          },
          {
            title: "Upcoming exams",
            value: String(upcomingExams.length),
            footnote: nextExamCountdown ? `Next exam in ${nextExamCountdown.days}d` : "No exams scheduled",
            badge: null,
          },
          {
            title: "Active subjects",
            value: String(activeSubjects.length),
            footnote: `${data.notes.length} notes kept · ${completedTaskCount} tasks done`,
            badge: null,
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>Today&apos;s classes</CardTitle>
              <CardAction>
                <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                  <Link href="/calendar">
                    View calendar <ArrowRight />
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {todayClasses.length === 0 ? (
                <p className="text-muted-foreground text-sm">No classes today.</p>
              ) : (
                todayClasses.map((event) => {
                  const subject = data.subjects.find((item) => item.id === event.subjectId);
                  const schedule = subject?.classSchedules.find((item) => item.id === event.sourceId);
                  const title = schedule?.label || subject?.name || "Class";
                  const metadata = [
                    subject?.name,
                    `${formatTime(event.startsAt)}–${formatTime(event.endsAt)}`,
                    schedule?.room,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <Link
                      key={event.id}
                      href={event.subjectId ? `/subjects?subject=${event.subjectId}` : "/calendar"}
                      className="group flex items-start gap-4 rounded-lg py-1 transition-colors hover:bg-muted/30"
                    >
                      <CalendarDays className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-sm leading-none group-hover:underline">{title}</div>
                        <div className="mt-1 truncate text-muted-foreground text-xs">{metadata}</div>
                      </div>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
              <CardAction>
                <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                  <Link href="/tasks">
                    View all <ArrowRight />
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {overdue.length + dueToday.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nothing due right now. Nice.</p>
              ) : (
                [...overdue, ...dueToday].slice(0, 6).map((task) => {
                  const subject = data.subjects.find((item) => item.id === task.subjectId);
                  const isOverdue = overdue.some((item) => item.id === task.id);
                  return (
                    <Link
                      key={task.id}
                      href={`/tasks?task=${task.id}`}
                      className="group flex items-start gap-4 rounded-lg py-1 transition-colors hover:bg-muted/30"
                    >
                      <ListTodo
                        className={`mt-0.5 size-5 shrink-0 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-sm leading-none group-hover:underline">
                          {task.title}
                        </div>
                        <div
                          className={
                            isOverdue
                              ? "mt-1 truncate text-destructive text-xs"
                              : "mt-1 truncate text-muted-foreground text-xs"
                          }
                        >
                          {subject?.name ?? "No subject"} · {isOverdue ? "Overdue" : "Due today"}
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>Upcoming exams</CardTitle>
              <CardAction>
                <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                  <Link href="/exams">
                    View all <ArrowRight />
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {upcomingExams.length === 0 ? (
                <p className="text-muted-foreground text-sm">No upcoming exams.</p>
              ) : (
                upcomingExams.map((exam) => {
                  const subject = data.subjects.find((item) => item.id === exam.subjectId);
                  const countdown = getExamCountdown(exam, now);
                  const countdownLabel = countdown.days === 0 ? "Today" : `${countdown.days}d left`;
                  return (
                    <Link
                      key={exam.id}
                      href={`/exams/${exam.id}`}
                      className="group flex items-start gap-4 rounded-lg py-1 transition-colors hover:bg-muted/30"
                    >
                      <GraduationCap className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-sm leading-none group-hover:underline">
                          {exam.title}
                        </div>
                        <div className="mt-1 truncate text-muted-foreground text-xs">
                          {subject?.name ?? "No subject"} · {formatExamDate(exam.startsAt)} · {countdownLabel}
                        </div>
                        <div className="mt-0.5 text-muted-foreground text-xs">
                          {getExamReadiness(exam)}% readiness · {exam.topics.length} topics
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-4 justify-self-center xl:justify-self-end">
          <CalendarPanel weekStartsOn={data.studyPreferences.weekStartsOn} />
          {recommendation ? (
            <Card className="border-primary/40">
              <CardHeader>
                <CardTitle className="text-base">Recommended study</CardTitle>
                <CardDescription>
                  {(() => {
                    const subject = data.subjects.find((item) => item.id === recommendation.subjectId);
                    switch (recommendation.reason) {
                      case "overdue-task":
                        return `${subject?.name ?? "This subject"} has overdue work. Start with a focused session.`;
                      case "exam-soon":
                        return `${subject?.name ?? "This subject"} has an exam coming up. Review while it's fresh.`;
                      case "low-progress":
                        return `${subject?.name ?? "This subject"} could use some study time.`;
                      default:
                        return `${subject?.name ?? "This subject"} hasn't been studied recently.`;
                    }
                  })()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2">
                <LoadingButton loading={isPending} loadingLabel="Starting…" onClick={startRecommended}>
                  <Play /> Start focus
                </LoadingButton>
                <Button variant="ghost" onClick={() => router.push(`/subjects?subject=${recommendation.subjectId}`)}>
                  Open subject <ArrowRight />
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Subject progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeSubjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active subjects.</p>
              ) : (
                activeSubjects.slice(0, 5).map((subject) => {
                  const progress = getSubjectProgress(data, subject.id);
                  return (
                    <div key={subject.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <Link className="font-medium hover:underline" href={`/subjects?subject=${subject.id}`}>
                          {subject.name}
                        </Link>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} aria-label={`${subject.name} progress ${progress} percent`} />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
