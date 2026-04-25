export const SHAPES = ['square', 'circle', 'triangle', 'hexagon'];
export const COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#EAB308', '#A855F7', '#F97316'];

// Relationships grouped by category (used for hierarchical N-back)
export const RELATIONSHIP_CATEGORIES = {
  SPATIAL: ['INSIDE', 'OVERLAPPING', 'TOUCHING', 'ABOVE_BELOW', 'DIAGONAL', 'BETWEEN', 'SURROUNDED'],
  TRAIT:   ['HOLLOW_VS_SOLID', 'ONE_SHARED_TRAIT', 'ROTATED', 'CONNECTED'],
  QUANT:   ['SIZE_MISMATCH', 'ONE_TO_MANY', 'EQUAL_COUNT', 'TWO_TO_ONE', 'PYRAMID'],
};

export const RELATIONSHIPS = [
  ...RELATIONSHIP_CATEGORIES.SPATIAL,
  ...RELATIONSHIP_CATEGORIES.TRAIT,
  ...RELATIONSHIP_CATEGORIES.QUANT,
];

// Returns the category string for a given relationship
export function getCategory(relationship) {
  for (const [cat, members] of Object.entries(RELATIONSHIP_CATEGORIES)) {
    if (members.includes(relationship)) return cat;
  }
  return null;
}

export const MATCH_CHANCE = 0.3;       // probability of a match on stream A
export const DUAL_MATCH_CHANCE = 0.25; // probability of a match on stream B (dual mode)
export const HIER_MATCH_CHANCE = 0.25; // probability of a category-level match
export const DISTRACTOR_CHANCE = 0.15; // probability of a near-match distractor
export const TOTAL_ROUNDS = 20;
export const STIMULUS_DURATION = 2500;
export const WIPE_DURATION = 500;
export const FEEDBACK_DURATION = 400;

// Adaptive N-level thresholds
export const ADAPT_UP_THRESHOLD = 80;   // accuracy % to increase N
export const ADAPT_DOWN_THRESHOLD = 50; // accuracy % to decrease N
export const N_MIN = 1;
export const N_MAX = 5;

export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickRandomExcluding(arr, ...excludes) {
  const filtered = arr.filter(item => !excludes.includes(item));
  if (filtered.length === 0) return arr[Math.floor(Math.random() * arr.length)];
  return filtered[Math.floor(Math.random() * filtered.length)];
}

export function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}