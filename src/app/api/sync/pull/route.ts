import { NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rate = checkRateLimit(user.id, { kind: "pull" });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
        status: 429,
      },
    );
  }

  const { data, error } = await supabase
    .from("tbl_profiles")
    .select("snapshot, snapshot_updated_at")
    .eq("user_id", user.id)
    .single();
  if (error || data === null) return NextResponse.json({ snapshot: null, snapshotUpdatedAt: null });

  return NextResponse.json({
    snapshot: data.snapshot,
    snapshotUpdatedAt: data.snapshot_updated_at,
  });
}
