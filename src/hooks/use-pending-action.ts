import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Minimum time a pending state stays visible.
 *
 * PokeDen persists through synchronous localStorage writes, so an action's
 * `isSaving` flag flips true → false inside a single React event batch and a
 * bare spinner would never paint. Holding the pending state for a short
 * minimum makes the feedback observable without making fast actions feel slow.
 */
const DEFAULT_MIN_MS = 350;

export type PendingActionOptions = {
  /** Override the minimum visible duration (ms). Use a smaller value for trivial toggles. */
  minMs?: number;
};

/**
 * Tracks a user-triggered action so its control can show a spinner.
 *
 * `run` is reentrancy-guarded (a second call while pending is ignored), keeps
 * the pending state visible for at least `minMs`, clears its timer on unmount,
 * and re-throws operation errors so screens keep their existing try/catch and
 * toast behavior.
 */
export function usePendingAction() {
  const [isPending, setIsPending] = useState(false);
  const pendingRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const run = useCallback(async (operation: () => unknown, options?: PendingActionOptions): Promise<void> => {
    // biome-ignore lint/suspicious/noUnnecessaryConditions: re-entrancy guard — the ref is mutated by other concurrent invocations, so it is not always falsy.
    if (pendingRef.current) return;
    const minMs = options?.minMs ?? DEFAULT_MIN_MS;
    const startedAt = Date.now();
    pendingRef.current = true;
    setIsPending(true);
    try {
      await operation();
    } finally {
      // Resolve only after the pending state actually clears, so callers that
      // `await run(...)` (e.g. to close a dialog) never cut the spinner short.
      const remaining = minMs - (Date.now() - startedAt);
      if (remaining > 0) {
        await new Promise<void>((resolve) => {
          timerRef.current = window.setTimeout(() => {
            timerRef.current = null;
            resolve();
          }, remaining);
        });
      }
      pendingRef.current = false;
      setIsPending(false);
    }
  }, []);

  return { isPending, run };
}
