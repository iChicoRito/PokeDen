# 05 - SYSTEM ARCHITECTURE

[[00 - START HERE|Back to start]] · Previous: [[02 - DOCUMENT FINDINGS]] · Next: [[06 - DIAGRAMS]]

## How to read this note

The supplied document describes a proposed arrangement. Since 28 August 2026, Roadmap Phases 1–6 have been implemented as a local-first front-end experience at the application root; the second section explains the implemented arrangement and the production arrangement the document proposes. Phase 7 production parts remain future work.

## The arrangement today

### The parts

Roadmap Phases 1–6 are implemented: onboarding and setup, subjects, tasks, study planner, notes, Pomodoro, exams, progress, Dashboard, Calendar, Settings, and an optional companion, built on shared local services. (`src/features/pokeden/`, `src/data/pokeden/`, and the routes under `src/app/(main)/`)

### How work passes between them

Pages call the shared store/actions layer (`src/features/pokeden/pokeden-provider.tsx`), which mutates the normalized local state and persists it. Shared derivations (`src/features/pokeden/derivations.ts`) feed Dashboard, Calendar, progress, subject details, and recommendation views, so a change in any source module immediately updates every derived view. The planner hands subject/topic/duration/related task into Pomodoro through `startStudySession`; completing linked focus marks exam topics reviewed.

### Where things are kept

A versioned localStorage repository (`src/data/pokeden/repository.client.ts`) holds the aggregate `PokeDenData` with validation, backup/recovery, cross-tab synchronization, demo reset, and academic-data clearing. Durable production storage remains deferred.

### Where it touches the outside world

No production outside connection exists. Production account and server operations remain future work in the document and are not started.

### What holds the arrangement together

The local-first store/service boundary is the dependency root: pages never read fixture files directly, and the same boundary is designed to be replaced by production service implementations later without redesigning page features. (`pokeden_product_build_documentation.md`, lines 73–85 and 1026–1052)

## The arrangement being implemented

### What changes and why

| Part | Status | What it is for | Why it is being built |
|---|---|---|---|
| Pages and navigation | ✅ Built | Give the student direct access to the main study tools. | PokeDen has seven core modules and supporting utilities. (`pokeden_product_build_documentation.md`, lines 89–105) |
| Onboarding and setup | ✅ Built | Introduce the product and collect starting profile, subject, companion, and timer choices. | First-time students need a short path into a useful Dashboard. (`pokeden_product_build_documentation.md`, lines 109–224) |
| Academic records | ✅ Built | Hold subjects, tasks, plans, notes, exams, focus sessions, grades, preferences, and companion information. | The document names the information the front end needs. (`pokeden_product_build_documentation.md`, lines 1003–1022) |
| Shared front-end services | ✅ Built | Give pages one consistent way to read and change information. | Pages should not read sample files directly, and the services should later be replaceable. (`pokeden_product_build_documentation.md`, lines 1026–1052) |
| Local information storage | ✅ Built | Let the first version remember work without production services. | The front-end-first approach calls for sample data, local state, and local storage. (`pokeden_product_build_documentation.md`, lines 73–85 and 1026–1034) |
| Cross-module update flow | ✅ Built | Keep the Dashboard, Calendar, subjects, tasks, plans, focus totals, and exams consistent. | The product is intended to behave as one connected application. (`pokeden_product_build_documentation.md`, lines 908–960) |
| Companion event handler | ✅ Built | Turn academic and timer events into optional visual reactions. | The companion has named states and events but must remain secondary. (`pokeden_product_build_documentation.md`, lines 830–905) |
| Production account checks | ⭕ Proposed later | Check who the student is and protect their routes. | Production requirements include sign-up, sign-in, sessions, recovery if needed, and protected routes. (`pokeden_product_build_documentation.md`, lines 1119–1134) |
| Production information store | ⭕ Proposed later | Keep each student’s records durably with ownership and relationships. | Production requires persistent records, keys, ownership, dates, constraints, and useful indexes. (`pokeden_product_build_documentation.md`, lines 1135–1162) |
| Server-side rules and services | ⭕ Proposed later | Check inputs, ownership, calculations, and safe changes behind the pages. | The document moves business rules and production service operations behind the front end after it is stable. (`pokeden_product_build_documentation.md`, lines 1163–1225) |

### How work passes between them

A student action begins on a page. The page asks the relevant shared service to read or change information. In the current version, that service uses sample information, local state, or local storage. The page then shows the result and any affected summary changes. (`pokeden_product_build_documentation.md`, lines 1026–1052)

Subjects provide the shared academic structure. Once a subject is created, Tasks, Notes, Study Planner, Pomodoro, and Exams can refer to it. (`pokeden_product_build_documentation.md`, lines 921–929)

A planned session can hand its subject, topic, duration, and related task to Pomodoro. A completed focus session then adds to daily and weekly time, session totals, and subject study time. (`pokeden_product_build_documentation.md`, lines 498–506 and 931–947)

Tasks, classes, plans, and exams send their date information to the Calendar view. Selecting an event opens its original record, so the Calendar does not become a separate place to maintain the same information. (`pokeden_product_build_documentation.md`, lines 750–776 and 952–960)

Academic actions and timer events can also send simple event names to the companion. The companion chooses a suitable state, unless it is hidden or movement is reduced. It may celebrate or rest, but it does not decide academic outcomes. (`pokeden_product_build_documentation.md`, lines 816–822 and 830–905)

After the front-end experience is stable, the same page-level services are intended to connect to production server operations. Those operations check the student, ownership, input, calculations, and safe record changes before using durable storage. (`pokeden_product_build_documentation.md`, lines 1119–1225)

### Where information is kept

| Stage | Where information is kept | What belongs there |
|---|---|---|
| First implementation (built) | Sample fixtures, local front-end state, and local storage | Student-facing records and preferences needed to demonstrate the complete experience. (`pokeden_product_build_documentation.md`, lines 73–85 and 1026–1034) |
| Production (future) | A durable information store behind checked server operations | Users, profiles, subjects, tasks, plans, notes, exams, focus sessions, grades, preferences, and any retained companion state. (`pokeden_product_build_documentation.md`, lines 1135–1162) |

`CalendarEvent` is implemented as a derived read model built temporarily from its source records; it is never persisted. This resolves Q-10 in [[00 - START HERE#Open questions]].

### What it took to get here

The shared academic information and service boundaries were defined first. Then the full local student experience was built, including its normal, empty, failed, disabled, completed, and overdue behavior. The modules are connected and shared derivations keep Dashboard, Calendar, progress, subject details, and recommendation views consistent. The remaining front-end step is executing the manual QA checklist in `docs/pokeden-phase-6-qa.md`. Only after that experience is stable should production accounts, durable storage, ownership checks, and server-side rules replace the local implementations. (`pokeden_product_build_documentation.md`, lines 73–85, 1026–1115, and 1119–1225)

### What is being given up

The first complete experience does not have production accounts, shared multi-device records, or durable server storage. The document chooses replaceable local services so page features can be settled first. (`pokeden_product_build_documentation.md`, lines 73–85 and 1026–1052)

The product also deliberately gives up advanced project management, complex analytics and note systems, social and competitive features, AI study tools, and deep game mechanics in order to remain a simple personal study space. (`pokeden_product_build_documentation.md`, lines 33–34, 672–739, 897–905, and 1320–1344)
