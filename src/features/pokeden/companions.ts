// Single source of truth for the study-companion catalog (T-07).
// Consumed by the onboarding companion step and the Settings companion card.
export type CompanionId =
  | "bulbasaur"
  | "charizard"
  | "blastoise"
  | "gengar"
  | "snorlax"
  | "wigglypuff"
  | "pikachu"
  | "totodile"
  | "cubone"
  | "dragonite"
  | "mewtwo";

export type CompanionEntry = {
  id: CompanionId;
  name: string;
  description: string;
  tagline: string;
  personality: "calm" | "cheerful" | "focused";
  /** Public URL of the portrait asset used in companion cards and the focus dock. */
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

export type CompanionEvolution = {
  name: string;
  companionLevel: number;
  studyLevel: number;
};

export type CompanionCatalogEntry = CompanionEntry & {
  unlockStudyLevel: number;
  evolutions?: readonly CompanionEvolution[];
};

export const COMPANION_CATALOG: readonly CompanionCatalogEntry[] = [
  {
    ...COMPANIONS[0],
    unlockStudyLevel: 1,
    evolutions: [
      { name: "Ivysaur", companionLevel: 3, studyLevel: 3 },
      { name: "Venusaur", companionLevel: 6, studyLevel: 6 },
    ],
  },
  {
    ...COMPANIONS[1],
    unlockStudyLevel: 1,
    evolutions: [
      { name: "Charmeleon", companionLevel: 3, studyLevel: 3 },
      { name: "Charizard", companionLevel: 6, studyLevel: 6 },
    ],
  },
  {
    ...COMPANIONS[2],
    unlockStudyLevel: 1,
    evolutions: [
      { name: "Wartortle", companionLevel: 3, studyLevel: 3 },
      { name: "Blastoise", companionLevel: 6, studyLevel: 6 },
    ],
  },
  {
    id: "gengar",
    name: "Gastly",
    description: "Mysterious and playful",
    tagline: "A little spooky, a lot of fun.",
    personality: "cheerful",
    image: "/assets/profiles/gengar-profile.png",
    unlockStudyLevel: 2,
    evolutions: [{ name: "Haunter", companionLevel: 5, studyLevel: 5 }],
  },
  {
    id: "pikachu",
    name: "Pikachu",
    description: "Bright and loyal",
    tagline: "A spark that keeps you going.",
    personality: "cheerful",
    image: "/assets/profiles/pickachu-profile.png",
    unlockStudyLevel: 2,
    evolutions: [{ name: "Raichu", companionLevel: 5, studyLevel: 5 }],
  },
  {
    id: "snorlax",
    name: "Munchlax",
    description: "Relaxed and dependable",
    tagline: "Take a breath, then keep going.",
    personality: "calm",
    image: "/assets/profiles/snorlax-profile.png",
    unlockStudyLevel: 3,
    evolutions: [{ name: "Snorlax", companionLevel: 6, studyLevel: 6 }],
  },
  {
    id: "wigglypuff",
    name: "Jigglypuff",
    description: "Gentle and expressive",
    tagline: "A soft song for every study session.",
    personality: "cheerful",
    image: "/assets/profiles/wigglypuff-profile.png",
    unlockStudyLevel: 4,
  },
  {
    id: "totodile",
    name: "Totodile",
    description: "Playful and bold",
    tagline: "Small jaws, big energy.",
    personality: "cheerful",
    image: "/assets/profiles/totodile-profile.png",
    unlockStudyLevel: 2,
    evolutions: [
      { name: "Croconaw", companionLevel: 3, studyLevel: 3 },
      { name: "Feraligatr", companionLevel: 6, studyLevel: 6 },
    ],
  },
  {
    id: "cubone",
    name: "Cubone",
    description: "Quiet and resilient",
    tagline: "A steady heart beneath the mask.",
    personality: "calm",
    image: "/assets/profiles/cubone-profile.png",
    unlockStudyLevel: 3,
    evolutions: [{ name: "Marowak", companionLevel: 5, studyLevel: 5 }],
  },
  {
    id: "dragonite",
    name: "Dragonite",
    description: "Warm and soaring",
    tagline: "Drifts above the to-do list.",
    personality: "cheerful",
    image: "/assets/profiles/dragonite-profile.png",
    unlockStudyLevel: 5,
  },
  {
    id: "mewtwo",
    name: "Mewtwo",
    description: "Focused and uncommonly calm",
    tagline: "A mind sharpened by deep work.",
    personality: "focused",
    image: "/assets/profiles/mewtwo-profile.png",
    unlockStudyLevel: 6,
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
  return COMPANION_CATALOG.some((item) => item.id === normalized) ? (normalized as CompanionId) : DEFAULT_COMPANION;
}
