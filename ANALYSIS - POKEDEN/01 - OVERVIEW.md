# 01 - OVERVIEW

[[00 - START HERE|Back to start]] · Next: [[02 - DOCUMENT FINDINGS]]

## What it is

PokeDen is a proposed personal study website for students. It brings subjects, assignments, study plans, notes, focus sessions, exams, progress, and a calendar into one place. A small study companion adds encouragement but is not needed to use any academic feature. (`pokeden_product_build_documentation.md`, lines 3–15 and 89–105)

## Who uses it

| Who they are | What they come here to do |
|---|---|
| A student | Organize current subjects and academic work. |
| A student preparing to study | Decide what to study, plan the time, and begin a focus session. |
| A student preparing for an exam | List review topics, plan review sessions, and see simple readiness progress. |

The supplied document describes only a student-facing experience. Teacher, school administration, and social features are outside the initial scope. (`pokeden_product_build_documentation.md`, lines 19–33 and 1320–1344)

## What it does

A first-time student can see a short introduction, enter profile details, add subjects, choose a companion, and set focus and break lengths. They may skip subject setup and return to it later. (`pokeden_product_build_documentation.md`, lines 109–224)

The main study tools let the student manage subjects and assignments, plan study sessions, organize notes, run a Pomodoro focus timer, prepare for exams, and review simple progress. (`pokeden_product_build_documentation.md`, lines 315–748)

The Dashboard brings together what matters today. The Calendar brings together classes, deadlines, planned study sessions, and exam dates without asking the student to enter the same event twice. (`pokeden_product_build_documentation.md`, lines 227–312 and 750–786)

The tools are meant to work together. For example, a planned study session can open the focus timer with its subject and topic already filled in. A completed focus session can update study totals and subject progress. (`pokeden_product_build_documentation.md`, lines 908–960)

The companion may react to completed work and change its activity during focus and break periods. It must remain optional, avoid important screen areas, support reduced motion, and never punish the student. (`pokeden_product_build_documentation.md`, lines 623–662 and 830–905)

## What state it is in

The supplied material is a product and build specification. It describes what PokeDen should become, including a front-end-first version followed later by production accounts and durable storage. (`pokeden_product_build_documentation.md`, lines 73–85 and 1119–1225)

Roadmap Phases 1–6 (the complete local-first student experience) were implemented on 28 August 2026 at the application root while the template reference remained under `/template`. `npx tsc --noEmit` and `npm run build` pass; the remaining step is executing the manual QA checklist in `docs/pokeden-phase-6-qa.md`.

For evidence-backed statuses, see [[08 - ROADMAP TRACKER]] and [[09 - TASK TRACKER]]. Phase 7 production account and storage work is not started.

## What it does not do

The initial product is not meant to become a full school learning system, professional project manager, advanced note system, social network, or full game. It also excludes social feeds, messaging, public profiles, multiplayer study rooms, rankings, combat, trading, virtual currencies, AI tutoring, advanced spaced repetition, teacher dashboards, and institutional administration. (`pokeden_product_build_documentation.md`, lines 33–34 and 1320–1344)

Progress remains deliberately simple. The document rejects predictive scoring, competitive rankings, leaderboards, and a large collection of charts. (`pokeden_product_build_documentation.md`, lines 721–739)

## Where the details are

The proposed parts and the way information moves between them are in [[05 - SYSTEM ARCHITECTURE]]. The main journeys are pictured in [[06 - DIAGRAMS]]. The proposed build order is in [[07 - DEVELOPMENT ROADMAP]].
