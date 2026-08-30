"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { Coffee, Pause, Play, RotateCcw, Square } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/app/(main)/_components/page-header";
import { PomodoroSkeleton } from "@/app/(main)/_components/page-skeletons";
import { LoadingButton } from "@/components/loading-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getActiveTimerElapsedSeconds,
  getActiveTimerRemainingSeconds,
  getDailyFocusMinutes,
  getDailyFocusSessionCount,
} from "@/features/pokeden/derivations";
import { usePokeDenStore } from "@/features/pokeden/pokeden-provider";
import { usePendingAction } from "@/hooks/use-pending-action";

type TimerMode = "focus" | "short-break" | "long-break";

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

type ModeClockProps = { mode: TimerMode; minutes: number; onStart: (mode: TimerMode) => void };

function ModeClock({ mode, minutes, onStart }: ModeClockProps) {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center gap-4 py-8">
        <div className="font-mono font-semibold text-6xl tabular-nums">{formatClock(minutes * 60)}</div>
        <p className="text-muted-foreground text-sm">
          {mode === "focus" ? "Time to study." : mode === "short-break" ? "A short reset." : "A longer rest."}
        </p>
        <Button size="lg" onClick={() => onStart(mode)}>
          <Play /> Start {mode === "focus" ? "focus" : mode === "short-break" ? "short break" : "long break"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function PomodoroScreen() {
  const router = useRouter();
  const data = usePokeDenStore((state) => state.data);
  const isHydrated = usePokeDenStore((state) => state.isHydrated);
  const storageError = usePokeDenStore((state) => state.storageError);
  const actions = usePokeDenStore((state) => state.actions);
  const { run } = usePendingAction();

  const timer = data.activeTimer;
  const [now, setNow] = useState(() => new Date());
  const [selectedMode, setSelectedMode] = useState<TimerMode>(timer?.mode ?? "focus");
  const completionHandledRef = useRef(false);

  useEffect(() => {
    if (timer?.mode) setSelectedMode(timer.mode);
  }, [timer?.mode]);

  useEffect(() => {
    if (timer?.status !== "running") return;
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, [timer?.status]);

  useEffect(() => {
    if (timer?.status !== "running") return;
    const remaining = getActiveTimerRemainingSeconds(data, new Date());
    if (remaining <= 0 && !completionHandledRef.current) {
      completionHandledRef.current = true;
      actions.completeTimer();
      toast.success("Focus session complete. Great work!");
    }
    if (remaining > 0) completionHandledRef.current = false;
  }, [actions, data, timer]);

  const elapsed = timer ? getActiveTimerElapsedSeconds(data, now) : 0;
  const remaining = timer ? getActiveTimerRemainingSeconds(data, now) : 0;
  const targetSeconds = timer ? timer.targetMinutes * 60 : data.studyPreferences.defaultFocusMinutes * 60;
  const progress = timer ? Math.min(100, (elapsed / targetSeconds) * 100) : 0;

  const defaults = useMemo(
    () => ({
      focus: data.studyPreferences.defaultFocusMinutes,
      "short-break": data.studyPreferences.defaultBreakMinutes,
      "long-break": data.studyPreferences.longBreakMinutes,
    }),
    [data.studyPreferences],
  );

  const subject = timer?.subjectId ? data.subjects.find((item) => item.id === timer.subjectId) : undefined;
  const task = timer?.taskId ? data.tasks.find((item) => item.id === timer.taskId) : undefined;

  // Tracks which action is pending so each control's feedback reflects its own
  // operation. Start/switch buttons swap out of the DOM as soon as the store
  // updates, so their pending state also renders in the status line below the
  // clock, where it survives the swap until the minimum hold elapses.
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const track = (name: string, action: () => Promise<unknown>) => {
    setPendingAction(name);
    void action().finally(() => {
      setPendingAction((current) => (current === name ? null : current));
    });
  };
  const pendingLabel =
    pendingAction === "pause"
      ? "Pausing…"
      : pendingAction === "resume"
        ? "Resuming…"
        : pendingAction === "stop"
          ? "Stopping…"
          : pendingAction === "reset"
            ? "Resetting…"
            : pendingAction === "start-focus"
              ? "Starting focus…"
              : pendingAction === "start-short-break"
                ? "Switching to short break…"
                : pendingAction === "start-long-break"
                  ? "Switching to long break…"
                  : null;

  const start = (mode: TimerMode) => {
    track(`start-${mode}`, () =>
      run(
        () => {
          actions.startTimer({
            mode,
            targetMinutes: defaults[mode],
            subjectId: mode === "focus" ? (timer?.subjectId ?? null) : null,
            taskId: mode === "focus" ? (timer?.taskId ?? null) : null,
            studySessionId: mode === "focus" ? (timer?.studySessionId ?? null) : null,
            examId: mode === "focus" ? (timer?.examId ?? null) : null,
            examTopicId: mode === "focus" ? (timer?.examTopicId ?? null) : null,
          });
          toast.success(mode === "focus" ? "Focus started. You've got this!" : "Break started. Rest well.");
        },
        { minMs: 250 },
      ).catch(() => toast.error("Could not start the timer.")),
    );
  };

  const pause = () =>
    track("pause", () =>
      run(() => actions.pauseTimer(), { minMs: 250 }).catch(() => toast.error("Could not pause the timer.")),
    );
  const resume = () =>
    track("resume", () =>
      run(() => actions.resumeTimer(), { minMs: 250 }).catch(() => toast.error("Could not resume the timer.")),
    );
  const stop = () =>
    track("stop", () =>
      run(
        () => {
          actions.stopTimer();
          toast("Session stopped. Partial time was not counted.");
        },
        { minMs: 250 },
      ).catch(() => toast.error("Could not stop the timer.")),
    );
  const reset = () =>
    track("reset", () =>
      run(() => actions.resetTimer(), { minMs: 250 }).catch(() => toast.error("Could not reset the timer.")),
    );

  if (!isHydrated) return <PomodoroSkeleton />;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Focus, one interval at a time"
        description="Start a planned session here or choose a mode and begin."
      />

      {storageError ? (
        <div
          className="w-full rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive text-sm"
          role="alert"
        >
          Changes may not be saved. Your timer remains available.
        </div>
      ) : null}

      {timer ? (
        <Card className="w-full overflow-hidden">
          <CardHeader className="items-center gap-1 text-center">
            <Badge variant="secondary" className="w-fit">
              {timer.mode === "focus" ? "Focus" : timer.mode === "short-break" ? "Short break" : "Long break"}
            </Badge>
            <CardTitle className="text-xl">{subject?.name ?? "Unfocused session"}</CardTitle>
            {task ? (
              <CardDescription>Related task: {task.title}</CardDescription>
            ) : (
              <CardDescription>
                {timer.status === "running" ? "Running" : timer.status === "paused" ? "Paused" : "Ready"}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <div className="relative grid size-64 place-items-center sm:size-72" aria-live="polite" aria-atomic="true">
              <Progress
                value={progress}
                className="absolute inset-0 size-full rounded-full [&>div]:rounded-full"
                aria-hidden="true"
              />
              <div className="relative text-center">
                <div className="font-mono font-semibold text-5xl tabular-nums tracking-tight">
                  {formatClock(remaining)}
                </div>
                <div className="mt-1 min-h-5 text-muted-foreground text-sm" aria-live="polite">
                  {pendingLabel ? (
                    <span className="inline-flex items-center justify-center gap-1.5">
                      <Spinner className="size-3.5" /> {pendingLabel}
                    </span>
                  ) : timer.status === "paused" ? (
                    "Paused"
                  ) : timer.status === "completed" ? (
                    "Complete"
                  ) : (
                    "Remaining"
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {timer.status === "running" ? (
                <LoadingButton
                  size="lg"
                  variant="outline"
                  loading={pendingAction === "pause"}
                  loadingLabel="Pausing…"
                  onClick={pause}
                >
                  <Pause /> Pause
                </LoadingButton>
              ) : timer.status === "paused" ? (
                <LoadingButton size="lg" loading={pendingAction === "resume"} loadingLabel="Resuming…" onClick={resume}>
                  <Play /> Resume
                </LoadingButton>
              ) : (
                <LoadingButton
                  size="lg"
                  loading={pendingAction === `start-${selectedMode}`}
                  loadingLabel="Starting…"
                  onClick={() => start(selectedMode)}
                >
                  <Play /> Start
                </LoadingButton>
              )}
              <LoadingButton
                size="lg"
                variant="outline"
                loading={pendingAction === "stop"}
                loadingLabel="Stopping…"
                onClick={stop}
              >
                <Square /> Stop
              </LoadingButton>
              <LoadingButton
                size="lg"
                variant="ghost"
                loading={pendingAction === "reset"}
                loadingLabel="Resetting…"
                onClick={reset}
              >
                <RotateCcw /> Reset
              </LoadingButton>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <LoadingButton
                variant="outline"
                size="sm"
                loading={pendingAction === "start-short-break"}
                loadingLabel="Switching…"
                onClick={() => start("short-break")}
              >
                <Coffee /> Short break
              </LoadingButton>
              <LoadingButton
                variant="outline"
                size="sm"
                loading={pendingAction === "start-long-break"}
                loadingLabel="Switching…"
                onClick={() => start("long-break")}
              >
                <Coffee /> Long break
              </LoadingButton>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs
          className="w-full gap-6"
          value={selectedMode}
          onValueChange={(value) => setSelectedMode(value as TimerMode)}
        >
          <TabsList className="self-center" aria-label="Timer mode">
            <TabsTrigger value="focus">Focus</TabsTrigger>
            <TabsTrigger value="short-break">Short break</TabsTrigger>
            <TabsTrigger value="long-break">Long break</TabsTrigger>
          </TabsList>
          <TabsContent value="focus">
            <ModeClock mode="focus" minutes={defaults.focus} onStart={start} />
          </TabsContent>
          <TabsContent value="short-break">
            <ModeClock mode="short-break" minutes={defaults["short-break"]} onStart={start} />
          </TabsContent>
          <TabsContent value="long-break">
            <ModeClock mode="long-break" minutes={defaults["long-break"]} onStart={start} />
          </TabsContent>
        </Tabs>
      )}

      <div className="grid w-full gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Today's focus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-3xl tracking-tight">
              {Math.floor(getDailyFocusMinutes(data, now) / 60)}h {getDailyFocusMinutes(data, now) % 60}m
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Sessions today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-3xl tracking-tight">{getDailyFocusSessionCount(data, now)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Next session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-3xl tracking-tight">#{getDailyFocusSessionCount(data, now) + 1}</div>
          </CardContent>
        </Card>
      </div>

      {data.companionPreferences.visible ? (
        <Card className="w-full bg-muted/30">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="font-medium">{data.companionPreferences.name} is studying quietly</div>
              <div className="text-muted-foreground text-xs">Companions never interrupt your focus.</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push("/settings")}>
              Companion settings
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
