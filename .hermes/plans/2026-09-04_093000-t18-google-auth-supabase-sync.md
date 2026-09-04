# T-18 — Google-Only Auth with Supabase Sync, Hardened Security — Implementation Plan

**Source:** `prompts/T-18.md` (78 lines, read 2026-09-04)
**Save path:** `.hermes/plans/2026-09-04_093000-t18-google-auth-supabase-sync.md`
**Mode:** Plan only. No code was changed to produce this plan.

---

## Goal

Add Google-OAuth-only sign-in backed by Supabase to the Pokademia Next.js app, with dual persistence (browser `localStorage` + Supabase `tbl_*` tables, RLS owner-only, rate-limited sync API) so a user's study data syncs cross-device on login.

---

## Current context / assumptions (verified by read-only inspection)

- **Stack:** Next.js 16 App Router, React 19 + React Compiler, Tailwind v4, shadcn/ui, TypeScript strict, Biome (`npm run check`, `npm run check:fix`, `npm run build`). Alias `@/*` → `src/*`. No test runner, no test files — do not invent a framework (per `CLAUDE.md`).
- **No Supabase today:** `package.json` has no `@supabase/*` deps; zero hits for `NEXT_PUBLIC_SUPABASE` / `supabase-js` in visible source; no `.env*`, no `middleware.ts`, no `src/lib/supabase/`. One stale file exists: `src/proxy.disabled.ts` (not read — implementer must read it; it likely holds disabled middleware logic).
- **Hidden Supabase skill exists (gitignored):** `.opencode/skills/supabase/SKILL.md` matched the Supabase search but is excluded from default search. Its core rules were read: verify against changelog, enable RLS on every `public` table, never use `auth.role()` (use `TO authenticated` + `(select auth.uid()) = …`), UPDATE needs SELECT policy + `USING` + `WITH CHECK`, never expose `service_role`/secret key in client, views bypass RLS, `SECURITY DEFINER` is dangerous, check Data API exposure + grants.
- **Persistence today is localStorage-only:** `src/data/pokeden/repository.client.ts` (241 lines) owns keys `pokademia:pokeden:data:v1`, `pokademia:pokeden:backup:v1`, `pokademia:pokeden:recovery`; exports `loadPokeDenData()`, `savePokeDenData()`, `createEmptyPokeDenData()`, `PokeDenStorageError`. Absent key = first-run empty profile + onboarding (`setupCompleted: false`); corrupt data falls back to backup then demo. **Do not rename these keys.**
- **State owner:** `src/features/pokeden/pokeden-provider.tsx` (955 lines, `"use client"`, zustand vanilla store) calls the repository on mount and on every mutation. This is the single wire-in point for cloud sync.
- **Users are mocks:** `src/data/users.ts` is a 2-row demo array. Template email/password pages exist only under `src/app/(template)/template/(main)/auth/` — leave them alone; gate only the real `(main)` routes.
- **Supabase credentials from T-18 (BLOCKER — treat as secrets, never commit):** URL `https://thdmmqdbtngrencwfqlw.supabase.co`, publishable key `sb_publishable_k8MVunfb0NnHDK-VZ6gx3Q_XaOM6Q7z`, direct connection password **masked (`***`)**, secret key **truncated (`sb_secret_qj..........`)**. Implementer cannot finish remote work until the user pastes the full secret + DB password into `.env.local` (untracked) — task 0.3 covers this.
- **Next.js 16 breaking changes:** per `CLAUDE.md` agent-rules block, read `node_modules/next/dist/docs/` before writing App Router code (cookies API is async, etc.).

---

## Architecture / proposed approach

Use **Supabase Auth (Google provider only) + `@supabase/ssr`** for cookie-based sessions in App Router: browser client for sign-in/out, server client for session refresh + sync API, OAuth code exchange in `src/app/auth/callback/route.ts`. Store one JSONB snapshot per user (`tbl_pokeden_states.payload`, validated by the existing `pokeDenDataSchema` zod schema) plus a thin `tbl_user_profiles` row — YAGNI over normalizing the whole domain. Sync is **last-write-wins on `updatedAt`**: pull on sign-in, debounced push on local save, server re-compares timestamps. Rate limiting is an **in-memory token bucket** in the sync route (no new infra); RLS is owner-only (`TO authenticated` + `auth.uid()` predicates) with `anon` revoked.

