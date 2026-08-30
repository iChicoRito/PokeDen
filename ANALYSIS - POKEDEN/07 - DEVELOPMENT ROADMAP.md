# 07 - DEVELOPMENT ROADMAP

[[00 - START HERE|Back to start]] · Previous: [[06 - DIAGRAMS]] · Next: [[08 - ROADMAP TRACKER]]

## What this covers

This plan orders the building work described for PokeDen. It begins with a replaceable local student experience and ends with the production accounts and durable storage that the document says must wait until that experience is stable. It does not add dates, staffing, launch, or marketing work.

## Where the plan came from

The plan is drawn only from `pokeden_product_build_documentation.md`, summarized in [[02 - DOCUMENT FINDINGS]] and arranged in [[05 - SYSTEM ARCHITECTURE]]. No application source was used.

## The phases at a glance

| Phase | What it delivers | Waits on |
|---|---|---|
| Phase 1 — The local foundation is ready | Shared information, services, local storage, behavior patterns, and accessibility foundations | Nothing — this one starts |
| Phase 2 — A student can set up their study space | Onboarding, profile, preferences, subjects, and companion choice | Phase 1 |
| Phase 3 — Daily academic work can be organized | Tasks, study plans, and notes | Phase 2 |
| Phase 4 — Planned study becomes focused study | Pomodoro records and optional companion reactions | Phase 3 |
| Phase 5 — Exam preparation and progress are visible | Exams, review topics, readiness, and simple progress | Phase 4 |
| Phase 6 — The whole study day stays connected | Dashboard, Calendar, shared updates, complete states, quality checks, and end-to-end journeys | Phases 3–5 |
| Phase 7 — Student information becomes production-ready | Accounts, durable storage, ownership checks, and server-side rules | Phase 6 |

