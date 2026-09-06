import { NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export async function DELETE() {
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

  const { error } = await supabase.from("tbl_profiles").delete().eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "sync_failed" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
