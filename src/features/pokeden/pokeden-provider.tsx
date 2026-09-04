"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";

import {
  clearPokeDenAcademicData,
  loadPokeDenData,
  notifyPokeDenSaved,
  resetPokeDenDemo,
  savePokeDenData,
  subscribeToPokeDenStorage,
} from "@/data/pokeden/repository.client";
import { createClient } from "@/lib/supabase/client";
import { chooseSyncAction } from "@/lib/sync/sync-engine";

import { COMPANION_CATALOG, type CompanionId, resolveCompanionId } from "./companions";
import type {
  ExamInput,
  ExamUpdateInput,
  NoteInput,
  NoteUpdateInput,
  PokeDenData,
  StudyActivityKind,
  StudySessionInput,
  StudySessionUpdateInput,
  SubjectInput,
  SubjectUpdateInput,
  TaskInput,
  TaskUpdateInput,
} from "./domain";
import {
  applyStudyReward,
  createEmptyStudyProgress,
  getCompanionLevel,
  getDailyGoalRewardId,
  getRewardId,
  getRewardXp,
  getStudyLevel,
} from "./progression";
import { getTimerElapsedSeconds } from "./timer-clock";

export type PokeDenSetupUpdate = {
  currentStep?: number;
  setupCompleted?: boolean;
};

export type ProfileUpdate = Partial<{
  name: string;
  displayName: string;
  school: string;
  course: string;
}>;

export type StudyPreferencesUpdate = Partial<PokeDenData["studyPreferences"]>;
export type CompanionPreferencesUpdate = Partial<PokeDenData["companionPreferences"]>;

export type PokeDenActions = {
  updateSetup: (update: PokeDenSetupUpdate) => void;
  updateProfile: (update: ProfileUpdate) => void;
  createSubject: (input: SubjectInput) => void;
  updateSubject: (id: string, input: SubjectUpdateInput) => void;
  archiveSubject: (id: string) => void;
  createTask: (input: TaskInput) => void;
  updateTask: (id: string, input: TaskUpdateInput) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => void;
  reopenTask: (id: string) => void;
  createStudySession: (input: StudySessionInput) => void;
  updateStudySession: (id: string, input: StudySessionUpdateInput) => void;
  deleteStudySession: (id: string) => void;
  completeStudySession: (id: string) => void;
  startStudySession: (id: string) => void;
  createNote: (input: NoteInput) => void;
  updateNote: (id: string, input: NoteUpdateInput) => void;
  saveNote: (id: string, input: NoteUpdateInput) => void;
  pinNote: (id: string, pinned: boolean) => void;
  deleteNote: (id: string) => void;
  startTimer: (input: {
    mode: PokeDenData["activeTimer"] extends infer T ? (T extends { mode: infer M } ? M : never) : never;
    targetMinutes: number;
    subjectId?: string | null;
    taskId?: string | null;
    studySessionId?: string | null;
    examId?: string | null;
    examTopicId?: string | null;
  }) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  completeTimer: () => void;
  createExam: (input: ExamInput) => void;
  updateExam: (id: string, input: ExamUpdateInput) => void;
  deleteExam: (id: string) => void;
  toggleExamTopic: (examId: string, topicId: string) => void;
  planExamTopic: (examId: string, topicId: string, plannedStart: string) => void;
  recordExamResult: (examId: string, score: number, maxScore: number) => void;
  updateStudyPreferences: (update: StudyPreferencesUpdate) => void;
  updateCompanionPreferences: (update: CompanionPreferencesUpdate) => void;
  evolveCompanion: (companionId: string) => void;
  completeSetup: (update: { studyPreferences: StudyPreferencesUpdate; setupCompleted?: boolean }) => void;
  saveOnboardingDraft: (update: {
    profile?: ProfileUpdate;
    studyPreferences?: StudyPreferencesUpdate;
    companionPreferences?: CompanionPreferencesUpdate;
  }) => void;
  clearAcademicData: () => void;
  resetDemoData: () => void;
  resetAllData: () => void;
};

