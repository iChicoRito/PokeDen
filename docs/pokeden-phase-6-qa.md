# PokeDen Phases 1–6 Manual QA and Acceptance Checklist

## Purpose

Use this checklist to manually accept the front-end-first PokeDen MVP delivered by roadmap Phases 1–6. Every item is intentionally unchecked; a tester must check an item only after observing its expected outcome.

## Fixed implementation decisions

The following decisions are acceptance rules for this build, not open questions:

- **Attachments are excluded.** Tasks and notes do not need attachment or image upload controls.
- **Calendar data is derived.** Calendar events come from subject schedules, task deadlines, study plans, and exam dates; users do not create or separately persist duplicate calendar records.
- **Archived subjects retain history.** Archiving removes a subject from active choices and active views, but preserves its existing tasks, notes, plans, exams, focus records, grades, and progress history.
- **Reopening a completed task sets it to `To Do`.**
- **Only completed focus sessions count toward progress.** Daily/weekly totals, session count, subject study time, and linked review progress exclude incomplete sessions.
- **A stopped focus session is incomplete.** Its partial elapsed time does not count toward completed-session progress totals.
- **Completing focus linked to an exam topic marks that topic reviewed.** Readiness then recalculates from reviewed topics.

## Test record

- Tester: ____________________
- Build/commit: ____________________
- Date: ____________________
- Browser and version: ____________________
- Desktop viewport: ____________________
- Mobile viewport/device: ____________________
- Operating system: ____________________
- Storage state at start: fresh / seeded / existing / corrupted
- Theme tested: light / dark
- Motion preference tested: normal / reduced

## Test setup and evidence

- [ ] Start once with a fresh browser profile or cleared site data. **Expected:** PokeDen has no stale records and follows the first-time setup rule.
- [ ] Repeat persistence checks in a normal, non-private browser context. **Expected:** local storage remains available across refresh and browser restart.
- [ ] Prepare records with long names, long content, past/today/future dates, multiple exams on one day, and at least 100 tasks and 100 notes. **Expected:** edge and scale checks can be executed without changing product code.
- [ ] Capture a screenshot or note for every failure and record exact reproduction steps. **Expected:** failures are actionable and unchecked items are not presented as passed.

---

## Cross-cutting acceptance matrix — all completed modules

Apply these checks to onboarding, Settings, Subjects, Tasks, Study Planner, Notes, Pomodoro, Exams & Progress, Dashboard, Calendar, and companion controls where applicable. Covers R-04, R-05, R-22 and T-04–T-07, T-34–T-35.

### Interaction and form states

- [ ] **Default:** open each module with ordinary seeded data. **Expected:** its primary content, actions, labels, and navigation are understandable without prior instruction.
- [ ] **Empty:** open Dashboard, Subjects, Tasks, Study Planner, Notes, and Exams with no applicable records. **Expected:** each displays helpful guidance and the documented next action: Dashboard suggests adding a first task or plan; Subjects—Add Subject; Tasks—Add Task; Planner—Plan Study Session; Notes—Create Note; Exams—Add Exam.
- [ ] **Loading:** trigger every observable asynchronous/service operation. **Expected:** progress is communicated, layout remains stable, repeated action is prevented, and controls are not misleadingly active.
- [ ] **Success:** create, edit, complete, archive, or delete a record. **Expected:** clear feedback appears, the resulting state is visible, and linked views update exactly once.
- [ ] **Error:** make a service operation fail using the supported QA method or corrupted input. **Expected:** a clear, non-destructive error appears; entered data is retained where safe; retry/correction is possible; unrelated records remain unchanged.
- [ ] **Disabled:** inspect unavailable and in-progress actions. **Expected:** disabled controls are visually and programmatically disabled, explain prerequisite context where needed, cannot be activated by pointer or keyboard, and are not the only way status is communicated.
- [ ] **Completed:** complete tasks, plans, focus sessions, and exam topics. **Expected:** text/icon/semantic status—not color alone—identifies completion and the correct downstream totals update.
- [ ] **Overdue:** leave a dated task incomplete past its deadline. **Expected:** it is identified as overdue using text/icon plus styling, appears in appropriate filters/summaries, and a completed task is not shown as overdue.
- [ ] Submit each create/edit form with required fields blank. **Expected:** submission is blocked; clear field-specific validation identifies every required field.
- [ ] Enter malformed or impossible values, including invalid dates and non-positive durations. **Expected:** validation prevents invalid persistence and explains correction.
- [ ] Leave optional fields blank. **Expected:** valid records save without placeholder junk, crashes, or invented values.
- [ ] Cancel a create and an edit after changing fields. **Expected:** no unintended record/change is persisted and the user returns to a predictable location.
- [ ] Attempt to close or navigate away from an editor with meaningful unsaved changes. **Expected:** behavior is consistent and protects or explicitly discards changes; autosaved content is not falsely described as unsaved.
- [ ] Delete each deletable record type. **Expected:** a clearly labeled confirmation names the consequence; cancel preserves it; confirm removes only the allowed record and applies relation rules below.
- [ ] Double-click/tap a submit action and press Enter repeatedly while it processes. **Expected:** one logical record/change is created, no duplicate success messages or derived events appear, and the action is guarded until settled.

