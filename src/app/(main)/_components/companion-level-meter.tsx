"use client";

import { Progress } from "@/components/ui/progress";
import { usePokeDenStore } from "@/features/pokeden/pokeden-provider";
import { getStudyLevel, getStudyLevelProgress } from "@/features/pokeden/progression";

export function CompanionLevelMeter() {
  const studyXp = usePokeDenStore((state) => state.data.studyProgress.studyXp);
  const level = getStudyLevel(studyXp);
  const progress = getStudyLevelProgress(studyXp);
  const xpToNext = progress.nextThreshold === null ? null : Math.max(0, progress.nextThreshold - studyXp);

  return (
    <div className="space-y-1 px-1 pt-1 pb-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">Lv {level}</span>
        <span className="text-muted-foreground">{studyXp} XP</span>
      </div>
      <Progress
        value={progress.percentage}
        className="h-1.5"
        aria-label={`${progress.percentage}% progress to the next study level`}
      />
      <p className="text-[11px] text-muted-foreground">
        {xpToNext === null ? "Max level" : `${xpToNext} XP to next level`}
      </p>
    </div>
  );
}
