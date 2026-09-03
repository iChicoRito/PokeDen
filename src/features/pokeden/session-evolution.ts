// Session-temporary display evolution for the Pomodoro canvas (T-15).
// Pure and dependency-free: (remaining, total) -> phase, (companion, phase) -> species.
// Missing next-phase sheets stay in place; never mutates persisted evolutionStage.
import type { CompanionId } from "@/features/pokeden/companions";
import type { SpriteSpecies } from "@/features/pokeden/sprite-sheets";

// Phase-1 species for every obtainable companion. Must stay in sync with
// FIRST_EVOLUTION_BY_COMPANION in sprite-sheets.ts.
export const SESSION_BASE_SPECIES: Record<CompanionId, SpriteSpecies> = {
  blastoise: "squirtle",
  bulbasaur: "bulbasaur",
  charizard: "charmander",
  gengar: "gastly",
  snorlax: "munchlax",
  wigglypuff: "jigglypuff",
  pikachu: "pikachu",
};

// Phase-2/3 display species by companion. Entries whose sheet has not been
// exported yet (see public/assets/sprites/*/*.aseprite without a matching
// *-sheet.png) are intentionally absent: lookup falls back to the base species.
export const SESSION_EVOLUTION_SPECIES: Record<CompanionId, readonly SpriteSpecies[]> = {
  blastoise: ["squirtle", "wartortle"],
  bulbasaur: ["bulbasaur", "ivysaur"],
  charizard: ["charmander", "charmeleon", "charizard"],
  gengar: ["gastly", "haunter"],
  snorlax: ["munchlax"],
  wigglypuff: ["jigglypuff", "wigglytuff"],
  pikachu: ["pikachu", "raichu"],
};

export type SessionPhase = 0 | 1 | 2;

/** Remaining-fraction thresholds. 5-min session: phase 1 at <=180s (60%), phase 2 at <=90s (30%). */
export const PHASE_1_REMAINING_FRACTION = 0.6;
export const PHASE_2_REMAINING_FRACTION = 0.3;

export function getSessionPhase(remainingSeconds: number, totalSeconds: number): SessionPhase {
  if (!Number.isFinite(remainingSeconds) || !Number.isFinite(totalSeconds) || totalSeconds <= 0) return 0;
  const clamped = Math.max(0, Math.min(totalSeconds, remainingSeconds));
  const fraction = clamped / totalSeconds;
  if (fraction <= PHASE_2_REMAINING_FRACTION) return 2;
  if (fraction <= PHASE_1_REMAINING_FRACTION) return 1;
  return 0;
}

/**
 * Display species for a companion at a session phase.
 * `hasSheet` gates on SPRITE_SHEETS availability: missing next-phase sheet stays.
 */
export function getDisplaySpeciesForCompanion(
  companionId: CompanionId,
  phase: SessionPhase,
  hasSheet: (species: SpriteSpecies) => boolean,
): SpriteSpecies {
  const chain = SESSION_EVOLUTION_SPECIES[companionId] ?? [SESSION_BASE_SPECIES[companionId]];
  const wanted = chain[Math.min(phase, chain.length - 1)] ?? chain[0] ?? SESSION_BASE_SPECIES[companionId];
  if (wanted && hasSheet(wanted)) return wanted;
  const base = SESSION_BASE_SPECIES[companionId];
  return base;
}
