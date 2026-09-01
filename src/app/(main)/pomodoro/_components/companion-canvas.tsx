"use client";

import { useEffect, useRef, useState } from "react";

import { resolveCompanionId } from "@/features/pokeden/companions";
import { usePokeDenStore } from "@/features/pokeden/pokeden-provider";
import type { SpriteSheetEntry, SpriteSpecies, SpriteStateName } from "@/features/pokeden/sprite-sheets";
import { FIRST_EVOLUTION_BY_COMPANION, SPRITE_SHEETS } from "@/features/pokeden/sprite-sheets";

type Actor = {
  species: SpriteSpecies;
  sheet: SpriteSheetEntry;
  scale: number;
  state: SpriteStateName;
  frameIndex: number;
  x: number;
  speed: number;
};

const SCALE = 3;

export function CompanionCanvas({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const actorRef = useRef<Actor | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [actor, setActor] = useState<Actor | null>(null);
  const [mounted, setMounted] = useState(false);
  const selectedSpecies = usePokeDenStore((state) => {
    const selected = resolveCompanionId(state.data.companionPreferences.selected);
    return FIRST_EVOLUTION_BY_COMPANION[selected];
  });
  const visible = usePokeDenStore((state) => state.data.companionPreferences.visible);
  const movementEnabled = usePokeDenStore((state) => state.data.companionPreferences.movement);
  const reducedMotion = usePokeDenStore((state) => state.data.companionPreferences.reducedMotion);

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

  // Create only the selected companion, and keep it within the horizontal platform after resizes.
  useEffect(() => {
    if (!mounted || canvasSize.width <= 0 || canvasSize.height <= 0) return;

    const sheet = SPRITE_SHEETS[selectedSpecies];
    const displayWidth = sheet.frameWidth * SCALE;
    const maxX = Math.max(0, canvasSize.width - displayWidth);
    const current = actorRef.current;
    const isCurrentSpecies = current?.species === selectedSpecies;
    const state: SpriteStateName = motionGated ? "idle-right" : (current?.state ?? "idle-right");
    const range = sheet.states[state];
    const next: Actor = {
      species: selectedSpecies,
      sheet,
      scale: SCALE,
      state,
      frameIndex: motionGated || !isCurrentSpecies ? range.from : (current?.frameIndex ?? range.from),
      x: motionGated || !isCurrentSpecies ? maxX * 0.82 : Math.min(maxX, Math.max(0, current?.x ?? maxX * 0.82)),
      speed: isCurrentSpecies ? current.speed : (24 + Math.random() * 16) * (SCALE / 2),
    };

    actorRef.current = next;
    setActor(next);
  }, [canvasSize.height, canvasSize.width, mounted, motionGated, selectedSpecies]);

  // One loop owns behavior phases, horizontal movement, and sprite frame advancement.
  useEffect(() => {
    if (!mounted || !visible || motionGated || canvasSize.width <= 0 || canvasSize.height <= 0) return;

    let active = true;
    let raf = 0;
    let lastTick = performance.now();
    let phaseRemaining = 2 + Math.random() * 4;
    let frameAccumulator = 0;

    const schedule = () => {
      if (active && raf === 0 && !document.hidden) {
        raf = requestAnimationFrame(tick);
      }
    };

    const tick = (now: number) => {
      raf = 0;
      const delta = Math.min(0.1, Math.max(0, (now - lastTick) / 1000));
      lastTick = now;
      const current = actorRef.current;

      // biome-ignore lint/suspicious/noUnnecessaryConditions: a separate setup effect populates the mutable actor ref.
      if (current) {
        let state = current.state;
        let frameIndex = current.frameIndex;
        let x = current.x;
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

        const next = { ...current, state, frameIndex, x };
        actorRef.current = next;
        setActor(next);
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

  const displayWidth = actor ? actor.sheet.frameWidth * actor.scale : 0;
  const displayHeight = actor ? actor.sheet.frameHeight * actor.scale : 0;
  // Anchor the companion's feet to the bottom ground strip.
  const desiredBaseline = canvasSize.height - 10;
  const baseline = Math.min(canvasSize.height, Math.max(Math.min(displayHeight, canvasSize.height), desiredBaseline));
  const top = Math.max(0, baseline - displayHeight);
  const stateRange = actor?.sheet.states[actor.state];
  const displayedFrame =
    actor && stateRange ? Math.min(stateRange.to, Math.max(stateRange.from, Math.floor(actor.frameIndex))) : 0;

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 z-0 overflow-hidden ${className ?? ""}`}
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
    >
      {actor ? (
        <div
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
      ) : null}
    </div>
  );
}
