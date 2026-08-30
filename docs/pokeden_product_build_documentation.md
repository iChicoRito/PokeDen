# PokeDen — Product & Build Documentation

## 1. Product Overview

**PokeDen** is a student-focused academic productivity web application that helps students organize their studies, manage academic responsibilities, plan study sessions, take notes, prepare for exams, and stay focused using a built-in Pomodoro timer.

The application includes a lightweight Pokémon-style study companion that acts as a visual and motivational presence throughout the experience. The companion supports studying through subtle reactions and animations but does not turn the application into a game.

PokeDen should remain simple, useful for everyday student life, easy to navigate, lightweight, and engaging without becoming overly gamified.

The product should answer three primary questions for the student:

1. **What do I need to do?**
2. **What should I study?**
3. **How am I progressing?**

---

## 2. Core Product Goals

PokeDen should help students:

- Organize active subjects.
- Track tasks, assignments, and deadlines.
- Plan study sessions.
- Write and organize academic notes.
- Start focused study sessions using Pomodoro.
- Track upcoming exams and preparation progress.
- Review basic study and academic progress.
- See important academic events in one place.
- Stay motivated through a persistent study companion.

The application should not become a full LMS, project-management platform, complex knowledge-management system, social network, or full game.

---

## 3. Product Principles

### Student-first

Every feature must directly support a realistic student activity such as studying, reviewing, completing assignments, managing subjects, writing notes, preparing for exams, or tracking deadlines.

### Simple terminology

Use labels students immediately understand:

- Subjects
- Tasks
- Study Planner
- Notes
- Pomodoro
- Exams
- Progress
- Calendar

### Low-friction interaction

Common student actions should require as few steps as possible:

- Add task
- Complete task
- Start Pomodoro
- Create note
- Add exam
- Plan study session

### Companion is secondary

The Pokémon-style companion enhances the experience but must never be required to use the academic features.

Students should be able to hide the companion, reduce motion, and use every study feature without interacting with it.

### Front-end-first implementation

The first implementation should work without production backend services.

Use:

- Mock data
- Local front-end state
- Local storage
- Front-end service abstractions
- Static or generated sample data

Production business logic, authentication, and databases should be added only after the complete student-facing experience is stable.

---

## 4. Main Application Structure

PokeDen contains seven core student modules:

1. Dashboard
2. Subjects
3. Tasks & Assignments
4. Study Planner
5. Notes
6. Pomodoro / Focus Timer
7. Exams & Progress

Supporting utilities:

- Calendar
- Settings
- Study Companion

---

## 5. Onboarding Experience

The onboarding experience should appear only for first-time users or users who have not completed initial setup.

Recommended onboarding length:

**4 introduction screens + setup**

### Onboarding Screen 1 — Welcome

**Purpose:** Introduce PokeDen and explain the product in one simple message.

**Title:** Welcome to PokeDen

**Supporting text:** Plan your studies, stay focused, organize your notes, and study with a companion by your side.

**Primary action:** Get Started

**Secondary action:** Skip

### Onboarding Screen 2 — Academic Organization

**Purpose:** Explain that PokeDen brings the student's important academic tools into one application.

**Title:** Everything for School, in One Place

Highlight:

- Subjects
- Tasks & Assignments
- Notes
- Study Planner
- Exams & Progress

**Primary action:** Next

### Onboarding Screen 3 — Study Planning and Focus

**Purpose:** Explain how Study Planner and Pomodoro work together.

**Title:** Plan It. Then Focus.

Explain:

- Subject
- Topic
- Planned duration
- Pomodoro
- Short break
- Long break

**Primary action:** Next

### Onboarding Screen 4 — Study Companion

**Purpose:** Explain the companion system.

**Title:** Meet Your Study Companion

Explain that the companion can:

- Roam within safe areas of the interface.
- Study during Pomodoro.
- Celebrate completed tasks.
- React to completed study sessions.
- Rest during inactivity.
- React to study milestones.
- Be hidden when the student wants zero distractions.

**Primary action:** Choose My Companion

---

## 6. Initial Student Setup

### Student Profile Setup

Suggested fields:

- Name
- Course / Program
- Year Level
- Current Semester

### Subject Setup

Allow students to add current subjects.

Each subject may contain:

