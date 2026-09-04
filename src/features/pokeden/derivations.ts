import { addDays, endOfDay, endOfWeek, isAfter, isBefore, isSameDay, startOfDay, startOfWeek } from "date-fns";

import type { CalendarEvent, Exam, FocusSession, PokeDenData, Subject, Task } from "./domain";
import { getTimerElapsedSeconds } from "./timer-clock";

const toDate = (value: string): Date => new Date(value);
const minutesBetween = (start: Date, end: Date): number =>
  Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));

export function getOverdueTasks(data: PokeDenData, now = new Date()): Task[] {
  return data.tasks.filter(
    (task) => task.status !== "completed" && task.dueAt !== null && isBefore(toDate(task.dueAt), startOfDay(now)),
  );
}

export function getTasksDueToday(data: PokeDenData, now = new Date()): Task[] {
  return data.tasks.filter(
    (task) => task.status !== "completed" && task.dueAt !== null && isSameDay(toDate(task.dueAt), now),
  );
}

export function getExamCountdown(exam: Exam, now = new Date()): { days: number; minutes: number; isPast: boolean } {
  const minutes = Math.ceil((toDate(exam.startsAt).getTime() - now.getTime()) / 60000);
  return { days: Math.ceil(minutes / 1440), minutes, isPast: minutes < 0 };
}

export function getExamReadiness(exam: Exam): number {
  if (exam.topics.length === 0) return 0;
  const reviewed = exam.topics.filter((topic) => topic.reviewedAt !== null).length;
  return Math.round((reviewed / exam.topics.length) * 100);
}

export function getCompletedFocusSessions(data: PokeDenData): FocusSession[] {
  return data.focusSessions.filter((session) => session.completed);
}

export function getDailyFocusMinutes(data: PokeDenData, now = new Date()): number {
  return data.focusSessions
    .filter((session) => session.completed && isSameDay(toDate(session.endedAt), now))
    .reduce((sum, session) => sum + session.durationMinutes, 0);
}

export function getDailyFocusSessionCount(data: PokeDenData, now = new Date()): number {
  return data.focusSessions.filter((session) => session.completed && isSameDay(toDate(session.endedAt), now)).length;
}

export function getWeeklyFocusMinutes(data: PokeDenData, now = new Date()): number {
  const start = startOfWeek(now, { weekStartsOn: data.studyPreferences.weekStartsOn });
  const end = endOfWeek(now, { weekStartsOn: data.studyPreferences.weekStartsOn });
  return data.focusSessions
    .filter((session) => {
      const endedAt = toDate(session.endedAt);
      return session.completed && !isBefore(endedAt, start) && !isAfter(endedAt, end);
    })
    .reduce((sum, session) => sum + session.durationMinutes, 0);
}

export function getWeeklyFocusSessionCount(data: PokeDenData, now = new Date()): number {
  const start = startOfWeek(now, { weekStartsOn: data.studyPreferences.weekStartsOn });
  const end = endOfWeek(now, { weekStartsOn: data.studyPreferences.weekStartsOn });
  return data.focusSessions.filter((session) => {
    const endedAt = toDate(session.endedAt);
    return session.completed && !isBefore(endedAt, start) && !isAfter(endedAt, end);
  }).length;
}

export function getCompletedTaskCount(data: PokeDenData): number {
  return data.tasks.filter((task) => task.status === "completed").length;
}

export function getSubjectProgress(data: PokeDenData, subjectId: string): number {
  const tasks = data.tasks.filter((task) => task.subjectId === subjectId);
  const plans = data.studySessions.filter((session) => session.subjectId === subjectId);
  const topics = data.exams.filter((exam) => exam.subjectId === subjectId).flatMap((exam) => exam.topics);
  const total = tasks.length + plans.length + topics.length;
  if (total === 0) return 0;
  const completed =
    tasks.filter((task) => task.status === "completed").length +
    plans.filter((session) => session.status === "completed").length +
    topics.filter((topic) => topic.reviewedAt !== null).length;
  return Math.round((completed / total) * 100);
}

export function getGradeSummary(data: PokeDenData, subjectId?: string): { mean: number; count: number } {
  const grades = subjectId ? data.grades.filter((grade) => grade.subjectId === subjectId) : data.grades;
  if (grades.length === 0) return { mean: 0, count: 0 };
  const mean = grades.reduce((sum, grade) => sum + (grade.score / grade.maxScore) * 100, 0) / grades.length;
  return { mean: Math.round(mean * 10) / 10, count: grades.length };
}

export type StudyRecommendation = {
  subjectId: string;
  reason: "overdue-task" | "exam-soon" | "low-progress" | "least-recently-focused";
  score: number;
};

