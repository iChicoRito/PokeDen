# 08 - ROADMAP TRACKER

[[00 - START HERE|Back to start]] · Previous: [[07 - DEVELOPMENT ROADMAP]] · Next: [[09 - TASK TRACKER]]

**Last checked:** 28 August 2026

## Where everything stands

| Status | How many |
|---|---:|
| ✅ Finished | 22 |
| 🟨 Being worked on | 2 |
| ⭕ Not started | 0 |
| ❌ Blocked | 0 |
| 🔵 Already there | 0 |
| ⬜ Dropped | 0 |
| ❓ Unclear | 4 |
| **Total** | **28** |

Roadmap Phases 1–6 (R-01–R-24) were implemented on 28 August 2026 as a local-first front-end experience. Statuses now cite implementation evidence from the application source. Phase 7 (R-25–R-28) remains future production work. `npx tsc --noEmit` and `npm run build` pass; the remaining step is executing the manual QA checklist in `docs/pokeden-phase-6-qa.md`.

## Phase 1 — The local foundation is ready

| # | What gets built | Status | Notes |
|---|---|---|---|
| R-01 | Shared academic information definitions | ✅ Finished | Zod-validated `PokeDenData` aggregate (profile, subjects, tasks, plans, notes, exams, focus, grades, preferences, companion, timer) in `src/features/pokeden/domain.ts`. |
| R-02 | Replaceable service boundaries | ✅ Finished | All pages consume the shared store/actions from `src/features/pokeden/pokeden-provider.tsx`; no page imports fixture files directly. |
| R-03 | Sample information, local state, and local storage | ✅ Finished | Demo fixtures in `src/data/pokeden/demo-fixtures.ts`; versioned repository with backup/recovery and cross-tab sync in `src/data/pokeden/repository.client.ts`. |
| R-04 | Shared form and interaction behavior | ✅ Finished | Skeleton loading, empty states, success toasts, error banners, disabled/submitting controls, and delete/dirty confirmations applied across every module. |
| R-05 | Accessibility foundations | ✅ Finished | shadcn primitives, visible focus, labeled controls, keyboard-operable dialogs and timer, non-color text/icon status, companion hiding, and reduced-motion rules in `src/app/globals.css`. |

## Phase 2 — A student can set up their study space

| # | What gets built | Status | Notes |
|---|---|---|---|
| R-06 | First-time onboarding and setup path | ✅ Finished | `/onboarding`: four documented intro screens, then profile, optional subjects, companion choice, and timer preferences; skip, resume, and completion gate (`data.setupCompleted`). |
| R-07 | Student profile and focus preferences | ✅ Finished | Profile and focus/short/long-break defaults collected in onboarding and editable again in `/settings`. |
| R-08 | Subject management and details | ✅ Finished | `/subjects` list/create/edit/archive; `/subjects/[subjectId]` tabs for overview, tasks, notes, sessions, exams, materials, and progress. |
| R-09 | Companion selection and controls | ✅ Finished | Abstract companions (Sprout/Ember/Ripple); selection, visibility, movement, reduced motion, and interaction preferences in `/settings`; companion cards on Dashboard and Pomodoro. |

## Phase 3 — Daily academic work can be organized

| # | What gets built | Status | Notes |
|---|---|---|---|
| R-10 | Task and assignment management | ✅ Finished | `/tasks`: All/Due Today/Upcoming/Completed views, search, subject/status/priority/due filters, subtasks, complete/reopen (reopen → To Do), delete with confirmation. |
| R-11 | Today and Week study planning | ✅ Finished | `/study-planner`: Today/Week tabs, add/edit/reschedule/delete/complete, subject/topic/task/date/time/duration/priority/notes, Start Focus handoff. |
| R-12 | Subject-organized notes | ✅ Finished | `/notes`: subject organization, search/filter/pin/delete, Markdown-style formatting and link toolbar, debounced autosave with truthful Saving/Saved/Error status. |

## Phase 4 — Planned study becomes focused study