### Keyboard, focus, labels, dialogs, and motion

- [ ] Navigate every page using Tab and Shift+Tab only. **Expected:** all interactive controls are reachable in a logical order with a visible focus indicator that is not clipped.
- [ ] Operate buttons, links, menus, tabs, checkboxes, selectors, filters, timer controls, and companion controls using keyboard conventions. **Expected:** actions work without pointer-only behavior.
- [ ] Inspect icon-only controls. **Expected:** each has an accessible name that describes the action rather than the icon shape.
- [ ] Inspect inputs and validation messages with accessibility tooling. **Expected:** every input has a clear associated label; help/error text is programmatically associated; required state is conveyed.
- [ ] Open every modal/dialog from the keyboard. **Expected:** focus moves inside; the dialog has an accessible name (and description where useful); focus is trapped; Escape/cancel works when safe; closing restores focus to the trigger.
- [ ] Open a destructive confirmation. **Expected:** the title and actions identify the affected record; focus does not default to an accidental destructive action.
- [ ] Check status badges, priorities, readiness, timer mode, errors, and progress without relying on color. **Expected:** text, icon, shape, or semantics communicate the same meaning.
- [ ] Enable operating-system/browser reduced motion and the app reduced-motion setting. **Expected:** roaming and decorative transitions stop or become minimal; no required information is lost; controls remain immediate and usable.
- [ ] Hide the companion. **Expected:** every academic workflow remains fully available, no empty obstruction remains, and no status or instruction depends on companion animation.
- [ ] Use the companion with normal motion. **Expected:** it stays in safe areas, never covers controls/content, never interferes with typing/focus, is quiet during focus-heavy work, and does not cause jank.

### Responsive layout and themes

- [ ] Run every core journey at a mobile viewport (approximately 320–430 px wide). **Expected:** no horizontal page overflow, clipped primary actions, inaccessible menus, overlapping companion, or unusable dialog; touch targets remain practical.
- [ ] Run every core journey at a desktop viewport (at least 1280 px wide). **Expected:** content uses space coherently, navigation and dialogs remain readable, and no critical action is isolated or hidden.
- [ ] Resize from desktop to mobile and back with dialogs, filters, and populated lists open. **Expected:** state is retained and the layout recovers without overlap or lost controls.
- [ ] Repeat representative empty, default, completed, overdue, disabled, focus, and error states in light theme. **Expected:** text, borders, focus rings, controls, charts/progress, and status indicators remain legible.
- [ ] Repeat the same states in dark theme. **Expected:** contrast and hierarchy remain legible with no invisible text/icons, flashing theme mismatch, or color-only meaning.
- [ ] Refresh in each selected theme. **Expected:** the chosen theme persists and does not visibly switch to the wrong theme during startup.

---

## Phase 1 — Local foundation

### Shared information and service boundaries (R-01–R-03 / T-01–T-03)

- [ ] Create and inspect relationships among student profile, subject, task/subtask, study session, note, exam/topic, focus session, grade, preferences, and companion records. **Expected:** stable identifiers and shared subject/task/topic references let modules refer to the same logical records consistently.
- [ ] Exercise read, create, update, and delete through each main UI area. **Expected:** operations work through the app’s replaceable service boundary; pages do not expose fixture paths or require direct sample-file access.
- [ ] Start with sample/seeded data where supplied. **Expected:** seeded records load through the same behavior as locally created records and remain editable without special-case failures.
- [ ] Create records in every module, refresh, then close and reopen the browser. **Expected:** profile, onboarding completion, subjects, tasks, plans, notes, focus history, exams, preferences, and companion choices persist locally.
- [ ] Edit and delete persisted records, then refresh. **Expected:** the latest state remains and deleted records do not reappear from seed data.
- [ ] Open two PokeDen tabs, change data in one, then revisit/refresh the other. **Expected:** the app resolves local state predictably without silently replacing newer valid data or creating duplicates.

