// Single source of truth for the study-companion catalog (T-07).
// Consumed by the onboarding companion step and the Settings companion card.
export type CompanionId = "bulbasaur" | "charizard" | "blastoise";

export type CompanionEntry = {
  id: CompanionId;
  name: string;
  description: string;
  tagline: string;
  personality: "calm" | "cheerful" | "focused";
  /** Public URL of the profile PNG (1000×1000, artwork derived from public/assets/background/pokemon-profiles.aseprite). */
  image: string;
};

export const COMPANIONS: readonly CompanionEntry[] = [
  {
    id: "bulbasaur",
    name: "Bulbasaur",
    description: "Calm and encouraging",
    tagline: "Softly green, steady as a leaf.",
    personality: "calm",
    image: "/assets/profiles/bulbasaur-profile.png",
  },
  {
    id: "charizard",
    name: "Charmander",
    description: "Cheerful and energetic",
    tagline: "Warm, bright, and ready to go.",
    personality: "cheerful",
    image: "/assets/profiles/charizard-profile.png",
  },
  {
    id: "blastoise",
    name: "Squirtle",
    description: "Focused and thoughtful",
    tagline: "Quiet water, deep focus.",
    personality: "focused",
    image: "/assets/profiles/blastoise-profile.png",
  },
];

export const DEFAULT_COMPANION: CompanionId = "bulbasaur";

// Legacy abstract companions used before T-07; map them so stored
// selections keep working (sprout→bulbasaur, ember→charizard, ripple→blastoise).
const LEGACY_COMPANION_IDS: Record<string, CompanionId> = {
  sprout: "bulbasaur",
  ember: "charizard",
  ripple: "blastoise",
};

/** Resolve any persisted value (including legacy IDs) to a valid CompanionId. */
export function resolveCompanionId(value: string | null | undefined): CompanionId {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return DEFAULT_COMPANION;
  const legacy = LEGACY_COMPANION_IDS[normalized];
  if (legacy) return legacy;
  return COMPANIONS.some((item) => item.id === normalized) ? (normalized as CompanionId) : DEFAULT_COMPANION;
}
