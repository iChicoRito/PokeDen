import { z } from "zod";

const id = z.string().min(1);
const isoDateTime = z.iso.datetime({ offset: true });
const nullableId = id.nullable();

export const studentProfileSchema = z.object({
  id,
  name: z.string().min(1),
  displayName: z.string().min(1),
  school: z.string(),
  course: z.string(),
  timezone: z.string().min(1),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const classScheduleSchema = z.object({
  id,
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  room: z.string(),
  label: z.string(),
});

export const materialLinkSchema = z.object({
  id,
  title: z.string().min(1),
  url: z.url(),
  kind: z.enum(["textbook", "slides", "video", "practice", "other"]),
});

export const subjectSchema = z.object({
  id,
  name: z.string().min(1),
  description: z.string(),
  color: z.string(),
  icon: z.string(),
  archivedAt: isoDateTime.nullable(),
  classSchedules: z.array(classScheduleSchema),
  materialLinks: z.array(materialLinkSchema),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const subtaskSchema = z.object({
  id,
  title: z.string().min(1),
  completed: z.boolean(),
  completedAt: isoDateTime.nullable(),
});

export const taskSchema = z.object({
  id,
  subjectId: nullableId,
  title: z.string().min(1),
  description: z.string(),
  dueAt: isoDateTime.nullable(),
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["todo", "in-progress", "completed"]),
  subtasks: z.array(subtaskSchema),
  completedAt: isoDateTime.nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const studySessionSchema = z.object({
  id,
  subjectId: nullableId,
  taskId: nullableId,
  examId: nullableId,
  examTopicId: nullableId,
  title: z.string().min(1),
  topic: z.string(),
  plannedStart: isoDateTime,
  plannedMinutes: z.number().int().positive(),
  priority: z.enum(["low", "medium", "high"]),
  notes: z.string(),
  status: z.enum(["planned", "in-progress", "completed", "skipped"]),
  completedAt: isoDateTime.nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const noteSchema = z.object({
  id,
  subjectId: nullableId,
  taskId: nullableId,
  examId: nullableId,
  title: z.string().min(1),
  content: z.string(),
  tags: z.array(z.string()),
  pinned: z.boolean(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const examTopicSchema = z.object({
  id,
  title: z.string().min(1),
  confidence: z.number().int().min(0).max(5),
  reviewedAt: isoDateTime.nullable(),
});

export const examResultSchema = z.object({
  score: z.number().nonnegative(),
  maxScore: z.number().positive(),
});

export const examSchema = z.object({
  id,
  subjectId: nullableId,
  title: z.string().min(1),
  description: z.string(),
  startsAt: isoDateTime,
  durationMinutes: z.number().int().positive(),
  topics: z.array(examTopicSchema),
  result: examResultSchema.nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const focusSessionSchema = z.object({
  id,
  subjectId: nullableId,
  taskId: nullableId,
  studySessionId: nullableId,
  examId: nullableId,
  examTopicId: nullableId,
  startedAt: isoDateTime,
  endedAt: isoDateTime,
  durationMinutes: z.number().int().nonnegative(),
  kind: z.enum(["focus", "review"]),
  note: z.string(),
  completed: z.boolean(),
});

export const gradeRecordSchema = z.object({
  id,
  subjectId: nullableId,
  title: z.string().min(1),
  score: z.number().nonnegative(),
  maxScore: z.number().positive(),
  weight: z.number().positive(),
  recordedAt: isoDateTime,
});

export const notificationTogglesSchema = z.object({
  tasks: z.boolean(),
  classes: z.boolean(),
  exams: z.boolean(),
  focusReminders: z.boolean(),
  companion: z.boolean(),
});

export const studyPreferencesSchema = z.object({
  defaultFocusMinutes: z.number().int().min(5).max(180),
  defaultBreakMinutes: z.number().int().min(1).max(60),
  longBreakMinutes: z.number().int().min(1).max(120),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]),
  dailyGoalMinutes: z.number().int().min(0).max(1440),
  notifications: notificationTogglesSchema,
});

export const companionPreferencesSchema = z.object({
  selected: z.string().min(1),
  name: z.string().min(1),
  personality: z.enum(["calm", "cheerful", "focused"]),
  enabled: z.boolean(),
  visible: z.boolean(),
  movement: z.boolean(),
  reducedMotion: z.boolean(),
  interaction: z.boolean(),
});

export const companionMoodSchema = z.enum([
  "idle",
  "walk",
  "read",
  "write",
  "study",
  "sit",
  "sleep",
  "stretch",
  "happy",
  "celebrate",
  "concerned",
]);

export const companionStateSchema = z.object({
  mood: companionMoodSchema,
  energy: z.number().int().min(0).max(100),
  experience: z.number().int().nonnegative(),
  lastInteractionAt: isoDateTime.nullable(),
});

export const studyActivityKindSchema = z.enum([
  "pomodoro",
  "planned-session",
  "assignment",
  "exam-topic-review",
  "daily-goal",
]);

export const studyRewardSchema = z.object({
  id,
  sourceId: id,
  kind: studyActivityKindSchema,
  xp: z.number().int().nonnegative(),
  minutes: z.number().int().nonnegative(),
  companionId: nullableId,
  completedAt: isoDateTime,
});

export const companionProgressSchema = z.object({
  companionXp: z.number().int().nonnegative(),
  studyMinutes: z.number().int().nonnegative(),
  evolutionStage: z.number().int().nonnegative(),
});

export const studyProgressSchema = z.object({
  studyXp: z.number().int().nonnegative(),
  rewards: z.array(studyRewardSchema),
  companions: z.record(z.string(), companionProgressSchema),
});

export const companionEventTypeSchema = z.enum([
  "TASK_COMPLETED",
  "ALL_DAILY_TASKS_COMPLETED",
  "FOCUS_STARTED",
  "FOCUS_PAUSED",
  "FOCUS_COMPLETED",
  "BREAK_STARTED",
  "STUDY_PLAN_COMPLETED",
  "EXAM_TOPIC_REVIEWED",
  "EXAM_READY",
  "DAILY_STUDY_GOAL_COMPLETED",
  "APP_IDLE",
]);

export const companionEventSchema = z.object({
  id,
  type: companionEventTypeSchema,
  message: z.string(),
  occurredAt: isoDateTime,
  relatedId: nullableId,
});

export const activeTimerSchema = z.object({
  id,
  mode: z.enum(["focus", "short-break", "long-break"]),
  status: z.enum(["idle", "running", "paused", "completed"]),
  subjectId: nullableId,
  taskId: nullableId,
  studySessionId: nullableId,
  examId: nullableId,
  examTopicId: nullableId,
  startedAt: isoDateTime,
  targetMinutes: z.number().int().positive(),
  accumulatedSeconds: z.number().int().nonnegative(),
  pausedAt: isoDateTime.nullable(),
});

export const calendarEventSchema = z.object({
  id,
  sourceId: id,
  type: z.enum(["class", "task", "study", "exam"]),
  title: z.string().min(1),
  startsAt: isoDateTime,
  endsAt: isoDateTime,
  subjectId: nullableId,
  status: z.enum(["scheduled", "completed", "overdue", "cancelled"]),
});

export const pokeDenDataSchema = z.object({
  version: z.literal(2),
  setupCompleted: z.boolean(),
  onboardingStep: z.number().int().min(0),
  profile: studentProfileSchema,
  subjects: z.array(subjectSchema),
  tasks: z.array(taskSchema),
  studySessions: z.array(studySessionSchema),
  notes: z.array(noteSchema),
  exams: z.array(examSchema),
  focusSessions: z.array(focusSessionSchema),
  grades: z.array(gradeRecordSchema),
  studyPreferences: studyPreferencesSchema,
  companionPreferences: companionPreferencesSchema,
  companionState: companionStateSchema,
  studyProgress: studyProgressSchema,
  companionEvents: z.array(companionEventSchema),
  activeTimer: activeTimerSchema.nullable(),
  updatedAt: isoDateTime,
});

export type StudentProfile = z.infer<typeof studentProfileSchema>;
export type ClassSchedule = z.infer<typeof classScheduleSchema>;
export type MaterialLink = z.infer<typeof materialLinkSchema>;
export type Subject = z.infer<typeof subjectSchema>;
export type Subtask = z.infer<typeof subtaskSchema>;
export type Task = z.infer<typeof taskSchema>;
export type StudySession = z.infer<typeof studySessionSchema>;
export type Note = z.infer<typeof noteSchema>;
export type ExamTopic = z.infer<typeof examTopicSchema>;
export type ExamResult = z.infer<typeof examResultSchema>;
export type Exam = z.infer<typeof examSchema>;
export type FocusSession = z.infer<typeof focusSessionSchema>;
export type GradeRecord = z.infer<typeof gradeRecordSchema>;
export type NotificationToggles = z.infer<typeof notificationTogglesSchema>;
export type StudyPreferences = z.infer<typeof studyPreferencesSchema>;
export type CompanionPreferences = z.infer<typeof companionPreferencesSchema>;
export type CompanionMood = z.infer<typeof companionMoodSchema>;
export type CompanionState = z.infer<typeof companionStateSchema>;
export type StudyActivityKind = z.infer<typeof studyActivityKindSchema>;
export type StudyReward = z.infer<typeof studyRewardSchema>;
export type CompanionProgress = z.infer<typeof companionProgressSchema>;
export type StudyProgress = z.infer<typeof studyProgressSchema>;
export type CompanionEventType = z.infer<typeof companionEventTypeSchema>;
export type CompanionEvent = z.infer<typeof companionEventSchema>;
export type ActiveTimer = z.infer<typeof activeTimerSchema>;
export type CalendarEvent = z.infer<typeof calendarEventSchema>;
export type PokeDenData = z.infer<typeof pokeDenDataSchema>;

export type EntityInput<T extends { id: string; createdAt: string; updatedAt: string }> = Omit<
  T,
  "id" | "createdAt" | "updatedAt"
> &
  Partial<Pick<T, "id">>;

export type ClassScheduleInput = Omit<ClassSchedule, "id"> & Partial<Pick<ClassSchedule, "id">>;

export type SubjectInput = Partial<Pick<Subject, "id">> &
  Pick<Subject, "name"> &
  Omit<Partial<Omit<Subject, "id" | "createdAt" | "updatedAt" | "name">>, "classSchedules"> & {
    classSchedules?: ClassScheduleInput[];
  };
export type TaskInput = Partial<Pick<Task, "id">> &
  Pick<Task, "title"> &
  Partial<Omit<Task, "id" | "createdAt" | "updatedAt" | "title">>;
export type StudySessionInput = Partial<Pick<StudySession, "id">> &
  Pick<StudySession, "title" | "plannedStart" | "plannedMinutes"> &
  Partial<Omit<StudySession, "id" | "createdAt" | "updatedAt" | "title" | "plannedStart" | "plannedMinutes">>;
export type NoteInput = Partial<Pick<Note, "id">> &
  Pick<Note, "title"> &
  Partial<Omit<Note, "id" | "createdAt" | "updatedAt" | "title">>;
export type ExamInput = Partial<Pick<Exam, "id">> &
  Pick<Exam, "title" | "startsAt"> &
  Partial<Omit<Exam, "id" | "createdAt" | "updatedAt" | "title" | "startsAt">>;

export type SubjectUpdateInput = Partial<Omit<Subject, "classSchedules">> & { classSchedules?: ClassScheduleInput[] };
export type TaskUpdateInput = Partial<Omit<Task, "id" | "createdAt" | "updatedAt">>;
export type StudySessionUpdateInput = Partial<Omit<StudySession, "id" | "createdAt" | "updatedAt">>;
export type NoteUpdateInput = Partial<Omit<Note, "id" | "createdAt" | "updatedAt">>;
export type ExamUpdateInput = Partial<Omit<Exam, "id" | "createdAt" | "updatedAt">>;

/**
 * True when a snapshot holds no real user content yet — the auto-seeded shape
 * created on a fresh install or after a full reset (see repository.client.ts).
 * The sync engine uses this so a populated cloud row wins over an empty local
 * seed on a brand-new device.
 */
export function isPristineSnapshot(data: PokeDenData): boolean {
  return (
    !data.setupCompleted &&
    data.subjects.length === 0 &&
    data.tasks.length === 0 &&
    data.studySessions.length === 0 &&
    data.notes.length === 0 &&
    data.exams.length === 0 &&
    data.focusSessions.length === 0 &&
    data.grades.length === 0
  );
}