---

## Required skills (implementer must load before coding)

| When | Skill / reference | How |
|---|---|---|
| Any Supabase work | `.opencode/skills/supabase/SKILL.md` — read directly with `read_file` (it is gitignored, invisible to `skills_list`) | Follow its security checklist + changelog-first rule |
| Current lib docs | `context7-cli` via `skill_view(name="context7-cli")` | Fetch `@supabase/ssr` + `supabase-js` OAuth/cookies usage; do not rely on training data |
| Executing this plan | `subagent-driven-development` + `parallel-agent-orchestration` / `dispatching-parallel-agents` | Disjoint file ownership table below; agents never touch each other's files |
| Each code task | `test-driven-development` | Failing verify-script first, then minimal implementation |
| Debugging | `systematic-debugging` | Root-cause, check sibling paths |
| Before claiming done | `verification-before-completion` | Run the exact commands in Tests/validation, paste output |

---

## Parallel delegation — file ownership (no overlaps)

| Lane | Owns (only this lane edits) | Read-only for others |
|---|---|---|
| A — DB/schema | `supabase/migrations/*`, `supabase/seed.sql` (if needed) | — |
| B — Auth plumbing | `src/lib/supabase/*`, `src/app/auth/*`, `src/components/auth/*` | may read provider + repository |
| C — Sync | `src/lib/sync/*`, `src/app/api/pokeden-sync/*`, `src/lib/security/rate-limit.ts` + **surgical edits** to `src/data/pokeden/repository.client.ts`, `src/features/pokeden/pokeden-provider.tsx` | owns those two edits; B and D must not touch them |
| D — Hardening/QA | `src/proxy.ts` (or `middleware.ts`), `src/lib/security/*` (headers), `scripts/verify-t18-*.mjs`, `.env.example` | may read all, edit only these |

Merge order: A → B → C → D. C starts only after B's session helper exists; D runs last.

---

## Step-by-step tasks

### Phase 0 — Exploration & guardrails (one agent, ~10 min, read-only + secrets)

**Task 0.1 — Inventory entry points (2 min).**
Read these files, change nothing:
`src/proxy.disabled.ts`, `src/app/layout.tsx`, `src/app/(main)/layout.tsx`, `src/navigation/sidebar/sidebar-items.ts`, `src/features/pokeden/domain.ts` (schema exports), `src/data/pokeden/demo-fixtures.ts` (first 60 lines).
Verify: `search_files` for `signIn|signOut|getSession|getUser` in `src/` — expect zero hits outside `(template)`.

**Task 0.2 — Verify Supabase docs + CLI (3 min).**
Commands (expected output in parentheses):
```bash
npx -y supabase --version   # expect: supabase v2.x.x (any 2.79+; if older, upgrade — `db query` needs 2.79+, `db advisors` needs 2.81.3+)
node -e "fetch('https://supabase.com/changelog.md').then(r=>r.text()).then(t=>console.log(t.split('\n').filter(l=>/breaking-change/i.test(l)).slice(0,10).join('\n')))"
# expect: 0-10 lines with `breaking-change` tags, or empty (empty is fine — means no flagged breakage on the index page)
```
Then via `context7-cli`, fetch current `@supabase/ssr` docs for `createBrowserClient`, `createServerClient`, `exchangeCodeForSession`, `signInWithOAuth`. If docs contradict any snippet below, **docs win** — update the plan snippet before coding.

