import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Shared route skeletons.
 *
 * Server-safe building blocks used by every route's `loading.tsx`, the screens'
 * Suspense fallbacks, and the store-hydration branches, so all three loading
 * stages of a page render the same layout. Each composite skeleton is wrapped
 * in role="status" with a label so assistive tech announces the load.
 *
 * Layouts mirror the real pages:
 * - screens live in `mx-auto w-full max-w-7xl` containers with `gap-6`
 *   (max-w-4xl for detail pages) and `p-4 sm:p-6 lg:p-8` padding
 * - a KPI card is ≈114px tall (`h-[114px]`)
 * - subject cards ≈224px, exam/planner cards ≈192px, note cards ≈224px
 */

function PageSkeleton({
  label,
  maxWidth = "max-w-7xl",
  className,
  children,
}: {
  label: string;
  maxWidth?: "max-w-7xl" | "max-w-4xl";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={cn("mx-auto flex w-full flex-col gap-6 p-4 sm:p-6 lg:p-8", maxWidth, className)}
    >
      {children}
    </div>
  );
}

export function PageHeaderSkeleton({ width = "w-72" }: { width?: string }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div className="space-y-1.5">
        <Skeleton className={cn("h-9 w-full", width)} />
        <Skeleton className="h-5 w-48 max-w-full" />
      </div>
      <Skeleton className="h-8 w-28" />
    </div>
  );
}

export function KpiGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list — items never reorder, index is the identity
        <Skeleton key={`kpi-${index}`} className="h-[114px] rounded-xl" />
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 6, cardHeight = "h-48" }: { count?: number; cardHeight?: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list — items never reorder, index is the identity
        <Skeleton key={`card-${index}`} className={cn("rounded-xl", cardHeight)} />
      ))}
    </div>
  );
}

export function PanelSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-96 rounded-xl", className)} />;
}

/* --- Route composites --------------------------------------------------- */

export function DashboardSkeleton() {
  return (
    <PageSkeleton label="Loading dashboard">
      <PageHeaderSkeleton width="w-80" />
      <KpiGridSkeleton />
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="flex flex-col gap-4 xl:col-span-7">
          <PanelSkeleton className="h-52" />
          <PanelSkeleton className="h-52" />
          <PanelSkeleton className="h-52" />
        </div>
        <div className="flex flex-col gap-4 xl:col-span-5">
          <PanelSkeleton className="h-64" />
          <PanelSkeleton className="h-64" />
        </div>
      </div>
    </PageSkeleton>
  );
}

export function TasksSkeleton() {
  return (
    <PageSkeleton label="Loading tasks">
      <PageHeaderSkeleton />
      <Skeleton className="h-9 w-full max-w-xl" />
      <div className="grid gap-3">
        {Array.from({ length: 5 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list — items never reorder, index is the identity
          <Skeleton key={`task-${index}`} className="h-20 rounded-xl" />
        ))}
      </div>
    </PageSkeleton>
  );
}

export function PlannerSkeleton() {
  return (
    <PageSkeleton label="Loading study planner">
      <PageHeaderSkeleton width="w-96" />
      <CardGridSkeleton count={6} cardHeight="h-48" />
    </PageSkeleton>
  );
}

export function SubjectsSkeleton() {
  return (
    <PageSkeleton label="Loading subjects">
      <PageHeaderSkeleton />
      <CardGridSkeleton count={4} cardHeight="h-[224px]" />
    </PageSkeleton>
  );
}

export function ExamsSkeleton() {
  return (
    <PageSkeleton label="Loading exams">
      <PageHeaderSkeleton />
      <CardGridSkeleton count={6} cardHeight="h-48" />
    </PageSkeleton>
  );
}

export function ExamDetailSkeleton() {
  return (
    <PageSkeleton maxWidth="max-w-4xl" label="Loading exam">
      <Skeleton className="h-8 w-24" />
      <div className="space-y-3">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-5 w-52" />
      </div>
      <PanelSkeleton className="h-64" />
    </PageSkeleton>
  );
}

export function NotesSkeleton() {
  return (
    <PageSkeleton label="Loading notes">
      <PageHeaderSkeleton />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-3 lg:col-span-1">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl lg:col-span-2" />
      </div>
    </PageSkeleton>
  );
}

export function CalendarSkeleton() {
  return (
    <PageSkeleton label="Loading calendar">
      <PageHeaderSkeleton />
      <PanelSkeleton className="h-[32rem]" />
    </PageSkeleton>
  );
}

export function ProgressSkeleton() {
  return (
    <PageSkeleton label="Loading progress">
      <PageHeaderSkeleton />
      <KpiGridSkeleton />
      <PanelSkeleton className="h-56" />
      <PanelSkeleton className="h-64" />
    </PageSkeleton>
  );
}

export function PomodoroSkeleton() {
  return (
    <PageSkeleton label="Loading focus timer">
      <PageHeaderSkeleton width="w-80" />
      <div className="flex justify-center">
        <Skeleton className="h-8 w-64" />
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
      <CardGridSkeleton count={3} cardHeight="h-28" />
    </PageSkeleton>
  );
}

export function SettingsSkeleton() {
  return (
    <PageSkeleton label="Loading settings">
      <PageHeaderSkeleton width="w-64" />
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </PageSkeleton>
  );
}

export function OnboardingSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading setup"
      aria-busy="true"
      className="flex min-h-svh items-center justify-center bg-muted/30 p-6 sm:p-10"
    >
      <div className="flex w-full max-w-2xl flex-col items-center gap-6">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-1.5 w-full max-w-xs rounded-full" />
        <div className="flex w-full flex-col items-center gap-4 rounded-xl border bg-card p-8">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full max-w-sm" />
          <Skeleton className="h-10 w-full max-w-sm" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
    </div>
  );
}
