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
  laneMin: number; // left edge of this sprite's personal-space lane (canvas px)
  laneMax: number; // right edge of this sprite's personal-space lane (canvas px)
  speed: number;
  phaseRemaining: number;
  frameAccumulator: number;
  lift: number; // px above the ground baseline; 0 = resting on the ground
  falling: boolean;
  fallVelocity: number; // px/s, positive = moving down, negative = bounce rebound
  airborneXVelocity: number; // px/s horizontal velocity while airborne (throw momentum)
  dragging: boolean;
  dragPointerId: number | null;
  dragOffsetX: number; // pointer→sprite-left offset at grab, canvas px
  dragOffsetY: number; // pointer→sprite-top offset at grab, canvas px
  // Throw physics: short pointer-position history (newest last) sampled in endSpriteDrag.
  pointerHistory: Array<{ x: number; y: number; t: number }>;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const GRAVITY_SCALE = 2.2; // gravity = 2.2 × canvas height, px/s² — same feel in the card and full-viewport focus
const MAX_FALL_SPEED = 1200; // px/s terminal velocity; with the 0.1s delta clamp, max travel is 120px/frame → no tunneling
const BOUNCE_RESTITUTION = 0.3; // rebound keeps 30% of impact speed
const BOUNCE_SETTLE_SPEED = 150; // px/s; impacts slower than this settle instead of bouncing
const GROUND_SETTLE_PX = 12; // release with feet within this distance of the ground settles instantly
const THROW_VELOCITY_SCALE = 1.15; // pointer px/s → released momentum px/s, slight exaggeration for game feel
const MAX_THROW_SPEED = 1600; // px/s cap per axis so flings stay inside the card
const THROW_SAMPLE_MS = 90; // velocity window: average pointer travel over the last 90ms
const THROW_MIN_SPEED = 120; // px/s; slower releases count as plain drops, not throws
const IDLE_PHASE_MIN = 0.4; // s; idle pauses are 0.4-1.0s so any pause stays <= ~1s
const IDLE_PHASE_RANGE = 0.6; // s; idle duration = IDLE_PHASE_MIN + random * IDLE_PHASE_RANGE
const WALK_PHASE_MIN = 1.6; // s; walking bursts are 1.6-4.0s — long enough to pace the lane, short enough to feel alive
const WALK_PHASE_RANGE = 2.4; // s; walk duration = WALK_PHASE_MIN + random * WALK_PHASE_RANGE
const AMBIENT_JUMP_CHANCE = 0.3; // probability of a hop when entering idle (ungated ambient jumps only)
const EDGE_PAD_X = 4; // px; sprites rest this far inside the card edges, clear of the border/radius

// Horizontal roam bounds inside the card: [minX, boundedMaxX]. Collapses to a
// single pin point when the canvas is narrower than the sprite + padding.
function xBounds(maxX: number): { minX: number; boundedMaxX: number } {
  const minX = Math.min(EDGE_PAD_X, maxX);
  return { minX, boundedMaxX: Math.max(minX, maxX - EDGE_PAD_X) };
}

