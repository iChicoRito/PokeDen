// T-18 T13: pure last-write-wins sync engine.
// No React, no framework imports, no path aliases (node --test imports this directly).

export type SyncAction = "push" | "pull" | "none";

export interface Timestamped {
  updatedAt: string;
}

export type SyncDecisionContext = {
  /** Local snapshot holds no real user content (fresh-install auto-seed or post-full-reset shape). */
  localEmpty: boolean;
  /** Remote row exists but holds no real user content. */
  remoteEmpty: boolean;
  /** The user deliberately performed a Full reset on this device and it has not reached the cloud yet. */
  wipePending: boolean;
};

export function resolveSyncAction(
  local: Timestamped | null,
  remote: Timestamped | null,
  ctx: SyncDecisionContext,
): SyncAction {
  // A deliberate wipe on this device always wins over a fresh-install pull.
  if (ctx.wipePending && local !== null) return "push";
  // No local state at all (defensive; the app always seeds local data in practice).
  if (local === null) return remote === null ? "none" : "pull";
  // Fresh install: an empty auto-seeded local snapshot must never outrank a populated cloud row.
  if (ctx.localEmpty && remote !== null && !ctx.remoteEmpty) return "pull";
  // Cloud has no row: push real content up on first sign-in; push nothing if empty.
  if (remote === null) return ctx.localEmpty ? "none" : "push";
  // Both sides have real content: last-write-wins on updatedAt.
  if (local.updatedAt === remote.updatedAt) return "none";
  return local.updatedAt > remote.updatedAt ? "push" : "pull";
}

/** Legacy pure timestamp comparison (kept for callers/tests that predate the fresh-install rules). */
export function chooseSyncAction(local: Timestamped | null, remote: Timestamped | null): SyncAction {
  return resolveSyncAction(local, remote, { localEmpty: false, remoteEmpty: false, wipePending: false });
}