- Subject name
- Subject code
- Instructor
- Class schedule

The user should also be able to skip this step and add subjects later.

### Companion Selection

Allow the student to select one available companion.

Possible controls:

- Select companion
- Preview idle animation
- Preview study animation
- Confirm selection

### Study Preferences

Suggested defaults:

- Focus duration: 25 minutes
- Short break: 5 minutes
- Long break: 15 minutes

---

## 7. Dashboard Module

### Purpose

The Dashboard gives the student an immediate overview of what matters today.

It should answer:

- What classes do I have?
- What tasks are due?
- What exam is coming?
- What should I study?
- How much have I studied today?

### Main Content

#### Today's Classes

Show:

- Time
- Subject
- Optional room / location

#### Due Tasks

Show:

- Task title
- Subject
- Due date or urgency

#### Upcoming Exams

Show:

- Exam title
- Subject
- Date
- Days remaining

#### Recommended Study

Show one useful next action.

Example:

**Database Systems — Review SQL Joins — 30 min**

#### Quick Focus

Provide a shortcut to start Pomodoro.

#### Subject Progress Summary

Show simple progress indicators for active subjects.

#### Today's Focus

Show:

- Total focus time
- Number of sessions

#### Companion Home

The Dashboard can act as the companion's primary resting area.

The companion may:

- Walk
- Sit
- Sleep
- React to completed work
- Display a small status or emote

### Core Interactions

- Open task
- Open subject
- Open exam
- Start recommended study
- Start Pomodoro
- Open calendar
- Interact with companion

---

## 8. Subjects Module

### Purpose

Subjects provide the main academic organization structure.

Everything related to a course should be easy to find from its subject page.

### Subject List

Each subject can show:

- Subject name
- Subject code
- Instructor
- Schedule
- Current progress
- Upcoming work

### Add Subject

Suggested fields:

- Subject name
- Subject code
- Instructor
- Class days
- Class time

Optional:

- Room
- Description

### Subject Details

Each subject should provide access to:

- Overview
- Tasks
- Notes
- Study Sessions
- Exams
- Materials
- Progress

### Core Interactions

- Add subject
- Edit subject
- Archive subject
- Open related task
- Open note
- Start study session
- Open exam

---

## 9. Tasks & Assignments Module

### Purpose

Help students manage academic work and avoid missing deadlines.

This module should stay simpler than professional task-management software.

### Task Data

A task may contain:

- Title
- Subject
- Description
- Due date
- Priority
- Status
- Subtasks
- Optional attachment
- Optional related note

### Recommended Statuses

- To Do
- In Progress
- Completed

### Recommended Priorities

- Low
- Medium
- High

### Main Views

- All Tasks
- Due Today
- Upcoming
- Completed

### Filters

Allow filtering by:

- Subject
- Status
- Priority
- Due date

### Core Interactions

- Add task
- Edit task
- Complete task
- Reopen task
- Delete task
- Add subtasks
- Filter tasks
- Search tasks

### Companion Behavior

Examples:

- Completing a task triggers a short celebration.
- Completing all tasks for the day triggers a special reaction.
- Overdue tasks may trigger a subtle concerned animation.

Do not use punishment mechanics.

---

## 10. Study Planner Module

### Purpose

Help the student decide what to study and when.

Tasks answer:

**What do I need to finish?**

The Study Planner answers:

**What should I spend study time on?**

### Study Session Data

A planned session may contain:

- Subject
- Topic
- Related task
- Date
- Start time
- Planned duration
- Priority
- Notes

### Main Views

- Today
- Week

### Study Session Actions

- Add
- Edit
- Reschedule
- Delete
- Mark complete
- Start focus session

### Suggested Priority Logic

A simple front-end priority system may consider:

- Upcoming exam
- Upcoming task deadline
- Low subject progress
- Unfinished review topic

No AI is required.

### Pomodoro Integration

Selecting **Start** from a planned study session should send relevant context to Pomodoro:

- Subject
- Topic
- Planned duration
- Related task if available

---

## 11. Notes Module

### Purpose

Give students a focused place to create and organize study notes.

PokeDen does not need to recreate advanced tools such as Obsidian.

### Note Data

A note may contain:

- Title
- Subject
- Content
- Tags
- Created date
- Updated date
- Pinned status

