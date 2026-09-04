import type { ReactNode } from "react";

import { cookies } from "next/headers";

import { SessionGuard } from "@/features/auth/session-guard";
import { PokeDenProvider } from "@/features/pokeden/pokeden-provider";
import { SIDEBAR_COLLAPSIBLE_VALUES, SIDEBAR_VARIANT_VALUES } from "@/lib/preferences/layout";
import { getPreference } from "@/server/server-actions";

import { PokeDenShell } from "./_components/pokeden-shell";
import { SetupGate } from "./_components/setup-gate";

export default async function MainLayout({ children }: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const [variant, collapsible] = await Promise.all([
    getPreference("sidebar_variant", SIDEBAR_VARIANT_VALUES, "inset"),
    getPreference("sidebar_collapsible", SIDEBAR_COLLAPSIBLE_VALUES, "icon"),
  ]);

  return (
    <SessionGuard>
      <PokeDenProvider>
        <SetupGate>
          <PokeDenShell defaultOpen={defaultOpen} variant={variant} collapsible={collapsible}>
            {children}
          </PokeDenShell>
        </SetupGate>
      </PokeDenProvider>
    </SessionGuard>
  );
}
