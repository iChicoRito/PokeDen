import { Suspense } from "react";

import { OnboardingSkeleton } from "@/app/(main)/_components/page-skeletons";
import { PokeDenProvider } from "@/features/pokeden/pokeden-provider";

import { OnboardingFlow } from "./_components/onboarding-flow";

export default function OnboardingPage() {
  return (
    <PokeDenProvider>
      <Suspense fallback={<OnboardingSkeleton />}>
        <OnboardingFlow />
      </Suspense>
    </PokeDenProvider>
  );
}
