"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { useAuth } from "./auth-provider";

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) router.replace("/auth/sign-in");
  }, [loading, session, router]);

  if (loading || !session) return null;
  return <>{children}</>;
}