The same order appears as a picture in [[06 - DIAGRAMS#11. The order of the phases]].

---

## Phase 1 — The local foundation is ready

**The goal:** Every page can use the same replaceable information and interaction foundations.

**Why it comes first:** Every student module depends on shared academic records, shared services, reliable interaction states, and accessible controls.

**What gets built:**

| # | What gets built | Why it is needed | Where the need came from |
|---|---|---|---|
| R-01 | Define the shared student, subject, task, plan, note, exam, focus, grade, calendar, preference, and companion information. | The modules need consistent records to refer to one another. | `pokeden_product_build_documentation.md`, lines 1003–1022 |
| R-02 | Create one service boundary for each main area and keep pages from reading sample files directly. | Local implementations must later be replaceable without redesigning pages. | `pokeden_product_build_documentation.md`, lines 1026–1052 |
| R-03 | Provide sample information, local state, and local storage through those services. | The complete first experience must work without production services. | `pokeden_product_build_documentation.md`, lines 73–85 and 1026–1034 |
| R-04 | Establish shared form and interaction behavior for normal, loading, success, failure, disabled, completed, and overdue states. | Every interactive feature and form must handle these situations consistently. | `pokeden_product_build_documentation.md`, lines 1056–1077 |
| R-05 | Establish keyboard use, visible focus, clear labels, accessible dialogs, non-color indicators, and reduced motion. | Accessibility cannot be added safely after every module has chosen a different pattern. | `pokeden_product_build_documentation.md`, lines 1080–1095 |

**How you know the phase is finished:**

- A sample page can read, add, change, and delete local information through a service rather than a sample file.
- Shared controls demonstrate each required state and remain usable by keyboard and with reduced motion.

**What could hold it up:** The document does not say which foundations may already exist. See [[00 - START HERE#Open questions|Q-01]].

---

## Phase 2 — A student can set up their study space

**The goal:** A new student can enter PokeDen, make the initial choices, and create the subjects that later work refers to.

**Why it comes here:** Setup needs the shared records, local storage, controls, and accessibility patterns from Phase 1.

**What gets built:**

| # | What gets built | Why it is needed | Where the need came from |
|---|---|---|---|
| R-06 | Build the four introduction screens and setup path, shown only when setup is incomplete. | A first-time student needs an understandable route into the product. | `pokeden_product_build_documentation.md`, lines 109–180 |
| R-07 | Build student profile and focus-preference setup, with the same choices available in Settings. | Profile and timer defaults are needed across the experience. | `pokeden_product_build_documentation.md`, lines 182–224 and 788–815 |
| R-08 | Build subject listing, creation, editing, archiving, schedules, and subject details. | Subjects are the academic structure shared by later modules. | `pokeden_product_build_documentation.md`, lines 193–204 and 315–370 |
| R-09 | Build companion selection, preview, visibility, movement, reduced-motion, and interaction preferences. | The companion must be chosen and controllable without becoming required. | `pokeden_product_build_documentation.md`, lines 206–215 and 816–822 |

**How you know the phase is finished:**

- A first-time student can complete or skip allowed setup steps and reach the Dashboard.
- A student can add a subject and find it available to later academic records.
- The companion can be selected, hidden, or motion-reduced.

**What could hold it up:** The document does not define how skipped setup is resumed or reset, or which companion assets are available. See Q-07 and Q-08 in [[00 - START HERE#Open questions]].

---

## Phase 3 — Daily academic work can be organized

**The goal:** A student can record what must be finished, plan study time, and keep notes by subject.

**Why it comes here:** Tasks, plans, and notes need the subject records and preferences created in Phase 2.

**What gets built:**

| # | What gets built | Why it is needed | Where the need came from |
|---|---|---|---|
| R-10 | Build task creation, editing, subtasks, status, priority, searching, filtering, completion, reopening, and deletion. | Students need a simple way to avoid missed academic deadlines. | `pokeden_product_build_documentation.md`, lines 373–432 |
| R-11 | Build Today and Week study planning, including adding, changing, moving, deleting, completing, and starting sessions. | The student needs to decide what to study and when. | `pokeden_product_build_documentation.md`, lines 446–506 |
| R-12 | Build subject-organized notes with editing, search, pinning, filtering, formatting, links, and automatic saving. | Students need a focused place for academic notes. | `pokeden_product_build_documentation.md`, lines 509–562 |

**How you know the phase is finished:**

- A student can complete the assignment-entry and note-taking journeys described in the document.
- A student can plan a session carrying a subject, topic, date, time, duration, priority, and optional related work.

**What could hold it up:** Attachment scope and detailed automatic-save behavior are not settled. See Q-02 in [[00 - START HERE#Open questions]].

---

## Phase 4 — Planned study becomes focused study

**The goal:** A planned session can become a working timer session, record useful study time, and trigger optional companion behavior.

**Why it comes here:** Pomodoro receives subject, topic, duration, and related task information from the planning work in Phase 3.

**What gets built:**

| # | What gets built | Why it is needed | Where the need came from |
|---|---|---|---|
| R-13 | Build the separate Pomodoro screen with start, pause, resume, stop, reset, short-break, and long-break controls. | Students need to move from planning into focused study. | `pokeden_product_build_documentation.md`, lines 577–622 |
| R-14 | Record planned and actual focus duration, start time, completion, daily totals, weekly totals, session count, and subject study time. | Completed focus work must feed progress. | `pokeden_product_build_documentation.md`, lines 591–622 and 939–947 |
| R-15 | Build optional companion states, event reactions, safe movement, quiet focus behavior, hiding, and reduced motion. | The companion provides motivation without obstructing study. | `pokeden_product_build_documentation.md`, lines 623–662 and 830–905 |

**How you know the phase is finished:**

- Starting a planned session opens Pomodoro with its study context.
- Completing a focus session updates the named totals.
- The companion can react without blocking controls, typing, or focus.

**What could hold it up:** Navigation, refresh, partial-session counting, and exact companion assets are not settled. See Q-06 and Q-08 in [[00 - START HERE#Open questions]].

---

## Phase 5 — Exam preparation and progress are visible

**The goal:** A student can break an exam into review topics, plan the review work, and see simple readiness and study progress.

**Why it comes here:** Exam review planning and progress depend on the planner and completed focus records from Phases 3 and 4.

**What gets built:**

| # | What gets built | Why it is needed | Where the need came from |
|---|---|---|---|
| R-16 | Build exam creation, editing, deletion, topics, reviewed state, countdown, result recording, and topic-based readiness. | Students need a clear way to prepare for assessments. | `pokeden_product_build_documentation.md`, lines 666–719 |
| R-17 | Build simple weekly study, focus-session, task, subject, exam-readiness, and grade summaries without competitive or predictive analytics. | Students need basic answers about progress without a large analytics product. | `pokeden_product_build_documentation.md`, lines 721–739 |
| R-18 | Let an exam topic create a planned review session and let completed review work increase readiness and progress. | Exam preparation must connect to planning and focus rather than stand alone. | `pokeden_product_build_documentation.md`, lines 948–950 and 1283–1293 |

**How you know the phase is finished:**

- A student can complete the exam-preparation journey from adding topics through increased readiness.
- Progress shows only the simple measures named in the document.

**What could hold it up:** The formulas for subject progress, grade summary, and suggested study are not defined. See Q-03 in [[00 - START HERE#Open questions]].

---

## Phase 6 — The whole study day stays connected

**The goal:** The student can understand today at a glance, open every dated commitment from one Calendar, and complete all named journeys reliably.

**Why it comes here:** Dashboard and Calendar summaries need working subjects, tasks, plans, focus records, and exams from earlier phases.

**What gets built:**

| # | What gets built | Why it is needed | Where the need came from |
|---|---|---|---|
| R-19 | Build the connected Dashboard with today’s classes, due tasks, exams, suggested study, quick focus, subject progress, focus totals, and companion home. | The product must answer what needs attention, what to study, and how study is progressing. | `pokeden_product_build_documentation.md`, lines 227–312 and 1348–1363 |
| R-20 | Build Month, Week, and Agenda calendar views from class schedules, deadlines, study plans, and exam dates, with each event opening its source. | Students need one chronological view without duplicate entry. | `pokeden_product_build_documentation.md`, lines 750–786 |
| R-21 | Connect task, subject, planner, focus, exam, progress, Dashboard, Calendar, and companion updates. | PokeDen must behave as one application rather than isolated tools. | `pokeden_product_build_documentation.md`, lines 908–960 |
| R-22 | Apply helpful empty states and every required interaction state across all modules and forms. | Students need clear next actions and reliable feedback in every condition. | `pokeden_product_build_documentation.md`, lines 963–999 and 1056–1077 |
| R-23 | Check long content, large collections, dates, duplicates, navigation, cleared storage, related deletions, and animation performance. | The document identifies these as important front-end quality risks. | `pokeden_product_build_documentation.md`, lines 1099–1115 |
| R-24 | Verify all five named journeys and every MVP capability from beginning to end. | The complete student-facing experience must be stable before production work begins. | `pokeden_product_build_documentation.md`, lines 1229–1316 and 1348–1363 |

**How you know the phase is finished:**

- The Dashboard and Calendar reflect changes made in their source modules without duplicate entry.
- All five journeys work by keyboard, with the companion hidden and reduced motion enabled.
- Each listed quality case has a defined expected result and has been checked.

**What could hold it up:** Dashboard recommendation rules, notifications, related-record deletion, timer navigation, and the Calendar event representation remain open. See Q-03, Q-04, Q-05, Q-06, and Q-10 in [[00 - START HERE#Open questions]].

---

## Phase 7 — Student information becomes production-ready

**The goal:** A student can sign in and keep owned academic information in durable production storage behind checked operations.

**Why it comes here:** The document explicitly delays this work until the complete front-end student experience is stable.

**What gets built:**

| # | What gets built | Why it is needed | Where the need came from |
|---|---|---|---|
| R-25 | Build sign-up, sign-in, sign-out, session handling, protected routes, ownership checks, and account recovery if retained. | Production use needs to recognize the student and protect their information. | `pokeden_product_build_documentation.md`, lines 1119–1134 |
| R-26 | Build durable records with keys, relationships, ownership, dates, archive and delete behavior, constraints, and useful indexes. | Production information must remain consistent and belong to the correct student. | `pokeden_product_build_documentation.md`, lines 1135–1162 |
| R-27 | Move due, completion, scheduling, timer, exam, progress, and Calendar rules into checked server-side operations. | Production calculations and changes should no longer rely only on the browser. | `pokeden_product_build_documentation.md`, lines 1163–1202 |
| R-28 | Connect the existing service boundaries to production operations with input checks, account checks, permission checks, safe changes, and consistent failure responses. | The front end needs production services without redesigning its pages. | `pokeden_product_build_documentation.md`, lines 1204–1225 |

**How you know the phase is finished:**

- A signed-in student can reach only their own academic information.
- The same student journeys work through production services and durable storage.
- Invalid or forbidden changes fail consistently without damaging records.

**What could hold it up:** Account recovery and durable companion state remain conditional. See Q-09 in [[00 - START HERE#Open questions]].

## Deliberately left out

| What | Why it is not here |
|---|---|
| Social feeds, messaging, public profiles, friends, multiplayer study rooms, and leaderboards | The document places them outside the initial scope. (`pokeden_product_build_documentation.md`, lines 1320–1330) |
| Battles, trading, pet-care systems, currencies, shops, and large achievement systems | The companion is intentionally secondary rather than a full game. (`pokeden_product_build_documentation.md`, lines 897–905 and 1331–1337) |
| AI tutoring, AI notes, advanced spaced repetition, and graph-based knowledge management | The document says not to prioritize them. (`pokeden_product_build_documentation.md`, lines 1338–1341) |
| Teacher dashboards, institutional administration, and full learning-management features | PokeDen is a personal student study space. (`pokeden_product_build_documentation.md`, lines 1342–1344) |
| Dates, budgets, staffing, marketing, and launch activity | This roadmap covers building work only, and the source supplies no schedule for it. |
