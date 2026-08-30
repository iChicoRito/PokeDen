# 06 - DIAGRAMS

[[00 - START HERE|Back to start]] · Previous: [[05 - SYSTEM ARCHITECTURE]] · Next: [[07 - DEVELOPMENT ROADMAP]]

Pictures of the proposed PokeDen experience. The supplied document does not confirm a currently built arrangement. Each picture therefore shows intended behavior and is followed by the same meaning in words.

## 1. The proposed system at a glance

```mermaid
flowchart LR
    student["A student"]
    pages["The study pages"]
    services["Shared study services"]
    localStore["Local information"]
    companion["Optional companion"]
    account["Production account checks"]
    serverRules["Production study rules"]
    durableStore["Durable student records"]

    student --> pages
    pages --> services
    services --> localStore
    pages --> companion
    services -.->|"after the front end is stable"| account
    account --> serverRules
    serverRules --> durableStore
```

**Reading this:** The student uses the study pages. Those pages ask shared services to read or change information. The first version keeps that information locally and can show optional companion reactions. Only after the complete front-end experience is stable do the same services move through production account checks and server-side rules into durable student records. This matches [[05 - SYSTEM ARCHITECTURE]]. (`pokeden_product_build_documentation.md`, lines 73–85, 1026–1052, and 1119–1225)

## 2. How a job gets done — first-time setup

```mermaid
flowchart TD
    openApp(["Open PokeDen"])
    setupDone{"Is initial setup complete?"}
    dashboard["Open the Dashboard"]
    welcome["Show four introduction screens"]
    profile["Enter profile details"]
    subjects["Add subjects or skip"]
    chooseCompanion["Choose a companion"]
    timerPrefs["Set focus and break lengths"]
    saveSetup["Mark setup complete"]

    openApp --> setupDone
    setupDone -->|"yes"| dashboard
    setupDone -->|"no"| welcome
    welcome --> profile
    profile --> subjects
    subjects --> chooseCompanion
    chooseCompanion --> timerPrefs
    timerPrefs --> saveSetup
    saveSetup --> dashboard
```

**Reading this:** PokeDen first checks whether setup is complete. Returning students go to the Dashboard. A new student sees the introduction, enters profile details, may add or skip subjects, chooses a companion, sets timer preferences, and then reaches the Dashboard. The document does not explain how a skipped or reset setup is resumed. (`pokeden_product_build_documentation.md`, lines 109–224 and 1231–1241)

## 3. How a job gets done — add an assignment

```mermaid
flowchart TD
    startTask(["Open Dashboard or Tasks"])
    newTask["Choose New Task"]
    enterTask["Enter the task and subject"]
    enterDate["Add the deadline"]
    validTask{"Do the entered details make sense?"}
    fixTask["Show what needs correcting"]
    saveTask["Save the task"]
    taskList["Show it in Tasks"]
    updateDash["Update the Dashboard"]
    updateCal["Update the Calendar"]

    startTask --> newTask
    newTask --> enterTask
    enterTask --> enterDate
    enterDate --> validTask
    validTask -->|"no"| fixTask
    fixTask --> enterTask
    validTask -->|"yes"| saveTask
    saveTask --> taskList
    saveTask --> updateDash
    saveTask --> updateCal
```

**Reading this:** The student opens Dashboard or Tasks, enters an assignment and deadline, and saves valid information. The assignment appears in Tasks while the Dashboard and Calendar update from the same source. The document requires input checking but leaves exact required fields to the form design. (`pokeden_product_build_documentation.md`, lines 381–432, 912–920, 1069–1076, and 1243–1254)

## 4. How a job gets done — plan and study

```mermaid
flowchart TD
    openPlanner(["Open Study Planner"])
    addPlan["Add a study session"]
    fillPlan["Choose subject topic and duration"]
    savePlan["Save the plan"]
    startPlan["Start the session"]
    openTimer["Open Pomodoro with study details"]
    focus["Complete focused study"]
    recordFocus["Record time and session totals"]
    updateProgress["Update subject and weekly progress"]
    react["Let the companion react if enabled"]

    openPlanner --> addPlan
    addPlan --> fillPlan
    fillPlan --> savePlan
    savePlan --> startPlan
    startPlan --> openTimer
    openTimer --> focus
    focus --> recordFocus
    recordFocus --> updateProgress
    updateProgress --> react
```

**Reading this:** A student plans a subject, topic, and duration. Starting that plan opens Pomodoro with the details already filled in. Completing focus records the session, updates progress, and may trigger a companion reaction. The document does not settle how partial sessions count. (`pokeden_product_build_documentation.md`, lines 460–506, 591–662, 931–947, and 1256–1270)

## 5. How a job gets done — take notes

```mermaid
flowchart TD
    openNotes(["Open Notes"])
    chooseSubject["Choose a subject"]
    createNote["Create a note"]
    writeNote["Write and format content"]
    saveNote["Save or automatically save"]
    showNote["Show the note under its subject"]

    openNotes --> chooseSubject
    chooseSubject --> createNote
    createNote --> writeNote
    writeNote --> saveNote
    saveNote --> showNote
```

**Reading this:** The student chooses a subject, creates and writes a note, and saves it manually or through automatic saving. The note then appears under that subject. (`pokeden_product_build_documentation.md`, lines 509–562 and 1272–1281)

## 6. How a job gets done — prepare for an exam