### Local storage recovery

- [ ] Clear all PokeDen site storage while the app is closed, then reopen it. **Expected:** the app returns safely to the documented fresh/first-time state with no crash or phantom records.
- [ ] Clear storage while the app is open, then refresh. **Expected:** initialization handles missing keys and presents a coherent fresh state.
- [ ] Corrupt one persisted PokeDen storage value with malformed JSON, then reload. **Expected:** the app does not white-screen; invalid data is rejected/recovered safely and an understandable fallback or reset path is available.
- [ ] Corrupt a record with missing fields, unknown enum/status values, and invalid dates, then reload. **Expected:** invalid records do not break unrelated data; safe defaults, omission, or reset behavior is consistent and visible.
- [ ] Replace persisted data with a structurally valid but older/partial shape, then reload. **Expected:** initialization tolerates missing optional values or falls back safely without data duplication.

---

## Phase 2 — Study-space setup

### Onboarding, profile, and preferences (R-06–R-07 / T-08–T-10)

- [ ] With setup incomplete, open PokeDen. **Expected:** four introduction screens lead into setup and the first screen presents Welcome, Get Started, and Skip clearly.
- [ ] Complete the four screens using only Next/primary actions. **Expected:** Academic Organization, Plan It. Then Focus., and Meet Your Study Companion content appears in order and setup is reachable.
- [ ] Use each allowed Skip action. **Expected:** optional setup can be skipped without trapping the user; the resulting completion state is saved consistently.
- [ ] Enter name and course/program. **Expected:** valid profile values save, persist, and appear in Settings for later editing.
- [ ] Set focus, short-break, and long-break defaults during setup. **Expected:** values persist, appear in Settings, and become Pomodoro defaults.
- [ ] Complete setup and reach Dashboard, then refresh/reopen. **Expected:** onboarding does not reappear while completion remains saved.
- [ ] Leave setup incomplete and refresh. **Expected:** onboarding/setup remains available rather than incorrectly treating the user as complete.

### Subjects (R-08 / T-11–T-12)

- [ ] Add a subject with name, code, instructor, class days/time, room, and description. **Expected:** it appears once in the subject list/details and its recurring classes are derived in Dashboard/Calendar.
- [ ] Add a subject with only required fields. **Expected:** it saves without malformed optional-field output.
- [ ] Edit the subject’s identity and schedule. **Expected:** Subjects, selectors, Dashboard classes, and Calendar reflect the same updated source.
- [ ] Open subject details. **Expected:** overview, related tasks, notes, study sessions, exams, materials area (if represented), and progress are reachable without duplicating records.
- [ ] Create one related task, note, plan, exam, and completed focus record, then archive the subject. **Expected:** the subject disappears from active choices/views while all related history remains viewable and attributable to the archived subject.
- [ ] Inspect archived-subject history after refresh. **Expected:** task, note, plan, exam, focus, grade/progress history remains intact; nothing is silently reassigned or deleted.
- [ ] Attempt any permanent subject deletion offered by the UI when relations exist. **Expected:** the app blocks it or clearly applies the retain-history rule; related records are never orphaned or silently cascade-deleted.

### Companion setup and preferences (R-09 / T-13)

- [ ] Preview each available companion’s idle and study presentation, select one, and confirm. **Expected:** the chosen companion appears consistently and the choice persists.
- [ ] Change the selected companion in Settings. **Expected:** the app updates without changing academic records.
- [ ] Toggle visibility, movement, reduced motion, and interaction preferences. **Expected:** each takes effect, persists after refresh, and does not disable academic features.

---

## Phase 3 — Organizing daily work

### Tasks and assignments (R-10 / T-14–T-16)

