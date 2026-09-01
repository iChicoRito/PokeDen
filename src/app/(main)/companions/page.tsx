import { Suspense } from "react";

import { CompanionsScreen } from "./_components/companions-screen";

export default function CompanionsPage() {
  return (
    <Suspense fallback={<CompanionsScreen loading />}>
      <CompanionsScreen />
    </Suspense>
  );
}
