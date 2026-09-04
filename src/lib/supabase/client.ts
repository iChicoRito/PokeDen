import { createBrowserClient } from "@supabase/ssr";

let cached: ReturnType<typeof createBrowserClient> | null = null;

/** Browser-only client. Returns null during SSR/prerender — callers must guard. */
export function createClient() {
  if (typeof window === "undefined") return null;
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  if (!url || !key) return null;
  cached = createBrowserClient(url, key);
  return cached;
}

export type BrowserClient = NonNullable<ReturnType<typeof createClient>>;