- [ ] Create a task with title, subject, description, deadline, Low/Medium/High priority, To Do/In Progress status, and multiple subtasks. **Expected:** all values persist and display in task details.
- [ ] Confirm no attachment control is required. **Expected:** attachment upload is absent or explicitly unsupported; task acceptance does not depend on it.
- [ ] Edit every task field and subtask. **Expected:** one source task updates across Tasks, subject details, Dashboard, and Calendar.
- [ ] Verify All Tasks, Due Today, Upcoming, and Completed views. **Expected:** each contains only matching tasks and handles empty results helpfully.
- [ ] Filter by subject, status, priority, and due date individually and in supported combinations. **Expected:** results match every active condition and filter state is clear/resettable.
- [ ] Search with exact, partial, mixed-case, no-match, and long queries. **Expected:** matching is predictable, no-match is helpful, and records are not changed.
- [ ] Complete a task. **Expected:** status becomes Completed once; Dashboard due counts, subject data, Calendar representation, and companion reaction update appropriately.
- [ ] Reopen that task. **Expected:** status becomes **To Do** (not In Progress); due/overdue and cross-module summaries recalculate.
- [ ] Delete a task after canceling once and confirming once. **Expected:** cancel preserves it; confirm removes the source and its derived Dashboard/Calendar appearances without unrelated changes.

### Study Planner (R-11 / T-17–T-18)

- [ ] Add a planned session with subject, topic, related task, date, start time, duration, priority, and notes. **Expected:** it appears once in Today or Week as appropriate and once as a derived Calendar event.
- [ ] Edit and reschedule the plan across dates. **Expected:** Planner and Calendar move the same source event; the old date has no stale duplicate.
- [ ] Move a plan between Today and another day in Week. **Expected:** grouping and dates update consistently.
- [ ] Mark a plan complete. **Expected:** completed styling/status is non-color-only and linked summaries update without recording a completed focus session unless focus actually completed.
- [ ] Delete a plan. **Expected:** its derived Calendar event disappears and related task/subject records remain.
- [ ] Start a planned session. **Expected:** Pomodoro opens with exactly its subject, topic, planned duration, and related task context.

### Notes (R-12 / T-19–T-20)

- [ ] Create a subject note with title, content, tags, link, formatting, and pinned state. **Expected:** it appears under the selected subject with created/updated information and working safe link behavior.
- [ ] Confirm no attachments/images are required. **Expected:** acceptance covers text, basic formatting, and links only.
- [ ] Edit note content, pause for autosave, navigate away, and return. **Expected:** saved content returns without duplicate notes or loss; autosave status is truthful.
- [ ] Type rapidly while autosave occurs. **Expected:** old saves do not overwrite newer text and typing/focus remains stable.
- [ ] Create and save an empty-content note if title-only notes are allowed; otherwise submit it empty. **Expected:** either a stable empty note is shown or clear validation blocks it—never a crash or silent disappearance.
- [ ] Search by title/content/tag and filter by subject; pin/unpin notes. **Expected:** results and ordering update consistently and persist.
- [ ] Delete a note through confirmation. **Expected:** only that note is removed from Notes and subject details.

---

## Phase 4 — Focused study

### Pomodoro controls and lifecycle (R-13 / T-21–T-22)

- [ ] Open Pomodoro directly. **Expected:** focus, short-break, and long-break modes and their configured durations are available on a dedicated screen.
- [ ] For each mode, use Start, Pause, Resume, Stop, and Reset with pointer and keyboard. **Expected:** elapsed/remaining time and control availability follow a coherent state machine; repeated actions cannot create overlapping timers.
- [ ] Pause for several seconds. **Expected:** the timer does not decrement while paused and resumes from the paused value.
- [ ] Reset before and during a session. **Expected:** confirmation is used where destructive; the current interval returns to its configured duration without adding progress.
- [ ] Stop an active focus session. **Expected:** the record is incomplete and its partial time is excluded from completed focus totals and linked exam readiness.
- [ ] Complete a focus interval. **Expected:** completion occurs once even if completion actions/events repeat, and appropriate break options become available.
- [ ] Navigate to another PokeDen route while running, then return. **Expected:** one timer continues from wall-clock time with the same context and no duplicate session.
- [ ] Refresh while running, paused, and completed. **Expected:** running time recovers accurately, paused time remains paused, and a completed interval is recorded at most once.
- [ ] Put the tab in the background/sleep the device briefly, then return. **Expected:** time reconciles against elapsed wall-clock time; it does not slow down, add extra time, go negative, or complete more than once.
- [ ] Navigate away after stopping/resetting. **Expected:** the timer does not secretly continue or later add progress.

