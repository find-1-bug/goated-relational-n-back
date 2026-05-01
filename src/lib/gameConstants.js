export const SHAPES = [
  'square', 'circle', 'triangle', 'hexagon',
  'pentagon', 'star', 'diamond', 'cross',
  'arrow', 'heart', 'crescent', 'parallelogram',
];

export const COLORS = [
  '#EF4444', '#3B82F6', '#22C55E', '#EAB308',
  '#A855F7', '#F97316', '#EC4899', '#14B8A6',
  '#F43F5E', '#6366F1', '#84CC16', '#FB923C',
];

// ─── Relationship Categories ───────────────────────────────────────────────────
export const RELATIONSHIP_CATEGORIES = {
  SPATIAL: [
    'INSIDE', 'OVERLAPPING', 'TOUCHING',
    'ABOVE_BELOW', 'DIAGONAL', 'BETWEEN',
    'SURROUNDED', 'LEFT_RIGHT', 'STACKED',
    'NESTED_3', 'MIRRORED', 'SCATTERED',
  ],
  TRAIT: [
    'HOLLOW_VS_SOLID', 'ONE_SHARED_TRAIT', 'ROTATED',
    'CONNECTED', 'SAME_COLOR', 'SAME_SHAPE',
    'OPPOSITE_COLORS', 'SIZE_GRADIENT', 'BORDER_ONLY',
    'SHADOW_COPY', 'STRIPED', 'DASHED_OUTLINE',
  ],
  QUANT: [
    'SIZE_MISMATCH', 'ONE_TO_MANY', 'EQUAL_COUNT',
    'TWO_TO_ONE', 'PYRAMID', 'THREE_TO_ONE',
    'ONE_TO_FIVE', 'DECREASING_ROW', 'INCREASING_ROW',
    'BALANCED_SCALE',
  ],
  VERBAL: [
    'SAME_AS',        // "A is the same as B"
    'OPPOSITE_OF',    // "A is the opposite of B"
    'PART_OF',        // "A is part of B"
    'BIGGER_THAN',    // "A is bigger than B"
    'SMALLER_THAN',   // "A is smaller than B"
    'BEFORE',         // "A comes before B"
    'AFTER',          // "A comes after B"
    'CAUSES',         // "A causes B"
    'CONTAINS',       // "A contains B"
    'BELONGS_TO',     // "A belongs to B"
    'DEFINES',        // "A defines B"
    'REPLACES',       // "A replaces B"
    'FOLLOWS',        // "A follows B"
    'NEGATES',        // "A negates B"
    'MATCHES',        // "A matches B"
    'EXCEEDS',        // "A exceeds B"
    'PRECEDES',       // "A precedes B"
    'TRANSFORMS_INTO', // "A transforms into B"
    'MIRRORS',        // "A mirrors B"
    'DEPENDS_ON',     // "A depends on B"
  ],
};

export const RELATIONSHIPS = [
  ...RELATIONSHIP_CATEGORIES.SPATIAL,
  ...RELATIONSHIP_CATEGORIES.TRAIT,
  ...RELATIONSHIP_CATEGORIES.QUANT,
  ...RELATIONSHIP_CATEGORIES.VERBAL,
];

export function getCategory(relationship) {
  for (const [cat, members] of Object.entries(RELATIONSHIP_CATEGORIES)) {
    if (members.includes(relationship)) return cat;
  }
  return null;
}

// ─── Verbal word pools ─────────────────────────────────────────────────────────

