"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { usePokeDenStore } from "@/features/pokeden/pokeden-provider";

import { SetupLoading } from "./setup-loading";

export function SetupGate({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const isHydrated = usePokeDenStore((state) => state.isHydrated);
  const setupCompleted = usePokeDenStore((state) => state.data.setupCompleted);
  const storageError = usePokeDenStore((state) => state.storageError);

  useEffect(() => {
    if (isHydrated && !setupCompleted) router.replace("/onboarding");
  }, [isHydrated, router, setupCompleted]);

  if (!isHydrated || !setupCompleted || storageError) return <SetupLoading />;

  return children;
}
