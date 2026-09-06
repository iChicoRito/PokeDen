"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Coffee, Pause, Play, RotateCcw, Square } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/app/(main)/_components/page-header";
import { PomodoroSkeleton } from "@/app/(main)/_components/page-skeletons";
import { LoadingButton } from "@/components/loading-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getActiveTimerElapsedSeconds, getActiveTimerRemainingSeconds } from "@/features/pokeden/derivations";
import { usePokeDenStore } from "@/features/pokeden/pokeden-provider";
import {
  exitPomodoroFullscreen,
  isPomodoroFocusModeActive,
  requestPomodoroFullscreen,
} from "@/features/pokeden/pomodoro-focus-mode";
import { usePendingAction } from "@/hooks/use-pending-action";
import { cn } from "@/lib/utils";

import { CompanionCanvas } from "./companion-canvas";
import { CompanionDock } from "./companion-dock";

type TimerMode = "focus" | "short-break" | "long-break";

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function modeTagline(mode: TimerMode): string {
  if (mode === "focus") return "Time to study.";
  if (mode === "short-break") return "A short reset.";
  return "A longer rest.";
}

function modeLabel(mode: TimerMode): string {
  if (mode === "focus") return "Focus";
  if (mode === "short-break") return "Short break";
  return "Long break";
}

export function PomodoroScreen() {
  const data = usePokeDenStore((state) => state.data);
  const isHydrated = usePokeDenStore((state) => state.isHydrated);
  const storageError = usePokeDenStore((state) => state.storageError);
  const actions = usePokeDenStore((state) => state.actions);
  const { run } = usePendingAction();

  const timer = data.activeTimer;
  const focusLayout = isPomodoroFocusModeActive(timer?.status);
  const companionVisible = data.companionPreferences.visible;
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: now is the per-second tick that re-evaluates completion.
  useEffect(() => {
    if (timer?.status !== "running") return;
    const remaining = getActiveTimerRemainingSeconds(data, new Date());
    if (remaining <= 0 && !completionHandledRef.current) {
      completionHandledRef.current = true;
      actions.completeTimer();
      void exitPomodoroFullscreen(document);
      toast.success("Focus session complete. Great work!");
      // Normalize the completed-but-not-idle limbo: transition back to the idle
      // view (mode tabs + Start CTA) through the store's own reset flow.
      track("reset", () =>
        run(
          () => {
            actions.resetTimer();
          },
          { minMs: 250 },
        ).catch(() => toast.error("Could not reset the timer.")),
      );
    }
    if (remaining > 0) completionHandledRef.current = false;
  }, [actions, data, now, timer]);

  useEffect(
    () => () => {
      void exitPomodoroFullscreen(document);
    },
    [],
  );

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
    const fullscreenRequest = requestPomodoroFullscreen(document);
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
      ).catch(async () => {
        if (await fullscreenRequest) await exitPomodoroFullscreen(document);
        toast.error("Could not start the timer.");
      }),
    );
  };

  const pause = () =>
    track("pause", () =>
      run(() => actions.pauseTimer(), { minMs: 250 }).catch(() => toast.error("Could not pause the timer.")),
    );

  const resume = () => {
    void requestPomodoroFullscreen(document);
    track("resume", () =>
      run(() => actions.resumeTimer(), { minMs: 250 }).catch(() => toast.error("Could not resume the timer.")),
    );
  };

  const stop = () =>
    track("stop", () =>
      run(
        () => {
          actions.stopTimer();
          void exitPomodoroFullscreen(document);
          toast("Session stopped. Partial time was not counted.");
        },
        { minMs: 250 },
      ).catch(() => toast.error("Could not stop the timer.")),
    );

  const reset = () =>
    track("reset", () =>
      run(
        () => {
          actions.resetTimer();
          void exitPomodoroFullscreen(document);
        },
        { minMs: 250 },
      ).catch(() => toast.error("Could not reset the timer.")),
    );

  if (!isHydrated) return <PomodoroSkeleton />;

  return (
    <div
      className={
        focusLayout
          ? // Fixed viewport height + overflow-hidden keep the vertical scrollbar away;
            // regular page padding keeps the card from hugging the viewport edges.
            "relative flex h-svh w-full flex-col items-center gap-6 overflow-hidden p-4 sm:p-6 lg:p-8"
          : "mx-auto flex w-full max-w-7xl flex-col items-center gap-6 p-4 sm:p-6 lg:p-8"
      }
    >
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

      {!timer ? (
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
        </Tabs>
      ) : null}

      <Card
        className={cn(
          "relative min-h-[340px] w-full overflow-hidden border-primary/20 bg-transparent shadow-sm",
          focusLayout && "grow",
        )}
      >
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-10 select-none border-primary/20 border-t bg-gradient-to-t from-secondary/50 via-secondary/25 to-transparent"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-10 z-0 h-1 select-none bg-primary/35 shadow-sm"
          aria-hidden="true"
        />
        <CompanionCanvas remainingSeconds={remaining} totalSeconds={targetSeconds} />
        <CardContent
          className={cn(
            // pointer-events-none lets companion sprites under this overlay receive
            // pointer events; interactive rows below opt back in with pointer-events-auto.
            "pointer-events-none relative z-10 flex flex-col items-center gap-6 py-10",
            timer ? "pb-24" : "pb-16",
            // Focus layout: centered content in the tall card; the dock and progress
            // bar stay in normal flow below the card, above the sprites' ground strip.
            focusLayout && "flex-1 justify-center",
          )}
        >
          {timer ? (
            <>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="w-fit">
                  {modeLabel(timer.mode)}
                </Badge>
              </div>
              <div className="text-center">
                <div className="font-semibold text-xl">{subject?.name ?? "Unfocused session"}</div>
                {task ? (
                  <div className="text-muted-foreground text-sm">Related task: {task.title}</div>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    {timer.status === "running" ? "Running" : timer.status === "paused" ? "Paused" : "Ready"}
                  </div>
                )}
              </div>
              <div
                className="rounded-2xl bg-card/70 px-6 py-2 text-center backdrop-blur-sm"
                aria-live="polite"
                aria-atomic="true"
              >
                <div className="font-mono font-semibold text-6xl tabular-nums tracking-tight sm:text-7xl">
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
              <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
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
                  <LoadingButton
                    size="lg"
                    loading={pendingAction === "resume"}
                    loadingLabel="Resuming…"
                    onClick={resume}
                  >
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
              <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
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
            </>
          ) : (
            <>
              <div
                className="rounded-2xl bg-card/70 px-6 py-2 text-center backdrop-blur-sm"
                aria-live="polite"
                aria-atomic="true"
              >
                <div className="font-mono font-semibold text-6xl tabular-nums tracking-tight sm:text-7xl">
                  {formatClock(defaults[selectedMode] * 60)}
                </div>
                <div className="mt-1 min-h-5 text-muted-foreground text-sm">{modeTagline(selectedMode)}</div>
              </div>
              <LoadingButton
                size="lg"
                className="pointer-events-auto"
                loading={pendingAction === `start-${selectedMode}`}
                loadingLabel="Starting…"
                onClick={() => start(selectedMode)}
              >
                <Play /> Start {modeLabel(selectedMode).toLowerCase()}
              </LoadingButton>
            </>
          )}
        </CardContent>
      </Card>

      {timer ? (
        <div className="flex w-full justify-center">
          <div className="h-1 w-full max-w-3xl overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}

      {companionVisible ? <CompanionDock /> : null}
    </div>
  );
}
