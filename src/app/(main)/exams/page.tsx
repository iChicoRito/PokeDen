import { Suspense } from "react";

import { ExamsScreen } from "./_components/exams-screen";

export default function ExamsPage() {
  return (
    <Suspense fallback={<ExamsScreen loading />}>
      <ExamsScreen />
    </Suspense>
  );
}
