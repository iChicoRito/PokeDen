# T-19: Remove Hard Auth Barrier, Add Optional Settings Sync

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the mandatory sign-in gate so users can use Pokademia freely on first visit, and add a Google sign-in option in the Settings page for optional cloud sync.

**Architecture:** The change is surgical. A single `SessionGuard` component wrapping the `(main)` layout is the only hard auth gate — removing it makes all routes open. The existing sync infrastructure (`notifyPokeDenSaved`, `pokeden-provider` auto-pull, `/api/sync/push` + `/api/sync/pull`) already checks for a session before running, so it naturally degrades to local-only for anonymous users. The Settings page already has a placeholder "Account" card that gets replaced with a real sign-in/sign-out UI. The `signOut` function and OAuth callback are updated to redirect to `/settings` instead of `/auth/sign-in`.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase SSR, Zustand, Tailwind v4, shadcn/ui, Biome

**Spec:** `prompts/T-19.md`

## Global Constraints

- Secrets (Google OAuth, Supabase keys) stay in `.env.local` only
- Supabase project `thdmmqdbtngrencwfqlw`, table `tbl_profiles` with RLS — must not break
- Local storage is source of truth; cloud is optional sync target
- No new backend or data model changes
- Biome enforces: kebab-case filenames, sorted Tailwind classes, double quotes, semicolons, line width 120
- Run `npm run check:fix` before committing

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| **Modify** | `src/app/(main)/layout.tsx` | Remove `SessionGuard` wrapper |
| **Modify** | `src/features/auth/auth-provider.tsx` | Update `signOut` redirect to `/settings` |
| **Modify** | `src/app/auth/callback/route.ts` | Redirect to `/settings` after OAuth |
| **Modify** | `src/app/auth/sign-out/route.ts` | Redirect to `/dashboard` after sign-out |
| **Modify** | `src/app/(main)/settings/_components/settings-screen.tsx` | Replace placeholder "Account" card with real sync UI |
| **Create** | `src/app/(main)/settings/_components/account-card.tsx` | Isolated Google sign-in + account status component |

---

## Task 1: Remove the Auth Gate from the Main Layout

**Files:**
- Modify: `src/app/(main)/layout.tsx`

**What this does:** The `SessionGuard` component at `src/features/auth/session-guard.tsx:9-19` checks `useAuth()` for a session and redirects to `/auth/sign-in` if none exists, while rendering nothing during the loading state. It wraps the entire `(main)` layout at `src/app/(main)/layout.tsx:22-30`. Removing it makes all `(main)` routes accessible without authentication.

**Note:** `SessionGuard` is only imported in one place. After removing it from the layout, it becomes dead code. Do NOT delete the file yet — another task may reference it, and the spec says the existing `/auth/sign-in` route should still work.

- [ ] **Step 1: Read the file to confirm current state**

```bash
cat src/app/\(main\)/layout.tsx
```

Confirm the file matches what we expect (has `SessionGuard` import and wrapper).

- [ ] **Step 2: Remove SessionGuard import and wrapper**

In `src/app/(main)/layout.tsx`, make two changes:

1. Delete the import line:
   ```typescript
   import { SessionGuard } from "@/features/auth/session-guard";
   ```

2. Remove the `<SessionGuard>` / `</SessionGuard>` wrapper around `PokeDenProvider`, so the JSX becomes:

   ```tsx
   return (
     <PokeDenProvider>
       <SetupGate>
         <PokeDenShell defaultOpen={defaultOpen} variant={variant} collapsible={collapsible}>
           {children}
         </PokeDenShell>
       </SetupGate>
     </PokeDenProvider>
   );
   ```

- [ ] **Step 3: Verify the app builds**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds. No TypeScript errors about `SessionGuard`.

- [ ] **Step 4: Lint and format**

```bash
npm run check:fix
```