export function getRecommendedStudy(data: PokeDenData, now = new Date()): StudyRecommendation | null {
  const activeSubjects = data.subjects.filter((subject) => subject.archivedAt === null);
  if (activeSubjects.length === 0) return null;
  const candidates = activeSubjects.map((subject) => {
    const overdue = getOverdueTasks(data, now).filter((task) => task.subjectId === subject.id).length;
    const nextExam = data.exams
      .filter((exam) => exam.subjectId === subject.id && !isBefore(toDate(exam.startsAt), now))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
    const examDays = nextExam ? getExamCountdown(nextExam, now).days : Number.POSITIVE_INFINITY;
    const progress = getSubjectProgress(data, subject.id);
    const latestFocus = data.focusSessions
      .filter((session) => session.subjectId === subject.id)
      .sort((a, b) => b.endedAt.localeCompare(a.endedAt))[0];
    const staleDays = latestFocus
      ? Math.max(0, Math.floor((now.getTime() - toDate(latestFocus.endedAt).getTime()) / 86400000))
      : 30;
    const score =
      overdue * 1000 + (examDays <= 14 ? (15 - Math.max(0, examDays)) * 30 : 0) + (100 - progress) + staleDays;
    const reason: StudyRecommendation["reason"] =
      overdue > 0
        ? "overdue-task"
        : examDays <= 14
          ? "exam-soon"
          : progress < 50
            ? "low-progress"
            : "least-recently-focused";
    return { subjectId: subject.id, reason, score };
  });
  return candidates.sort((a, b) => b.score - a.score || a.subjectId.localeCompare(b.subjectId))[0] ?? null;
}

function setTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return result;
}

export function getCalendarEvents(
  data: PokeDenData,
  rangeStart = addDays(new Date(), -14),
  rangeEnd = addDays(new Date(), 60),
  now = new Date(),
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const subject of data.subjects.filter((item) => item.archivedAt === null)) {
    for (let day = startOfDay(rangeStart); !isAfter(day, endOfDay(rangeEnd)); day = addDays(day, 1)) {
      for (const schedule of subject.classSchedules.filter((item) => item.weekday === day.getDay())) {
        const startsAt = setTime(day, schedule.startTime);
        const endsAt = setTime(day, schedule.endTime);
        events.push({
          id: `class:${schedule.id}:${startsAt.toISOString()}`,
          sourceId: schedule.id,
          type: "class",
          title: `${subject.name}: ${schedule.label}`,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          subjectId: subject.id,
          status: "scheduled",
        });
      }
    }
  }
  for (const task of data.tasks.filter((item) => item.dueAt !== null)) {
    const startsAt = toDate(task.dueAt ?? now.toISOString());
    events.push({
      id: `task:${task.id}`,
      sourceId: task.id,
      type: "task",
      title: task.title,
      startsAt: startsAt.toISOString(),
      endsAt: startsAt.toISOString(),
      subjectId: task.subjectId,
      status: task.status === "completed" ? "completed" : isBefore(startsAt, now) ? "overdue" : "scheduled",
    });
  }
  for (const plan of data.studySessions) {
    const startsAt = toDate(plan.plannedStart);
    events.push({
      id: `study:${plan.id}`,
      sourceId: plan.id,
      type: "study",
      title: plan.title,
      startsAt: startsAt.toISOString(),
      endsAt: new Date(startsAt.getTime() + plan.plannedMinutes * 60000).toISOString(),
      subjectId: plan.subjectId,
      status: plan.status === "completed" ? "completed" : plan.status === "skipped" ? "cancelled" : "scheduled",
    });
  }
  for (const exam of data.exams) {
    const startsAt = toDate(exam.startsAt);
    events.push({
      id: `exam:${exam.id}`,
      sourceId: exam.id,
      type: "exam",
      title: exam.title,
      startsAt: startsAt.toISOString(),
      endsAt: new Date(startsAt.getTime() + exam.durationMinutes * 60000).toISOString(),
      subjectId: exam.subjectId,
      status: isBefore(startsAt, now) ? "completed" : "scheduled",
    });
  }
  return events.sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id));
}

export function getTodayClasses(data: PokeDenData, now = new Date()): CalendarEvent[] {
  return getCalendarEvents(data, startOfDay(now), endOfDay(now), now).filter((event) => event.type === "class");
}

export function getActiveSubjects(data: PokeDenData): Subject[] {
  return data.subjects.filter((subject) => subject.archivedAt === null);
}

export function getActiveTimerElapsedSeconds(data: PokeDenData, now = new Date()): number {
  const timer = data.activeTimer;
  return timer ? getTimerElapsedSeconds(timer, now) : 0;
}

export function getActiveTimerRemainingSeconds(data: PokeDenData, now = new Date()): number {
  const timer = data.activeTimer;
  if (!timer) return 0;
  return Math.max(0, timer.targetMinutes * 60 - getActiveTimerElapsedSeconds(data, now));
}

export function getFocusDurationMinutes(startedAt: string, endedAt: string): number {
  return minutesBetween(toDate(startedAt), toDate(endedAt));
}

export function getStudySessionFocusMinutes(data: PokeDenData, sessionId: string): number {
  return data.focusSessions
    .filter((session) => session.studySessionId === sessionId && session.completed)
    .reduce((sum, session) => sum + session.durationMinutes, 0);
}

export function getStudySessionProgress(data: PokeDenData, sessionId: string): number {
  const plan = data.studySessions.find((session) => session.id === sessionId);
  if (!plan) return 0;
  if (plan.status === "completed") return 100;
  if (plan.status === "skipped") return 0;
  const minutes = getStudySessionFocusMinutes(data, sessionId);
  return Math.min(100, Math.round((minutes / plan.plannedMinutes) * 100));
}
