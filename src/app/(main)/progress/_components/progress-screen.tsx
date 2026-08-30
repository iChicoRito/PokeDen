"use client";

import { useMemo } from "react";

import { Award, GraduationCap } from "lucide-react";

import { PageHeader } from "@/app/(main)/_components/page-header";
import { ProgressSkeleton } from "@/app/(main)/_components/page-skeletons";
import { KpiCards } from "@/app/(main)/progress/_components/kpi-cards";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  getCompletedTaskCount,
  getExamReadiness,
  getGradeSummary,
  getSubjectProgress,
  getWeeklyFocusMinutes,
  getWeeklyFocusSessionCount,
} from "@/features/pokeden/derivations";
import { usePokeDenStore } from "@/features/pokeden/pokeden-provider";

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function ProgressScreen() {
  const data = usePokeDenStore((state) => state.data);
  const isHydrated = usePokeDenStore((state) => state.isHydrated);
  const storageError = usePokeDenStore((state) => state.storageError);

  const weeklyMinutes = useMemo(() => getWeeklyFocusMinutes(data), [data]);
  const weeklySessions = useMemo(() => getWeeklyFocusSessionCount(data), [data]);
  const completedTasks = useMemo(() => getCompletedTaskCount(data), [data]);
  const gradeSummary = useMemo(() => getGradeSummary(data), [data]);

  if (!isHydrated) return <ProgressSkeleton />;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Simple progress, no noise"
        description="A few honest numbers about your study time and preparation."
      />

      {storageError ? (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive text-sm"
          role="alert"
        >
          Some data may be out of date.
        </div>
      ) : null}

      <KpiCards
        cards={[
          { title: "Weekly study time", value: formatDuration(weeklyMinutes), footnote: "this week" },
          { title: "Focus sessions completed", value: String(weeklySessions), footnote: "this week" },
          { title: "Tasks completed", value: String(completedTasks), footnote: "all time" },
          {
            title: "Grade summary",
            value: gradeSummary.count > 0 ? `${gradeSummary.mean}%` : "—",
            footnote: gradeSummary.count > 0 ? `${gradeSummary.count} recorded grades` : "No grades recorded yet",
          },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <GraduationCap className="size-4 text-muted-foreground" aria-hidden="true" />
            Exam readiness
          </CardTitle>
          <CardDescription>Reviewed topics out of all topics per exam.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.exams.length === 0 ? (
            <p className="text-muted-foreground text-sm">No exams yet. Readiness appears once you add an exam.</p>
          ) : (
            data.exams.map((exam) => {
              const readiness = getExamReadiness(exam);
              return (
                <div key={exam.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{exam.title}</span>
                    <span>
                      {readiness}% · {exam.topics.filter((topic) => topic.reviewedAt).length}/{exam.topics.length}
                    </span>
                  </div>
                  <Progress value={readiness} aria-label={`${exam.title} readiness ${readiness} percent`} />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Award className="size-4 text-muted-foreground" aria-hidden="true" />
            Subject progress
          </CardTitle>
          <CardDescription>Completion across tasks, planned sessions, and exam topics.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {data.subjects.length === 0 ? (
            <p className="text-muted-foreground text-sm">No subjects yet.</p>
          ) : (
            data.subjects.map((subject) => {
              const progress = getSubjectProgress(data, subject.id);
              const tasks = data.tasks.filter((task) => task.subjectId === subject.id);
              const sessions = data.studySessions.filter((session) => session.subjectId === subject.id);
              const topics = data.exams.filter((exam) => exam.subjectId === subject.id).flatMap((exam) => exam.topics);
              const grade = getGradeSummary(data, subject.id);
              return (
                <div key={subject.id} className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{subject.name}</span>
                      {subject.archivedAt ? <Badge variant="secondary">Archived</Badge> : null}
                    </div>
                    <span className="text-muted-foreground text-sm">
                      {tasks.filter((task) => task.status === "completed").length}/{tasks.length} tasks ·{" "}
                      {sessions.filter((session) => session.status === "completed").length}/{sessions.length} sessions ·{" "}
                      {topics.filter((topic) => topic.reviewedAt).length}/{topics.length} topics
                      {grade.count > 0 ? ` · grade ${grade.mean}%` : ""}
                    </span>
                  </div>
                  <Progress value={progress} aria-label={`${subject.name} progress ${progress} percent`} />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
