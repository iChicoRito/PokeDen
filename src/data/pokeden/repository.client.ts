import { type PokeDenData, pokeDenDataSchema, studyProgressSchema } from "@/features/pokeden/domain";
import { backfillStudyProgress, createEmptyStudyProgress } from "@/features/pokeden/progression";

import { createDemoPokeDenData } from "./demo-fixtures";

export const POKEDEN_STORAGE_KEY = "pokademia:pokeden:data:v1";
export const POKEDEN_BACKUP_KEY = "pokademia:pokeden:backup:v1";
export const POKEDEN_RECOVERY_KEY = "pokademia:pokeden:recovery";

export type StorageErrorCode = "unavailable" | "read-failed" | "write-failed" | "invalid-data";

export class PokeDenStorageError extends Error {
  readonly code: StorageErrorCode;
  readonly cause?: unknown;

  constructor(code: StorageErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "PokeDenStorageError";
    this.code = code;
    this.cause = cause;
  }
}

export type RepositoryLoadResult = {
  data: PokeDenData;
  recovered: boolean;
  error: PokeDenStorageError | null;
};

function getStorage(): Storage {
  if (typeof window === "undefined") {
    throw new PokeDenStorageError("unavailable", "PokeDen storage is only available in the browser.");
  }
  return window.localStorage;
}

function migrate(candidate: unknown, now = new Date()): PokeDenData | null {
  if (!candidate || typeof candidate !== "object") return null;
  const stored = candidate as Record<string, unknown>;
  const version = stored.version;
  if (version !== 0 && version !== 1 && version !== 2 && version !== undefined) return null;

  const defaults = createDemoPokeDenData(now);
  const storedProgress = studyProgressSchema.safeParse(stored.studyProgress);
  const normalized = {
    ...defaults,
    ...stored,
    studyProgress: storedProgress.success ? storedProgress.data : createEmptyStudyProgress(),
    version: 2,
    updatedAt: version === 2 ? stored.updatedAt : now.toISOString(),
  };
  const parsed = pokeDenDataSchema.safeParse(normalized);
  return parsed.success ? backfillStudyProgress(parsed.data) : null;
}

