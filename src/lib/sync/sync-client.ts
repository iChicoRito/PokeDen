import { type PokeDenData, pokeDenDataSchema } from "@/features/pokeden/domain";

export type PullResult =
  | { status: "ok"; snapshot: PokeDenData }
  | { status: "empty" } // authoritative: cloud has no usable row
  | { status: "error" }; // network failure, timeout, non-OK status, invalid payload

/**
 * GET /api/sync/pull → validated cloud snapshot.
 * { status: "empty" } is authoritative — the cloud has no usable row — while
 * { status: "error" } means the pull failed (network error, ~10s timeout,
 * non-OK status, or invalid payload). Never throws.
 */
export async function pullSnapshot(): Promise<PullResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch("/api/sync/pull", { method: "GET", signal: controller.signal });
    if (!response.ok) return { status: "error" };
    const body = (await response.json()) as { snapshot?: unknown };
    if (body.snapshot === null || body.snapshot === undefined) return { status: "empty" };
    const parsed = pokeDenDataSchema.safeParse(body.snapshot);
    return parsed.success ? { status: "ok", snapshot: parsed.data } : { status: "error" };
  } catch {
    return { status: "error" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST /api/sync/push with the whole snapshot. Resolves true only when the
 * server accepted it (response.ok). Never throws.
 */
export async function pushSnapshot(data: PokeDenData): Promise<boolean> {
  try {
    const response = await fetch("/api/sync/push", {
      body: JSON.stringify({ snapshot: data, snapshotUpdatedAt: data.updatedAt }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    return response.ok;
  } catch {
    return false;
  }
}
