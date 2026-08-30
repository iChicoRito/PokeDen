import { Suspense } from "react";

import { CalendarScreen } from "./_components/calendar-screen";

export default function CalendarPage() {
  return (
    <Suspense fallback={<CalendarScreen loading />}>
      <CalendarScreen />
    </Suspense>
  );
}