Expected: Biome auto-fixes any issues. Exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(main\)/layout.tsx
git commit -m "feat: remove SessionGuard from main layout to allow unauthenticated access"
```

---

## Task 2: Update Auth Redirects (signOut, callback, sign-out route)

**Files:**
- Modify: `src/features/auth/auth-provider.tsx`
- Modify: `src/app/auth/callback/route.ts`
- Modify: `src/app/auth/sign-out/route.ts`

**What this does:** Currently `signOut` redirects to `/auth/sign-in` (line 70 of `auth-provider.tsx`), the OAuth callback defaults to `/dashboard` (line 8 of `callback/route.ts`), and the server-side sign-out route redirects to `/auth/sign-in` (line 9 of `sign-out/route.ts`). Since the user will initiate sign-in from Settings, the callback should return them to Settings. Sign-out should go to `/dashboard` (the main app) rather than a sign-in page they no longer need to visit.

- [ ] **Step 1: Update `signOut` in auth-provider.tsx**

In `src/features/auth/auth-provider.tsx`, line 70, change:
```typescript
router.push("/auth/sign-in");
```
to:
```typescript
router.push("/settings");
```

This means after signing out, the user lands on Settings where they see the sign-in option again.

- [ ] **Step 2: Update auth callback redirect**

In `src/app/auth/callback/route.ts`, line 8, change:
```typescript
const next = searchParams.get("next") ?? "/dashboard";
```
to:
```typescript
const next = searchParams.get("next") ?? "/settings";
```

This ensures the OAuth callback returns to Settings (where the user initiated sign-in). The `?next=` query param is not currently used by the `signIn()` function, so the default matters.

- [ ] **Step 3: Update server-side sign-out redirect**

In `src/app/auth/sign-out/route.ts`, line 9, change:
```typescript
return NextResponse.redirect(`${origin}/auth/sign-in`);
```
to:
```typescript
return NextResponse.redirect(`${origin}/dashboard`);
```

- [ ] **Step 4: Verify build**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds.

- [ ] **Step 5: Lint and format**

```bash
npm run check:fix
```

Expected: Exit code 0.

- [ ] **Step 6: Commit**

```bash
git add src/features/auth/auth-provider.tsx src/app/auth/callback/route.ts src/app/auth/sign-out/route.ts
git commit -m "feat: redirect auth flows to settings/dashboard instead of sign-in page"
```

---

## Task 3: Create the Account Card Component

**Files:**
- Create: `src/app/(main)/settings/_components/account-card.tsx`

**What this does:** Builds a self-contained card component that handles two states:
1. **Not signed in:** Shows a "Sign in with Google" button that triggers `useAuth().signIn()`
2. **Signed in:** Shows the user's email, a sync status indicator, and a "Sign out" button

This component is consumed by the Settings screen in the next task.

**Interfaces:**
- Consumes: `useAuth()` from `@/features/auth/auth-provider` (provides `session`, `user`, `signIn`, `signOut`, `loading`)
- Produces: A `<Card>` element with auth UI — no exports other than `AccountCard`

- [ ] **Step 1: Create the component file**

```tsx
"use client";

import { LogOut, RefreshCcw, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/auth-provider";

export function AccountCard() {
  const { session, user, loading, signIn, signOut } = useAuth();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Sign in to sync your data across devices.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Spinner className="size-4" />
            Checking session…
          </div>
        </CardContent>
      </Card>
    );
  }

  if (session && user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your data syncs automatically when signed in.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full bg-muted">
              <User className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-sm">{user.email ?? "Signed in"}</p>
              <p className="text-muted-foreground text-xs">Synced with Supabase</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void signOut().then(() => {
                  toast.success("Signed out. Data stays on this device.");
                });
              }}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>Sign in to sync your data across devices.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Your data is stored locally on this device. Sign in with Google to enable cross-device sync.
        </p>
        <Button onClick={() => void signIn()}>
          <RefreshCcw className="size-4" />
          Sign in with Google
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds. The new file has no TypeScript errors.

- [ ] **Step 3: Lint and format**

```bash
npm run check:fix
```

Expected: Exit code 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(main\)/settings/_components/account-card.tsx
git commit -m "feat: add AccountCard component with Google sign-in for Settings page"
```

---

## Task 4: Wire AccountCard into Settings Screen

**Files:**
- Modify: `src/app/(main)/settings/_components/settings-screen.tsx`

**What this does:** Replaces the placeholder "Account" card (lines 310-318 of `settings-screen.tsx`) with the new `AccountCard` component. The placeholder currently reads:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Account</CardTitle>
    <CardDescription>Sign-in and durable storage arrive with the production version.</CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-muted-foreground text-sm">Your data currently stays on this device.</p>
  </CardContent>
</Card>
```

- [ ] **Step 1: Add the import**

At the top of `src/app/(main)/settings/_components/settings-screen.tsx`, add:

```typescript
import { AccountCard } from "./account-card";
```

- [ ] **Step 2: Replace the placeholder Account card**

Find the existing placeholder `<Card>` block (the one with `<CardTitle>Account</CardTitle>` and "Sign-in and durable storage arrive with the production version") and replace it entirely with:

```tsx
<AccountCard />
```

That single line replaces the entire 9-line placeholder Card block.

- [ ] **Step 3: Remove unused Card import if it becomes unused**

After removing the placeholder, check whether `Card` and related imports are still used by other cards in the file. They are — the file has Profile, Study preferences, Notifications, Companion, and Data cards that all use `Card`/`CardHeader`/`CardContent`. So the imports stay.

- [ ] **Step 4: Verify build**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds.

- [ ] **Step 5: Lint and format**

```bash
npm run check:fix
```

Expected: Exit code 0.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(main\)/settings/_components/settings-screen.tsx
git commit -m "feat: replace placeholder Account card with Google sign-in AccountCard in Settings"
```

---

## Task 5: Verify the Full Anonymous Flow

**What this does:** Manual verification that an unauthenticated user can access the app, create data, and have it persist across reloads — with no sign-in prompt.

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Clear browser storage**

In the browser, open DevTools → Application → Storage → Clear site data. This simulates a fresh visitor.

- [ ] **Step 3: Navigate to the app root**

Open `http://localhost:3000/`. Expected behavior:
- The root page (`src/app/page.tsx`) checks `setupCompleted` in localStorage.
- Since storage is cleared, `setupCompleted` is `false` → redirects to `/onboarding`.
- The onboarding flow runs — no sign-in prompt appears.