// Feet rest on the ground line: pomodoro-screen draws the line at bottom-10
// (40px above the container bottom) atop the h-10 ground strip, so the feet
// baseline sits at containerHeight - 40 — not sunk into the strip.
function computeBaseline(containerHeight: number, displayHeight: number): number {
  const desiredBaseline = containerHeight - 40;
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
  // Narrow canvases (mobile) render sprites at a moderately reduced integer scale;
  // desktop keeps the large sprites. Integer scales keep the pixel art crisp.
  // Scale also shrinks as the roster grows so N sprites share the card without
  // piling: 11 × 112px ≈ 1232px still fits a 1216px card with touching slots,
  // while 11 × 140px ≈ 1540px cannot — hence scale 3 once 7+ are unlocked.
  const scale =
    canvasSize.width > 0 && canvasSize.width < 640 ? 3 : unlockedIds.length > 6 ? 3 : unlockedIds.length > 4 ? 4 : 5;

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
      const { minX, boundedMaxX } = xBounds(maxX);
      // Deterministic slot centers spread actors evenly; the slot's own lane
      // half-width reserves personal space so a fresh spawn never overlaps a neighbor.
      // Lanes are clamped to the padded roam band and collapse to a pin point when
      // the canvas is too narrow to give every sprite its own segment.
      const slotCenter = ((i + 0.5) / count) * canvasSize.width;
      // Lane half-width: leave a 4px gap between neighboring lanes so sprites at
      // adjacent edges never touch; reserve sprite half-width so the whole body
      // fits inside its own lane even at rest.
      const laneHalf = Math.max(0, canvasSize.width / count / 2 - 4 - displayWidth / 2);
      const laneMin = clamp(slotCenter - laneHalf, minX, boundedMaxX);
      const laneMax = clamp(slotCenter + laneHalf, minX, boundedMaxX);
      const slotX = clamp(slotCenter - displayWidth / 2, Math.min(laneMin, laneMax), Math.max(laneMin, laneMax));
      const old = prev.find((actor) => actor.companionId === id);
      const speciesChanged = old !== undefined && old.species !== species;
      // Alternate initial facing so sprites disperse instead of marching right in lockstep
      // (previously every actor spawned idle-right and walked right together, piling at one edge).
      const state: SpriteStateName = motionGated
        ? "idle-right"
        : (old?.state ?? (i % 2 === 0 ? "idle-right" : "idle-left"));
      const range = sheet.states[state];
      return {
        companionId: id,
        species,
        sheet,
        scale,
        state,
        frameIndex: motionGated || !old || speciesChanged ? range.from : old.frameIndex,
        x: old ? clamp(old.x, minX, boundedMaxX) : slotX,
        // Slot lane reserves personal space: walking clamps to [laneMin, laneMax]
        // so roamers pace inside their own segment instead of drifting into a neighbor.
        laneMin,
        laneMax,
        // Stagger roam speed per sprite (8–20× scale/2 px/s) so neighbors drift
        // apart instead of keeping formation and stacking on the same slot.
        speed: old?.speed ?? (8 + ((i * 7) % 13)) * (scale / 2),
        phaseRemaining: old?.phaseRemaining ?? IDLE_PHASE_MIN + ((i * 1.3) % IDLE_PHASE_RANGE),
        frameAccumulator: old?.frameAccumulator ?? 0,
        // Motion gate flips ground the sprite; drag state carries unconditionally so dragging
        // keeps working while gated (next pointermove re-derives from the pointer).
        lift: old && !motionGated ? clamp(old.lift, 0, liftMax) : 0,
        falling: old ? old.falling && !motionGated : false,
        fallVelocity: old && !motionGated ? old.fallVelocity : 0,
        airborneXVelocity: old && !motionGated ? old.airborneXVelocity : 0,
        dragging: old?.dragging ?? false,
        dragPointerId: old?.dragPointerId ?? null,
        dragOffsetX: old?.dragOffsetX ?? 0,
        dragOffsetY: old?.dragOffsetY ?? 0,
        pointerHistory: old?.pointerHistory ?? [],
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
      airborneXVelocity: 0,
      lift: 0,
      pointerHistory: [],
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
      airborneXVelocity: 0,
      pointerHistory: [{ x: point.x, y: point.y, t: event.timeStamp }],
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
    // Face the drag direction: a 3px horizontal deadzone stops idle-frame flicker from jitter.
    const deltaX = point.x - actor.dragOffsetX - actor.x;
    const facing = deltaX > 3 ? "right" : deltaX < -3 ? "left" : actor.state.endsWith("left") ? "left" : "right";
    const state: SpriteStateName = `idle-${facing}`;
    // Clamps: left ∈ [minX, boundedMaxX]; lift ∈ [0, liftMax] ⟺ sprite top ≥ 0 and feet baseline ∈
    // [displayHeight, baseline] — the feet never sink below the ground line nor rise past the top.
    const { minX, boundedMaxX } = xBounds(maxX);
    updateActor(companionId, {
      x: clamp(point.x - actor.dragOffsetX, minX, boundedMaxX),
      lift: clamp(baseline - displayHeight - (point.y - actor.dragOffsetY), 0, liftMax),
      state,
      frameIndex: actor.state === state ? actor.frameIndex : actor.sheet.states[state].from,
      pointerHistory: [
        ...actor.pointerHistory.filter((sample) => event.timeStamp - sample.t <= THROW_SAMPLE_MS),
        { x: point.x, y: point.y, t: event.timeStamp },
      ],
    });
  };

  // Shared by onPointerUp / onPointerCancel / onLostPointerCapture; idempotent after the first call.
  const endSpriteDrag = (event: ReactPointerEvent<HTMLDivElement>, companionId: CompanionId) => {
    const actor = findActor(companionId);
    if (!actor?.dragging || actor.dragPointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    // Throw velocity: average pointer travel over the recent sample window, so a fling
    // carries momentum while a slow grab-and-drop releases in place. Pointer coords are
    // canvas-space (toCanvasPoint in handleSpritePointerMove), so +y is downward.
    let throwX = 0;
    let throwY = 0;
    const recent = actor.pointerHistory.filter((sample) => event.timeStamp - sample.t <= THROW_SAMPLE_MS);
    const first = recent[0];
    const last = recent[recent.length - 1];
    if (first && last && last.t > first.t) {
      const span = (last.t - first.t) / 1000;
      throwX = ((last.x - first.x) / span) * THROW_VELOCITY_SCALE;
      throwY = ((last.y - first.y) / span) * THROW_VELOCITY_SCALE;
      const speed = Math.hypot(throwX, throwY);
      if (speed > MAX_THROW_SPEED) {
        throwX *= MAX_THROW_SPEED / speed;
        throwY *= MAX_THROW_SPEED / speed;
      }
    }

    const groundLevel = actor.lift <= GROUND_SETTLE_PX;
    const thrown = Math.hypot(throwX, throwY) >= THROW_MIN_SPEED;
    // Throws animate even under the motion gate: the fall is direct feedback to the
    // user's own fling, not ambient motion. Plain drops still snap when gated.
    const settle = !thrown && (motionGated || groundLevel);
    // A ground-level horizontal fling pops up slightly; otherwise it would land on the
    // first tick and the momentum would never carry.
    const thrownLift = groundLevel ? Math.max(actor.lift, 16) : actor.lift;
    updateActor(companionId, {
      dragging: false,
      dragPointerId: null,
      falling: !settle,
      // Sign convention: positive = downward, negative = upward arc. An upward fling
      // rises before gravity pulls it back down.
      fallVelocity: settle ? 0 : throwY,
      airborneXVelocity: settle ? 0 : throwX,
      lift: settle ? 0 : thrownLift,
      pointerHistory: [],
    });
  };

  // One loop owns behavior phases, horizontal movement, sprite frame advancement, and
  // airborne physics (falls and throws) for all actors. Walk/idle behavior stays
  // motion-gated, but the loop itself must run while gated so thrown sprites still fall.
  useEffect(() => {
    if (!mounted || !visible || canvasSize.width <= 0 || canvasSize.height <= 0) return;

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
            const displayWidth = current.sheet.frameWidth * current.scale;
            const maxX = Math.max(0, canvasSize.width - displayWidth);
            const displayHeight = current.sheet.frameHeight * current.scale;
            const liftMax = Math.max(0, computeBaseline(canvasSize.height, displayHeight) - displayHeight);

            // Horizontal throw momentum with wall bounces (restitution, no friction mid-air).
            const { minX, boundedMaxX } = xBounds(maxX);
            let x = clamp(current.x + current.airborneXVelocity * delta, minX, boundedMaxX);
            let airborneXVelocity = current.airborneXVelocity;
            if (x <= minX) {
              x = minX;
              airborneXVelocity = Math.abs(airborneXVelocity) * BOUNCE_RESTITUTION;
            } else if (x >= boundedMaxX) {
              x = boundedMaxX;
              airborneXVelocity = -Math.abs(airborneXVelocity) * BOUNCE_RESTITUTION;
            }

            // Vertical motion; the ceiling clamps the arc (head bonk stops upward travel).
            const lift = clamp(current.lift - fallVelocity * delta, 0, liftMax);
            const ceilingHit = current.lift >= liftMax && fallVelocity < 0;

            if (ceilingHit) {
              return { ...current, lift: liftMax, fallVelocity: 0, x, airborneXVelocity };
            }
            if (lift > 0) {
              return { ...current, lift, fallVelocity, x, airborneXVelocity }; // airborne; frame held
            }
            if (fallVelocity > BOUNCE_SETTLE_SPEED) {
              // Ground bounce: restitution on both axes, friction damps horizontal momentum.
              return {
                ...current,
                lift: 0,
                fallVelocity: -fallVelocity * BOUNCE_RESTITUTION,
                airborneXVelocity: airborneXVelocity * BOUNCE_RESTITUTION,
                x,
              };
            }
            // Land: resume idle facing the last direction with a short pause (<= ~1s).
            // Settle inside the sprite's own lane so a wall bounce never parks on a neighbor.
            const facing = current.state.endsWith("left") ? "left" : "right";
            const state: SpriteStateName = `idle-${facing}`;
            const laneLo = Math.min(current.laneMin, current.laneMax);
            const laneHi = Math.max(current.laneMin, current.laneMax);
            return {
              ...current,
              lift: 0,
              fallVelocity: 0,
              falling: false,
              airborneXVelocity: 0,
              x: clamp(x, laneLo, laneHi),
              state,
              frameIndex: current.sheet.states[state].from,
              frameAccumulator: 0,
              phaseRemaining: IDLE_PHASE_MIN + Math.random() * IDLE_PHASE_RANGE,
            };
          }

          if (motionGated) {
            return current; // gated: ambient walk/idle frozen; only throws (handled above) animate
          }

          let state = current.state;
          let frameIndex = current.frameIndex;
          let x = current.x;
          let phaseRemaining = current.phaseRemaining;
          let frameAccumulator = current.frameAccumulator;
          phaseRemaining -= delta;

          if (phaseRemaining <= 0) {
            const facing = state.endsWith("left") ? "left" : "right";
            const enteringIdle = state.startsWith("walking");
            state = enteringIdle ? `idle-${facing}` : `walking-${facing}`;
            frameIndex = current.sheet.states[state].from;
            frameAccumulator = 0;
            phaseRemaining = enteringIdle
              ? IDLE_PHASE_MIN + Math.random() * IDLE_PHASE_RANGE
              : WALK_PHASE_MIN + Math.random() * WALK_PHASE_RANGE;
            // Ambient jump: grounded forward hop reusing the airborne (falling) path.
            // Unreachable when motionGated (early return above), grounded only
            // (lift === 0, !falling, !dragging via the held early return), facing
            // direction only (no backward drift into a neighbor). Skipped when
            // liftMax === 0 (short canvas, no vertical room).
            if (enteringIdle && current.lift === 0 && !current.falling) {
              const jumpDisplayHeight = current.sheet.frameHeight * current.scale;
              const jumpLiftMax = Math.max(
                0,
                computeBaseline(canvasSize.height, jumpDisplayHeight) - jumpDisplayHeight,
              );
              if (jumpLiftMax > 0 && Math.random() < AMBIENT_JUMP_CHANCE) {
                const gravity = GRAVITY_SCALE * canvasSize.height;
                const jumpCap = Math.min(96 * (current.scale / 5), 0.35 * jumpLiftMax);
                if (jumpCap > 0) {
                  const jumpHeight = jumpCap * (0.5 + Math.random() * 0.5);
                  const hopDirection = facing === "left" ? -1 : 1;
                  return {
                    ...current,
                    state,
                    frameIndex,
                    x,
                    phaseRemaining,
                    frameAccumulator,
                    lift: 0,
                    falling: true,
                    fallVelocity: -Math.sqrt(2 * gravity * jumpHeight),
                    airborneXVelocity: hopDirection * (10 + Math.random() * 30),
                  };
                }
              }
            }
          }

          const walking = state.startsWith("walking");
          if (walking) {
            // Pace inside the sprite's own lane; turn at the lane edges so roamers
            // never drift across the card into a neighbor and stack.
            const laneLo = Math.min(current.laneMin, current.laneMax);
            const laneHi = Math.max(current.laneMin, current.laneMax);
            if (laneHi > laneLo) {
              const movingLeft = state === "walking-left";
              x = clamp(x + (movingLeft ? -1 : 1) * current.speed * delta, laneLo, laneHi);
              if (x <= laneLo) {
                x = laneLo;
                state = "walking-right";
              } else if (x >= laneHi) {
                x = laneHi;
                state = "walking-left";
              }
            } else {
              x = laneLo;
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
        // The companion the user picked stays on top when sprites overlap; dragged or
        // falling sprites lift above them temporarily.
        const isSelected = actor.companionId === selected;
        return (
          <div
            key={actor.companionId}
            // Spawn fades in grounded (lift: 0, falling: false at build) — no drop-from-above on load/refresh.
            // transition-none is REQUIRED: the fade utilities set transition: all 0.5s, which would interpolate
            // background-position between frames and render the sprite sliced across two frames mid-walk.
            className={`pokeden-pixelated fade-in absolute animate-in touch-none select-none transition-none duration-500 motion-reduce:animate-none ${actor.dragging ? "cursor-grabbing" : "cursor-grab"}`}
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
              zIndex: actor.dragging || actor.falling ? 6 : isSelected ? 5 : undefined, // selected stays on top; active sprite above all, below CardContent z-10
            }}
          />
        );
      })}
    </div>
  );
}