const VERBAL_WORD_POOLS = {
  SAME_AS:         [['sun','moon'],['hot','cold'],['fast','slow'],['cat','dog'],['fire','ice'],['up','down'],['open','close']],
  OPPOSITE_OF:     [['light','dark'],['loud','quiet'],['full','empty'],['sharp','dull'],['thick','thin'],['wet','dry'],['new','old']],
  PART_OF:         [['wheel','car'],['leaf','tree'],['key','keyboard'],['lens','eye'],['blade','sword'],['petal','flower'],['page','book']],
  BIGGER_THAN:     [['ocean','lake'],['elephant','mouse'],['sun','star'],['mountain','hill'],['city','town'],['galaxy','planet']],
  SMALLER_THAN:    [['atom','cell'],['seed','fruit'],['pixel','screen'],['ant','bee'],['word','sentence'],['drop','wave']],
  BEFORE:          [['dawn','dusk'],['seed','bloom'],['question','answer'],['cause','effect'],['birth','growth'],['winter','spring']],
  AFTER:           [['thunder','lightning'],['answer','question'],['effect','cause'],['harvest','planting'],['echo','sound']],
  CAUSES:          [['rain','flood'],['fire','smoke'],['wind','wave'],['heat','melt'],['impact','crater'],['spark','flame']],
  CONTAINS:        [['bag','stone'],['mind','thought'],['ocean','fish'],['sky','cloud'],['box','gift'],['forest','tree']],
  BELONGS_TO:      [['scale','fish'],['wing','bird'],['fin','shark'],['claw','bear'],['thorn','rose'],['root','plant']],
  DEFINES:         [['map','territory'],['word','meaning'],['law','rule'],['sign','signal'],['code','message']],
  REPLACES:        [['digital','analog'],['LED','bulb'],['email','letter'],['stream','disc'],['AI','manual']],
  FOLLOWS:         [['night','day'],['spring','winter'],['effect','cause'],['reply','message'],['landing','flight']],
  NEGATES:         [['shadow','light'],['silence','noise'],['still','motion'],['void','mass'],['anti','pro']],
  MATCHES:         [['lock','key'],['plug','socket'],['question','answer'],['puzzle','piece'],['bow','arrow']],
  EXCEEDS:         [['storm','breeze'],['flood','drizzle'],['roar','whisper'],['blaze','spark'],['surge','trickle']],
  PRECEDES:        [['intro','chapter'],['root','branch'],['seed','sapling'],['sketch','painting'],['draft','final']],
  TRANSFORMS_INTO: [['caterpillar','butterfly'],['ice','water'],['coal','diamond'],['clay','pottery'],['dough','bread']],
  MIRRORS:         [['left','right'],['past','future'],['rise','fall'],['inhale','exhale'],['give','take']],
  DEPENDS_ON:      [['flame','oxygen'],['life','water'],['plant','sunlight'],['sight','light'],['thought','mind']],
};

export function getVerbalPair(relationship) {
  const pool = VERBAL_WORD_POOLS[relationship];
  if (!pool) return ['A', 'B'];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Template phrases for verbal display ──────────────────────────────────────
const VERBAL_TEMPLATES = {
  SAME_AS:          ([a, b]) => [`"${a}"`, `is the same as`, `"${b}"`],
  OPPOSITE_OF:      ([a, b]) => [`"${a}"`, `is the opposite of`, `"${b}"`],
  PART_OF:          ([a, b]) => [`"${a}"`, `is part of`, `"${b}"`],
  BIGGER_THAN:      ([a, b]) => [`"${a}"`, `is bigger than`, `"${b}"`],
  SMALLER_THAN:     ([a, b]) => [`"${a}"`, `is smaller than`, `"${b}"`],
  BEFORE:           ([a, b]) => [`"${a}"`, `comes before`, `"${b}"`],
  AFTER:            ([a, b]) => [`"${a}"`, `comes after`, `"${b}"`],
  CAUSES:           ([a, b]) => [`"${a}"`, `causes`, `"${b}"`],
  CONTAINS:         ([a, b]) => [`"${a}"`, `contains`, `"${b}"`],
  BELONGS_TO:       ([a, b]) => [`"${a}"`, `belongs to`, `"${b}"`],
  DEFINES:          ([a, b]) => [`"${a}"`, `defines`, `"${b}"`],
  REPLACES:         ([a, b]) => [`"${a}"`, `replaces`, `"${b}"`],
  FOLLOWS:          ([a, b]) => [`"${a}"`, `follows`, `"${b}"`],
  NEGATES:          ([a, b]) => [`"${a}"`, `negates`, `"${b}"`],
  MATCHES:          ([a, b]) => [`"${a}"`, `matches`, `"${b}"`],
  EXCEEDS:          ([a, b]) => [`"${a}"`, `exceeds`, `"${b}"`],
  PRECEDES:         ([a, b]) => [`"${a}"`, `precedes`, `"${b}"`],
  TRANSFORMS_INTO:  ([a, b]) => [`"${a}"`, `transforms into`, `"${b}"`],
  MIRRORS:          ([a, b]) => [`"${a}"`, `mirrors`, `"${b}"`],
  DEPENDS_ON:       ([a, b]) => [`"${a}"`, `depends on`, `"${b}"`],
};

export function buildVerbalDisplay(relationship, pair) {
  const fn = VERBAL_TEMPLATES[relationship];
  if (!fn) return [`"${pair[0]}"`, relationship, `"${pair[1]}"`];
  return fn(pair);
}

export const isVerbal = (rel) => RELATIONSHIP_CATEGORIES.VERBAL.includes(rel);

// ─── Timing & probability constants ───────────────────────────────────────────
export const MATCH_CHANCE = 0.3;
export const DUAL_MATCH_CHANCE = 0.25;
export const HIER_MATCH_CHANCE = 0.25;
export const DISTRACTOR_CHANCE = 0.15;
export const TOTAL_ROUNDS = 20;
export const STIMULUS_DURATION = 2800;
export const WIPE_DURATION = 500;
export const FEEDBACK_DURATION = 400;

export const ADAPT_UP_THRESHOLD = 80;
export const ADAPT_DOWN_THRESHOLD = 50;
export const N_MIN = 1;
export const N_MAX = 20;

// ─── Helpers ───────────────────────────────────────────────────────────────────
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