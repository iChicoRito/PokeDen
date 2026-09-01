"use client";

import { useMemo, useState } from "react";

import Image from "next/image";
import Link from "next/link";

import { ArrowRight, Check, LockKeyhole, Sparkles, Timer } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/app/(main)/_components/page-header";
import { CompanionsSkeleton } from "@/app/(main)/_components/page-skeletons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  COMPANION_CATALOG,
  type CompanionCatalogEntry,
  type CompanionId,
  resolveCompanionId,
} from "@/features/pokeden/companions";
import { usePokeDenStore } from "@/features/pokeden/pokeden-provider";
import {
  getCompanionLevel,
  getCompanionLevelProgress,
  getCompanionProgress,
  getStudyLevel,
  getStudyLevelProgress,
} from "@/features/pokeden/progression";
import { usePendingAction } from "@/hooks/use-pending-action";

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

function getFormName(entry: CompanionCatalogEntry, evolutionStage: number): string {
  if (evolutionStage <= 0) return entry.name;
  return entry.evolutions?.[evolutionStage - 1]?.name ?? entry.name;
}

function CompanionImage({ entry, locked = false }: { entry: CompanionCatalogEntry; locked?: boolean }) {
  return (
    <div className={`relative size-20 shrink-0 overflow-hidden rounded-2xl bg-muted ${locked ? "grayscale" : ""}`}>
      <Image
        src={entry.image}
        alt={`${entry.name} profile`}
        fill
        sizes="80px"
        className="pokeden-pixelated object-cover"
      />
      {locked ? (
        <div className="absolute inset-0 grid place-items-center bg-background/60" aria-hidden="true">
          <LockKeyhole className="size-5 text-muted-foreground" />
        </div>
      ) : null}
    </div>
  );
}