Optional:

- Attachment
- Related task
- Related exam topic

### Organization

Recommended structure:

**Subject → Notes**

Example:

```text
Database Systems
├── SQL Basics
├── Joins
├── Normalization
└── Transactions
```

### Main Functionality

- Create note
- Edit note
- Delete note
- Search notes
- Pin note
- Filter by subject
- Autosave
- Add basic formatting
- Add links
- Add images or attachments if retained in scope

### Companion Behavior

Keep companion activity quiet in Notes.

Suggested states:

- Reading
- Sitting
- Sleeping
- Looking toward the editor

---

## 12. Pomodoro / Focus Timer Module

### Purpose

Help the student transition from planning into actual focused studying.

This is a dedicated core module and should not be merged into Study Planner.

### Default Pomodoro Cycle

- Focus: 25 minutes
- Short break: 5 minutes
- Long break: 15 minutes

### Focus Session Data

A focus session may contain:

- Subject
- Topic
- Related task
- Planned duration
- Actual duration
- Start time
- Completion status

### Main Controls

- Start
- Pause
- Resume
- Stop
- Reset
- Short Break
- Long Break

### Additional Information

Show:

- Current subject
- Current topic
- Session number
- Today's total focus time
- Today's completed sessions

### Companion Behavior

Pomodoro should be the strongest companion integration.

#### During Focus

Possible animations:

- Reading
- Writing
- Sitting at a desk
- Studying

#### During Short Break

Possible animations:

- Walking
- Stretching
- Eating
- Looking around

#### During Long Break

Possible animations:

- Sleeping
- Relaxing
- Playing

#### On Completion

Possible reactions:

- Celebrate
- Heart or emote
- Small jump
- Happy animation

The companion should never distract the student during an active focus period.

---

## 13. Exams & Progress Module

### Purpose

Help students prepare for assessments and understand basic study progress.

Avoid turning this into a large analytics platform.

### Exams

An exam may contain:

- Exam title
- Subject
- Date
- Description
- Topics
- Optional grade
- Preparation progress

#### Exam Topic Checklist

Example:

```text
Database Midterm

✓ Database Basics
✓ Primary Keys
✓ SELECT Queries
○ SQL Joins
○ Normalization
○ Transactions
```

#### Exam Readiness

A simple readiness percentage can be based on completed review topics.

Example:

```text
4 reviewed topics / 6 total topics = 67%
```

#### Exam Actions

- Add exam
- Edit exam
- Delete exam
- Add topics
- Mark topic reviewed
- Plan review session
- Record result

### Progress

Recommended progress information:

- Weekly study time
- Focus sessions completed
- Tasks completed
- Subject progress
- Exam readiness
- Basic grade summary

Avoid:

- Complex analytics
- Dozens of charts
- Predictive academic scoring
- Competitive rankings
- Leaderboards

### Companion Behavior

Suggested reactions:

- Celebrate exam topic completion.
- Celebrate 100% exam preparation.
- React to weekly study milestones.

---

## 14. Calendar Utility

### Purpose

Give the student one chronological view of academic commitments.

The Calendar should aggregate data from other modules rather than require duplicate entry.

### Calendar Sources

Automatically show:

- Subject class schedules
- Task deadlines
- Planned study sessions
- Exam dates

### Calendar Behavior

Selecting an event should open its source.

Examples:

- Task → open task
- Exam → open exam
- Study session → open Study Planner
- Class → open subject

### Views

Recommended:

- Month
- Week
- Agenda

---

## 15. Settings Utility

### Purpose

Allow students to control preferences that do not belong in study modules.

### Recommended Sections

#### Profile

- Name
- Course / Program
- Year Level
- Semester

#### Study Preferences

- Default focus duration
- Short break duration
- Long break duration

#### Notifications

- Task reminders
- Exam reminders
- Planned study reminders
- Pomodoro completion alerts

#### Companion

- Selected companion
- Companion visibility
- Companion movement
- Reduced motion
- Companion interaction preference

#### Account

Reserved for future production authentication.

---

## 16. Study Companion System

### Purpose

The companion gives PokeDen personality and provides lightweight motivation without changing the academic purpose of the application.

### Companion Rules

The companion must:

