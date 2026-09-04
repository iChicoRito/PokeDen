// T-18 T13: pure last-write-wins sync engine.
// No React, no framework imports, no path aliases (node --test imports this directly).

export type SyncAction = "push" | "pull" | "none";

export interface Timestamped {
  updatedAt: string;
}

export const PUSH_COOLDOWN_MS = 5_000;

export function chooseSyncAction(local: Timestamped | null, remote: Timestamped | null): SyncAction {
  if (local === null && remote === null) return "none";
  if (remote === null) return "push";
  if (local === null) return "pull";
  if (local.updatedAt === remote.updatedAt) return "none";
  return local.updatedAt > remote.updatedAt ? "push" : "pull";
}

export function shouldPush(lastPushAt: number | null, nowMs: number, cooldownMs: number = PUSH_COOLDOWN_MS): boolean {
  if (lastPushAt === null) return true;
  return nowMs - lastPushAt >= cooldownMs;
}

const pending: Array<unknown> = [];

export function enqueuePendingPush<T>(item: T): void {
  pending.push(item);
}

export function takePendingPush<T>(): T | null {
  if (pending.length === 0) return null;
  return pending.shift() as T;
}

/** Test-only escape hatch: drop queued pushes. */
export function __resetPendingPushes(): void {
  pending.length = 0;
}
