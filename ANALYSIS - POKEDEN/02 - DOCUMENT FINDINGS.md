# 02 - DOCUMENT FINDINGS

[[00 - START HERE|Back to start]] · Previous: [[01 - OVERVIEW]] · Next: [[05 - SYSTEM ARCHITECTURE]]

## What was read

| Document | Kind | How much was read |
|---|---|---|
| `pokeden_product_build_documentation.md` | Product and build specification, 1,363 lines | All of it |

## What the document says the system must do

| # | What it must do | Where it says so |
|---|---|---|
| D-01 | Give students one simple place to organize academic work, plan study, focus, take notes, prepare for exams, and review progress. | `pokeden_product_build_documentation.md`, lines 3–33 |
| D-02 | Keep the companion secondary, optional, hideable, and unnecessary for every academic feature. | `pokeden_product_build_documentation.md`, lines 67–71 |
| D-03 | Build the complete student-facing experience with sample and locally kept information before adding production accounts and server-side storage. | `pokeden_product_build_documentation.md`, lines 73–85 |
| D-04 | Show onboarding only to first-time students or those who have not completed setup. | `pokeden_product_build_documentation.md`, lines 109–180 |
| D-05 | Let the student set profile details, add or skip subjects, choose a companion, and set focus and break lengths. | `pokeden_product_build_documentation.md`, lines 182–224 |
| D-06 | Give the Dashboard a useful view of today’s classes, due tasks, exams, suggested study, focus totals, and subject progress. | `pokeden_product_build_documentation.md`, lines 227–312 |
| D-07 | Let students add, change, archive, and open subjects, with related tasks, notes, study sessions, exams, materials, and progress reachable from each subject. | `pokeden_product_build_documentation.md`, lines 315–370 |
| D-08 | Let students create, change, complete, reopen, delete, search, and filter academic tasks, including subtasks. | `pokeden_product_build_documentation.md`, lines 373–432 |
| D-09 | Let students plan, change, move, delete, complete, and start study sessions. | `pokeden_product_build_documentation.md`, lines 446–506 |
| D-10 | Let students create, edit, delete, search, pin, filter, format, and automatically save notes by subject. | `pokeden_product_build_documentation.md`, lines 509–562 |
| D-11 | Keep Pomodoro as a separate core tool with focus, short-break, and long-break controls and session details. | `pokeden_product_build_documentation.md`, lines 577–622 |
| D-12 | Keep the companion quiet during focus and change its activity appropriately during focus, breaks, completion, and inactivity. | `pokeden_product_build_documentation.md`, lines 623–662 and 830–878 |
| D-13 | Let students add exams, track review topics, plan review sessions, record results, and see simple readiness and progress. | `pokeden_product_build_documentation.md`, lines 666–746 |
| D-14 | Build the Calendar from classes, task deadlines, study plans, and exam dates, and open the original item when an event is selected. | `pokeden_product_build_documentation.md`, lines 750–786 |
| D-15 | Let students control profile, timer, reminder, and companion preferences in Settings. | `pokeden_product_build_documentation.md`, lines 788–827 |
| D-16 | Keep subject, task, plan, focus, exam, progress, calendar, and companion information synchronized across the application. | `pokeden_product_build_documentation.md`, lines 908–960 |
| D-17 | Give empty screens a clear explanation and a useful next action. | `pokeden_product_build_documentation.md`, lines 963–999 |
| D-18 | Keep page features behind shared service boundaries so pages do not read sample files directly. | `pokeden_product_build_documentation.md`, lines 1026–1052 |
| D-19 | Cover normal, empty, loading, successful, failed, disabled, completed, and overdue behavior where each applies. | `pokeden_product_build_documentation.md`, lines 1056–1077 |
| D-20 | Remain usable by keyboard and without color, animation, or the companion carrying essential meaning. | `pokeden_product_build_documentation.md`, lines 1080–1095 |
| D-21 | Check long content, large collections, unusual dates, duplicate actions, cleared local storage, timer navigation, related deleted records, and companion performance. | `pokeden_product_build_documentation.md`, lines 1099–1115 |
| D-22 | Add production sign-in, durable storage, ownership checks, server-side rules, and safe service connections only after the front-end experience is stable. | `pokeden_product_build_documentation.md`, lines 1119–1225 |
| D-23 | Support the five named end-to-end journeys: setup, assignment entry, planned study, note taking, and exam preparation. | `pokeden_product_build_documentation.md`, lines 1229–1293 |
| D-24 | Deliver the listed student capabilities as the initial complete version and treat anything beyond them as optional expansion. | `pokeden_product_build_documentation.md`, lines 1297–1316 |

