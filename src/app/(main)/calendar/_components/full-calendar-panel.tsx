"use client";

import { useMemo, useState } from "react";

import { useCalendarController } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import listPlugin from "@fullcalendar/react/list";
import multiMonthPlugin from "@fullcalendar/react/multimonth";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import { differenceInCalendarDays, endOfMonth, format, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { EventCalendarViews } from "./event-calendar-views";

export type FullCalendarEventInput = {
  id: string;
  title: string;
  start: string;
  end: string;
  color?: string;
  className?: string;
  url: string;
  extendedProps: { type: string; status: string };
};

const viewOptions = [
  { value: "dayGridMonth", label: "Month" },
  { value: "timeGridWeek", label: "Week" },
  { value: "listWeek", label: "Agenda" },
] as const;

const filterOptions = [
  { value: "all", label: "All events" },
  { value: "class", label: "Classes" },
  { value: "task", label: "Tasks" },
  { value: "study", label: "Study sessions" },
  { value: "exam", label: "Exams" },
] as const;

const plugins = [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, multiMonthPlugin];

type FullCalendarPanelProps = {
  events: FullCalendarEventInput[];
  filter: string;
  onFilterChange: (value: string) => void;
  weekStartsOn: 0 | 1;
  nowIndicator?: true;
};

export function FullCalendarPanel({
  events,
  filter,
  onFilterChange,
  weekStartsOn,
  nowIndicator = true,
}: FullCalendarPanelProps) {
  const controller = useCalendarController();
  const [eventCount, setEventCount] = useState(0);
  const [dateInfo, setDateInfo] = useState(() => {
    const now = new Date();

    return {
      title: format(now, "MMMM yyyy"),
      days: differenceInCalendarDays(endOfMonth(now), startOfMonth(now)) + 1,
    };
  });
  const title = dateInfo.title;
  const days = dateInfo.days;
  const filteredEvents = useMemo(
    () => (filter === "all" ? events : events.filter((event) => event.extendedProps.type === filter)),
    [events, filter],
  );

  return (
    <div className="flex flex-col overflow-hidden rounded-md border">
      <div className="flex flex-col gap-4 border-b bg-sidebar p-4 text-sidebar-foreground lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 shrink-0 flex-col gap-1">
          <div className="font-medium text-lg leading-none">{title}</div>
          <p className="text-muted-foreground text-sm">
            {days} days – {eventCount} events
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={filter} onValueChange={onFilterChange}>
            <SelectTrigger aria-label="Filter events" className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectGroup>
                {filterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <ButtonGroup>
            <Button size="icon" variant="outline" aria-label="Previous period" onClick={() => controller.prev()}>
              <ChevronLeft />
            </Button>
            <Button variant="outline" onClick={() => controller.today()}>
              Today
            </Button>
            <Button size="icon" variant="outline" aria-label="Next period" onClick={() => controller.next()}>
              <ChevronRight />
            </Button>
          </ButtonGroup>
          <Select
            value={controller.view?.type ?? viewOptions[0].value}
            onValueChange={(value) => {
              controller.changeView(value);
            }}
          >
            <SelectTrigger aria-label="Calendar view">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectGroup>
                {viewOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <EventCalendarViews
        controller={controller}
        initialView="dayGridMonth"
        plugins={[...plugins]}
        popoverCloseContent={() => <XIcon className="size-5 text-muted-foreground group-hover:text-foreground" />}
        events={filteredEvents}
        nowIndicator={nowIndicator}
        firstDay={weekStartsOn}
        dayMaxEvents={3}
        eventClick={(info) => {
          info.jsEvent.preventDefault();
          window.location.href = info.event.url;
        }}
        datesSet={(info) => {
          setDateInfo({
            title: info.view.title,
            days: differenceInCalendarDays(info.view.currentEnd, info.view.currentStart),
          });
          setEventCount(
            filteredEvents.filter((event) => {
              const start = new Date(event.start);

              return start >= info.start && start < info.end;
            }).length,
          );
        }}
      />
    </div>
  );
}
