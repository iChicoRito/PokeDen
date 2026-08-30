"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { PokeDenProvider, usePokeDenStore } from "@/features/pokeden/pokeden-provider";

import { SetupLoading } from "./(main)/_components/setup-loading";

function RootEntryGate() {
  const router = useRouter();
  const isHydrated = usePokeDenStore((state) => state.isHydrated);
  const setupCompleted = usePokeDenStore((state) => state.data.setupCompleted);
  const storageError = usePokeDenStore((state) => state.storageError);

  useEffect(() => {
    if (!isHydrated) return;
    if (storageError) {
      router.replace("/onboarding?storage=error");
      return;
    }
    router.replace(setupCompleted ? "/dashboard" : "/onboarding");
  }, [isHydrated, router, setupCompleted, storageError]);

  return <SetupLoading />;
}

export default function Home() {
  return (
    <PokeDenProvider>
      <RootEntryGate />
    </PokeDenProvider>
  );
}