**Task 0.3 — Secrets contract (BLOCKER, 2 min, ask user).**
Create nothing yet. Ask the user for (via `clarify`, one round):
1. Full `SUPABASE_SECRET_KEY` (server-only) + confirmation the publishable key in T-18 is still valid.
2. Full Postgres direct-connection password (T-18 shows `***`).
3. Google Cloud OAuth client ID/secret — have they been entered in Supabase Dashboard → Auth → Providers → Google, with redirect `https://thdmmqdbtngrencwfqlw.supabase.co/auth/v1/callback`?
Do not proceed to Phase 1 remote-apply without (1)–(3). Local code (Phases 1–2 files) can be written with placeholder env first.

---

### Phase 1 — Database + RLS (Lane A, owns `supabase/migrations/*` only)

**Task 1.1 — Scaffold migration (2 min).**
```bash
npx -y supabase migration new create_tbl_user_profiles_and_pokeden_states
# expect: Created migration supabase/migrations/<timestamp>_create_tbl_user_profiles_and_pokeden_states.sql
ls supabase/migrations/  # expect: the new file listed
```
TDD: no test framework in repo — the "failing test" is `scripts/verify-t18-schema.mjs` (Lane D writes it in parallel; Lane A runs it). Before SQL is applied, expect `FAIL: relation tbl_user_profiles does not exist`.

**Task 1.2 — Write the migration (5 min). Paste exactly:**
```sql
-- T-18: Google-only auth app tables. All names use the tbl_ prefix.
create table public.tbl_user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null default 'Student',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tbl_pokeden_states (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  version integer not null default 2,
  updated_at timestamptz not null default now()
);

alter table public.tbl_user_profiles enable row level security;
alter table public.tbl_pokeden_states enable row level security;

-- Owner-only access. Note: UPDATE needs the SELECT policy to exist (Postgres RLS).
create policy "tbl_user_profiles_owner_select"
  on public.tbl_user_profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "tbl_user_profiles_owner_write"
  on public.tbl_user_profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "tbl_user_profiles_owner_update"
  on public.tbl_user_profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "tbl_pokeden_states_owner_select"
  on public.tbl_pokeden_states for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "tbl_pokeden_states_owner_write"
  on public.tbl_pokeden_states for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "tbl_pokeden_states_owner_update"
  on public.tbl_pokeden_states for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Data API exposure: authenticated only, anon revoked (RLS alone is not enough).
grant select, insert, update on public.tbl_user_profiles to authenticated;
grant select, insert, update on public.tbl_pokeden_states to authenticated;
revoke all on public.tbl_user_profiles from anon;
revoke all on public.tbl_pokeden_states from anon;

create index tbl_pokeden_states_updated_at_idx
  on public.tbl_pokeden_states (updated_at desc);
```
Then:
```bash
npm run check  # expect: no new errors (migration is SQL, biome ignores it)
```

**Task 1.3 — Apply + verify (3 min, needs Task 0.3 secrets).**
```bash
npx -y supabase db push --linked  # expect: ... Applying migration ... done (or use Dashboard SQL editor paste as fallback)
npx -y supabase db advisors --linked  # expect: no RLS/security warnings for tbl_* (requires CLI 2.81.3+; else Dashboard → Advisors)
```
Verify query (via Dashboard SQL editor or `psql $DIRECT_URL`):
```sql
select tablename from pg_tables where tablename like 'tbl\_%' escape '\';
-- expect: tbl_user_profiles, tbl_pokeden_states
select * from pg_policies where tablename like 'tbl\_%' escape '\';
-- expect: 6 rows (3 per table)
```
Negative RLS test (must do): with anon key, `select * from tbl_user_profiles` → expect 0 rows / permission error, not user data.

---

### Phase 2 — Auth plumbing (Lane B, owns `src/lib/supabase/*`, `src/app/auth/*` only)

**Task 2.1 — Install pinned deps (2 min).**
```bash
npm i -S @supabase/ssr@^0.5.0 @supabase/supabase-js@^2.47.0
npm run check  # expect: passes (run npm run check:fix if import order complains)
```
Verify: `node -e "console.log(require('./package.json').dependencies['@supabase/ssr'])"` → expect the pinned version.

