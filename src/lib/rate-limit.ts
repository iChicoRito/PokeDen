// T-18 T11: dependency-free fixed-window rate limiter for sync endpoints.
// In-memory: resets on server restart, single-instance only (see plan risks).

export const SYNC_PUSH_LIMIT = 30;
export const SYNC_PUSH_WINDOW_MS = 60_000;
export const SYNC_PULL_LIMIT = 60;
export const SYNC_PULL_WINDOW_MS = 60_000;

export type RateLimitKind = "push" | "pull";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

interface WindowState {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, WindowState>();

export function checkRateLimit(key: string, options: { kind?: RateLimitKind; nowMs?: number } = {}): RateLimitResult {
  const kind: RateLimitKind = options.kind ?? "push";
  const nowMs = options.nowMs ?? Date.now();
  const limit = kind === "push" ? SYNC_PUSH_LIMIT : SYNC_PULL_LIMIT;
  const windowMs = kind === "push" ? SYNC_PUSH_WINDOW_MS : SYNC_PULL_WINDOW_MS;

  const bucket = `${kind}:${key}:${Math.floor(nowMs / windowMs)}`;
  const existing = buckets.get(bucket);
  if (existing === undefined) {
    buckets.set(bucket, { count: 1, windowStart: Math.floor(nowMs / windowMs) * windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }
  if (existing.count >= limit) {
    return { allowed: false, retryAfterMs: Math.max(0, existing.windowStart + windowMs - nowMs) };
  }
  existing.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

/** Test-only escape hatch: drop all buckets. */
export function __resetRateLimits(): void {
  buckets.clear();
}