## Rules it has to follow

- Every feature must support a realistic student activity. Common actions should take few steps. (`pokeden_product_build_documentation.md`, lines 37–65)
- The product must not grow into a full learning-management system, professional project manager, advanced knowledge system, social network, or full game. (`pokeden_product_build_documentation.md`, lines 33–34)
- The companion must not cover controls, interfere with typing, distract during focus, punish the student, or carry required academic information. (`pokeden_product_build_documentation.md`, lines 662 and 836–846; lines 1080–1095)
- The focus timer remains a separate core module rather than being merged into the Study Planner. (`pokeden_product_build_documentation.md`, lines 577–584)
- Calendar events come from their original records rather than being entered again. (`pokeden_product_build_documentation.md`, lines 750–776 and 1200–1202)
- Production accounts, storage, and business rules wait until the complete front-end experience is stable. (`pokeden_product_build_documentation.md`, lines 73–85 and 1119–1122)
- The initial build does not prioritize the social, competitive, game, AI, teacher, and institutional features listed outside scope. (`pokeden_product_build_documentation.md`, lines 1320–1344)

## Decisions already made

| Decision | Reasoning given | Where it says so |
|---|---|---|
| Use familiar student labels for the main tools. | Students should understand them immediately. | `pokeden_product_build_documentation.md`, lines 43–55 |
| Start with local and sample information behind shared services. | Production services can replace them later without redesigning page features. | `pokeden_product_build_documentation.md`, lines 73–85 and 1026–1052 |
| Keep Pomodoro separate from Study Planner. | It is a dedicated core module that moves the student from planning into focused work. | `pokeden_product_build_documentation.md`, lines 577–584 |
| Calculate exam readiness from reviewed topics. | This provides a simple percentage without a large analytics system. | `pokeden_product_build_documentation.md`, lines 686–709 and 721–739 |
| Derive calendar entries from original academic records. | This avoids duplicate entry and keeps events connected to their source. | `pokeden_product_build_documentation.md`, lines 750–776 and 1200–1202 |
| Make the companion optional and non-punitive. | It should add personality and motivation without changing the academic purpose. | `pokeden_product_build_documentation.md`, lines 830–846 |

## Where the document disagrees with itself

No flat contradiction was found. Two scope tensions still need a decision:

| # | One passage says | Another passage says | Where |
|---|---|---|---|
| C-01 | Tasks may have an attachment, and notes may have images or attachments. | Images and attachments are included only “if retained in scope,” while the MVP list does not name them. | `pokeden_product_build_documentation.md`, lines 381–393, 517–562, and 1297–1316 |
| C-02 | `CalendarEvent` appears among the recommended information entities. | Calendar information should be derived from source records rather than duplicated. | `pokeden_product_build_documentation.md`, lines 1003–1022 and 1200–1202 |

These are recorded as questions rather than resolved by assumption.

## What the document leaves unsaid

- It does not report which parts, if any, are already built.
- It does not settle whether task and note attachments belong in the initial complete version.
- It does not define how recommended study, subject progress, grades, or overall progress are calculated.
- It lists reminder settings but does not define when or how reminders are delivered.
- It requires testing deleted subjects with associated records but does not say whether those records move, remain, archive, or are deleted.
- It requires timer behavior during navigation to be checked but does not define the expected behavior after navigation, refresh, closing the page, or reopening it.
- It does not define whether a stopped or partly completed focus session contributes to progress.
- It does not say how a student returns to skipped onboarding steps or resets onboarding.
- It describes companion choices and animations but does not name the available companions or the source and permitted use of their artwork.
- It leaves production account recovery and stored companion state conditional.

Each gap appears as a numbered question in [[00 - START HERE#Open questions]].