### Focus records, totals, and companion (R-14–R-15 / T-23–T-25)

- [ ] Complete focus with subject, topic, related task, planned duration, and start time. **Expected:** actual duration and completed status are recorded with the original context.
- [ ] Complete multiple sessions across today/week and subjects. **Expected:** today’s focus time, weekly focus time, completed-session count, and subject study time equal **completed focus only**.
- [ ] Compare totals before and after a stopped/partial session. **Expected:** totals do not increase.
- [ ] Trigger task-completed, all-daily-tasks-completed, focus-started/paused/completed, break-started, plan-completed, exam-topic-reviewed, exam-ready, daily-goal, and idle events where supported. **Expected:** named companion states/reactions are brief, optional, non-punitive, and do not alter academic truth.
- [ ] Observe normal companion states (idle, walk, read, write, study, sit, sleep, stretch, happy, celebrate, concerned). **Expected:** available states render safely; missing decorative animation never blocks the workflow.
- [ ] Run focus with the companion visible. **Expected:** it becomes quiet/study-oriented and never obscures timer data or controls.
- [ ] Run focus hidden and with reduced motion. **Expected:** timing, completion, records, and progress are identical to the animated experience.

---

## Phase 5 — Exams and progress

### Exams and readiness (R-16 / T-26–T-27)

- [ ] Add an exam with title, subject, valid future date, description, and multiple topics. **Expected:** it appears once in Exams, Dashboard (when upcoming), subject details, and Calendar.
- [ ] Edit its date, subject, description, and topics. **Expected:** countdown, source links, Calendar date, Dashboard, and readiness update from one exam source.
- [ ] Mark and unmark topics reviewed. **Expected:** readiness equals reviewed topics divided by total topics, handles zero topics without invalid percentages, and reaches 100% only when all topics are reviewed.
- [ ] Record/edit an optional grade/result. **Expected:** the basic grade summary updates without predictive or competitive analytics.
- [ ] Delete an exam after canceling once. **Expected:** cancel preserves it; confirm removes its derived appearances and handles linked review plans without corrupting those plan records.
- [ ] Create an exam dated today. **Expected:** countdown uses an unambiguous same-day label/value (for example, “Today” or 0 days), never “overdue” merely because of time-of-day ambiguity.
- [ ] Create multiple exams on the same date. **Expected:** all remain distinct, readable, and open the correct source in Exams, Dashboard, and every Calendar view.
- [ ] Enter impossible/invalid dates and a past date. **Expected:** impossible dates are blocked; permitted past exams are clearly represented without negative/NaN countdowns.

### Simple progress and review flow (R-17–R-18 / T-28–T-29)

- [ ] Inspect Progress with mixed data. **Expected:** only weekly study time, completed focus sessions, completed tasks, subject progress, exam readiness, and basic grade summary are shown; no leaderboards, rankings, or predictive scoring appears.
- [ ] Create a review plan from an unreviewed exam topic. **Expected:** one planned session is created with the exam/subject/topic relationship and appears in Planner and Calendar.
- [ ] Start that linked plan and stop focus early. **Expected:** the focus record is incomplete, the topic stays unreviewed, and readiness does not increase.
- [ ] Start it again and complete focus. **Expected:** the linked exam topic is marked reviewed automatically, readiness recalculates once, completed-focus progress increases once, and companion reaction is optional.
- [ ] Complete focus linked to an already reviewed topic. **Expected:** no readiness beyond 100%, duplicate topic, or duplicate completion count is produced.

---

## Phase 6 — Connected study day

### Dashboard (R-19 / T-30–T-31)

- [ ] Open Dashboard with representative data. **Expected:** today’s classes, due tasks, upcoming exams, one useful suggested study action, Quick Focus, subject progress, today’s focus time/session count, and a safe companion home are present.
- [ ] Verify Dashboard answers what needs attention, what is due, what to study/planned study, how to focus, where notes are reached, upcoming exams, and preparation/progress. **Expected:** information and navigation are understandable at a glance.
- [ ] Open a Dashboard task, subject, exam, suggested/planned study action, Quick Focus, and Calendar. **Expected:** each opens the correct source/context rather than a disconnected copy.
- [ ] Complete/reopen/delete a due task while Dashboard is open or after returning to it. **Expected:** card/list and counts synchronize with Tasks exactly once.
- [ ] Change a subject schedule. **Expected:** today’s class card reflects the source schedule.
- [ ] Add/edit/delete an exam and complete focus. **Expected:** upcoming exam, readiness/progress, today’s focus time, and session count synchronize with source modules.
- [ ] Use Dashboard with the companion hidden. **Expected:** layout closes the companion area safely and all information/actions remain available.

