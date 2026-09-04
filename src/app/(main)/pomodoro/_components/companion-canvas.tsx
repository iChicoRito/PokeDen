"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { CompanionId } from "@/features/pokeden/companions";
import { COMPANION_CATALOG, resolveCompanionId } from "@/features/pokeden/companions";
import { getActiveTimerRemainingSeconds } from "@/features/pokeden/derivations";
import { usePokeDenStore } from "@/features/pokeden/pokeden-provider";
import { getStudyLevel } from "@/features/pokeden/progression";
import type { SessionPhase } from "@/features/pokeden/session-evolution";
import { getDisplaySpeciesForCompanion, getSessionPhase } from "@/features/pokeden/session-evolution";
import type { SpriteSheetEntry, SpriteSpecies, SpriteStateName } from "@/features/pokeden/sprite-sheets";
import { SPRITE_SHEETS } from "@/features/pokeden/sprite-sheets";

type Actor = {
  companionId: CompanionId;
  species: SpriteSpecies;
  sheet: SpriteSheetEntry;
  scale: number;
  state: SpriteStateName;
  frameIndex: number;
  x: number;
  speed: number;
  phaseRemaining: number;
  frameAccumulator: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function CompanionCanvas({
  className,
  remainingSeconds: remainingProp,
  totalSeconds: totalProp,
}: {
  className?: string;
  remainingSeconds?: number;
  totalSeconds?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const actorsRef = useRef<Actor[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [actors, setActors] = useState<Actor[]>([]);
  const [mounted, setMounted] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const data = usePokeDenStore((state) => state.data);
  const studyXp = data.studyProgress.studyXp;
  const selected = data.companionPreferences.selected;
  const visible = data.companionPreferences.visible;
  const movementEnabled = data.companionPreferences.movement;
  const reducedMotion = data.companionPreferences.reducedMotion;

  // Standalone fallback clock: only ticks when the parent does not drive time via props.
  const useFallbackClock = remainingProp === undefined || totalProp === undefined;
  useEffect(() => {
    if (!useFallbackClock) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [useFallbackClock]);

  // Shared session phase: props win when provided, otherwise derive from the store timer.
  // Idle preview (no active timer) always shows base forms.
  const remaining = remainingProp ?? getActiveTimerRemainingSeconds(data, new Date(nowMs));
  const total = totalProp ?? (data.activeTimer ? data.activeTimer.targetMinutes * 60 : 0);
  const phase: SessionPhase = data.activeTimer ? getSessionPhase(remaining, total) : 0;

  const unlockedIds = useMemo(() => {
    const studyLevel = getStudyLevel(studyXp);
    return COMPANION_CATALOG.filter((entry) => entry.unlockStudyLevel <= studyLevel).map((entry) => entry.id);
  }, [studyXp]);

  // Fall back to today's single selected-companion actor so the canvas is never empty.
  const actorIds = useMemo(
    () => (unlockedIds.length > 0 ? unlockedIds : [resolveCompanionId(selected)]),
    [unlockedIds, selected],
  );
  const scale = unlockedIds.length > 4 ? 3 : 4;

  let motionGated = !mounted || !movementEnabled || reducedMotion;
  if (mounted) {
    const html = document.documentElement;
    motionGated =
      motionGated ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      html.dataset.pokedenReducedMotion === "true" ||
      html.dataset.pokedenCompanionMovement === "false";
  }

  // Measure the container once it's mounted and on resize.
  useEffect(() => {
    setMounted(true);
    const node = containerRef.current;
    // biome-ignore lint/suspicious/noUnnecessaryConditions: tsc cannot narrow the ref to non-null in an effect.
    if (!node) return;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      setCanvasSize({ width: rect.width, height: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Build one actor per unlocked companion and resync on phase/size/motion changes.
  // New actors take their deterministic slot; existing actors keep x/state across
  // phase swaps (only species/sheet swap, with frameIndex reset to the new start).
  useEffect(() => {
    if (!mounted || canvasSize.width <= 0 || canvasSize.height <= 0) return;

    const prev = actorsRef.current;
    const count = actorIds.length;
    const next: Actor[] = actorIds.map((id, i) => {
      const species = getDisplaySpeciesForCompanion(id, phase, (s) => SPRITE_SHEETS[s] !== undefined);
      const sheet = SPRITE_SHEETS[species];
      const displayWidth = sheet.frameWidth * scale;
      const maxX = Math.max(0, canvasSize.width - displayWidth);
      const slotX = clamp(((i + 0.5) / count) * canvasSize.width - displayWidth / 2, 0, maxX);
      const old = prev.find((actor) => actor.companionId === id);
      const speciesChanged = old !== undefined && old.species !== species;
      const state: SpriteStateName = motionGated ? "idle-right" : (old?.state ?? "idle-right");
      const range = sheet.states[state];
      return {
        companionId: id,
        species,
        sheet,
        scale,
        state,
        frameIndex: motionGated || !old || speciesChanged ? range.from : old.frameIndex,
        x: old ? clamp(old.x, 0, maxX) : slotX,
        speed: old?.speed ?? (24 + ((i * 13) % 17)) * (scale / 2),
        phaseRemaining: old?.phaseRemaining ?? 2 + ((i * 1.3) % 4),
        frameAccumulator: old?.frameAccumulator ?? 0,
      };
    });

    actorsRef.current = next;
    setActors(next);
  }, [actorIds, canvasSize.height, canvasSize.width, mounted, motionGated, phase, scale]);

  // One loop owns behavior phases, horizontal movement, and sprite frame advancement for all actors.
  useEffect(() => {
    if (!mounted || !visible || motionGated || canvasSize.width <= 0 || canvasSize.height <= 0) return;

    let active = true;
    let raf = 0;
    let lastTick = performance.now();

    const schedule = () => {
      if (active && raf === 0 && !document.hidden) {
        raf = requestAnimationFrame(tick);
      }
    };

    const tick = (now: number) => {
      raf = 0;
      const delta = Math.min(0.1, Math.max(0, (now - lastTick) / 1000));
      lastTick = now;
      const list = actorsRef.current;

      if (list.length > 0) {
        const next = list.map((current) => {
          let state = current.state;
          let frameIndex = current.frameIndex;
          let x = current.x;
          let phaseRemaining = current.phaseRemaining;
          let frameAccumulator = current.frameAccumulator;
          phaseRemaining -= delta;

          if (phaseRemaining <= 0) {
            const facing = state.endsWith("left") ? "left" : "right";
            state = state.startsWith("walking") ? `idle-${facing}` : `walking-${facing}`;
            frameIndex = current.sheet.states[state].from;
            frameAccumulator = 0;
            phaseRemaining = 2 + Math.random() * 4;
          }

          const walking = state.startsWith("walking");
          if (walking) {
            const displayWidth = current.sheet.frameWidth * current.scale;
            const maxX = Math.max(0, canvasSize.width - displayWidth);
            if (maxX > 0) {
              const movingLeft = state === "walking-left";
              x += (movingLeft ? -1 : 1) * current.speed * delta;
              if (x <= 0) {
                x = 0;
                state = "walking-right";
              } else if (x >= maxX) {
                x = maxX;
                state = "walking-left";
              }
            } else {
              x = 0;
            }
          }

          frameAccumulator += delta;
          const frameStep = walking ? 0.125 : 0.5;
          if (frameAccumulator >= frameStep) {
            frameAccumulator %= frameStep;
            const range = current.sheet.states[state];
            const advance = walking ? 1 : 0.25;
            frameIndex += advance;
            if (frameIndex > range.to) {
              frameIndex = range.from + ((frameIndex - range.from) % (range.to - range.from + 1));
            }
          }

          return { ...current, state, frameIndex, x, phaseRemaining, frameAccumulator };
        });

        actorsRef.current = next;
        setActors(next);
      }

      schedule();
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
        return;
      }
      lastTick = performance.now();
      schedule();
    };

    document.addEventListener("visibilitychange", onVisibility);
    schedule();
    return () => {
      active = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [canvasSize.height, canvasSize.width, mounted, motionGated, visible]);

  if (!mounted || !visible) {
    return (
      <div
        ref={containerRef}
        className={`absolute inset-0 overflow-hidden ${className ?? ""}`}
        aria-hidden="true"
        style={{ pointerEvents: "none" }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 z-0 overflow-hidden ${className ?? ""}`}
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
    >
      {actors.map((actor) => {
        const displayWidth = actor.sheet.frameWidth * actor.scale;
        const displayHeight = actor.sheet.frameHeight * actor.scale;
        // Anchor each companion's feet to the bottom ground strip.
        const desiredBaseline = canvasSize.height - 10;
        const baseline = Math.min(
          canvasSize.height,
          Math.max(Math.min(displayHeight, canvasSize.height), desiredBaseline),
        );
        const top = Math.max(0, baseline - displayHeight);
        const stateRange = actor.sheet.states[actor.state];
        const displayedFrame = Math.min(stateRange.to, Math.max(stateRange.from, Math.floor(actor.frameIndex)));
        return (
          <div
            key={actor.companionId}
            className="pokeden-pixelated absolute"
            style={{
              left: actor.x,
              top,
              width: displayWidth,
              height: displayHeight,
              backgroundImage: `url(${actor.sheet.sheetUrl})`,
              backgroundSize: `${actor.sheet.frameCount * actor.sheet.frameWidth * actor.scale}px ${displayHeight}px`,
              backgroundPosition: `${-(displayedFrame * actor.sheet.frameWidth * actor.scale)}px 0`,
              backgroundRepeat: "no-repeat",
              transform: stateRange?.flip === true ? "scaleX(-1)" : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