export function CompanionsScreen({ loading = false }: { loading?: boolean }) {
  const data = usePokeDenStore((state) => state.data);
  const isHydrated = usePokeDenStore((state) => state.isHydrated);
  const storageError = usePokeDenStore((state) => state.storageError);
  const actions = usePokeDenStore((state) => state.actions);
  const { isPending, run } = usePendingAction();
  const [evolvingId, setEvolvingId] = useState<CompanionId | null>(null);

  const catalog = COMPANION_CATALOG;
  const selectedId = resolveCompanionId(data.companionPreferences.selected);
  const selected = catalog.find((entry) => entry.id === selectedId) ?? catalog[0];
  const studyLevel = getStudyLevel(data.studyProgress.studyXp);
  const studyLevelProgress = getStudyLevelProgress(data.studyProgress.studyXp);
  const unlocked = useMemo(() => catalog.filter((entry) => entry.unlockStudyLevel <= studyLevel), [studyLevel]);
  const locked = useMemo(() => catalog.filter((entry) => entry.unlockStudyLevel > studyLevel), [studyLevel]);
  const evolving = evolvingId ? catalog.find((entry) => entry.id === evolvingId) : null;
  const evolvingProgress = evolving ? getCompanionProgress(data.studyProgress, evolving.id) : null;
  const nextEvolution = evolving?.evolutions?.[evolvingProgress?.evolutionStage ?? 0];

  if (loading || !isHydrated) return <CompanionsSkeleton />;
  if (!selected) return null;

  const selectCompanion = (entry: CompanionCatalogEntry) => {
    if (isPending || entry.id === selectedId) return;
    void run(() => {
      actions.updateCompanionPreferences({
        selected: entry.id,
        name: entry.name,
        personality: entry.personality,
      });
    })
      .then(() => toast.success(`${entry.name} is now your study companion.`))
      .catch(() => toast.error("Could not change your companion."));
  };

  const confirmEvolution = () => {
    if (!evolving) return;
    void run(() => actions.evolveCompanion(evolving.id))
      .then(() => {
        toast.success(`${evolving.name} evolved into ${nextEvolution?.name ?? "a new form"}.`);
        setEvolvingId(null);
      })
      .catch(() => toast.error("Could not evolve this companion."));
  };

  const selectedProgress = getCompanionProgress(data.studyProgress, selected.id);
  const selectedLevel = getCompanionLevel(selectedProgress.companionXp);
  const selectedLevelProgress = getCompanionLevelProgress(selectedProgress.companionXp);
  const studyXpToNext =
    studyLevelProgress.nextThreshold === null
      ? null
      : Math.max(0, studyLevelProgress.nextThreshold - data.studyProgress.studyXp);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Companions, at your pace"
        description="A quiet home for the companion that keeps you company while you study."
        action={
          <Button asChild>
            <Link href="/pomodoro">
              <Timer aria-hidden="true" />
              Start focus
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      {storageError ? (
        <Alert variant="destructive">
          <AlertTitle>Storage unavailable</AlertTitle>
          <AlertDescription>Your latest companion changes may not be saved.</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]" aria-labelledby="study-progress-heading">
        <Card className="border-primary/20 bg-primary/[0.04]">
          <CardHeader>
            <CardDescription id="study-progress-heading">Your study progress</CardDescription>
            <CardTitle className="text-3xl">Study Level {studyLevel}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress
              value={studyLevelProgress.percentage}
              aria-label={`${studyLevelProgress.percentage}% progress to the next study level`}
            />
            <div className="flex flex-wrap justify-between gap-2 text-muted-foreground text-sm">
              <span>{data.studyProgress.studyXp} Study XP</span>
              <span>{studyXpToNext === null ? "Highest current level" : `${studyXpToNext} XP to next level`}</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Your progress is cumulative. A missed study day never takes away what you have earned.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Active companion</CardDescription>
            <CardTitle className="flex items-center gap-2">
              {getFormName(selected, selectedProgress.evolutionStage)}
              <Badge variant="secondary">Level {selectedLevel}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <CompanionImage entry={selected} />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-muted-foreground text-sm">{selected.tagline}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="font-medium">{formatMinutes(selectedProgress.studyMinutes)} studied</span>
                <span className="text-muted-foreground">{selectedLevelProgress.currentXp} companion XP</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4" aria-labelledby="unlocked-heading">
        <div>
          <h2 id="unlocked-heading" className="font-semibold text-xl">
            Unlocked companions
          </h2>
          <p className="text-muted-foreground text-sm">Choose who joins your next focus session.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {unlocked.map((entry) => {
            const progress = getCompanionProgress(data.studyProgress, entry.id);
            const level = getCompanionLevel(progress.companionXp);
            const levelProgress = getCompanionLevelProgress(progress.companionXp);
            const evolution = entry.evolutions?.[progress.evolutionStage];
            const ready =
              evolution !== undefined && level >= evolution.companionLevel && studyLevel >= evolution.studyLevel;

            return (
              <Card key={entry.id} className={entry.id === selectedId ? "border-primary ring-2 ring-primary/20" : ""}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start gap-3">
                    <CompanionImage entry={entry} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{getFormName(entry, progress.evolutionStage)}</h3>
                        {entry.id === selectedId ? (
                          <Badge>
                            <Check aria-hidden="true" />
                            Selected
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground text-sm">{entry.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Companion Level</p>
                      <p className="font-medium">{level}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Study time</p>
                      <p className="font-medium">{formatMinutes(progress.studyMinutes)}</p>
                    </div>
                  </div>
                  <Progress value={levelProgress.percentage} aria-label={`${entry.name} companion progress`} />

                  {ready && evolution ? (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                      <p className="flex items-center gap-2 font-medium">
                        <Sparkles aria-hidden="true" className="size-4" />
                        Evolution ready: {evolution.name}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        Companion Level {evolution.companionLevel} and Study Level {evolution.studyLevel} reached.
                      </p>
                      <Button variant="link" className="h-auto px-0" onClick={() => setEvolvingId(entry.id)}>
                        Review evolution
                      </Button>
                    </div>
                  ) : null}

                  <Button
                    className="w-full"
                    variant={entry.id === selectedId ? "secondary" : "outline"}
                    disabled={entry.id === selectedId || isPending}
                    onClick={() => selectCompanion(entry)}
                  >
                    {entry.id === selectedId ? "Selected" : "Choose companion"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="locked-heading">
        <div>
          <h2 id="locked-heading" className="font-semibold text-xl">
            Locked companions
          </h2>
          <p className="text-muted-foreground text-sm">Keep studying to make more companions available.</p>
        </div>
        {locked.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {locked.map((entry) => (
              <Card
                key={entry.id}
                aria-label={`${entry.name}, locked at Study Level ${entry.unlockStudyLevel}`}
                className="opacity-75"
              >
                <CardContent className="flex items-center gap-3 p-5">
                  <CompanionImage entry={entry} locked />
                  <div>
                    <h3 className="font-semibold">{entry.name}</h3>
                    <p className="text-muted-foreground text-sm">Required Study Level {entry.unlockStudyLevel}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Every companion is unlocked. Keep studying to grow them.</p>
        )}
      </section>

      <AlertDialog open={evolvingId !== null} onOpenChange={(open) => !open && setEvolvingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Evolve {evolving ? getFormName(evolving, evolvingProgress?.evolutionStage ?? 0) : "companion"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {nextEvolution
                ? `This companion is ready for ${nextEvolution.name}. Evolution is optional: keep the current form or evolve when it feels right.`
                : "Evolution is not available for this companion yet."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current form</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEvolution} disabled={isPending || !nextEvolution}>
              {isPending ? "Evolving…" : `Evolve to ${nextEvolution?.name ?? "next form"}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