### Derived Calendar (R-20 / T-32)

- [ ] Open Month, Week, and Agenda views. **Expected:** each derives events from subject class schedules, task deadlines, planned sessions, and exam dates.
- [ ] Confirm there is no independent “create calendar event” path for these commitments. **Expected:** adding/editing occurs at the source; Calendar does not persist duplicate academic records.
- [ ] Select a class, task, study session, and exam event in every supported view. **Expected:** each opens the exact subject, task, Planner session, or exam source.
- [ ] Add each source record. **Expected:** one corresponding Calendar representation appears without duplicate entry.
- [ ] Edit its source date/time/title. **Expected:** the existing derived event moves/updates and no stale event remains.
- [ ] Complete a task. **Expected:** Calendar applies the documented completed representation or removal consistently while retaining source truth.
- [ ] Delete a task, plan, or exam. **Expected:** its derived event disappears; unrelated events remain.
- [ ] Archive a subject. **Expected:** historical related records remain; future active class schedule events cease or are clearly archived, while retained task/plan/exam history remains attributable.
- [ ] View recurring schedules, same-day events, month boundaries, leap day (when supported), year boundaries, and local midnight. **Expected:** events land on correct local dates without off-by-one or duplicate occurrences.

### Cross-module synchronization and relation rules (R-21 / T-33)

- [ ] Create a subject. **Expected:** it becomes selectable in Tasks, Notes, Planner, Pomodoro, and Exams without refresh-dependent duplication.
- [ ] Rename a subject. **Expected:** every related display resolves the same updated subject while historical links remain valid.
- [ ] Archive a subject. **Expected:** it is unavailable for new active relationships but all existing academic and progress history is retained.
- [ ] Add/complete/reopen/delete a task. **Expected:** subject details, Dashboard, Calendar, companion event, and due/completion counts synchronize; reopen sets status to To Do.
- [ ] Start a plan. **Expected:** Pomodoro receives subject, topic, duration, and related task; completing focus updates plan/progress according to its source relationship.
- [ ] Complete and stop separate focus sessions. **Expected:** only the completed session affects today/week/session/subject totals.
- [ ] Create review from an exam topic and complete linked focus. **Expected:** Planner, Pomodoro, exam readiness, Progress, Dashboard, Calendar, and companion remain consistent.
- [ ] Delete a source record currently open from Dashboard or Calendar. **Expected:** returning/back navigation handles the missing source gracefully rather than crashing or showing an editable ghost.
- [ ] Delete a related task referenced by a plan, note, or focus record. **Expected:** the surviving record remains usable and displays a clear missing/unlinked task state; history is not deleted.
- [ ] Delete a plan linked to a focus record. **Expected:** completed/incomplete focus history remains accurate and does not become a broken editable plan.
- [ ] Delete an exam or topic linked to a review plan/focus record. **Expected:** surviving study history remains, the missing source is handled explicitly, and no readiness calculation crashes.

### Quality, scale, and resilience (R-23 / T-36–T-37)

- [ ] Use very long subject names/codes and task/exam/note titles. **Expected:** text wraps or truncates with access to the full value; controls, tables/cards, dialogs, Dashboard, and Calendar do not overlap.
- [ ] Use very long note content, descriptions, topics, tags, and URLs. **Expected:** editors and details remain responsive; content does not break layout; unsafe markup/script is not executed.
- [ ] Load at least 100 tasks with mixed statuses/dates. **Expected:** search, filters, completion, scrolling, and Dashboard summaries stay correct and practically responsive.
- [ ] Load at least 100 notes across subjects with pinned and unpinned states. **Expected:** search/filter/edit/autosave remain correct and practically responsive.
- [ ] Load dense subject schedules, plans, deadlines, and multiple same-day exams. **Expected:** Month/Week/Agenda remain navigable and each event opens the correct unique source.
- [ ] Repeat duplicate submits under slow/loading behavior for tasks, subjects, plans, notes, and exams. **Expected:** each action produces at most one source record and one derived representation.
- [ ] Switch routes rapidly while saves, autosaves, and timer state changes occur. **Expected:** no stale write overwrites newer data, no unhandled error appears, and timer behavior follows the lifecycle rules.
- [ ] Observe companion motion with large collections and while typing, scrolling, filtering, and running Pomodoro. **Expected:** academic interactions remain responsive and animation does not cause visible layout shifts or input lag.

