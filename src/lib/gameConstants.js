export const SHAPES = ['square', 'circle', 'triangle', 'hexagon'];
export const COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#EAB308', '#A855F7', '#F97316'];

export const RELATIONSHIPS = [
  'INSIDE',
  'OVERLAPPING',
  'TOUCHING',
  'SIZE_MISMATCH',
  'HOLLOW_VS_SOLID',
  'ONE_SHARED_TRAIT',
  'ONE_TO_MANY',
];

export const MATCH_CHANCE = 0.3;
export const TOTAL_ROUNDS = 20;
export const STIMULUS_DURATION = 2500;
export const WIPE_DURATION = 500;
export const FEEDBACK_DURATION = 400;

export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickRandomExcluding(arr, exclude) {
  const filtered = arr.filter(item => item !== exclude);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

export function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}