import { Suspense } from "react";

import { SubjectsManager } from "./_components/subjects-manager";

export default function SubjectsPage() {
  return (
    <Suspense fallback={<SubjectsManager loading />}>
      <SubjectsManager />
    </Suspense>
  );
}