---

## Five end-to-end journeys (R-24 / T-38)

Run all five once on mobile and desktop, in light and dark coverage across the set, once with the companion hidden, once with reduced motion, and using keyboard-only operation for every action.

### Journey A — New student

- [ ] Fresh start → complete onboarding → enter profile → add subjects → choose companion → set Pomodoro preferences → enter Dashboard. **Expected:** setup saves once; Dashboard uses the entered data/preferences; reopening skips completed onboarding; hiding/reduced motion never blocks the journey.

### Journey B — Add an assignment

- [ ] Dashboard or Tasks → New Task → select subject → add deadline → Save → inspect Tasks, Dashboard, and Calendar. **Expected:** one source task appears with matching details; Dashboard counts/urgency update; one derived Calendar event opens that exact task.

### Journey C — Plan and study

- [ ] Planner → add session → select subject → enter topic/duration → Save → Start → complete focus → inspect Progress and companion. **Expected:** context transfers intact; one completed focus record updates daily/weekly/session/subject totals; the plan and Dashboard synchronize; companion reaction is optional and non-blocking.

### Journey D — Take notes

- [ ] Notes → select subject → create note → write/formatted content and link → wait for Save/Autosave → leave and return via subject. **Expected:** one note persists with latest content under the correct subject and can be searched, filtered, pinned, edited, and deleted.

### Journey E — Prepare for an exam

- [ ] Exams & Progress → add exam/topics → mark some reviewed → plan an unreviewed topic → complete linked focus → inspect readiness. **Expected:** plan and Calendar derive from the exam topic; completed linked focus marks the topic reviewed; readiness and simple progress increase exactly once.

---

## MVP capability acceptance

- [ ] Complete onboarding. **Expected:** first-time setup is understandable, skippable where allowed, persisted, and not repeated after completion.
- [ ] Set up and edit a student profile. **Expected:** profile values persist and Settings reflects the same source.
- [ ] Choose/change a study companion. **Expected:** choice persists and remains optional.
- [ ] Add, edit, archive, and inspect subjects. **Expected:** active subject use and retained archived history follow the fixed rules.
- [ ] Add, edit, filter, search, complete, reopen, and delete tasks. **Expected:** task state and all linked summaries stay synchronized; reopen becomes To Do.
- [ ] Add, edit, reschedule, complete, start, and delete study plans. **Expected:** Planner, Pomodoro, and Calendar use one source relationship.
- [ ] Create, organize, format, link, autosave, search, pin, filter, edit, and delete notes. **Expected:** text/link scope works; attachments are not required.
- [ ] Run focus/short-break/long-break timer states. **Expected:** navigation, refresh, background, stop, reset, completion, and keyboard behavior are reliable.
- [ ] Add/edit/delete exams, manage topics, countdown/readiness, plan review, and record result. **Expected:** valid dates and same-day/multiple-exam cases remain correct.
- [ ] Review simple academic progress. **Expected:** only documented study, session, task, subject, readiness, and basic grade summaries appear; completed focus only counts.
- [ ] See academic events in Month, Week, and Agenda Calendar views. **Expected:** events are derived and selecting one opens its source.
- [ ] Configure profile, timer, companion, theme, and motion preferences exposed by the build. **Expected:** settings apply and persist consistently.
- [ ] Use or hide the companion. **Expected:** the complete academic MVP works identically without companion interaction or animation.

## Final acceptance gate

