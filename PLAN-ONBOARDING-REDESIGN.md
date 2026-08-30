# PokeDen Onboarding Redesign — Plan

## Goal & Success Criteria
Replace the linear 8-step "next-next" onboarding with a modern, human, progressive-profiling flow that feels distinctive to PokeDen (companion-first), is fully accessible, and captures only necessary input — while fixing the resume/data-loss bugs that audits found.

Success criteria:
1. Fresh user completes onboarding in **≤ 5 screens** (from 8) with **≤ 6 required interactions** and a visible, honest step indicator.
2. **Resume works**: refresh/reopen mid-wizard returns to the exact step AND preserves typed input (semester, longBreakMinutes, subject draft included).
3. **Zero data-loss windows**: draft autosave or equivalent; no store re-sync wiping edits.
4. **Companion choice is real**: `selected` persisted; Settings radio agrees; previews are visual (motion/illustration), not text.
5. **Accessible**: keyboard-navigable with focus moved to step heading; step titles announced; per-field inline validation with `aria-invalid`/`aria-describedby`/`FieldError`; focus rings on whole radio cards; reduced-motion respected; WCAG contrast on icon chips/progress.
6. **Distinctive, not generic**: no stock-lucide-in-rounded-square template look; branded companion illustration, character microcopy, celebratory completion, reusable stepper dots.
7. **No new dependencies**; all primitives from `src/components/ui` + `tw-animate-css`.
8. `npm run check` (biome) passes; `npm run build` passes.

## Current state (evidence from audits)
- `src/app/onboarding/_components/onboarding-flow.tsx` — 404-line wizard: steps 0–3 intro cards, 4 profile, 5 subject, 6 companion, 7 timers. `TOTAL_STEPS = 8` (line 53). `useState(0)` (line 65) never reads `data.onboardingStep` → resume broken. Restore effect depends on `data` (line 89) → wipes in-progress edits on any store change. Step 4 CTA "Choose My Companion" (line 42) navigates to profile (line 197). Companion write omits `selected` (line 129). Timer inputs allow 1–180 but schema caps focus 5–180, breaks 5–60/15–120 (domain.ts:163–170) → whole-save validation failure on out-of-range. Toast-only validation (lines 96–100). No focus management (CardTitle is a `div`, card.tsx:36). Radio cards double-labeled with 16px focus ring (radio-group.tsx:29).
- Entry: `src/app/page.tsx` root gate checks only `isHydrated`+`setupCompleted` (ignores `storageError`) → private-mode LS falls back to demo data with `setupCompleted:true` → routes to demo dashboard, onboarding unreachable. Direct `/onboarding` in that state loops on reload-only error card.
- `data.onboardingStep` is write-only (provider.tsx:205, reset :737); schema domain.ts:255; fixture demo-fixtures.ts:16.
- Settings "Revisit onboarding" → `/onboarding?revisit=1` (settings-screen.tsx:319); full reset → `/onboarding` (:390–393). Revisit has no review banner, no exit, and clobbers `longBreakMinutes`/`semester`.
- No analytics anywhere (evidence audit); docs promise resume (START HERE.md:71) but code doesn't deliver (doc/implementation mismatch). No first-run tour/spotlight/contextual help; brand-new user lands on one empty-state card.
- Primitives available: Field/FieldError/FieldDescription (field.tsx), RadioGroup, Select, Progress (h-1), Tabs/Slider/Switch/Toggle/ToggleGroup/ButtonGroup/Badge, Tooltip (Radix), Dialog (built-in animate), Carousel, Avatar; tw-animate-css (globals.css:2) provides animate-in/out, fade/zoom/slide; `.pokeden-motion` + `data-pokeden-reduced-motion`/`data-pokeden-companion-movement` ready-made motion opt-out (globals.css:351–365); no framer-motion.

## Design direction (replaces the linear next-next pattern)
**Progressive, conversational, companion-first — "setup your den, meet your friend".**