**Task 2.2 — Env contract (2 min).** Create `.env.example` (paste exactly; real values go in untracked `.env.local`, never committed):
```bash
cat > .env.example <<'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://thdmmqdbtngrencwfqlw.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_k8MVunfb0NnHDK-VZ6gx3Q_XaOM6Q7z
# Server-only. Never prefix with NEXT_PUBLIC_. Never commit the real value.
SUPABASE_SECRET_KEY=
EOF
git check-ignore .env.local && echo IGNORED || echo NOT-IGNORED
# expect: IGNORED (if NOT-IGNORED, append ".env.local" to .gitignore first)
```

**Task 2.3 — Supabase clients (3 min).** Create `src/lib/supabase/client.ts` (paste exactly):
```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  return createBrowserClient(url, key);
}
```
Create `src/lib/supabase/server.ts` (paste exactly; if Next docs say otherwise, docs win):
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    },
  );
}

/** Service-role client — import ONLY in server routes that need RLS bypass (none planned). Never import from client components. */
export async function createServiceClient() {
  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Missing SUPABASE_SECRET_KEY.");
  return createAdminClient(url, secret, { auth: { persistSession: false } });
}
```
Verify: `npm run check` → expect pass.

**Task 2.4 — OAuth callback + pages, Google-only (5 min).**
Create `src/app/auth/callback/route.ts` (paste exactly):
```ts
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard/default";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/auth/sign-in?error=oauth_failed`);
}
```
Create `src/app/auth/sign-in/page.tsx` — single "Continue with Google" button only, no email/password fields (paste exactly):
```tsx
"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  const [error, setError] = useState<string | null>(null);
  async function signIn() {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="font-semibold text-2xl">Sign in to Pokademia</h1>
      <p className="text-muted-foreground text-sm">Google accounts only.</p>
      <Button onClick={signIn}>Continue with Google</Button>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </main>
  );
}
```
Create `src/app/auth/sign-out/route.ts`:
```ts
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/auth/sign-in", request.url));
}
```
Gate: in `src/app/(main)/layout.tsx` (Lane B may read but the edit belongs to Lane C's provider batch — coordinate so only one lane edits that file; preferred: Lane B adds a `src/components/auth/session-guard.tsx` wrapper and Lane C mounts it). Simplest guard component:
```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
export function SessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/auth/sign-in");
      else setReady(true);
    });
  }, [router]);
  if (!ready) return null;
  return <>{children}</>;
}
```
Verify: `npm run build` → expect `✓ Compiled successfully`, and `/auth/sign-in` in the route list. Manual: `npm run dev`, visit `http://localhost:3000/auth/sign-in` → only a Google button, no password field.

---

### Phase 3 — Dual persistence + sync (Lane C)

**Task 3.1 — Rate limiter (3 min).** Create `src/lib/security/rate-limit.ts` (paste exactly):
```ts
const buckets = new Map<string, { count: number; resetAt: number }>();

/** In-memory fixed-window limiter. key = user id or IP. limit = max hits per windowMs. */
export function isRateLimited(key: string, limit = 30, windowMs = 60_000): { limited: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, retryAfterMs: 0 };
  }
  entry.count += 1;
  if (entry.count > limit) return { limited: true, retryAfterMs: entry.resetAt - now };
  return { limited: false, retryAfterMs: 0 };
}
```