function parse(raw: string | null): PokeDenData | null {
  if (!raw) return null;
  try {
    return migrate(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function ensureDemoTodayClass(data: PokeDenData, now: Date): PokeDenData {
  if (data.profile.id !== "student-demo") return data;

  const today = now.getDay();
  const subject = data.subjects.find((item) => item.id === "subject-math" && item.archivedAt === null);
  if (!subject || subject.classSchedules.some((schedule) => schedule.weekday === today)) return data;

  const demoSchedule = {
    id: "schedule-math-demo-today",
    weekday: today,
    startTime: "13:00",
    endTime: "14:00",
    room: "Study Hall",
    label: "Problem-solving workshop",
  };
  const hasDemoSchedule = subject.classSchedules.some((schedule) => schedule.id === demoSchedule.id);
  const updatedAt = now.toISOString();

  return {
    ...data,
    subjects: data.subjects.map((item) =>
      item.id !== subject.id
        ? item
        : {
            ...item,
            classSchedules: hasDemoSchedule
              ? item.classSchedules.map((schedule) => (schedule.id === demoSchedule.id ? demoSchedule : schedule))
              : [...item.classSchedules, demoSchedule],
            updatedAt,
          },
    ),
    updatedAt,
  };
}

/**
 * A genuinely fresh profile (no stored data) starts with zero records so the
 * user lands in onboarding. Default-taste preferences (focus/break minutes,
 * companion defaults) are kept from the demo baseline, mirroring the shape
 * resetAllData() produces.
 */
export function createEmptyPokeDenData(now = new Date()): PokeDenData {
  const data = createDemoPokeDenData(now);
  return {
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
    // First-run state: no demo event feed (its relatedIds point at demo
    // records that do not exist here) and a zeroed companion state.
    companionState: { mood: "idle", energy: 100, experience: 0, lastInteractionAt: null },
    companionEvents: [],
    studyProgress: createEmptyStudyProgress(),
    activeTimer: null,
    updatedAt: now.toISOString(),
  };
}

export function loadPokeDenData(): RepositoryLoadResult {
  const fallback = createDemoPokeDenData();
  let storage: Storage;
  try {
    storage = getStorage();
  } catch (error) {
    return { data: fallback, recovered: true, error: error as PokeDenStorageError };
  }
  try {
    const raw = storage.getItem(POKEDEN_STORAGE_KEY);
    if (raw === null) {
      // Absent key = first-time user: empty records, onboarding pending.
      // (Previously this seeded the demo dataset, which made onboarding unreachable.)
      // Strict null check: a corrupt empty-string value must fall through to
      // the backup-recovery path below instead of masquerading as first-run.
      const fresh = createEmptyPokeDenData();
      savePokeDenData(fresh);
      return { data: fresh, recovered: false, error: null };
    }
    const data = parse(raw);
    if (data) {
      const withDemoClass = ensureDemoTodayClass(data, new Date());
      if (withDemoClass !== data) {
        try {
          savePokeDenData(withDemoClass);
        } catch {
          // The in-memory demo class remains available if persistence is unavailable.
        }
      }
      return { data: withDemoClass, recovered: false, error: null };
    }
    const backup = parse(storage.getItem(POKEDEN_BACKUP_KEY));
    try {
      storage.setItem(POKEDEN_RECOVERY_KEY, raw);
    } catch {
      // A full storage area should not prevent in-memory recovery.
    }
    const recovered = ensureDemoTodayClass(backup ?? fallback, new Date());
    try {
      savePokeDenData(recovered);
    } catch {
      // The validated recovery remains usable for this session.
    }
    return {
      data: recovered,
      recovered: true,
      error: new PokeDenStorageError("invalid-data", "Stored PokeDen data was invalid and has been recovered."),
    };
  } catch (error) {
    return {
      data: fallback,
      recovered: true,
      error: new PokeDenStorageError("read-failed", "PokeDen data could not be read.", error),
    };
  }
}

export function savePokeDenData(data: PokeDenData): void {
  const parsed = pokeDenDataSchema.safeParse(data);
  if (!parsed.success) {
    throw new PokeDenStorageError("invalid-data", "PokeDen refused to save invalid data.", parsed.error);
  }
  try {
    const storage = getStorage();
    const previous = storage.getItem(POKEDEN_STORAGE_KEY);
    if (previous && parse(previous)) storage.setItem(POKEDEN_BACKUP_KEY, previous);
    storage.setItem(POKEDEN_STORAGE_KEY, JSON.stringify(parsed.data));
  } catch (error) {
    if (error instanceof PokeDenStorageError) throw error;
    throw new PokeDenStorageError("write-failed", "PokeDen data could not be saved.", error);
  }
}

export function resetPokeDenDemo(now = new Date()): PokeDenData {
  const data = createDemoPokeDenData(now);
  savePokeDenData(data);
  return data;
}

export function clearPokeDenAcademicData(data: PokeDenData, now = new Date()): PokeDenData {
  const cleared: PokeDenData = {
    ...data,
    subjects: [],
    tasks: [],
    studySessions: [],
    notes: [],
    exams: [],
    focusSessions: [],
    grades: [],
    activeTimer: null,
    updatedAt: now.toISOString(),
  };
  savePokeDenData(cleared);
  return cleared;
}

export function subscribeToPokeDenStorage(listener: (data: PokeDenData) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key !== POKEDEN_STORAGE_KEY || event.storageArea !== window.localStorage) return;
    const data = parse(event.newValue);
    if (data) listener(data);
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

let pokeDenPushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Fire-and-forget debounced cloud push (~1500ms) after a local save.
 * Never throws; never blocks the UI.
 */
export function notifyPokeDenSaved(data: PokeDenData): void {
  if (typeof window === "undefined") return;
  try {
    if (pokeDenPushTimer !== null) clearTimeout(pokeDenPushTimer);
    const snapshot = data;
    pokeDenPushTimer = setTimeout(() => {
      pokeDenPushTimer = null;
      void (async () => {
        try {
          await fetch("/api/sync/push", {
            body: JSON.stringify({ snapshot, snapshotUpdatedAt: snapshot.updatedAt }),
            headers: { "content-type": "application/json" },
            method: "POST",
          });
        } catch {
          // Fire-and-forget: network failures stay silent, local cache wins.
        }
      })();
    }, 1500);
  } catch {
    // Scheduling must never break the save path.
  }
}