export type PokeDenStoreState = {
  data: PokeDenData;
  isHydrated: boolean;
  isSaving: boolean;
  storageError: string | null;
  actions: PokeDenActions;
};

const PokeDenContext = createContext<StoreApi<PokeDenStoreState> | null>(null);

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function applyStampedAttributes(preferences: PokeDenData["companionPreferences"]): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-pokeden-reduced-motion", String(preferences.reducedMotion));
  root.setAttribute("data-pokeden-companion-movement", String(preferences.movement));
}

export function PokeDenProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [store] = useState<StoreApi<PokeDenStoreState>>(() => {
    const initial = loadPokeDenData();
    const base: Omit<PokeDenStoreState, "actions"> = {
      data: initial.data,
      isHydrated: false,
      isSaving: false,
      storageError: initial.error ? initial.error.message : null,
    };
    return createStore<PokeDenStoreState>()(() => ({
      ...base,
      actions: {} as PokeDenActions,
    }));
  });

  const persist = useCallback(
    (data: PokeDenData) => {
      try {
        savePokeDenData(data);
        store.setState({ data, isSaving: false, storageError: null });
        notifyPokeDenSaved(data);
      } catch (error) {
        store.setState({
          data,
          isSaving: false,
          storageError: error instanceof Error ? error.message : "Could not save changes.",
        });
      }
    },
    [store],
  );

  const mutate = useCallback(
    (updater: (data: PokeDenData) => PokeDenData) => {
      const current = store.getState().data;
      const next = updater(current);
      store.setState({ isSaving: true });
      persist({ ...next, updatedAt: nowIso() });
    },
    [persist, store],
  );

  const actions = useMemo<PokeDenActions>(() => {
    const patch = <T extends { updatedAt: string }>(record: T, input: Partial<Omit<T, "updatedAt">>): T => ({
      ...record,
      ...input,
      updatedAt: nowIso(),
    });

    const companionEvent = (
      data: PokeDenData,
      type: PokeDenData["companionEvents"][number]["type"],
      message: string,
      relatedId?: string | null,
    ): PokeDenData["companionEvents"] => [
      ...data.companionEvents.slice(-49),
      {
        id: newId("companion-event"),
        type,
        message,
        occurredAt: nowIso(),
        relatedId: relatedId ?? null,
      },
    ];

    const todayCompletedAll = (data: PokeDenData): boolean => {
      const today = new Date().toDateString();
      const tasks = data.tasks.filter(
        (task) => task.status !== "completed" && task.dueAt !== null && new Date(task.dueAt).toDateString() === today,
      );
      return (
        tasks.length === 0 &&
        data.tasks.some(
          (task) => task.status === "completed" && task.dueAt !== null && new Date(task.dueAt).toDateString() === today,
        )
      );
    };

    const award = (
      data: PokeDenData,
      sourceId: string,
      kind: StudyActivityKind,
      minutes: number,
      companionId: string | null,
      completedAt: string,
    ): PokeDenData => {
      const id = kind === "daily-goal" ? sourceId : getRewardId(sourceId, kind);
      return {
        ...data,
        studyProgress: applyStudyReward(data.studyProgress, {
          id,
          sourceId,
          kind,
          xp: getRewardXp(kind, minutes),
          minutes,
          companionId,
          completedAt,
        }),
      };
    };

    const activeCompanion = (data: PokeDenData): CompanionId => resolveCompanionId(data.companionPreferences.selected);

    const awardDailyGoal = (data: PokeDenData, completedAt: string, companionId: CompanionId): PokeDenData => {
      const goal = data.studyPreferences.dailyGoalMinutes;
      if (goal <= 0) return data;
      const date = new Date(completedAt);
      const rewardId = getDailyGoalRewardId(date);
      if (data.studyProgress.rewards.some((reward) => reward.id === rewardId)) return data;
      const minutes = data.focusSessions
        .filter(
          (session) =>
            session.completed &&
            (session.kind === "focus" || session.examTopicId !== null) &&
            new Date(session.endedAt).toDateString() === date.toDateString(),
        )
        .reduce((sum, session) => sum + session.durationMinutes, 0);
      return minutes >= goal ? award(data, rewardId, "daily-goal", minutes, companionId, completedAt) : data;
    };

    return {
      updateSetup: (update) =>
        mutate((data) => ({
          ...data,
          setupCompleted: update.setupCompleted ?? data.setupCompleted,
          onboardingStep: update.currentStep ?? data.onboardingStep,
        })),

      updateProfile: (update) =>
        mutate((data) => ({
          ...data,
          profile: patch(data.profile, update),
        })),

      createSubject: (input) =>
        mutate((data) => {
          const now = nowIso();
          const subject = {
            id: input.id ?? newId("subject"),
            name: input.name,
            description: input.description ?? "",
            color: input.color ?? "#6366f1",
            icon: input.icon ?? "book-open",
            archivedAt: input.archivedAt ?? null,
            classSchedules: (input.classSchedules ?? []).map((schedule) => ({
              id: schedule.id ?? newId("schedule"),
              weekday: schedule.weekday,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              room: schedule.room ?? "",
              label: schedule.label ?? "",
            })),
            materialLinks: input.materialLinks ?? [],
            createdAt: now,
            updatedAt: now,
          };
          return { ...data, subjects: [...data.subjects, subject] };
        }),

      updateSubject: (id, input) =>
        mutate((data) => ({
          ...data,
          subjects: data.subjects.map((subject) =>
            subject.id === id
              ? {
                  ...subject,
                  ...input,
                  classSchedules: input.classSchedules
                    ? (input.classSchedules as PokeDenData["subjects"][number]["classSchedules"])
                    : subject.classSchedules,
                  updatedAt: nowIso(),
                }
              : subject,
          ),
        })),

      archiveSubject: (id) =>
        mutate((data) => ({
          ...data,
          subjects: data.subjects.map((subject) =>
            subject.id === id && subject.archivedAt === null
              ? { ...subject, archivedAt: nowIso(), updatedAt: nowIso() }
              : subject,
          ),
        })),

      createTask: (input) =>
        mutate((data) => {
          const now = nowIso();
          const task = {
            id: input.id ?? newId("task"),
            subjectId: input.subjectId ?? null,
            title: input.title,
            description: input.description ?? "",
            dueAt: input.dueAt ?? null,
            priority: input.priority ?? "medium",
            status: input.status ?? "todo",
            subtasks: input.subtasks ?? [],
            completedAt: input.status === "completed" ? null : (input.completedAt ?? null),
            createdAt: now,
            updatedAt: now,
          };
          return {
            ...data,
            tasks: [...data.tasks, task],
            companionEvents: companionEvent(data, "TASK_COMPLETED", "New task added to your den.", task.id),
          };
        }),

      updateTask: (id, input) =>
        mutate((data) => {
          const previous = data.tasks.find((task) => task.id === id);
          if (!previous) return data;
          const completedAt = input.status === "completed" ? (previous.completedAt ?? nowIso()) : null;
          const next = {
            ...data,
            tasks: data.tasks.map((task) =>
              task.id === id
                ? { ...patch(task, input), completedAt: input.status === undefined ? task.completedAt : completedAt }
                : task,
            ),
          };
          return previous.status !== "completed" && input.status === "completed"
            ? award(next, id, "assignment", 0, activeCompanion(data), completedAt ?? nowIso())
            : next;
        }),

      deleteTask: (id) =>
        mutate((data) => ({
          ...data,
          tasks: data.tasks.filter((task) => task.id !== id),
          studySessions: data.studySessions.map((session) =>
            session.taskId === id ? { ...session, taskId: null, updatedAt: nowIso() } : session,
          ),
          notes: data.notes.map((note) => (note.taskId === id ? { ...note, taskId: null, updatedAt: nowIso() } : note)),
          focusSessions: data.focusSessions.map((focus) => (focus.taskId === id ? { ...focus, taskId: null } : focus)),
        })),

      completeTask: (id) =>
        mutate((data) => {
          const previous = data.tasks.find((task) => task.id === id);
          if (!previous || previous.status === "completed") return data;
          const now = nowIso();
          const next = {
            ...data,
            tasks: data.tasks.map((item) =>
              item.id === id ? { ...item, status: "completed" as const, completedAt: now, updatedAt: now } : item,
            ),
          };
          const rewarded = award(next, id, "assignment", 0, activeCompanion(data), now);
          const allDone = todayCompletedAll(rewarded);
          return {
            ...rewarded,
            companionEvents: companionEvent(
              data,
              allDone ? "ALL_DAILY_TASKS_COMPLETED" : "TASK_COMPLETED",
              allDone ? "Every task for today is complete!" : "Task completed. Nice work!",
              id,
            ),
          };
        }),

      reopenTask: (id) =>
        mutate((data) => ({
          ...data,
          tasks: data.tasks.map((item) =>
            item.id === id && item.status === "completed"
              ? { ...item, status: "todo" as const, completedAt: null, updatedAt: nowIso() }
              : item,
          ),
        })),

      createStudySession: (input) =>
        mutate((data) => {
          const now = nowIso();
          const session = {
            id: input.id ?? newId("study-session"),
            subjectId: input.subjectId ?? null,
            taskId: input.taskId ?? null,
            examId: input.examId ?? null,
            examTopicId: input.examTopicId ?? null,
            title: input.title,
            topic: input.topic ?? input.title,
            plannedStart: input.plannedStart,
            plannedMinutes: input.plannedMinutes,
            priority: input.priority ?? "medium",
            notes: input.notes ?? "",
            status: input.status ?? ("planned" as const),
            completedAt: null,
            createdAt: now,
            updatedAt: now,
          };
          return { ...data, studySessions: [...data.studySessions, session] };
        }),

      updateStudySession: (id, input) =>
        mutate((data) => {
          const previous = data.studySessions.find((session) => session.id === id);
          if (!previous) return data;
          const completedAt =
            input.status === "completed"
              ? (previous.completedAt ?? nowIso())
              : input.status === undefined
                ? previous.completedAt
                : null;
          const next = {
            ...data,
            studySessions: data.studySessions.map((session) =>
              session.id === id
                ? { ...patch(session, input), topic: input.topic ?? session.topic, completedAt }
                : session,
            ),
          };
          return previous.status !== "completed" && input.status === "completed"
            ? award(
                next,
                id,
                "planned-session",
                previous.plannedMinutes,
                activeCompanion(data),
                completedAt ?? nowIso(),
              )
            : next;
        }),

      deleteStudySession: (id) =>
        mutate((data) => ({
          ...data,
          studySessions: data.studySessions.filter((session) => session.id !== id),
          focusSessions: data.focusSessions.map((focus) =>
            focus.studySessionId === id ? { ...focus, studySessionId: null } : focus,
          ),
        })),

      completeStudySession: (id) =>
        mutate((data) => {
          const previous = data.studySessions.find((session) => session.id === id);
          if (!previous || previous.status === "completed") return data;
          const completedAt = nowIso();
          const next = {
            ...data,
            studySessions: data.studySessions.map((session) =>
              session.id === id
                ? { ...session, status: "completed" as const, completedAt, updatedAt: completedAt }
                : session,
            ),
          };
          const rewarded = award(
            next,
            id,
            "planned-session",
            previous.plannedMinutes,
            activeCompanion(data),
            completedAt,
          );
          return {
            ...rewarded,
            companionEvents: companionEvent(data, "STUDY_PLAN_COMPLETED", "Planned session completed.", id),
          };
        }),

      startStudySession: (id) =>
        mutate((data) => {
          const session = data.studySessions.find((item) => item.id === id);
          if (!session) return data;
          return {
            ...data,
            activeTimer: {
              id: newId("timer"),
              mode: "focus",
              status: "running",
              subjectId: session.subjectId,
              taskId: session.taskId,
              studySessionId: session.id,
              examId: session.examId,
              examTopicId: session.examTopicId,
              startedAt: nowIso(),
              targetMinutes: session.plannedMinutes,
              accumulatedSeconds: 0,
              pausedAt: null,
            },
            studySessions: data.studySessions.map((item) =>
              item.id === id && item.status === "planned"
                ? { ...item, status: "in-progress" as const, updatedAt: nowIso() }
                : item,
            ),
            companionEvents: companionEvent(data, "FOCUS_STARTED", "Focus session started.", id),
          };
        }),

      createNote: (input) =>
        mutate((data) => {
          const now = nowIso();
          const note = {
            id: input.id ?? newId("note"),
            subjectId: input.subjectId ?? null,
            taskId: input.taskId ?? null,
            examId: input.examId ?? null,
            title: input.title,
            content: input.content ?? "",
            tags: input.tags ?? [],
            pinned: input.pinned ?? false,
            createdAt: now,
            updatedAt: now,
          };
          return { ...data, notes: [...data.notes, note] };
        }),

      updateNote: (id, input) =>
        mutate((data) => ({
          ...data,
          notes: data.notes.map((note) => (note.id === id ? patch(note, input) : note)),
        })),

      saveNote: (id, input) =>
        mutate((data) => ({
          ...data,
          notes: data.notes.map((note) => (note.id === id ? patch(note, input) : note)),
        })),

      pinNote: (id, pinned) =>
        mutate((data) => ({
          ...data,
          notes: data.notes.map((note) => (note.id === id ? { ...note, pinned, updatedAt: nowIso() } : note)),
        })),

      deleteNote: (id) =>
        mutate((data) => ({
          ...data,
          notes: data.notes.filter((note) => note.id !== id),
        })),

      startTimer: (input) =>
        mutate((data) => ({
          ...data,
          activeTimer: {
            id: newId("timer"),
            mode: input.mode,
            status: "running",
            subjectId: input.subjectId ?? null,
            taskId: input.taskId ?? null,
            studySessionId: input.studySessionId ?? null,
            examId: input.examId ?? null,
            examTopicId: input.examTopicId ?? null,
            startedAt: nowIso(),
            targetMinutes: input.targetMinutes,
            accumulatedSeconds: 0,
            pausedAt: null,
          },
          companionEvents: companionEvent(
            data,
            input.mode === "focus" ? "FOCUS_STARTED" : "BREAK_STARTED",
            input.mode === "focus" ? "Focus session started." : "Break started.",
          ),
        })),

      pauseTimer: () =>
        mutate((data) => {
          if (data.activeTimer?.status !== "running") return data;
          const elapsed = getTimerElapsedSeconds(data.activeTimer, new Date());
          return {
            ...data,
            activeTimer: {
              ...data.activeTimer,
              status: "paused",
              accumulatedSeconds: elapsed,
              pausedAt: nowIso(),
            },
          };
        }),

      resumeTimer: () =>
        mutate((data) => {
          if (data.activeTimer?.status !== "paused") return data;
          return {
            ...data,
            activeTimer: {
              ...data.activeTimer,
              status: "running",
              startedAt: nowIso(),
              pausedAt: null,
            },
          };
        }),

      stopTimer: () =>
        mutate((data) => {
          if (!data.activeTimer) return data;
          const timer = data.activeTimer;
          if (timer.status === "completed") return { ...data, activeTimer: null };
          const elapsed = getTimerElapsedSeconds(timer, new Date());
          const focus: PokeDenData["focusSessions"][number] = {
            id: newId("focus-session"),
            subjectId: timer.subjectId,
            taskId: timer.taskId,
            studySessionId: timer.studySessionId,
            examId: timer.examId,
            examTopicId: timer.examTopicId,
            startedAt: timer.startedAt,
            endedAt: nowIso(),
            durationMinutes: Math.max(0, Math.round(elapsed / 60)),
            kind: timer.mode === "focus" ? "focus" : "review",
            note: "",
            completed: false,
          };
          return {
            ...data,
            focusSessions: [...data.focusSessions, focus],
            activeTimer: null,
          };
        }),

      resetTimer: () =>
        mutate((data) => ({
          ...data,
          activeTimer: null,
        })),

      completeTimer: () =>
        mutate((data) => {
          if (!data.activeTimer || data.activeTimer.status === "completed") return data;
          const timer = data.activeTimer;
          const endedAt = nowIso();
          const elapsed = getTimerElapsedSeconds(timer, new Date());
          const durationMinutes = Math.max(1, Math.round(elapsed / 60));
          const focus: PokeDenData["focusSessions"][number] = {
            id: newId("focus-session"),
            subjectId: timer.subjectId,
            taskId: timer.taskId,
            studySessionId: timer.studySessionId,
            examId: timer.examId,
            examTopicId: timer.examTopicId,
            startedAt: timer.startedAt,
            endedAt,
            durationMinutes,
            kind: timer.mode === "focus" ? "focus" : "review",
            note: "",
            completed: true,
          };
          const topicWasUnreviewed =
            timer.mode === "focus" &&
            timer.examId !== null &&
            timer.examTopicId !== null &&
            data.exams
              .find((exam) => exam.id === timer.examId)
              ?.topics.some((topic) => topic.id === timer.examTopicId && topic.reviewedAt === null);
          const next = { ...data, focusSessions: [...data.focusSessions, focus] };
          const exams =
            timer.examId && timer.examTopicId
              ? next.exams.map((exam) =>
                  exam.id === timer.examId
                    ? {
                        ...exam,
                        topics: exam.topics.map((topic) =>
                          topic.id === timer.examTopicId && topic.reviewedAt === null
                            ? { ...topic, reviewedAt: endedAt }
                            : topic,
                        ),
                        updatedAt: endedAt,
                      }
                    : exam,
                )
              : next.exams;
          let rewarded: PokeDenData = {
            ...next,
            exams,
            activeTimer: { ...timer, status: "completed", accumulatedSeconds: elapsed },
          };
          if (timer.mode === "focus") {
            const companionId = activeCompanion(data);
            rewarded = award(rewarded, focus.id, "pomodoro", durationMinutes, companionId, endedAt);
            if (topicWasUnreviewed && timer.examTopicId) {
              rewarded = award(rewarded, timer.examTopicId, "exam-topic-review", 0, companionId, endedAt);
            }
            rewarded = awardDailyGoal(rewarded, endedAt, companionId);
          }
          const ready = exams.find((exam) => exam.id === timer.examId);
          return {
            ...rewarded,
            companionEvents: companionEvent(
              data,
              ready && ready.topics.length > 0 && ready.topics.every((topic) => topic.reviewedAt !== null)
                ? "EXAM_READY"
                : "FOCUS_COMPLETED",
              timer.mode === "focus" ? "Focus completed. Well done!" : "Break finished. Ready to continue?",
              timer.id,
            ),
          };
        }),

      createExam: (input) =>
        mutate((data) => {
          const now = nowIso();
          const exam = {
            id: input.id ?? newId("exam"),
            subjectId: input.subjectId ?? null,
            title: input.title,
            description: input.description ?? "",
            startsAt: input.startsAt,
            durationMinutes: input.durationMinutes ?? 60,
            topics: input.topics ?? [],
            result: input.result ?? null,
            createdAt: now,
            updatedAt: now,
          };
          return { ...data, exams: [...data.exams, exam] };
        }),

      updateExam: (id, input) =>
        mutate((data) => ({
          ...data,
          exams: data.exams.map((exam) => (exam.id === id ? patch(exam, input) : exam)),
        })),

      deleteExam: (id) =>
        mutate((data) => ({
          ...data,
          exams: data.exams.filter((exam) => exam.id !== id),
          studySessions: data.studySessions.map((session) =>
            session.examId === id ? { ...session, examId: null, examTopicId: null, updatedAt: nowIso() } : session,
          ),
          notes: data.notes.map((note) => (note.examId === id ? { ...note, examId: null, updatedAt: nowIso() } : note)),
          focusSessions: data.focusSessions.map((focus) =>
            focus.examId === id ? { ...focus, examId: null, examTopicId: null } : focus,
          ),
        })),

      toggleExamTopic: (examId, topicId) =>
        mutate((data) => {
          const exam = data.exams.find((item) => item.id === examId);
          const topic = exam?.topics.find((item) => item.id === topicId);
          if (!exam || !topic) return data;
          const reviewedAt = topic.reviewedAt === null ? nowIso() : null;
          const next = {
            ...data,
            exams: data.exams.map((item) =>
              item.id === examId
                ? {
                    ...item,
                    topics: item.topics.map((current) =>
                      current.id === topicId ? { ...current, reviewedAt, updatedAt: nowIso() } : current,
                    ),
                    updatedAt: nowIso(),
                  }
                : item,
            ),
          };
          return reviewedAt ? award(next, topicId, "exam-topic-review", 0, activeCompanion(data), reviewedAt) : next;
        }),

      planExamTopic: (examId, topicId, plannedStart) =>
        mutate((data) => {
          const exam = data.exams.find((item) => item.id === examId);
          const topic = exam?.topics.find((item) => item.id === topicId);
          if (!exam || !topic) return data;
          const now = nowIso();
          const session = {
            id: newId("study-session"),
            subjectId: exam.subjectId,
            taskId: null,
            examId: exam.id,
            examTopicId: topic.id,
            title: topic.title,
            topic: topic.title,
            plannedStart,
            plannedMinutes: 25,
            priority: "medium" as const,
            notes: `Review for ${exam.title}.`,
            status: "planned" as const,
            completedAt: null,
            createdAt: now,
            updatedAt: now,
          };
          return { ...data, studySessions: [...data.studySessions, session] };
        }),

      recordExamResult: (examId, score, maxScore) =>
        mutate((data) => ({
          ...data,
          exams: data.exams.map((exam) =>
            exam.id === examId ? { ...exam, result: { score, maxScore }, updatedAt: nowIso() } : exam,
          ),
        })),

      updateStudyPreferences: (update) =>
        mutate((data) => ({
          ...data,
          studyPreferences: { ...data.studyPreferences, ...update },
        })),

      updateCompanionPreferences: (update) => {
        const currentData = store.getState().data;
        if (update.selected) {
          const entry = COMPANION_CATALOG.find((item) => item.id === update.selected);
          if (!entry || getStudyLevel(currentData.studyProgress.studyXp) < entry.unlockStudyLevel) return;
        }
        mutate((data) => ({
          ...data,
          companionPreferences: { ...data.companionPreferences, ...update },
        }));
        const current = store.getState().data.companionPreferences;
        applyStampedAttributes({ ...current, ...update });
      },

      evolveCompanion: (companionId) =>
        mutate((data) => {
          const entry = COMPANION_CATALOG.find((item) => item.id === companionId);
          if (!entry || getStudyLevel(data.studyProgress.studyXp) < entry.unlockStudyLevel) return data;
          const current = data.studyProgress.companions[companionId];
          if (!current) return data;
          const evolution = entry.evolutions?.[current.evolutionStage];
          if (
            !evolution ||
            getCompanionLevel(current.companionXp) < evolution.companionLevel ||
            getStudyLevel(data.studyProgress.studyXp) < evolution.studyLevel
          ) {
            return data;
          }
          return {
            ...data,
            studyProgress: {
              ...data.studyProgress,
              companions: {
                ...data.studyProgress.companions,
                [companionId]: { ...current, evolutionStage: current.evolutionStage + 1 },
              },
            },
          };
        }),

      completeSetup: (update) =>
        mutate((data) => ({
          ...data,
          studyPreferences: { ...data.studyPreferences, ...update.studyPreferences },
          setupCompleted: update.setupCompleted ?? true,
        })),

      saveOnboardingDraft: (update) =>
        mutate((data) => ({
          ...data,
          profile: update.profile ? patch(data.profile, update.profile) : data.profile,
          studyPreferences: update.studyPreferences
            ? { ...data.studyPreferences, ...update.studyPreferences }
            : data.studyPreferences,
          companionPreferences: update.companionPreferences
            ? { ...data.companionPreferences, ...update.companionPreferences }
            : data.companionPreferences,
        })),

      clearAcademicData: () => {
        const current = store.getState().data;
        const cleared = clearPokeDenAcademicData(current);
        store.setState({ data: cleared, isSaving: false, storageError: null });
        notifyPokeDenSaved(cleared);
      },

      resetDemoData: () => {
        const data = resetPokeDenDemo();
        applyStampedAttributes(data.companionPreferences);
        store.setState({ data, isSaving: false, storageError: null });
        notifyPokeDenSaved(data);
      },

      resetAllData: () => {
        const data = resetPokeDenDemo();
        const fresh = {
          ...data,
          setupCompleted: false,
          onboardingStep: 0,
          profile: {
            ...data.profile,
            name: "Student",
            displayName: "Student",
            school: "",
            course: "",
          },
          subjects: [],
          tasks: [],
          studySessions: [],
          notes: [],
          exams: [],
          focusSessions: [],
          grades: [],
          studyProgress: createEmptyStudyProgress(),
          activeTimer: null,
          updatedAt: nowIso(),
        };
        savePokeDenData(fresh);
        applyStampedAttributes(fresh.companionPreferences);
        store.setState({ data: fresh, isSaving: false, storageError: null });
        notifyPokeDenSaved(fresh);
      },
    };
  }, [mutate, store]);

  useEffect(() => {
    store.setState({ actions });
  }, [actions, store]);

  useEffect(() => {
    const state = store.getState();
    applyStampedAttributes(state.data.companionPreferences);
    store.setState({ isHydrated: true });
    const unsubscribe = subscribeToPokeDenStorage((data) => {
      applyStampedAttributes(data.companionPreferences);
      store.setState({ data, isSaving: false, storageError: null });
    });
    void (async () => {
      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) return;
        const response = await fetch("/api/sync/pull", { method: "GET" });
        if (!response.ok) return;
        const body = (await response.json()) as { snapshot: PokeDenData | null };
        const local = store.getState().data;
        if (body.snapshot === null || body.snapshot === undefined) {
          const hasLocalContent =
            local.setupCompleted ||
            local.subjects.length > 0 ||
            local.tasks.length > 0 ||
            local.studySessions.length > 0 ||
            local.notes.length > 0 ||
            local.exams.length > 0;
          if (!hasLocalContent) return;
          try {
            await fetch("/api/sync/push", {
              body: JSON.stringify({ snapshot: local, snapshotUpdatedAt: local.updatedAt }),
              headers: { "content-type": "application/json" },
              method: "POST",
            });
          } catch {
            // First-upload failure stays silent; debounced pushes retry later.
          }
          return;
        }
        const action = chooseSyncAction(local, body.snapshot);
        if (action !== "pull") return;
        try {
          savePokeDenData(body.snapshot);
        } catch {
          return;
        }
        applyStampedAttributes(body.snapshot.companionPreferences);
        store.setState({ data: body.snapshot, isSaving: false, storageError: null });
      } catch {
        // Sync must never throw to the UI; the local cache remains authoritative.
      }
    })();
    return unsubscribe;
  }, [store]);

  return <PokeDenContext.Provider value={store}>{children}</PokeDenContext.Provider>;
}

export function usePokeDenStore<T>(selector: (state: PokeDenStoreState) => T): T {
  const store = useContext(PokeDenContext);
  if (!store) {
    throw new Error("usePokeDenStore must be used within a PokeDenProvider.");
  }
  return useStore(store, selector);
}
