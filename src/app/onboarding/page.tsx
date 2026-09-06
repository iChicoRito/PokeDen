import { Suspense } from "react";

import { OnboardingSkeleton } from "@/app/(main)/_components/page-skeletons";

import { OnboardingFlow } from "./_components/onboarding-flow";

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingSkeleton />}>
      <OnboardingFlow />
    </Suspense>
  );
}