- [ ] **Step 4: Complete onboarding**

Follow the onboarding flow to completion. You should land on `/dashboard` without any authentication wall.

- [ ] **Step 5: Create test data**

On the dashboard:
- Create a subject (via Subjects page or quick-create menu)
- Create a task
- Navigate to Settings — you should see the "Account" card with "Sign in with Google" button (not the old placeholder)

- [ ] **Step 6: Verify persistence across reload**

Reload the page (`Ctrl+R`). The subjects and tasks should still be there (stored in localStorage). No sign-in prompt.

- [ ] **Step 7: Verify Settings page shows sign-in option**

Navigate to `/settings`. Scroll to the Account card. It should show:
- Title: "Account"
- Description: "Sign in to sync your data across devices."
- A paragraph explaining local storage
- "Sign in with Google" button

- [ ] **Step 8: Verify existing `/auth/sign-in` route still works**

Navigate to `http://localhost:3000/auth/sign-in`. The sign-in page should still render and the "Continue with Google" button should work. It's just no longer a gate.

---

## Task 6: Verify the Authenticated Flow

- [ ] **Step 1: Sign in from Settings**

Click "Sign in with Google" on the Settings Account card. Complete Google OAuth. Expected:
- Callback redirects back to `/settings`
- Account card now shows your email and "Synced with Supabase"
- "Sign out" button is visible

- [ ] **Step 2: Verify auto-sync**

After sign-in, the existing sync logic in `pokeden-provider.tsx` (lines 950-994) should:
- Detect the session via `supabase.auth.getSession()`
- Pull cloud data via `/api/sync/pull`
- Merge or push based on `chooseSyncAction()` timestamp comparison

Verify no console errors during this flow.

- [ ] **Step 3: Sign out and verify**

Click "Sign out" on the Account card. Expected:
- Redirects to `/settings` (not `/auth/sign-in`)
- Account card reverts to "Sign in with Google" state
- Local data is preserved (sign-out doesn't clear localStorage)

---

## Task 7: Lint, Build, and Final Commit

- [ ] **Step 1: Full lint and format pass**

```bash
npm run check:fix
```

Expected: Exit code 0.

- [ ] **Step 2: Full build**

```bash
npm run build 2>&1 | tail -30
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Review all changes**

```bash
git diff --stat
git diff
```

Verify:
- `src/app/(main)/layout.tsx` — only SessionGuard import and wrapper removed
- `src/features/auth/auth-provider.tsx` — signOut redirect changed to `/settings`
- `src/app/auth/callback/route.ts` — default next changed to `/settings`
- `src/app/auth/sign-out/route.ts` — redirect changed to `/dashboard`
- `src/app/(main)/settings/_components/account-card.tsx` — new file
- `src/app/(main)/settings/_components/settings-screen.tsx` — placeholder replaced with AccountCard

- [ ] **Step 4: Commit remaining changes if any**

```bash
git add -A
git commit -m "feat: remove hard auth barrier and add optional Google sync in Settings (T-19)"
```

---

## Risks, Tradeoffs, and Open Questions

### Risks

1. **Existing auth redirect chain**: The `signIn()` function in `auth-provider.tsx` calls `supabase.auth.signInWithOAuth({ redirectTo: .../auth/callback })`. The callback reads `searchParams.get("next")` but `signIn()` doesn't pass a `?next=` param, so it falls through to the new default `/settings`. This is correct behavior but should be verified.

2. **Dead code**: `SessionGuard` component (`src/features/auth/session-guard.tsx`) and the `/auth/sign-in` page become less central but must remain — they're still usable as a standalone sign-in page and may be referenced by external links.

3. **Race condition on first visit**: The root `page.tsx` creates a `PokeDenProvider` and checks `setupCompleted` from localStorage. Since there's no longer an auth gate, an unauthenticated user goes straight to onboarding → dashboard. The sync pull in `pokeden-provider` correctly bails early if no session exists (`if (!sessionData.session) return;`), so there's no risk of sync errors for anonymous users.

4. **The push endpoint already handles 401 gracefully**: `notifyPokeDenSaved` calls `/api/sync/push` via `fetch()`. If the user isn't authenticated, the server returns 401. The `catch` block silently swallows this. No change needed.

### Tradeoffs

- **No middleware auth removal needed**: There's no `middleware.ts` file — auth was enforced purely client-side via `SessionGuard`. This simplifies the change but means server-rendered pages under `(main)` (like the layout's `getPreference()` calls) are now accessible to unauthenticated users. This is acceptable because those server calls only read cookie-based preferences, not user data.

- **Settings page is behind SetupGate**: The Settings route is under `(main)`, which means `SetupGate` (not `SessionGuard`) gates it. A user must complete onboarding before reaching Settings. This is intentional — they need data to sync before it makes sense to sign in.

### Open Questions

None — the spec is well-defined and the existing infrastructure covers all required behavior.
