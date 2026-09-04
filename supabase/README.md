# Supabase setup — T-18 Google-only auth + snapshot sync

> Implementation cannot click dashboard buttons, so this file is the
> deliverable for the manual hardening step. The repo-side work (migration,
> RLS checks) is done; a human with dashboard access must complete the
> checklist below before going live.

## 1. Apply the migration

Run `supabase/migrations/0001_tbl_profiles.sql` in the Supabase SQL editor
(or `supabase db push` if the CLI is linked), then verify:

```sql
select tablename from pg_tables where tablename = 'tbl_profiles';
```

Expected: 1 row. The migration creates `public.tbl_profiles`
(`user_id uuid PK → auth.users(id)`, owner-only `FOR ALL` RLS policy
`auth.uid() = user_id`, `snapshot_updated_at` index).

## 2. Manual dashboard hardening checklist (requires human clicks)

In the [Supabase dashboard](https://supabase.com/dashboard) for this project:

- [ ] **Auth → Providers → Google: enabled** (needs a Google Cloud OAuth
      client ID + secret — see Q1 in the plan).
- [ ] **Auth → Providers → Email/Password + every other provider: disabled**
      (Google-only; the codebase asserts zero `signInWithPassword` strings).
- [ ] **Auth → URL Configuration → Redirect URLs:** add
      `http://localhost:3000/auth/callback` and the production callback
      (e.g. `https://<prod-domain>/auth/callback`).
- [ ] **Rotate the exposed `sb_secret_*` key.** It appeared in the T-18 task
      prompt, so treat it as compromised: Settings → API → regenerate the
      secret key, update server-side env only, never commit it
      (`.env.local` is git-ignored; only `.env.local.example` holds
      placeholders).
- [ ] **Confirm `tbl_` prefix** on all new tables (`tbl_profiles` — done in
      the migration; keep the convention for any future tables).

## 3. Evidence

Record completion in the PR description (screenshots or written
confirmation). `node --test scripts/check-rls.mjs` proves the repo side;
only a human can prove the dashboard side.