- [ ] R-01 through R-24 each have executed evidence in this checklist. **Expected:** no roadmap requirement in Phases 1–6 is accepted by assumption.
- [ ] T-01 through T-38 each have executed evidence in this checklist. **Expected:** task coverage is traceable to the mapped phase sections and cross-cutting checks.
- [ ] All five journeys pass under the required keyboard, hidden-companion, and reduced-motion conditions. **Expected:** no accessibility alternative has a reduced academic capability.
- [ ] All MVP capabilities pass on mobile and desktop with representative light/dark coverage. **Expected:** no viewport or theme has a blocking defect.
- [ ] Default, empty, loading, success, error, disabled, completed, and overdue states have been observed wherever applicable. **Expected:** every state communicates status and a safe next action consistently.
- [ ] Persistence, corruption recovery, clearing, duplicate submission, long content, large collections, invalid/same-day dates, timer lifecycle, and relation rules pass. **Expected:** no data loss, duplicate source/derived records, crash, or inconsistent progress remains.
- [ ] Dashboard and Calendar synchronize with all source modules. **Expected:** edits appear from the source of truth, Calendar remains derived, and source links resolve correctly.
- [ ] Fixed implementation decisions are honored. **Expected:** attachments excluded; Calendar derived; archived subject history retained; reopen → To Do; completed focus only counts; stopped focus is incomplete; linked exam focus marks reviewed.
- [ ] No Phase 7 authentication, backend, or production database behavior was required for acceptance. **Expected:** this gate evaluates the complete local front-end student experience only.

---

## Onboarding redesign (Phase 7) acceptance checklist

Addendum to the Phases 1–6 checklist above. Phase 7 replaces the linear 8-step wizard with a progressive, companion-first flow of ≤5 screens (Welcome → About you → Subjects → Companion → Focus rhythm). Every item is intentionally unchecked; the original onboarding items earlier in this checklist also remain pending manual execution.

- [ ] Fresh start → complete the new flow in ≤5 screens. **Expected:** the whole flow fits in 5 screens or fewer, the step indicator always matches the current step and stays honest, and completion lands on the Dashboard.
- [ ] Resume mid-wizard: refresh or close/reopen at every step. **Expected:** the flow returns to the exact step and every supported typed value is intact — name, course, longBreakMinutes, and any in-progress subject draft.
- [ ] No data loss: type on the About-you screen, then refresh. **Expected:** the typed value persists (draft autosave); no field is wiped and the step does not restart.
- [ ] Open About you with no saved profile values. **Expected:** “What’s your name?” starts empty and shows guidance as placeholder text; “What are you studying?” shows an example placeholder rather than a predefined value.
- [ ] Inspect the text field on Step 3. **Expected:** it uses the same normalized default height and text sizing as the other onboarding text fields.
- [ ] Select each companion on Step 4. **Expected:** the selection is clear within the companion choices and no separate “Preview:” card is shown.
- [ ] Choose a companion (Charizard, Blastoise, or Bulbasaur). **Expected:** the selection persists after refresh and the Settings companion radio shows the same companion selected.
- [ ] Enter out-of-range timer values (outside focus 5–180, short break 1–60, long break 1–120). **Expected:** values clamp to the schema bounds, an inline error explains the correction, and Complete setup still succeeds — no whole-form save failure and no storage-error brick.
- [ ] Block localStorage (private mode or devtools storage block) and open PokeDen. **Expected:** the onboarding storage-error card appears with a "Continue in memory" path and a clear "Changes won't be saved" banner; the demo dashboard is never shown.
- [ ] Revisit onboarding from Settings. **Expected:** the "Reviewing your setup" banner shows, Cancel returns to the Dashboard, the saved longBreakMinutes value is preserved, and saving creates no duplicate subject.
- [ ] Run the flow keyboard-only. **Expected:** focus moves to the step heading on every step change, step titles are announced, all controls are reachable in tab order, and Back/Escape work without traps.
- [ ] Spot-check with a screen reader (NVDA or VoiceOver). **Expected:** step changes are announced and inline errors are announced via aria-invalid, aria-describedby, and role=alert where used — not announced twice.
- [ ] Enable reduced motion (OS setting and the companion reduced-motion toggle). **Expected:** companion idle/study motion and transitions stop or become minimal; content stays intact and readable.
- [ ] Spot-check contrast in devtools. **Expected:** icon chips (solid primary), the progress track (bg-border), and small muted text on muted backgrounds meet WCAG AA 4.5:1 text contrast (or 3:1 for non-text elements).
- [ ] After setup, open the Dashboard. **Expected:** the first-run "What's next?" hint card shows once and stays dismissed on later visits (localStorage flag).
- [ ] Complete setup and refresh. **Expected:** setup persists via a single batched write, the celebratory completion screen appears, "Go to dashboard" lands on the Dashboard, and onboarding does not reappear.
