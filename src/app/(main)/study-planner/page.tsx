import { Suspense } from "react";

import { StudyPlannerScreen } from "./_components/study-planner-screen";

export default function StudyPlannerPage() {
  return (
    <Suspense fallback={<StudyPlannerScreen loading />}>
      <StudyPlannerScreen />
    </Suspense>
  );
}
