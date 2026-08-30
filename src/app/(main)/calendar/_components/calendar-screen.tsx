"use client";

import { useMemo, useState } from "react";

import { PageHeader } from "@/app/(main)/_components/page-header";
import { CalendarSkeleton } from "@/app/(main)/_components/page-skeletons";
import { getCalendarEvents } from "@/features/pokeden/derivations";
import type { CalendarEvent } from "@/features/pokeden/domain";
import { usePokeDenStore } from "@/features/pokeden/pokeden-provider";

import { type FullCalendarEventInput, FullCalendarPanel } from "./full-calendar-panel";

function eventHref(event: CalendarEvent): string {
  switch (event.type) {
    case "class":
      if (!event.subjectId) return "/calendar";
      return `/subjects?subject=${event.subjectId}`;
    case "task":
      return `/tasks?task=${event.sourceId}`;
    case "study":
      return `/study-planner?session=${event.sourceId}`;
    case "exam":
      return `/exams/${event.sourceId}`;
  }
}

function statusClassName(status: CalendarEvent["status"]): string {
  switch (status) {
    case "overdue":
      return "text-destructive";
    case "cancelled":
      return "line-through opacity-60";
    case "completed":
      return "opacity-75";
    default:
      return "";
  }
}

export function CalendarScreen({ loading = false }: { loading?: boolean }) {
  const data = usePokeDenStore((state) => state.data);
  const isHydrated = usePokeDenStore((state) => state.isHydrated);
  const storageError = usePokeDenStore((state) => state.storageError);
  const [filter, setFilter] = useState("all");

  const events = useMemo(() => getCalendarEvents(data), [data]);

  const fcEvents = useMemo<FullCalendarEventInput[]>(
    () =>
      events
        .filter((event) => filter === "all" || event.type === filter)
        .map((event) => {
          const subject = event.subjectId ? data.subjects.find((s) => s.id === event.subjectId) : null;
          const color = subject?.color || undefined;
          return {
            id: event.id,
            title: event.title,
            start: event.startsAt,
            end: event.endsAt,
            color,
            className: statusClassName(event.status),
            url: eventHref(event),
            extendedProps: { type: event.type, status: event.status },
          };
        }),
    [events, filter, data.subjects],
  );

  if (loading || !isHydrated) {
    return <CalendarSkeleton />;
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Your academic calendar"
        description="Classes, tasks, study sessions, and exams — all derived from their source."
      />

      {storageError ? (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive text-sm"
          role="alert"
        >
          Some events may be out of date.
        </div>
      ) : null}

      <FullCalendarPanel
        events={fcEvents}
        filter={filter}
        onFilterChange={setFilter}
        weekStartsOn={data.studyPreferences.weekStartsOn}
      />
    </div>
  );
}
