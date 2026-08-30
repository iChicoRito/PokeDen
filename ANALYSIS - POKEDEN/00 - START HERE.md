# 00 - START HERE

Next: [[01 - OVERVIEW]]

**What this is about:** PokeDen
**Written:** 25 March 2026
**Last updated:** 28 August 2026

## What was handed over

| What | Kind | Where it came from | Read? |
|---|---|---|---|
| `pokeden_product_build_documentation.md` | Markdown product and build specification | `D:\Personal Files\Projects\WebApps\pokademia\docs\pokeden_product_build_documentation.md`, read 25 March 2026 | Yes — all 1,363 lines |

The document describes a student study product, its modules and journeys, a front-end-first build approach, quality and accessibility rules, and later production account and storage work. The whole document was read. No application source or other project document was used as evidence.

The material remains at the full path above rather than being copied into this run. The line citations in these notes are therefore live: if the original file changes, they must be checked again.

## The short version

PokeDen is a proposed personal study website that combines subjects, assignments, study plans, notes, focus sessions, exams, progress, and a calendar. An optional companion adds quiet encouragement without carrying required information. The document calls for the complete student-facing experience to work with locally kept information before production accounts and durable storage are added. Roadmap Phases 1–6 were implemented on 28 August 2026 as that local-first experience; see [[08 - ROADMAP TRACKER]] and [[09 - TASK TRACKER]] for evidence-backed statuses.

## Everything in this analysis

| File | What it holds |
|---|---|
| [[01 - OVERVIEW]] | What PokeDen is and what it does |
| [[02 - DOCUMENT FINDINGS]] | What the supplied document says |
| [[05 - SYSTEM ARCHITECTURE]] | The proposed parts and how they hand work along |
| [[06 - DIAGRAMS]] | Pictures of the proposed system and main journeys |
| [[07 - DEVELOPMENT ROADMAP]] | What to build, in dependency order |
| [[08 - ROADMAP TRACKER]] | The evidence-supported status of every roadmap item |
| [[09 - TASK TRACKER]] | Every task and the requirement it came from |
| [[10 - WORD LIST]] | Plain meanings for unavoidable terms |

## Not made this time

| File | Why not |
|---|---|
| `03 - CODE FINDINGS` | Source code was not supplied as context and was explicitly outside this analysis. |
| `04 - COMBINED FINDINGS` | A document-to-code comparison is impossible without allowed source code. |

## How to read this

Start with [[01 - OVERVIEW]] for the quickest explanation. Use [[02 - DOCUMENT FINDINGS]] for traceable requirements and gaps. Open [[05 - SYSTEM ARCHITECTURE]] and [[06 - DIAGRAMS]] to understand how the proposed parts connect. Use [[07 - DEVELOPMENT ROADMAP]] for build order, [[08 - ROADMAP TRACKER]] for status, and [[09 - TASK TRACKER]] for actionable work.

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

## Open questions

Things the supplied document does not settle. Some were answered by implementation decisions on 28 August 2026 (marked Resolved); the rest remain open.

| # | Question | Why it matters | Who can answer |
|---|---|---|---|
| Q-01 | Which PokeDen parts, if any, are already built or being worked on? | Every roadmap and task status must remain unclear until there is evidence. | The project owner or development team — **Resolved**: Phases 1–6 are implemented; see [[08 - ROADMAP TRACKER]]. |
| Q-02 | Are task attachments and note images or attachments part of the initial complete version? | The document mentions them but makes note attachments conditional and omits them from the MVP list. | The product owner — **Resolved (decision)**: attachments excluded from the Phases 1–6 build; related-note/task links supported. |
| Q-03 | How are recommended study, subject progress, grade summary, and any overall progress calculated? | Dashboard and Progress cannot show consistent numbers or suggestions without agreed rules. | The product owner with the academic experience designer — **Resolved (decision)**: deterministic recommendation order; subject progress = completion ratio across tasks/plans/topics; grade summary = unweighted mean of numeric exam results. |
| Q-04 | When, where, and how are task, exam, study-plan, and Pomodoro reminders delivered? | Settings lists reminder switches but does not define the reminder behavior. | The product owner — **Resolved (decision)**: switches persist as preferences only; delivery remains future work. |
| Q-05 | What happens to tasks, notes, plans, exams, and focus records when their subject is archived or deleted? | The product must avoid broken or accidentally lost academic records. | The product owner and development team — **Resolved (decision)**: archiving retains history and excludes from new selectors; deletions null dangling links without cascading. |
| Q-06 | What should Pomodoro do during navigation, refresh, page closure, reopening, automatic focus-to-break changes, and partial focus? | Timer controls and progress totals need one reliable rule. | The product owner — **Resolved (decision)**: wall-clock reconciliation on navigation/refresh; only completed sessions count; stopped sessions are incomplete; breaks are user-started. |
| Q-07 | How does a student resume skipped setup, revisit onboarding, or reset setup? | Onboarding appears only while setup is incomplete, but the document does not define return paths. | The product owner — **Resolved (implemented)**: resume restores the exact step and typed drafts after refresh or reopen; Settings offers revisit as a review mode (`/onboarding?revisit=1`) with a "Reviewing your setup" banner and Cancel; full reset remains available. |
| Q-08 | Which companions and animation assets are available, and what artwork may the product use? | Selection, previews, states, performance, and permitted visual identity depend on these assets. | The product owner and visual designer — **Resolved (decision)**: three original abstract companions (Sprout/Ember/Ripple), no third-party artwork; previews are the product's own animated idle/study motion built with Tailwind/tw-animate-css and respect reduced-motion preferences. |
| Q-09 | Are account recovery and durable companion state included in the production version? | Both are conditional in the production scope and affect account and storage work. | The product owner — remains open; Phase 7 work is not started. |
| Q-10 | Is `CalendarEvent` a stored record or a temporary view built from subjects, tasks, plans, and exams? | The information list names it, while the Calendar rule warns against duplicated records. | The product owner and development team — **Resolved (decision)**: derived read model only, never persisted. |
| Q-11 | Which active status should a completed task return to when it is reopened? | The document provides a reopen action but does not name the resulting status. | The product owner — **Resolved (decision)**: reopening returns a task to To Do. |
