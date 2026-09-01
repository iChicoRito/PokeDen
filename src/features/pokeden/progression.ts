import { COMPANION_CATALOG } from "./companions";
import type { CompanionProgress, PokeDenData, StudyActivityKind, StudyProgress, StudyReward } from "./domain";
import { studyRewardSchema } from "./domain";

export const STUDY_LEVEL_THRESHOLDS = [0, 100, 250, 500, 850, 1300, 1900, 2600] as const;
export const COMPANION_LEVEL_THRESHOLDS = [0, 60, 180, 360, 600, 900, 1300] as const;

const emptyCompanion = (): CompanionProgress => ({ companionXp: 0, studyMinutes: 0, evolutionStage: 0 });

export function createEmptyStudyProgress(): StudyProgress {
  return {
    studyXp: 0,
    rewards: [],
    companions: Object.fromEntries(COMPANION_CATALOG.map(({ id }) => [id, emptyCompanion()])),
  };
}

export function hasStudyReward(progress: StudyProgress, rewardId: string): boolean {
  return progress.rewards.some((reward) => reward.id === rewardId);
}

export function applyStudyReward(progress: StudyProgress, reward: StudyReward): StudyProgress {
  const normalized = studyRewardSchema.safeParse(reward);
  if (!normalized.success || hasStudyReward(progress, reward.id)) return normalizeStudyProgress(progress);
  const value = normalized.data;
  const companions = { ...normalizeStudyProgress(progress).companions };
  if (value.companionId && companions[value.companionId]) {
    const current = companions[value.companionId];
    companions[value.companionId] = {
      companionXp: current.companionXp + value.xp,
      studyMinutes: current.studyMinutes + value.minutes,
      evolutionStage: current.evolutionStage,
    };
  }
  return {
    studyXp: normalizeNumber(progress.studyXp) + value.xp,
    rewards: [...normalizeStudyProgress(progress).rewards, value],
    companions,
  };
}

export type LevelProgress = { currentXp: number; nextThreshold: number | null; percentage: number };

function level(xp: number, thresholds: readonly number[]): number {
  const value = normalizeNumber(xp);
  let result = 1;
  for (const threshold of thresholds) if (value >= threshold) result = thresholds.indexOf(threshold) + 1;
  return result;
}

function progress(xp: number, thresholds: readonly number[]): LevelProgress {
  const currentXp = normalizeNumber(xp);
  const currentLevel = level(currentXp, thresholds) - 1;
  const start = thresholds[currentLevel] ?? 0;
  const nextThreshold = thresholds[currentLevel + 1] ?? null;
  return {
    currentXp,
    nextThreshold,
    percentage:
      nextThreshold === null
        ? 100
        : Math.max(0, Math.min(100, Math.round(((currentXp - start) / (nextThreshold - start)) * 100))),
  };
}

export function getStudyLevel(xp: number): number {
  return level(xp, STUDY_LEVEL_THRESHOLDS);
}
export function getStudyLevelProgress(xp: number): LevelProgress {
  return progress(xp, STUDY_LEVEL_THRESHOLDS);
}
export function getCompanionLevel(xp: number): number {
  return level(xp, COMPANION_LEVEL_THRESHOLDS);
}
export function getCompanionLevelProgress(xp: number): LevelProgress {
  return progress(xp, COMPANION_LEVEL_THRESHOLDS);
}
export function getCompanionProgress(progressData: StudyProgress, companionId: string): CompanionProgress {
  return normalizeStudyProgress(progressData).companions[companionId] ?? emptyCompanion();
}

export function getDailyGoalRewardId(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `daily-goal:${year}-${month}-${day}`;
}

export function getRewardXp(kind: StudyActivityKind, minutes = 0): number {
  if (kind === "pomodoro" || kind === "planned-session") return Math.max(1, Math.floor(minutes));
  if (kind === "assignment") return 20;
  if (kind === "exam-topic-review") return 15;
  return 25;
}

export function getRewardId(sourceId: string, kind: StudyActivityKind): string {
  return `${kind}:${sourceId}`;
}

function normalizeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function normalizeStudyProgress(value: unknown): StudyProgress {
  const base = createEmptyStudyProgress();
  if (!value || typeof value !== "object") return base;
  const input = value as Partial<StudyProgress>;
  base.studyXp = normalizeNumber(input.studyXp);
  base.rewards = Array.isArray(input.rewards)
    ? input.rewards
        .map((reward) => studyRewardSchema.safeParse(reward))
        .filter((result) => result.success)
        .map((result) => result.data)
    : [];
  if (input.companions && typeof input.companions === "object") {
    for (const id of Object.keys(base.companions)) {
      const item = (input.companions as Record<string, unknown>)[id];
      if (item && typeof item === "object") {
        const candidate = item as Partial<CompanionProgress>;
        base.companions[id] = {
          companionXp: normalizeNumber(candidate.companionXp),
          studyMinutes: normalizeNumber(candidate.studyMinutes),
          evolutionStage: normalizeNumber(candidate.evolutionStage),
        };
      }
    }
  }
  return base;
}

export function backfillStudyProgress(data: PokeDenData): PokeDenData {
  let studyProgress = normalizeStudyProgress((data as PokeDenData & { studyProgress?: unknown }).studyProgress);
  const add = (sourceId: string, kind: StudyActivityKind, minutes: number, completedAt: string) => {
    const reward: StudyReward = {
      id: getRewardId(sourceId, kind),
      sourceId,
      kind,
      xp: getRewardXp(kind, minutes),
      minutes,
      companionId: null,
      completedAt,
    };
    studyProgress = applyStudyReward(studyProgress, reward);
  };
  for (const session of data.focusSessions) {
    if (session.completed && session.kind === "focus")
      add(session.id, "pomodoro", session.durationMinutes, session.endedAt);
  }
  for (const session of data.studySessions) {
    if (session.status === "completed" && session.completedAt)
      add(session.id, "planned-session", session.plannedMinutes, session.completedAt);
  }
  for (const task of data.tasks) {
    if (task.status === "completed" && task.completedAt) add(task.id, "assignment", 0, task.completedAt);
  }
  for (const exam of data.exams) {
    for (const topic of exam.topics) if (topic.reviewedAt) add(topic.id, "exam-topic-review", 0, topic.reviewedAt);
  }
  const goal = data.studyPreferences.dailyGoalMinutes;
  if (goal > 0) {
    const days = new Map<string, { date: Date; minutes: number; latest: string }>();
    for (const session of data.focusSessions)
      if (session.completed && (session.kind === "focus" || session.examTopicId !== null)) {
        const date = new Date(session.endedAt);
        const key = getDailyGoalRewardId(date);
        const item = days.get(key) ?? { date, minutes: 0, latest: session.endedAt };
        item.minutes += session.durationMinutes;
        if (session.endedAt > item.latest) item.latest = session.endedAt;
        days.set(key, item);
      }
    for (const [id, item] of days)
      if (item.minutes >= goal && !hasStudyReward(studyProgress, id)) {
        studyProgress = applyStudyReward(studyProgress, {
          id,
          sourceId: id,
          kind: "daily-goal",
          xp: 25,
          minutes: item.minutes,
          companionId: null,
          completedAt: item.latest,
        });
      }
  }
  return { ...data, studyProgress };
}
