"use client";

import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";

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
  lift: number; // px above the ground baseline; 0 = resting on the ground
  falling: boolean;
  fallVelocity: number; // px/s, positive = moving down, negative = bounce rebound
  dragging: boolean;
  dragPointerId: number | null;
  dragOffsetX: number; // pointer→sprite-left offset at grab, canvas px
  dragOffsetY: number; // pointer→sprite-top offset at grab, canvas px
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const GRAVITY_SCALE = 2.2; // gravity = 2.2 × canvas height, px/s² — same feel in the card and full-viewport focus
const MAX_FALL_SPEED = 1200; // px/s terminal velocity; with the 0.1s delta clamp, max travel is 120px/frame → no tunneling
const BOUNCE_RESTITUTION = 0.3; // rebound keeps 30% of impact speed
const BOUNCE_SETTLE_SPEED = 150; // px/s; impacts slower than this settle instead of bouncing
const GROUND_SETTLE_PX = 12; // release with feet within this distance of the ground settles instantly

function computeBaseline(containerHeight: number, displayHeight: number): number {
  const desiredBaseline = containerHeight - 10;
  return Math.min(containerHeight, Math.max(Math.min(displayHeight, containerHeight), desiredBaseline));
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
      const displayHeight = sheet.frameHeight * scale;
      const maxX = Math.max(0, canvasSize.width - displayWidth);
      const liftMax = Math.max(0, computeBaseline(canvasSize.height, displayHeight) - displayHeight);
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
        // Motion gate flips ground the sprite; drag state carries unconditionally so dragging
        // keeps working while gated (next pointermove re-derives from the pointer).
        lift: old && !motionGated ? clamp(old.lift, 0, liftMax) : 0,
        falling: old ? old.falling && !motionGated : false,
        fallVelocity: old && !motionGated ? old.fallVelocity : 0,
        dragging: old?.dragging ?? false,
        dragPointerId: old?.dragPointerId ?? null,
        dragOffsetX: old?.dragOffsetX ?? 0,
        dragOffsetY: old?.dragOffsetY ?? 0,
      };
    });

    actorsRef.current = next;
    setActors(next);
  }, [actorIds, canvasSize.height, canvasSize.width, mounted, motionGated, phase, scale]);

  // Single mutation path for pointer events: ref write + setState, so a re-render
  // happens even when the rAF loop is not running (motionGated).
  const updateActor = (companionId: CompanionId, patch: Partial<Actor>) => {
    const next = actorsRef.current.map((actor) => (actor.companionId === companionId ? { ...actor, ...patch } : actor));
    actorsRef.current = next;
    setActors(next);
  };

  // If the canvas hides mid-drag, release drags so no sprite respawns frozen as "grabbed".
  useEffect(() => {
    if (visible || actorsRef.current.length === 0) return;
    actorsRef.current = actorsRef.current.map((actor) => ({
      ...actor,
      dragging: false,
      dragPointerId: null,
      falling: false,
      fallVelocity: 0,
      lift: 0,
    }));
    setActors(actorsRef.current);
  }, [visible]);

  const findActor = (companionId: CompanionId) => actorsRef.current.find((actor) => actor.companionId === companionId);

  // Rect is re-read on every event — survives scroll, resize, and normal↔focus relayout mid-drag.
  const toCanvasPoint = (event: ReactPointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    return rect ? { x: event.clientX - rect.left, y: event.clientY - rect.top } : null;
  };

  const handleSpritePointerDown = (event: ReactPointerEvent<HTMLDivElement>, companionId: CompanionId) => {
    if (event.button !== 0) return;
    const actor = findActor(companionId);
    if (!actor || (actor.dragging && actor.dragPointerId !== event.pointerId)) return;
    const point = toCanvasPoint(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const displayHeight = actor.sheet.frameHeight * actor.scale;
    const baseline = computeBaseline(canvasSize.height, displayHeight);
    updateActor(companionId, {
      dragging: true,
      dragPointerId: event.pointerId,
      dragOffsetX: point.x - actor.x,
      dragOffsetY: point.y - Math.max(0, baseline - displayHeight - actor.lift),
      falling: false, // catching a falling sprite mid-air freezes it in the hand
      fallVelocity: 0,
    });
  };

  const handleSpritePointerMove = (event: ReactPointerEvent<HTMLDivElement>, companionId: CompanionId) => {
    const actor = findActor(companionId);
    if (!actor?.dragging || actor.dragPointerId !== event.pointerId) return;
    const point = toCanvasPoint(event);
    if (!point) return;
    const displayWidth = actor.sheet.frameWidth * actor.scale;
    const displayHeight = actor.sheet.frameHeight * actor.scale;
    const maxX = Math.max(0, canvasSize.width - displayWidth);
    const baseline = computeBaseline(canvasSize.height, displayHeight);
    const liftMax = Math.max(0, baseline - displayHeight);
    // Clamps: left ∈ [0, maxX]; lift ∈ [0, liftMax] ⟺ sprite top ≥ 0 and feet baseline ∈
    // [displayHeight, baseline] — the feet never sink below the ground strip nor rise past the top.
    updateActor(companionId, {
      x: clamp(point.x - actor.dragOffsetX, 0, maxX),
      lift: clamp(baseline - displayHeight - (point.y - actor.dragOffsetY), 0, liftMax),
    });
  };

  // Shared by onPointerUp / onPointerCancel / onLostPointerCapture; idempotent after the first call.
  const endSpriteDrag = (event: ReactPointerEvent<HTMLDivElement>, companionId: CompanionId) => {
    const actor = findActor(companionId);
    if (!actor?.dragging || actor.dragPointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const settle = motionGated || actor.lift <= GROUND_SETTLE_PX;
    updateActor(companionId, {
      dragging: false,
      dragPointerId: null,
      falling: !settle,
      fallVelocity: 0,
      lift: settle ? 0 : actor.lift,
    });
  };

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
          if (current.dragging) {
            return current; // held: pointer handlers own it; no phase timer, walking, or frame advance
          }

          if (current.falling) {
            const gravity = GRAVITY_SCALE * canvasSize.height; // canvasSize.height is already an effect dep
            const fallVelocity = Math.min(MAX_FALL_SPEED, current.fallVelocity + gravity * delta);
            const lift = current.lift - fallVelocity * delta;
            if (lift > 0) {
              return { ...current, lift, fallVelocity }; // airborne; frame and x held
            }
            if (fallVelocity > BOUNCE_SETTLE_SPEED) {
              return { ...current, lift: 0, fallVelocity: -fallVelocity * BOUNCE_RESTITUTION }; // bounce upward
            }
            // land: resume idle facing the last direction
            const facing = current.state.endsWith("left") ? "left" : "right";
            const state: SpriteStateName = `idle-${facing}`;
            return {
              ...current,
              lift: 0,
              fallVelocity: 0,
              falling: false,
              state,
              frameIndex: current.sheet.states[state].from,
              frameAccumulator: 0,
              phaseRemaining: 2 + Math.random() * 4,
            };
          }

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
        // Anchor each companion's feet to the ground strip, lifted by actor.lift while airborne/held.
        const baseline = computeBaseline(canvasSize.height, displayHeight);
        const top = Math.max(0, baseline - displayHeight - actor.lift);
        const stateRange = actor.sheet.states[actor.state];
        const displayedFrame = Math.min(stateRange.to, Math.max(stateRange.from, Math.floor(actor.frameIndex)));
        return (
          <div
            key={actor.companionId}
            className={`pokeden-pixelated absolute touch-none select-none ${actor.dragging ? "cursor-grabbing" : "cursor-grab"}`}
            onPointerDown={(event) => handleSpritePointerDown(event, actor.companionId)}
            onPointerMove={(event) => handleSpritePointerMove(event, actor.companionId)}
            onPointerUp={(event) => endSpriteDrag(event, actor.companionId)}
            onPointerCancel={(event) => endSpriteDrag(event, actor.companionId)}
            onLostPointerCapture={(event) => endSpriteDrag(event, actor.companionId)}
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
              pointerEvents: "auto", // opt-in escape from the container's pointerEvents: "none"
              zIndex: actor.dragging || actor.falling ? 5 : undefined, // above siblings, below CardContent z-10
            }}
          />
        );
      })}
    </div>
  );
}
