export type TimerClockState = {
  readonly accumulatedSeconds: number;
  readonly startedAt: string;
  readonly status: "idle" | "running" | "paused" | "completed";
};

export function getTimerElapsedSeconds(timer: TimerClockState, now = new Date()): number {
  if (timer.status !== "running") return timer.accumulatedSeconds;
  const currentSegment = Math.max(0, Math.floor((now.getTime() - new Date(timer.startedAt).getTime()) / 1000));
  return timer.accumulatedSeconds + currentSegment;
}
