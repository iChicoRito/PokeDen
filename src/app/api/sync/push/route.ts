import { NextResponse } from "next/server";

import { pokeDenDataSchema } from "@/features/pokeden/domain";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

const MAX_BODY_CHARS = 1_000_000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rate = checkRateLimit(user.id, { kind: "push" });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
        status: 429,
      },
    );
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_CHARS) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(raw) as unknown;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 422 });
  }
  const envelope = body as { snapshot?: unknown; snapshotUpdatedAt?: unknown };
  const parsed = pokeDenDataSchema.safeParse(envelope.snapshot);
  if (!parsed.success) return NextResponse.json({ error: "invalid_snapshot" }, { status: 422 });
  if (envelope.snapshotUpdatedAt !== parsed.data.updatedAt) {
    return NextResponse.json({ error: "updated_at_mismatch" }, { status: 409 });
  }

  const { error } = await supabase.from("tbl_profiles").upsert(
    {
      email: user.email ?? "",
      snapshot: parsed.data,
      snapshot_updated_at: parsed.data.updatedAt,
      user_id: user.id,
    },
    { onConflict: "user_id" },
  );
  if (error) return NextResponse.json({ error: "sync_failed" }, { status: 500 });

  return NextResponse.json({ ok: true, snapshotUpdatedAt: parsed.data.updatedAt });
}
