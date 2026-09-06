export type PomodoroTimerStatus = "idle" | "running" | "paused" | "completed" | null | undefined;

type FullscreenDocumentLike = {
  readonly documentElement: {
    requestFullscreen?: () => Promise<void>;
  };
  readonly fullscreenElement: unknown | null;
  exitFullscreen?: () => Promise<void>;
};

/**
 * Focus mode (hidden chrome, full-bleed timer card, no companion dock) applies
 * only while the timer is running. Pausing deliberately returns the page to the
 * normal view; resuming re-enters focus mode.
 */
export function isPomodoroFocusModeActive(status: PomodoroTimerStatus): boolean {
  return status === "running";
}

export async function requestPomodoroFullscreen(documentLike: FullscreenDocumentLike): Promise<boolean> {
  if (documentLike.fullscreenElement !== null) return false;
  const requestFullscreen = documentLike.documentElement.requestFullscreen;
  if (!requestFullscreen) return false;
  try {
    await requestFullscreen.call(documentLike.documentElement);
    return true;
  } catch {
    return false;
  }
}

export async function exitPomodoroFullscreen(documentLike: FullscreenDocumentLike): Promise<boolean> {
  if (documentLike.fullscreenElement !== documentLike.documentElement) return false;
  const exitFullscreen = documentLike.exitFullscreen;
  if (!exitFullscreen) return false;
  try {
    await exitFullscreen.call(documentLike);
    return true;
  } catch {
    return false;
  }
}