**Task 3.2 — Sync API (5 min).** Create `src/app/api/pokeden-sync/route.ts` (paste exactly; validates with the existing domain schema, last-write-wins):
```ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { pokeDenDataSchema } from "@/features/pokeden/domain";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/security/rate-limit";

const putSchema = z.object({
  payload: pokeDenDataSchema,
  version: z.number().int().default(2),
  updatedAt: z.string().datetime(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const check = isRateLimited(`sync:${auth.user.id}`, 60);
  if (check.limited)
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "60" } });
  const { data, error } = await supabase
    .from("tbl_pokeden_states")
    .select("payload, version, updated_at")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ state: data });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const check = isRateLimited(`sync:${auth.user.id}`, 30);
  if (check.limited)
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "60" } });
  const parsed = putSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  const { payload, version, updatedAt } = parsed.data;
  const { data: existing } = await supabase
    .from("tbl_pokeden_states")
    .select("updated_at")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (existing && new Date(existing.updated_at).getTime() >= new Date(updatedAt).getTime())
    return NextResponse.json({ kept: "server" }, { status: 200 });
  const { error } = await supabase.from("tbl_pokeden_states").upsert(
    { user_id: auth.user.id, payload, version, updated_at: updatedAt },
    { onConflict: "user_id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from("tbl_user_profiles").upsert(
    {
      id: auth.user.id,
      email: auth.user.email ?? "",
      display_name: auth.user.user_metadata?.full_name ?? auth.user.user_metadata?.name ?? "Student",
      avatar_url: auth.user.user_metadata?.avatar_url ?? null,
    },
    { onConflict: "id" },
  );
  return NextResponse.json({ kept: "client" });
}
```
Verify: `npm run check` → pass. Unauthenticated `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/pokeden-sync` → expect `401`.

**Task 3.3 — Cloud adapter (5 min).** Create `src/lib/sync/pokeden-cloud-sync.ts` (paste exactly):
```ts
import type { PokeDenData } from "@/features/pokeden/domain";

export type CloudState = { payload: PokeDenData; version: number; updatedAt: string } | null;

export async function pullCloudState(): Promise<CloudState> {
  const res = await fetch("/api/pokeden-sync", { cache: "no-store" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`pull failed: ${res.status}`);
  const body = (await res.json()) as { state: { payload: PokeDenData; version: number; updated_at: string } | null };
  if (!body.state) return null;
  return { payload: body.state.payload, version: body.state.version, updatedAt: body.state.updated_at };
}

let timer: ReturnType<typeof setTimeout> | null = null;
/** Debounced push — call from the provider after every local save. */
export function pushCloudStateDebounced(data: PokeDenData) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    fetch("/api/pokeden-sync", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ payload: data, version: 2, updatedAt: data.updatedAt }),
    }).catch(() => {});
  }, 1500);
}

/** Last-write-wins: returns which side won. Server already enforces the same rule. */
export function pickWinner(localUpdatedAt: string, cloudUpdatedAt: string): "local" | "cloud" {
  return new Date(cloudUpdatedAt).getTime() > new Date(localUpdatedAt).getTime() ? "cloud" : "local";
}
```

**Task 3.4 — Wire into provider + repository (5 min, Lane C only).**
In `src/data/pokeden/repository.client.ts`: no key changes; after successful `savePokeDenData`, callers already persist locally — add one optional hook export `notifyPokeDenSaved(data: PokeDenData)` that dynamic-imports the cloud adapter (keeps the repository importable on server). In `src/features/pokeden/pokeden-provider.tsx`: on mount, after `loadPokeDenData()`, `pullCloudState()` when a session exists; if cloud wins (`pickWinner`), replace store state + `savePokeDenData(cloud.payload)`; after every mutation that saves, call `pushCloudStateDebounced(state)`. On sign-out, push once, then clear nothing (local cache stays for offline viewing; next login re-pulls).
Verify: `npm run build` → success; manual cross-device test in Tests/validation.

---

### Phase 4 — Hardening + session refresh (Lane D)

**Task 4.1 — Session refresh + security headers (5 min).**
Read `src/proxy.disabled.ts` first. Create `src/lib/supabase/middleware.ts` per current `@supabase/ssr` docs (refresh session, return response), then enable it from `src/proxy.ts` (or `middleware.ts` if the repo prefers that name — match what `proxy.disabled.ts` implies). Add headers in `next.config.mjs`: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `frame-ancestors 'self'`.
Verify: `npm run build` → pass; `curl -sI http://localhost:3000/auth/sign-in | grep -i "x-content-type"` → expect `nosniff`.

