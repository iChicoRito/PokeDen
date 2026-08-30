# 09 - TASK TRACKER

[[00 - START HERE|Back to start]] · Previous: [[08 - ROADMAP TRACKER]] · Next: [[10 - WORD LIST]]

**Last checked:** 28 August 2026

Every task here names where it came from. Tasks T-01–T-38 (Roadmap Phases 1–6) were implemented on 28 August 2026 as a local-first front-end experience; their statuses now cite implementation evidence from the application source. Tasks T-39–T-45 belong to Phase 7 production work and remain not started.

## Where everything stands

| Status | How many |
|---|---:|
| ✅ Finished | 38 |
| 🟨 Being worked on | 0 |
| ⭕ Not started | 7 |
| ❌ Blocked | 0 |
| 🔵 Already there | 0 |
| ⬜ Dropped | 0 |
| ❓ Unclear | 0 |
| **Total** | **45** |

## The tasks

| # | The task | Where it came from | What it refers to | Serves | Status |
|---|---|---|---|---|---|
| T-01 | Define the shared information carried by every named academic record. | `pokeden_product_build_documentation.md`, lines 1003–1022 | The recommended front-end entities | [[07 - DEVELOPMENT ROADMAP#Phase 1 — The local foundation is ready\|R-01]] | ✅ |
| T-02 | Give each main area a service and stop pages reading sample files directly. | `pokeden_product_build_documentation.md`, lines 1026–1052 | The replaceable service boundary rule | [[07 - DEVELOPMENT ROADMAP#Phase 1 — The local foundation is ready\|R-02]] | ✅ |
| T-03 | Provide sample records, local state, and local storage behind the services. | `pokeden_product_build_documentation.md`, lines 73–85 and 1026–1034 | The front-end-first information strategy | [[07 - DEVELOPMENT ROADMAP#Phase 1 — The local foundation is ready\|R-03]] | ✅ |
| T-04 | Define how every feature shows default, loading, success, failure, disabled, completed, and overdue states. | `pokeden_product_build_documentation.md`, lines 1056–1067 | Required interaction states | [[07 - DEVELOPMENT ROADMAP#Phase 1 — The local foundation is ready\|R-04]] | ✅ |
| T-05 | Define required fields, optional fields, checks, cancellation, deletion confirmation, and unsaved changes for forms. | `pokeden_product_build_documentation.md`, lines 1069–1077 | Required form behavior | [[07 - DEVELOPMENT ROADMAP#Phase 1 — The local foundation is ready\|R-04]] | ✅ |
| T-06 | Make controls, dialogs, and timer actions usable by keyboard with visible focus. | `pokeden_product_build_documentation.md`, lines 1080–1093 | Keyboard accessibility | [[07 - DEVELOPMENT ROADMAP#Phase 1 — The local foundation is ready\|R-05]] | ✅ |
| T-07 | Add non-color status meaning, companion hiding, and reduced-motion behavior. | `pokeden_product_build_documentation.md`, lines 1089–1095 | Non-visual and reduced-motion accessibility | [[07 - DEVELOPMENT ROADMAP#Phase 1 — The local foundation is ready\|R-05]] | ✅ |
| T-08 | Build the four introduction screens with next, skip, and companion-choice actions. | `pokeden_product_build_documentation.md`, lines 109–180 | The onboarding content and actions | [[07 - DEVELOPMENT ROADMAP#Phase 2 — A student can set up their study space\|R-06]] | ✅ |
| T-09 | Show onboarding only while initial setup remains incomplete. | `pokeden_product_build_documentation.md`, lines 109–111 | The first-time display rule | [[07 - DEVELOPMENT ROADMAP#Phase 2 — A student can set up their study space\|R-06]] | ✅ |
| T-10 | Collect profile and timer preferences during setup and expose them again in Settings. | `pokeden_product_build_documentation.md`, lines 182–224 and 788–815 | Profile and focus preferences | [[07 - DEVELOPMENT ROADMAP#Phase 2 — A student can set up their study space\|R-07]] | ✅ |
| T-11 | Build subject listing, creation, editing, and archiving with the named details. | `pokeden_product_build_documentation.md`, lines 315–370 | Subject management | [[07 - DEVELOPMENT ROADMAP#Phase 2 — A student can set up their study space\|R-08]] | ✅ |
| T-12 | Make related tasks, notes, sessions, exams, materials, and progress reachable from a subject. | `pokeden_product_build_documentation.md`, lines 349–359 | Subject details connections | [[07 - DEVELOPMENT ROADMAP#Phase 2 — A student can set up their study space\|R-08]] | ✅ |
| T-13 | Build companion selection, previews, visibility, movement, reduced motion, and interaction preferences. | `pokeden_product_build_documentation.md`, lines 206–215 and 816–822 | Companion setup and controls | [[07 - DEVELOPMENT ROADMAP#Phase 2 — A student can set up their study space\|R-09]] | ✅ |
| T-14 | Build task creation and editing with subject, deadline, priority, status, and subtasks. | `pokeden_product_build_documentation.md`, lines 381–405 and 423–430 | Task information and changes | [[07 - DEVELOPMENT ROADMAP#Phase 3 — Daily academic work can be organized\|R-10]] | ✅ |
| T-15 | Build task views, subject and status filters, due-date filtering, and search. | `pokeden_product_build_documentation.md`, lines 407–432 | Finding and grouping tasks | [[07 - DEVELOPMENT ROADMAP#Phase 3 — Daily academic work can be organized\|R-10]] | ✅ |
| T-16 | Connect task completion and reopening to Dashboard, subject, Calendar, and companion updates. | `pokeden_product_build_documentation.md`, lines 423–440 and 912–920 | Task effects across the product | [[07 - DEVELOPMENT ROADMAP#Phase 3 — Daily academic work can be organized\|R-10]] | ✅ |
| T-17 | Build Today and Week study-plan views with add, edit, reschedule, delete, and completion actions. | `pokeden_product_build_documentation.md`, lines 460–485 | Planned study management | [[07 - DEVELOPMENT ROADMAP#Phase 3 — Daily academic work can be organized\|R-11]] | ✅ |
| T-18 | Pass subject, topic, duration, and related task from a study plan into Pomodoro. | `pokeden_product_build_documentation.md`, lines 498–506 | Study Planner to Pomodoro handoff | [[07 - DEVELOPMENT ROADMAP#Phase 3 — Daily academic work can be organized\|R-11]] | ✅ |
| T-19 | Build subject-organized note creation, editing, deletion, search, pinning, and filtering. | `pokeden_product_build_documentation.md`, lines 509–559 | Core note organization | [[07 - DEVELOPMENT ROADMAP#Phase 3 — Daily academic work can be organized\|R-12]] | ✅ |
| T-20 | Add automatic saving, basic formatting, and links, leaving attachment work subject to [[00 - START HERE#Open questions\|Q-02]]. | `pokeden_product_build_documentation.md`, lines 551–562 | Note editing behavior and optional scope | [[07 - DEVELOPMENT ROADMAP#Phase 3 — Daily academic work can be organized\|R-12]] | ✅ |
| T-21 | Build focus, short-break, and long-break modes with start, pause, resume, stop, and reset controls. | `pokeden_product_build_documentation.md`, lines 577–612 | Pomodoro controls | [[07 - DEVELOPMENT ROADMAP#Phase 4 — Planned study becomes focused study\|R-13]] | ✅ |
| T-22 | Keep timer controls usable by keyboard and define expected behavior during navigation. | `pokeden_product_build_documentation.md`, lines 1080–1093 and 1099–1111 | Accessible timer and navigation quality | [[07 - DEVELOPMENT ROADMAP#Phase 4 — Planned study becomes focused study\|R-13]] | ✅ |
| T-23 | Record focus context, planned and actual duration, start time, completion, and study totals. | `pokeden_product_build_documentation.md`, lines 591–622 and 939–947 | Focus records and progress totals | [[07 - DEVELOPMENT ROADMAP#Phase 4 — Planned study becomes focused study\|R-14]] | ✅ |
| T-24 | Implement the named companion states and academic or timer events. | `pokeden_product_build_documentation.md`, lines 848–878 | Companion state and event lists | [[07 - DEVELOPMENT ROADMAP#Phase 4 — Planned study becomes focused study\|R-15]] | ✅ |
| T-25 | Keep companion movement safe, optional, quiet during focus, non-punitive, and reduced when requested. | `pokeden_product_build_documentation.md`, lines 623–662 and 836–846 | Companion behavior rules | [[07 - DEVELOPMENT ROADMAP#Phase 4 — Planned study becomes focused study\|R-15]] | ✅ |
| T-26 | Build exam creation, editing, deletion, topics, reviewed state, review planning, and result recording. | `pokeden_product_build_documentation.md`, lines 674–719 | Exam management | [[07 - DEVELOPMENT ROADMAP#Phase 5 — Exam preparation and progress are visible\|R-16]] | ✅ |
| T-27 | Calculate exam countdown and topic-based readiness. | `pokeden_product_build_documentation.md`, lines 674–709 and 1185–1189 | Exam calculations | [[07 - DEVELOPMENT ROADMAP#Phase 5 — Exam preparation and progress are visible\|R-16]] | ✅ |
| T-28 | Show only the named simple study, task, subject, exam, and grade progress summaries. | `pokeden_product_build_documentation.md`, lines 721–739 | Limited progress reporting | [[07 - DEVELOPMENT ROADMAP#Phase 5 — Exam preparation and progress are visible\|R-17]] | ✅ |
| T-29 | Turn an exam topic into a planned review session and reflect completed review in readiness. | `pokeden_product_build_documentation.md`, lines 948–950 and 1283–1293 | Exam to planner and progress flow | [[07 - DEVELOPMENT ROADMAP#Phase 5 — Exam preparation and progress are visible\|R-18]] | ✅ |
| T-30 | Build Dashboard cards for classes, tasks, exams, suggested study, quick focus, subject progress, and focus totals. | `pokeden_product_build_documentation.md`, lines 227–290 | Dashboard information | [[07 - DEVELOPMENT ROADMAP#Phase 6 — The whole study day stays connected\|R-19]] | ✅ |
| T-31 | Add Dashboard links to source records and a safe companion home area. | `pokeden_product_build_documentation.md`, lines 291–312 | Dashboard actions and companion area | [[07 - DEVELOPMENT ROADMAP#Phase 6 — The whole study day stays connected\|R-19]] | ✅ |
| T-32 | Build Month, Week, and Agenda calendar views from source records and open the source when selected. | `pokeden_product_build_documentation.md`, lines 750–786 | Aggregated Calendar behavior | [[07 - DEVELOPMENT ROADMAP#Phase 6 — The whole study day stays connected\|R-20]] | ✅ |
| T-33 | Connect every cross-module update named in the specification. | `pokeden_product_build_documentation.md`, lines 908–960 | Shared subject, task, plan, focus, exam, and Calendar updates | [[07 - DEVELOPMENT ROADMAP#Phase 6 — The whole study day stays connected\|R-21]] | ✅ |
| T-34 | Build the six named helpful empty states with their next actions. | `pokeden_product_build_documentation.md`, lines 963–999 | Empty-state guidance | [[07 - DEVELOPMENT ROADMAP#Phase 6 — The whole study day stays connected\|R-22]] | ✅ |
| T-35 | Apply required interaction and form states to every completed module. | `pokeden_product_build_documentation.md`, lines 1056–1077 | Complete behavior coverage | [[07 - DEVELOPMENT ROADMAP#Phase 6 — The whole study day stays connected\|R-22]] | ✅ |
| T-36 | Check long names, empty notes, overdue work, same-day exams, large collections, dates, duplicates, and cleared storage. | `pokeden_product_build_documentation.md`, lines 1099–1115 | Content and storage quality cases | [[07 - DEVELOPMENT ROADMAP#Phase 6 — The whole study day stays connected\|R-23]] | ✅ |
| T-37 | Check timer navigation, related deleted records, and companion animation performance. | `pokeden_product_build_documentation.md`, lines 1110–1115 | Cross-module and performance quality cases | [[07 - DEVELOPMENT ROADMAP#Phase 6 — The whole study day stays connected\|R-23]] | ✅ |
| T-38 | Verify the five named journeys and all MVP capabilities from setup through progress. | `pokeden_product_build_documentation.md`, lines 1229–1316 and 1348–1363 | End-to-end success | [[07 - DEVELOPMENT ROADMAP#Phase 6 — The whole study day stays connected\|R-24]] | ✅ |
| T-39 | Build sign-up, sign-in, sign-out, and session handling. | `pokeden_product_build_documentation.md`, lines 1123–1132 | Production account access | [[07 - DEVELOPMENT ROADMAP#Phase 7 — Student information becomes production-ready\|R-25]] | ⭕ |
| T-40 | Protect application routes and enforce student ownership, with recovery if retained. | `pokeden_product_build_documentation.md`, lines 1130–1134 | Protected owned access | [[07 - DEVELOPMENT ROADMAP#Phase 7 — Student information becomes production-ready\|R-25]] | ⭕ |
| T-41 | Create durable records for every retained student and academic entity. | `pokeden_product_build_documentation.md`, lines 1135–1152 | Production persistence | [[07 - DEVELOPMENT ROADMAP#Phase 7 — Student information becomes production-ready\|R-26]] | ⭕ |
| T-42 | Add record keys, relationships, ownership, dates, archive and delete behavior, constraints, and useful indexes. | `pokeden_product_build_documentation.md`, lines 1153–1162 | Production record integrity | [[07 - DEVELOPMENT ROADMAP#Phase 7 — Student information becomes production-ready\|R-26]] | ⭕ |
| T-43 | Move task, plan, timer, and exam calculations into checked server-side rules. | `pokeden_product_build_documentation.md`, lines 1163–1190 | Production academic rules | [[07 - DEVELOPMENT ROADMAP#Phase 7 — Student information becomes production-ready\|R-27]] | ⭕ |
| T-44 | Move progress totals and derived Calendar events into checked server-side rules. | `pokeden_product_build_documentation.md`, lines 1191–1202 | Production summary and Calendar rules | [[07 - DEVELOPMENT ROADMAP#Phase 7 — Student information becomes production-ready\|R-27]] | ⭕ |
| T-45 | Connect every front-end service to safe production operations with consistent failure responses. | `pokeden_product_build_documentation.md`, lines 1204–1225 | Production service integration | [[07 - DEVELOPMENT ROADMAP#Phase 7 — Student information becomes production-ready\|R-28]] | ⭕ |

## Tasks that serve no roadmap item

Every task serves a roadmap item.

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