| # | What gets built | Status | Notes |
|---|---|---|---|
| R-13 | Separate Pomodoro controls | ✅ Finished | `/pomodoro`: focus/short-break/long-break modes, start/pause/resume/stop/reset, wall-clock reconciliation across navigation/refresh, idempotent completion. |
| R-14 | Focus records and study totals | ✅ Finished | Focus sessions recorded with context, planned/actual duration, and completion; daily/weekly/session/subject totals in `src/features/pokeden/derivations.ts`; stopped sessions are incomplete and excluded from totals. |
| R-15 | Optional companion states and reactions | ✅ Finished | Documented companion state/event vocabularies in `domain.ts`; actions emit events; quiet during focus, hideable, non-punitive, reduced-motion respected. |

## Phase 5 — Exam preparation and progress are visible

| # | What gets built | Status | Notes |
|---|---|---|---|
| R-16 | Exams, topics, countdown, results, and readiness | ✅ Finished | `/exams` + `/exams/[examId]`: create/edit/delete, topics with reviewed state, countdown, readiness (reviewed ÷ total, zero = 0%), and result recording. |
| R-17 | Simple study and academic progress summaries | ✅ Finished | `/progress`: weekly study time, completed focus sessions, completed tasks, subject progress, exam readiness, and basic grade mean only. |
| R-18 | Exam review planning and progress connection | ✅ Finished | Exam topic → planned review session (`planExamTopic`); completing linked focus marks the topic reviewed once and recalculates readiness. |

## Phase 6 — The whole study day stays connected

| # | What gets built | Status | Notes |
|---|---|---|---|
| R-19 | Connected Dashboard | ✅ Finished | `/dashboard`: today's classes, due/overdue tasks, upcoming exams, deterministic recommended study, quick focus, subject progress, today's focus totals, recent notes, and companion home; every card links to its source. |
| R-20 | Aggregated Calendar | ✅ Finished | `/calendar`: derived Month/Week/Agenda views from class schedules, task deadlines, plans, and exam dates; selecting an event opens its source record; no duplicate event entry. |
| R-21 | Cross-module updates | ✅ Finished | One shared store/actions layer and shared derivations keep tasks, subjects, plans, focus, exams, progress, Dashboard, Calendar, and companion state synchronized. |
| R-22 | Helpful empty states and complete interaction states | ✅ Finished | All six documented empty states (Dashboard, Subjects, Tasks, Planner, Notes, Exams) plus loading/success/error/disabled/completed/overdue behavior across modules. |
| R-23 | Front-end quality and edge-case checks | 🟨 Being worked on | Expected results for every listed quality case are defined in `docs/pokeden-phase-6-qa.md`; manual execution of the checklist is pending. |
| R-24 | End-to-end journeys and MVP verification | 🟨 Being worked on | All five journeys are implemented; the end-to-end manual verification pass is pending per `docs/pokeden-phase-6-qa.md`. |

## Phase 7 — Student information becomes production-ready

| # | What gets built | Status | Notes |
|---|---|---|---|
| R-25 | Production accounts and protected access | ❓ Unclear | Not started — explicitly out of scope for the Phases 1–6 implementation. |
| R-26 | Durable owned student records | ❓ Unclear | Not started — production storage deferred until the front-end experience is stable. |
| R-27 | Server-side academic and progress rules | ❓ Unclear | Not started — current rules live in shared client derivations. |
| R-28 | Production service connections and safety checks | ❓ Unclear | Not started — the replaceable service boundary is in place and ready for production implementations. |

## What is blocked

No roadmap item is blocked. The remaining work for R-23 and R-24 is executing the manual QA checklist in `docs/pokeden-phase-6-qa.md` and flipping those items to Finished as each check passes.

## Status legend

| Emoji | Means |
|---|---|
| ✅ | Finished — built, checked, working |
| 🟨 | Being worked on right now |
| ⭕ | Not started — waiting its turn |
| ❌ | Blocked — something is stopping it |
| 🔵 | Already there — found in the supplied material, built before this plan |
| ⬜ | Dropped — decided against, kept for the record |
| ❓ | Unclear — the material does not say |