**Task 4.2 — Verify scripts (5 min).** Create `scripts/verify-t18-schema.mjs` (queries `pg_tables`/`pg_policies` via `DATABASE_URL`, fails loudly if `tbl_*` missing) and `scripts/verify-t18-sync.mjs` (unauth GET → 401; invalid PUT → 400/401; rapid 40× GET → at least one 429). Run:
```bash
node scripts/verify-t18-schema.mjs  # expect: PASS tbl_user_profiles, PASS tbl_pokeden_states, PASS 6 policies
node scripts/verify-t18-sync.mjs    # expect: PASS 401 unauth, PASS rate-limit observed
```

---

## Tests / validation (Lane D owns; every lane runs per-task checks)

Per task TDD cycle: (1) write/run the failing check (`node scripts/verify-t18-*.mjs`, `curl`, or `npm run check`) and confirm it fails; (2) implement minimally; (3) rerun to pass; (4) `git add` + `git commit` with `feat:`/`fix:` prefix (Biome pre-commit must pass).
Final gate (all must pass before marking complete):
```bash
npm run check        # expect: no errors
npm run build        # expect: ✓ Compiled successfully
node scripts/verify-t18-schema.mjs
node scripts/verify-t18-sync.mjs
```
Manual OAuth smoke (`npm run dev`): sign in with Google → lands on `/dashboard/default`; reload → still signed in; sign out → redirected to `/auth/sign-in`; direct visit to `/(main)` route while signed out → bounced to sign-in. Cross-device: sign in on device B → same subjects/tasks/notes as device A (cloud pull won). Regression: fresh profile (cleared `localStorage`) still lands in onboarding with empty records, not demo data. RLS negative: anon-key query returns no rows; authenticated user A cannot read user B's row (expect 0 rows).

---

## Risks, tradeoffs, open questions

**Risks / blockers:**
- Secrets incomplete (masked DB password, truncated secret key) — remote apply + OAuth untestable until user supplies them. Mitigation: build all code against `.env.example` placeholders first.
- Google Cloud console setup (consent screen, OAuth client, Supabase provider toggle, redirect URLs for localhost + production) is outside the repo — a misconfigured redirect surfaces only as `?error=oauth_failed`. Mitigation: verify Task 0.3 checklist before debugging code.
- Next.js 16 + `@supabase/ssr` API drift — snippets above are best-effort; docs/Context7 win on conflict.
- `service_role`/secret key leak — only `src/lib/supabase/server.ts` may reference `SUPABASE_SECRET_KEY`, never client components, never `NEXT_PUBLIC_`.
- Public-schema Data API exposure — migration revokes `anon`; if the project later enables "expose new tables automatically", re-run the revoke + advisors check.
- JWT freshness: `app_metadata`/`auth.jwt()` claims lag token refresh — sync API uses server-side `auth.getUser()` (fresh) instead of trusting client claims.
- Conflict UX: last-write-wins silently drops the loser — acceptable YAGNI for v1; a merge UI is explicitly out of scope.
- In-memory rate limiter resets on redeploy/scale-out — acceptable for single-instance v1; upgrade to Upstash/KV only if abuse observed.
- Single-JSONB-snapshot tradeoff: schema evolution is free (zod validates), but no per-row queries/analytics; normalize later if reporting needs arise.

**Open questions for the user (Task 0.3 round):**
1. Should pre-existing local-only data auto-upload on first Google sign-in (upload wins), or should cloud win and local be archived to `POKEDEN_BACKUP_KEY`?
2. Keep the `(template)` demo email/password pages untouched for reference, or delete them to enforce "Google-only" repo-wide?
3. Rate limits: keep 30 PUT / 60 GET per minute per user, or different thresholds?
4. On sign-out, keep or clear the local cache on that device?
5. Is `tbl_user_profiles` + `tbl_pokeden_states` sufficient, or are per-entity tables (subjects/tasks) required in v1?

**Execution goal for subagents (paste to `subagent-driven-development` after approval):**
> Implement T-18 per `.hermes/plans/2026-09-04_093000-t18-google-auth-supabase-sync.md`, Phase order A→B→C→D, lanes editing only their owned files, TDD with `scripts/verify-t18-*.mjs` + `npm run check` + `npm run build` green before completion; stop and report if Supabase secrets or Google provider config block remote verification.