- **Shell:** full-viewport warm, focused layout. Left rail: animated companion (illustration/emoji-based avatar with `pokeden-motion` idle bob) + progress stepper dots with labels ("Your den", "About you", "Your subjects", "Your companion", "Focus rhythm", "Ready"). Top-right: "Skip for now" (always available) + "Stored on this device" microcopy. Content card is the hero.
- **Steps (≤5 screens):**
  1. **Welcome** (single screen, not 4 cards): short value prop + brand illustration; primary "Start my den"; secondary "Skip setup" (sets defaults, marks complete, goes to dashboard). No Next-Next-Next.
  2. **About you** (progressive): one question per screen with inline validation — Name → Course/Program → Year → Semester. Optional prefilled from profile if revisiting. Each answered field saves immediately (autosave) so refresh never loses data; "Skip" allowed on every field (defaults).
  3. **Your subjects** (optional, one screen): compact add-first-subject with "only name required" helper; "Add another" inline; "Skip" prominent; prefill if revisiting.
  4. **Your companion** (rich cards): 3 selectable cards with illustration + personality + live preview area (motion idle bob via `.pokeden-motion`; "preview study" toggle) — replaces static lucide avatars. Writes `selected` too.
  5. **Focus rhythm** (one screen): segmented preset pills ("Standard 25/5/15", "Deep 50/10/20", "Custom") + inline sliders/steppers clamped to schema bounds with live `FieldError`; "Complete setup" button + celebratory completion screen (Dialog or inline card with companion celebration + "Go to dashboard").
- **Every step:** Back (history-aware), Skip (with defaults), focus moved to step heading on change (real `<h1>`/`<h2>` + `aria-live`), step indicator announced, `motion-reduce` respected (tw-animate-css + `.pokeden-motion` + `motion-reduce:` classes).
- **Resume/revisit:** step initialized from `data.onboardingStep` after hydration (one-time); restore effect keyed on `isHydrated` only, includes semester/longBreakMinutes/subject draft; revisit shows "Reviewing your setup" banner + Cancel; completion is one batched write.
- **Root gate fix:** check `storageError` first → route to a dedicated onboarding error screen with in-memory fallback + clear "not saved" banner, instead of the demo dashboard.

## Implementation plan (parallel subagents, disjoint files)

### Phase A — Foundations (data + gates) — Subagent A
Files: `src/features/pokeden/pokeden-provider.tsx`, `src/app/page.tsx`, `src/app/(main)/_components/setup-gate.tsx`, `src/app/(main)/_components/setup-loading.tsx`, `src/data/pokeden/repository.client.ts` (only if needed for fallback).
Changes:
- `updateSetup` batching: add a single `completeSetup(patch)` action that persists study prefs + setupCompleted in one `mutate` (one localStorage write) — eliminates the double-write inconsistency window.
- Root gate: `if (storageError) router.replace("/onboarding?storage=error")` before the setupCompleted check; onboarding page reads `?storage=error` and shows the error card (no reload loop) with "Continue in memory" fallback option.
- (No schema change needed; `selected` already exists in domain.)

### Phase B — Onboarding flow rewrite — Subagent B (largest)
Files: `src/app/onboarding/_components/onboarding-flow.tsx` (rewrite), `src/app/onboarding/page.tsx` (small), new `src/app/onboarding/_components/step-shell.tsx`, `stepper-dots.tsx`, `companion-card.tsx`, `completion-screen.tsx`, `about-you-step.tsx`, `subjects-step.tsx`, `focus-rhythm-step.tsx`, `welcome-step.tsx`, `companion-step.tsx` (all new, route-local per colocation).
Changes: full redesign per Design direction; progressive one-question-at-a-time profile; autosave drafts to store (new `updateProfileDraft`/`updateSetupDraft` actions or reuse existing actions with debounce); step init from `data.onboardingStep` (one-time after hydration); restore effect keyed on `isHydrated` only; inline validation with `FieldError` + `aria-invalid` + `aria-describedby`; focus management (ref + tabIndex -1 + `aria-live`); stepper dots (local component using Progress/Badge/Button pattern); companion cards with visual preview (`.pokeden-motion` idle bob) + `selected` persisted; timer presets (ToggleGroup or ButtonGroup) + clamped inputs with inline hints; celebratory completion (Dialog or inline card + toast); skip-everywhere with defaults; revisit banner + Cancel; `autoComplete` on all fields.
Also: `src/app/(main)/dashboard/_components/dashboard-screen.tsx` — add a dismissible first-run "What's next?" hint card after onboarding (localStorage flag), keeping the empty-state card.