```mermaid
flowchart TD
    openExams(["Open Exams and Progress"])
    addExam["Add an exam"]
    addTopics["Add review topics"]
    reviewTopic["Mark a topic reviewed"]
    planReview["Plan another review session"]
    completeFocus["Complete focused review"]
    calculateReady["Recalculate readiness"]
    allReviewed{"Are all topics reviewed?"}
    keepPreparing["Continue preparing"]
    ready["Show full readiness"]

    openExams --> addExam
    addExam --> addTopics
    addTopics --> reviewTopic
    reviewTopic --> planReview
    planReview --> completeFocus
    completeFocus --> calculateReady
    calculateReady --> allReviewed
    allReviewed -->|"no"| keepPreparing
    keepPreparing --> reviewTopic
    allReviewed -->|"yes"| ready
```

**Reading this:** The student adds an exam and its topics, marks review work, plans more sessions, and completes focused review. Readiness is based on the share of topics marked reviewed. Work continues until all topics are reviewed. (`pokeden_product_build_documentation.md`, lines 674–719 and 1283–1293)

## 7. Who talks to whom, in order — a completed focus session

```mermaid
sequenceDiagram
    participant Student as A student
    participant Planner as Study Planner
    participant Timer as Pomodoro
    participant Progress as Progress summaries
    participant Companion as Optional companion

    Student->>Planner: Starts a planned session
    Planner->>Timer: Sends subject topic and duration
    Student->>Timer: Completes focused study
    Timer->>Progress: Sends time session and subject totals
    Progress-->>Student: Shows updated progress
    Timer->>Companion: Sends focus completed event
    Companion-->>Student: Shows a quiet reaction if enabled
```

**Reading this:** Time moves down the picture. The student starts in Study Planner, which sends the study details to Pomodoro. Completion sends totals to Progress and an event to the optional companion. Solid arrows carry requests or updates; dashed arrows show what the student sees in return. (`pokeden_product_build_documentation.md`, lines 498–506, 623–662, and 931–947)

## 8. The life story of a task

```mermaid
stateDiagram-v2
    [*] --> ToDo
    ToDo --> InProgress : work begins
    InProgress --> Completed : work is finished
    ToDo --> Completed : finished directly
    Completed --> ToDo : reopened
    ToDo --> [*] : deleted
    InProgress --> [*] : deleted
    Completed --> [*] : deleted
```

**Reading this:** A task begins as To Do. It may move into In Progress or be completed directly. A completed task may be reopened. Deleting a task ends its life from any listed state. The document names the statuses and actions but does not say whether reopening returns to To Do or In Progress; the arrow to To Do is therefore a proposed reading that needs confirmation in [[00 - START HERE#Open questions|Q-11]]. (`pokeden_product_build_documentation.md`, lines 395–432)

## 9. The life story of a focus session

```mermaid
stateDiagram-v2
    [*] --> Ready
    Ready --> Focusing : start
    Focusing --> Paused : pause
    Paused --> Focusing : resume
    Focusing --> Completed : focus finishes
    Focusing --> Stopped : stop
    Paused --> Stopped : stop
    Completed --> ShortBreak : choose short break
    Completed --> LongBreak : choose long break
    ShortBreak --> Ready : break finishes
    LongBreak --> Ready : break finishes
    Stopped --> Ready : reset
```

**Reading this:** The timer waits ready, moves into focus, may pause and resume, and can finish or stop. Completion can lead to a short or long break before returning to ready. A stopped session can be reset. The controls are specified, but the exact automatic movement between focus and breaks is not; this picture shows a conservative proposed flow. (`pokeden_product_build_documentation.md`, lines 585–612)

## 10. The companion’s main reactions

```mermaid
flowchart TD
    event(["An academic or timer event happens"])
    visible{"Is the companion visible?"}
    noReaction["Keep academic work unchanged"]
    reduced{"Is reduced motion enabled?"}
    quiet["Show a still or reduced reaction"]
    focusEvent{"Is focused study active?"}
    studyState["Use a quiet study state"]
    normalState["Use a suitable idle break or celebration state"]
    returnState["Return to a safe resting state"]

    event --> visible
    visible -->|"no"| noReaction
    visible -->|"yes"| reduced
    reduced -->|"yes"| quiet
    reduced -->|"no"| focusEvent
    focusEvent -->|"yes"| studyState
    focusEvent -->|"no"| normalState
    quiet --> returnState
    studyState --> returnState
    normalState --> returnState
```

**Reading this:** Academic work never depends on the companion. Hidden companions do nothing visible. Reduced motion leads to a restrained response. During focus, the companion uses a quiet study state; at other times it may idle, rest, or celebrate before returning to a safe area. (`pokeden_product_build_documentation.md`, lines 67–71, 623–662, 816–822, and 830–905)

## 11. The order of the phases

```mermaid
flowchart LR
    p1["Phase 1 - The local foundation is ready"]
    p2["Phase 2 - A student can set up their study space"]
    p3["Phase 3 - Daily academic work can be organized"]
    p4["Phase 4 - Planned study becomes focused study"]
    p5["Phase 5 - Exam preparation and progress are visible"]
    p6["Phase 6 - The whole study day stays connected"]
    p7["Phase 7 - Student information becomes production-ready"]

    p1 --> p2
    p2 --> p3
    p3 --> p4
    p4 --> p5
    p5 --> p6
    p6 --> p7
```

**Reading this:** Shared local foundations come first. Setup and subjects make daily work possible. Planning then feeds focused study, which supplies records for exam preparation and progress. Dashboard, Calendar, quality work, and full journeys connect everything before production accounts and durable storage begin. The order matches [[07 - DEVELOPMENT ROADMAP]].
