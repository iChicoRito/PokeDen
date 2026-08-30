"use client";

import { useState } from "react";

import Link from "next/link";

import { startOfMonth, startOfToday } from "date-fns";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CalendarPanel({ weekStartsOn }: { weekStartsOn: 0 | 1 }) {
  const today = startOfToday();
  const [date, setDate] = useState<Date | undefined>(today);
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(today));

  return (
    <Card size="sm" className="w-full max-w-xs self-center">
      <CardHeader>
        <CardTitle className="text-base">Calendar</CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/calendar">
              View calendar <ArrowRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          fixedWeeks
          weekStartsOn={weekStartsOn}
          className="mx-auto w-full max-w-64 p-0"
        />
      </CardContent>
    </Card>
  );
}