### Phase C — Accessibility & contrast hardening — Subagent C
Files: `src/app/globals.css` (add onboarding-specific classes: `.pokeden-chip`, `.pokeden-progress-track`, `.pokeden-card-ring` — all respecting reduced-motion + `motion-reduce`), `src/components/ui/card.tsx` (make CardTitle an `<h1>`/`<h2>` via `asChild` or heading role — careful, ui is shadcn-managed/biome-excluded; prefer a route-local wrapper `OnboardingHeading` instead of editing ui/card.tsx), `src/app/onboarding/_components/*` (apply classes), and any shared `field.tsx` improvement if needed (avoid editing ui/ if possible — use `FieldError` as-is).
Changes: contrast fixes (icon chips → solid `bg-primary` + `text-primary-foreground` or `text-foreground`; small muted text on muted/30 → `text-foreground/70`; progress track → `bg-border`), focus ring on whole radio card (`focus-within:` ring), heading semantics + live region, keyboard trap checks, reduced-motion parity, touch targets ≥ 40px.

### Phase D — Docs & verification — Subagent D
Files: `ANALYSIS - POKEDEN/00 - START HERE.md` (update Q-07 row to reflect implemented resume), `docs/pokeden-phase-6-qa.md` (mark onboarding items + add new redesign acceptance items), maybe `README.md` (PokeDen section).
Changes: document the new flow, the fixed resume, the completed acceptance checklist; note analytics remains intentionally absent.

**Conflict avoidance:** Subagent A (provider/page/gate), B (onboarding/_components + dashboard-screen), C (globals.css + wrapper components), D (docs). No two agents edit the same file. If B needs provider actions, A defines them first or B defines + A reviews — coordination via shared interface notes.

## Public API / schema / data-flow changes
- **No schema change** (domain.ts untouched; `selected` already exists).
- **New store action:** `completeSetup(patch)` (single batched write) added to `PokeDenActions`.
- **New behavior:** `onboardingStep` is now read on mount (resume); drafts autosaved; `selected` written on companion choice.
- **Entry:** `/onboarding?storage=error` handled; root gate checks storageError.
- **Settings:** revisit now shows review banner; full reset unchanged.

## Edge cases & failure modes
- Private-mode/unavailable LS: error card with in-memory fallback + "not saved" banner; no demo-data routing.
- Refresh mid-wizard: resume at step with drafts intact (autosave).
- Store change during typing: restore effect only on hydration (no wipe).
- Out-of-range timer values: clamped to schema bounds on change + inline error; no whole-save failure.
- `complete()` failure: single write; if it fails, stay on completion screen with retry + error; no bounce-back to onboarding.
- Revisit: banner + Cancel; longBreak/semester/subject restored; dedupe subject creation (prevent second copy).
- Reduced motion / companion movement off: `.pokeden-motion` + `motion-reduce:` + `data-pokeden-*` all respected; no motion dependency for content.
- Screen reader: focus to heading, aria-live announcements, FieldError wired; no double announcement (dedupe "Step X of 8" vs progress bar).
- Keyboard: full tab order, Back/forward via history or explicit buttons, no traps; touch targets ≥ 40px.

## Testing & acceptance criteria
- Manual QA checklist (docs/pokeden-phase-6-qa.md additions):
  - Fresh start → complete new flow in ≤5 screens, verify resume after refresh at every step, verify no data loss on refresh mid-typing.
  - Verify private-mode fallback (block LS in devtools) → error card + in-memory continue, no demo dashboard.
  - Verify companion `selected` persists and Settings radio agrees.
  - Verify timer bounds: input clamps, inline error, complete succeeds.
  - Keyboard-only run-through + screen reader (NVDA/VoiceOver) spot check; focus lands on step heading; titles announced.
  - Reduced-motion (OS setting + companion setting) → no motion, content intact.
  - Revisit: banner shows, longBreak preserved, Cancel works, no duplicate subject.
  - Contrast spot-check (icon chips, progress track, small text) via devtools.
  - `npm run check` and `npm run build` pass.
- No automated test framework exists (per CLAUDE.md); do not add one unless asked.

## Assumptions
- No analytics/telemetry will be added (docs explicitly exclude from MVP; evidence audit confirmed none exists) — improvements validated via manual QA + documented acceptance items instead.
- All redesigns use existing `src/components/ui` primitives + `tw-animate-css`; no new npm dependencies.
- The "companion" remains the product's personality differentiator; redesign leans into it with motion/illustration, staying abstract (no third-party artwork — Q-08 decision).
- Route-local `_components/` is the home for new wrappers; `src/components/ui/` (shadcn-managed, biome-excluded) is not hand-edited except where strictly required and then regenerated via shadcn.
- Scope is the onboarding flow + its direct entry/exit (root gate, settings revisit, dashboard first-run hint). No changes to other modules.
