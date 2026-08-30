import { Spinner } from "@/components/ui/spinner";

export function SetupLoading() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6" aria-live="polite">
      <div className="flex items-center gap-3 text-muted-foreground text-sm">
        <Spinner className="size-5" />
        <span>Preparing your study space…</span>
      </div>
    </div>
  );
}