- Stay in safe screen areas.
- Avoid covering buttons or important content.
- Avoid interfering with text entry.
- Reduce movement during focus-heavy activities.
- Be optional.
- Support reduced motion.
- Never punish the student.

### Companion States

```text
IDLE
WALK
READ
WRITE
STUDY
SIT
SLEEP
STRETCH
HAPPY
CELEBRATE
CONCERNED
```

### Companion Events

```text
TASK_COMPLETED
ALL_DAILY_TASKS_COMPLETED
FOCUS_STARTED
FOCUS_PAUSED
FOCUS_COMPLETED
BREAK_STARTED
STUDY_PLAN_COMPLETED
EXAM_TOPIC_REVIEWED
EXAM_READY
DAILY_STUDY_GOAL_COMPLETED
APP_IDLE
```

### Companion Interaction

Clicking the companion may open a small panel.

Suggested content:

- Companion name
- Mood
- Study time together
- Study sessions together

Actions:

- Pet
- Change Companion
- Hide Companion

Avoid complicated systems such as:

- Hunger
- Health
- Combat
- Breeding
- Complex inventory
- Currency grinding

---

## 17. Cross-Module Behavior

PokeDen should behave as one connected application.

### Tasks → Dashboard

When a task is added or completed:

- Dashboard updates.
- Due counts update.
- Subject data updates.
- Calendar updates.

### Subjects → Other Modules

A subject created in Subjects should become available in:

- Tasks
- Notes
- Study Planner
- Pomodoro
- Exams

### Study Planner → Pomodoro

Starting a planned session should populate:

- Subject
- Topic
- Duration

### Pomodoro → Progress

Completing a focus session should update:

- Today's focus time
- Weekly focus time
- Session count
- Subject study time

### Exams → Study Planner

An exam topic should be able to create a planned review session.

### Calendar → Source Data

Calendar events should reflect data from:

- Subjects
- Tasks
- Study Planner
- Exams

---

## 18. Empty States

Empty states should help students understand what to do next.

### Dashboard

**Your Den is ready. Add your first task or plan a study session.**

### Subjects

**No subjects yet. Add the subjects you're currently taking.**

Action: **Add Subject**

### Tasks

**Nothing due right now.**

Action: **Add Task**

### Study Planner

**No study sessions planned.**

Action: **Plan Study Session**

### Notes

**Start your first study note.**

Action: **Create Note**

### Exams

**No upcoming exams.**

Action: **Add Exam**

---

## 19. Front-End Data Model

Recommended entities:

```ts
StudentProfile
Subject
Task
TaskSubtask
StudySession
Note
Exam
ExamTopic
FocusSession
GradeRecord
CalendarEvent
StudyPreference
Companion
CompanionState
```

---

## 20. Front-End Data Strategy

Before production backend integration, PokeDen should operate using:

- Mock fixtures
- Local state
- Local storage
- Front-end service abstractions

Pages should not read mock files directly.

Recommended service boundaries:

```ts
subjectService
taskService
studyPlannerService
noteService
focusService
examService
progressService
calendarService
settingsService
companionService
```

These can later be replaced with production implementations without redesigning page-level features.

---

## 21. Front-End Behavior Requirements

Every interactive feature should account for:

- Default state
- Empty state
- Loading state
- Success state
- Error state
- Disabled state
- Completed state
- Overdue state where applicable

Forms should define:

- Required fields
- Optional fields
- Validation
- Cancel behavior
- Delete confirmation
- Unsaved-change behavior where relevant

---

## 22. Accessibility Requirements

PokeDen should remain fully usable without relying on the companion or animation.

Requirements:

- Keyboard-accessible controls
- Visible focus states
- Clear labels
- Semantic controls
- Accessible dialogs
- Non-color status indicators
- Timer controls usable with keyboard
- Companion can be hidden
- Reduced-motion support
- Companion animations must not convey required academic information

---

## 23. Front-End Quality Requirements

Important areas to test:

- Long subject names
- Long task titles
- Empty notes
- Overdue tasks
- Multiple exams on one date
- Large note collections
- Large task collections
- Pomodoro behavior during navigation
- Deleted subjects with associated records
- Invalid dates
- Duplicate submissions
- Local storage clearing
- Companion animation performance

---

## 24. Production Backend Scope

Production backend work should begin only after the complete front-end student experience is stable.

### Authentication

Production requirements:

- Sign up
- Sign in
- Sign out
- Session handling
- Protected application routes
- Account recovery if required
- Student ownership checks

### Database

Persistent storage will be needed for:

- Users
- Student profiles
- Subjects
- Tasks
- Task subtasks
- Study plans
- Notes
- Exams
- Exam topics
- Focus sessions
- Grade records
- Preferences
- Companion preference/state if required

The production schema should include:

- Primary keys
- Foreign keys
- Ownership
- Timestamps
- Archive/delete behavior
- Constraints
- Useful indexes

### Business Logic

Server-side or domain logic should eventually handle:

#### Tasks

- Due status
- Overdue calculation
- Completion
- Subject ownership

#### Study Planner

- Session scheduling
- Completion state
- Priority calculation where retained

#### Pomodoro

- Completed focus session validation
- Study-time aggregation

#### Exams

- Countdown
- Topic completion
- Readiness calculation

#### Progress

- Study time
- Completed sessions
- Task completion
- Subject totals
- Exam readiness
- Grade summaries

#### Calendar

Academic events should be derived from source data rather than duplicated unnecessarily.

### Production Service Integration

The front-end service abstractions should eventually connect to production server operations for:

- Subjects
- Tasks
- Study Plans
- Notes
- Focus Sessions
- Exams
- Progress
- Calendar
- Settings
- Companion Preferences

Production implementation should include:

- Input validation
- Authentication checks
- Authorization checks
- Safe create/update/delete behavior
- Consistent error responses

---

## 25. Core User Journeys

### Journey A — New Student

```text
Open PokeDen
→ Complete onboarding
→ Enter student profile
→ Add subjects
→ Choose companion
→ Set Pomodoro preferences
→ Enter Dashboard
```

### Journey B — Add an Assignment

```text
Dashboard / Tasks
→ New Task
→ Select Subject
→ Add Deadline
→ Save
→ Task appears in Tasks
→ Dashboard updates
→ Calendar updates
```

### Journey C — Plan and Study

```text
Study Planner
→ Add Study Session
→ Select Subject
→ Enter Topic
→ Choose Duration
→ Save
→ Start Session
→ Pomodoro opens
→ Complete Focus Session
→ Progress updates
→ Companion reacts
```

### Journey D — Take Notes

```text
Notes
→ Select Subject
→ Create Note
→ Write Content
→ Save / Autosave
→ Note appears under Subject
```

### Journey E — Prepare for an Exam

```text
Exams & Progress
→ Add Exam
→ Add Topics
→ Mark Topics Reviewed
→ Plan Review Sessions
→ Complete Focus Sessions
→ Readiness increases
```

---

## 26. MVP Scope

The initial complete version of PokeDen should allow a student to:

- Complete onboarding.
- Set up a student profile.
- Choose a study companion.
- Add and manage subjects.
- Add and complete tasks.
- Plan study sessions.
- Create and organize notes.
- Run Pomodoro sessions.
- Track upcoming exams.
- Track exam topics.
- Review simple academic progress.
- See academic events in Calendar.
- Configure study preferences.
- Use or hide the study companion.

Anything beyond this should be treated as optional future expansion.

---

## 27. Features Outside the Initial Scope

Do not prioritize these for the initial build:

- Social feeds
- Messaging
- Public profiles
- Friend systems
- Multiplayer study rooms
- Leaderboards
- Competitive rankings
- Battles
- Pokémon combat
- Trading
- Complex pet care
- Virtual currencies
- Shops
- Large achievement systems
- AI tutoring
- AI-generated notes
- Advanced spaced repetition
- Complex graph-based knowledge management
- Institutional administration
- Teacher dashboards
- Full LMS functionality

---

## 28. Definition of a Successful PokeDen Build

PokeDen is successful when a student can open the application and immediately understand:

- What needs attention today.
- What assignments are due.
- What subject they should study.
- What they planned to study.
- How to start focusing.
- Where their notes are.
- What exams are coming.
- How prepared they are.

The companion should make the experience feel more personal and enjoyable while remaining secondary to the academic tools.

> **PokeDen is a personal study space where students organize academic work, plan focused study sessions, and study alongside a companion.**
