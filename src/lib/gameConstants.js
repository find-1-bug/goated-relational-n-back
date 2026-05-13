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
  SPATIAL_3D: [
    'DEPTH_LAYERED', 'ORBITING', 'ROTATING_PAIR',
    'NESTED_VOLUME', 'ASCENDING_SPIRAL', 'COLLIDING',
    'REPELLING', 'BOUND_BY_GRAVITY', 'INTERSECTING_PLANES',
    'IN_FRONT_OF', 'BEHIND', 'STACKED_3D',
    'LEANING_AGAINST', 'FLOATING_ABOVE', 'CASTING_SHADOW',
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
    // Semantic
    'SAME_AS', 'OPPOSITE_OF', 'PART_OF',
    'CAUSES', 'CONTAINS', 'BELONGS_TO',
    'DEFINES', 'REPLACES', 'NEGATES',
    'MATCHES', 'TRANSFORMS_INTO', 'DEPENDS_ON',
    // Comparison
    'BIGGER_THAN', 'SMALLER_THAN', 'MORE_THAN', 'LESS_THAN',
    'FASTER_THAN', 'SLOWER_THAN', 'HEAVIER_THAN', 'LIGHTER_THAN',
    'HOTTER_THAN', 'COLDER_THAN', 'LOUDER_THAN', 'SOFTER_THAN',
    'STRONGER_THAN', 'WEAKER_THAN', 'OLDER_THAN', 'NEWER_THAN',
    'HIGHER_THAN', 'LOWER_THAN', 'CLOSER_THAN', 'FURTHER_THAN',
    // Temporal
    'BEFORE', 'AFTER', 'FOLLOWS', 'PRECEDES',
    'EXCEEDS', 'MIRRORS',
    // Directional / spatial verbal
    'LEFT_OF', 'RIGHT_OF', 'ABOVE', 'BELOW',
    'NORTH_OF', 'SOUTH_OF', 'EAST_OF', 'WEST_OF',
    'NORTH_EAST_OF', 'NORTH_WEST_OF', 'SOUTH_EAST_OF', 'SOUTH_WEST_OF',
    'INSIDE_OF', 'OUTSIDE_OF', 'NEXT_TO', 'FAR_FROM',
  ],
  SOUND: [
    'PITCH_HIGHER', 'PITCH_LOWER', 'RHYTHM_FASTER', 'RHYTHM_SLOWER',
  ],
};

export const RELATIONSHIPS = [
  ...RELATIONSHIP_CATEGORIES.SPATIAL,
  ...RELATIONSHIP_CATEGORIES.SPATIAL_3D,
  ...RELATIONSHIP_CATEGORIES.TRAIT,
  ...RELATIONSHIP_CATEGORIES.QUANT,
  ...RELATIONSHIP_CATEGORIES.VERBAL,
  ...RELATIONSHIP_CATEGORIES.SOUND,
];

export const TRANSITIVE_RELATIONSHIPS = [
  'BIGGER_THAN', 'SMALLER_THAN', 'MORE_THAN', 'LESS_THAN',
  'FASTER_THAN', 'SLOWER_THAN', 'HEAVIER_THAN', 'LIGHTER_THAN',
  'HOTTER_THAN', 'COLDER_THAN', 'LOUDER_THAN', 'SOFTER_THAN',
  'STRONGER_THAN', 'WEAKER_THAN', 'OLDER_THAN', 'NEWER_THAN',
  'HIGHER_THAN', 'LOWER_THAN', 'CLOSER_THAN', 'FURTHER_THAN',
  'BEFORE', 'AFTER', 'FOLLOWS', 'PRECEDES',
  'LEFT_OF', 'RIGHT_OF', 'ABOVE', 'BELOW',
  'NORTH_OF', 'SOUTH_OF', 'EAST_OF', 'WEST_OF',
  'PART_OF', 'CAUSES', 'CONTAINS', 'DEPENDS_ON', 'TRANSFORMS_INTO',
];

export function filterTransitiveRelationships(rels, isRINTMode, isTypeMode) {
  if (!isRINTMode && !isTypeMode) return rels;
  const allowed = new Set(TRANSITIVE_RELATIONSHIPS);
  return rels.filter(r => allowed.has(r));
}

// For the HUD category label
export const CATEGORY_LABELS = {
  SPATIAL: 'Spatial',
  SPATIAL_3D: 'Spatial 3D',
  TRAIT: 'Trait',
  QUANT: 'Quantitative',
  VERBAL: 'Verbal',
  SOUND: 'Sound',
};

export function getCategory(relationship) {
  for (const [cat, members] of Object.entries(RELATIONSHIP_CATEGORIES)) {
    if (members.includes(relationship)) return cat;
  }
  return null;
}

// ─── Token Type System ─────────────────────────────────────────────────────────
// Token types for words in verbal stimuli
export const TOKEN_TYPES = ['meaningful', 'nonsense', 'garbage', 'emoji', 'voronoi_emoji', 'random_string', 'voronoi'];

// Meaningful words grouped by semantic field
const MEANINGFUL_POOLS = {
  objects:    ['sun','moon','fire','ice','wind','rain','stone','leaf','wave','root','dust','spark'],
  animals:    ['cat','dog','wolf','bear','fish','bird','ant','bee','fox','owl','elk','crab'],
  concepts:   ['light','dark','truth','void','mind','soul','time','code','law','myth','pain','joy'],
  spatial:    ['north','south','east','west','top','base','edge','core','peak','depth','front','side'],
  scale:      ['giant','dwarf','ocean','atom','city','grain','star','drop','blaze','trace','surge','wisp'],
};

function pickMeaningful() {
  const pools = Object.values(MEANINGFUL_POOLS);
  const pool = pools[Math.floor(Math.random() * pools.length)];
  return pool[Math.floor(Math.random() * pool.length)];
}

// Nonsense words (pronounceable but meaningless)
const NONSENSE_WORDS = [
  'fhy','iiy','tpy','zov','blim','quor','neth','vask','plox','driv',
  'keln','wurp','glax','sniv','trob','yeff','munk','daze','crul','spiv',
  'thon','wrix','flem','zupp','kraz','briv','nolp','skuv','drix','glab',
  'vorp','twex','slun','moph','crev','zink','blap','drox','guth','plev',
  'snork','wuft','krib','flox','zunt','meld','brix','criv','thub','yonk',
];

// Garbage words (random short letter strings, harder)
function makeGarbage(len = 3) {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// Emojis pool
const EMOJI_POOL = [
  '🔥','💧','🌊','⚡','🌀','❄️','🌙','☀️','⭐','🌈',
  '🍎','🍋','🍇','🌿','🌸','🌻','🍄','🦋','🐉','🦅',
  '🏔️','🌋','🏝️','🌙','🪐','💎','🔮','⚗️','🧲','🪄',
  '🐺','🦊','🐻','🦁','🐬','🦉','🐜','🦂','🐙','🦎',
  '🎯','🎲','🎭','🎪','🎨','🧩','🔑','🗝️','⚔️','🛡️',
  '👁️','🧠','💀','👾','🤖','👻','🌀','🔵','🔴','🟡',
];

// Voronoi-style emoji: abstract/geometric unicode symbols
const VORONOI_EMOJI_POOL = [
  '◈','◉','◊','◌','◍','◎','●','○','◐','◑','◒','◓',
  '▲','△','▴','▵','▶','▷','▸','▹','►','▻','▼','▽',
  '◆','◇','◈','❋','✦','✧','✩','✪','✫','✬','✭','✮',
  '⬡','⬢','⬣','⬟','⬠','⬡','⌬','⎔','⏣','⟁','⟐','⟡',
  '⬤','⭕','🔷','🔶','🔹','🔸','🔺','🔻','💠','🔘','🔳','🔲',
];


export const VORONOI_TOKEN_PREFIX = '\x00V:';
export function encodeVoronoiToken() {
  // encode a random seed into a sentinel string the renderer detects
  return VORONOI_TOKEN_PREFIX + Math.floor(Math.random() * 99991);
}

export function pickTokenWord(type, garbageLen = 3) {
  switch (type) {
    case 'meaningful':    return pickMeaningful();
    case 'nonsense':      return NONSENSE_WORDS[Math.floor(Math.random() * NONSENSE_WORDS.length)];
    case 'garbage':       return makeGarbage(garbageLen);
    case 'emoji':         return EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)];
    case 'voronoi_emoji': return VORONOI_EMOJI_POOL[Math.floor(Math.random() * VORONOI_EMOJI_POOL.length)];
    case 'random_string': return makeRandomString();
    case 'voronoi':       return encodeVoronoiToken();
    default:              return pickMeaningful();
  }
}

// Token type weights — can be overridden from the UI
let _tokenWeights = {
  meaningful:    25,
  emoji:         15,
  voronoi_emoji: 10,
  nonsense:      15,
  garbage:       15,
  random_string: 10,
  voronoi:       10,
};

export function setTokenWeights(weights) {
  _tokenWeights = { ..._tokenWeights, ...weights };
}

export function getTokenWeights() {
  return { ..._tokenWeights };
}

// Pick a random token type using current weights
export function pickTokenType() {
  const entries = Object.entries(_tokenWeights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  if (total === 0) return 'meaningful';
  let r = Math.random() * total;
  for (const [type, w] of entries) {
    r -= w;
    if (r <= 0) return type;
  }
  return entries[entries.length - 1][0];
}

// Random uppercase/lowercase mixed string 4-6 chars — looks like a code token
export function makeRandomString(len) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const l = len || (4 + Math.floor(Math.random() * 3));
  let s = '';
  for (let i = 0; i < l; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// ─── Verbal word pools ─────────────────────────────────────────────────────────
const VERBAL_WORD_POOLS = {
  // Semantic
  SAME_AS:         [['sun','moon'],['hot','cold'],['fast','slow'],['cat','dog'],['fire','ice'],['up','down'],['open','close']],
  OPPOSITE_OF:     [['light','dark'],['loud','quiet'],['full','empty'],['sharp','dull'],['thick','thin'],['wet','dry'],['new','old']],
  PART_OF:         [['wheel','car'],['leaf','tree'],['key','keyboard'],['lens','eye'],['blade','sword'],['petal','flower'],['page','book']],
  CAUSES:          [['rain','flood'],['fire','smoke'],['wind','wave'],['heat','melt'],['impact','crater'],['spark','flame']],
  CONTAINS:        [['bag','stone'],['mind','thought'],['ocean','fish'],['sky','cloud'],['box','gift'],['forest','tree']],
  BELONGS_TO:      [['scale','fish'],['wing','bird'],['fin','shark'],['claw','bear'],['thorn','rose'],['root','plant']],
  DEFINES:         [['map','territory'],['word','meaning'],['law','rule'],['sign','signal'],['code','message']],
  REPLACES:        [['digital','analog'],['LED','bulb'],['email','letter'],['stream','disc'],['AI','manual']],
  NEGATES:         [['shadow','light'],['silence','noise'],['still','motion'],['void','mass'],['anti','pro']],
  MATCHES:         [['lock','key'],['plug','socket'],['question','answer'],['puzzle','piece'],['bow','arrow']],
  TRANSFORMS_INTO: [['caterpillar','butterfly'],['ice','water'],['coal','diamond'],['clay','pottery'],['dough','bread']],
  DEPENDS_ON:      [['flame','oxygen'],['life','water'],['plant','sunlight'],['sight','light'],['thought','mind']],
  // Comparison
  BIGGER_THAN:     [['ocean','lake'],['elephant','mouse'],['sun','star'],['mountain','hill'],['city','town'],['galaxy','planet']],
  SMALLER_THAN:    [['atom','cell'],['seed','fruit'],['pixel','screen'],['ant','bee'],['word','sentence'],['drop','wave']],
  MORE_THAN:       [['flood','drizzle'],['crowd','pair'],['forest','bush'],['army','squad'],['feast','snack']],
  LESS_THAN:       [['drop','ocean'],['spark','blaze'],['whisper','shout'],['seed','tree'],['penny','fortune']],
  FASTER_THAN:     [['light','sound'],['cheetah','turtle'],['jet','car'],['thought','speech'],['hawk','dove']],
  SLOWER_THAN:     [['snail','rabbit'],['glacier','river'],['sloth','cat'],['growth','change'],['walk','run']],
  HEAVIER_THAN:    [['iron','feather'],['boulder','pebble'],['whale','seal'],['lead','air'],['tank','boat']],
  LIGHTER_THAN:    [['feather','stone'],['foam','metal'],['air','water'],['leaf','brick'],['cloud','rock']],
  HOTTER_THAN:     [['sun','star'],['lava','steam'],['fire','smoke'],['desert','tundra'],['summer','winter']],
  COLDER_THAN:     [['ice','snow'],['space','earth'],['winter','autumn'],['arctic','tropics'],['freeze','chill']],
  LOUDER_THAN:     [['thunder','rain'],['explosion','pop'],['roar','whisper'],['storm','breeze'],['concert','hum']],
  SOFTER_THAN:     [['silk','wool'],['foam','wood'],['moss','bark'],['cloud','stone'],['down','cotton']],
  STRONGER_THAN:   [['steel','wood'],['titan','human'],['gravity','wind'],['flood','stream'],['storm','gust']],
  WEAKER_THAN:     [['reed','oak'],['mist','rain'],['echo','sound'],['ripple','wave'],['gust','gale']],
  OLDER_THAN:      [['stone','sand'],['star','planet'],['myth','story'],['fossil','bone'],['oak','sapling']],
  NEWER_THAN:      [['phone','book'],['LED','candle'],['stream','disc'],['drone','plane'],['app','program']],
  HIGHER_THAN:     [['cloud','hill'],['peak','base'],['sky','ground'],['orbit','flight'],['eagle','sparrow']],
  LOWER_THAN:      [['valley','peak'],['root','branch'],['sea','sky'],['mine','hill'],['depth','surface']],
  CLOSER_THAN:     [['moon','star'],['friend','stranger'],['wall','door'],['echo','source'],['shadow','self']],
  FURTHER_THAN:    [['star','moon'],['dream','goal'],['past','now'],['void','edge'],['distant','near']],
  // Temporal
  BEFORE:          [['dawn','dusk'],['seed','bloom'],['question','answer'],['cause','effect'],['birth','growth'],['winter','spring']],
  AFTER:           [['thunder','lightning'],['answer','question'],['effect','cause'],['harvest','planting'],['echo','sound']],
  FOLLOWS:         [['night','day'],['spring','winter'],['effect','cause'],['reply','message'],['landing','flight']],
  PRECEDES:        [['intro','chapter'],['root','branch'],['seed','sapling'],['sketch','painting'],['draft','final']],
  EXCEEDS:         [['storm','breeze'],['flood','drizzle'],['roar','whisper'],['blaze','spark'],['surge','trickle']],
  MIRRORS:         [['left','right'],['past','future'],['rise','fall'],['inhale','exhale'],['give','take']],
  // Directional
  LEFT_OF:         [['west','east'],['shadow','sun'],['moon','star'],['tail','head'],['back','front']],
  RIGHT_OF:        [['east','west'],['sun','shadow'],['star','moon'],['head','tail'],['front','back']],
  ABOVE:           [['cloud','ground'],['sky','sea'],['eagle','fish'],['star','peak'],['ceiling','floor']],
  BELOW:           [['root','trunk'],['ocean','sky'],['valley','peak'],['worm','bird'],['floor','ceiling']],
  NORTH_OF:        [['arctic','tropics'],['pole','equator'],['tundra','desert'],['glacier','jungle'],['snow','sand']],
  SOUTH_OF:        [['tropics','arctic'],['equator','pole'],['desert','tundra'],['jungle','glacier'],['sand','snow']],
  EAST_OF:         [['sunrise','sunset'],['dawn','dusk'],['orient','occident'],['morning','evening']],
  WEST_OF:         [['sunset','sunrise'],['dusk','dawn'],['occident','orient'],['evening','morning']],
  NORTH_EAST_OF:   [['peak','valley'],['star','root'],['sky','ground'],['ice','fire'],['summit','base']],
  NORTH_WEST_OF:   [['tundra','jungle'],['snow','heat'],['cold','warm'],['night','day'],['frost','bloom']],
  SOUTH_EAST_OF:   [['shore','cliff'],['sand','rock'],['warm','cold'],['day','night'],['bloom','frost']],
  SOUTH_WEST_OF:   [['desert','forest'],['heat','cold'],['dry','wet'],['dust','rain'],['fire','ice']],
  INSIDE_OF:       [['core','shell'],['seed','fruit'],['yolk','egg'],['thought','mind'],['fire','torch']],
  OUTSIDE_OF:      [['skin','bone'],['bark','wood'],['shell','core'],['wind','wall'],['echo','cave']],
  NEXT_TO:         [['shadow','self'],['tide','shore'],['moon','earth'],['echo','source'],['twin','twin']],
  FAR_FROM:        [['void','center'],['star','home'],['exile','origin'],['echo','source'],['dream','now']],
};

export function getVerbalPair(relationship) {
  const pool = VERBAL_WORD_POOLS[relationship];
  if (!pool) return ['A', 'B'];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Inverse relationship map ──────────────────────────────────────────────────
// Maps a relationship to its semantic inverse. If A rel B matches, then B inv(rel) A
// is an equivalent stimulus. Both should count as the same N-back target.
export const INVERSE_RELATIONSHIP = {
  // Comparison pairs
  BIGGER_THAN:    'SMALLER_THAN',
  SMALLER_THAN:   'BIGGER_THAN',
  MORE_THAN:      'LESS_THAN',
  LESS_THAN:      'MORE_THAN',
  FASTER_THAN:    'SLOWER_THAN',
  SLOWER_THAN:    'FASTER_THAN',
  HEAVIER_THAN:   'LIGHTER_THAN',
  LIGHTER_THAN:   'HEAVIER_THAN',
  HOTTER_THAN:    'COLDER_THAN',
  COLDER_THAN:    'HOTTER_THAN',
  LOUDER_THAN:    'SOFTER_THAN',
  SOFTER_THAN:    'LOUDER_THAN',
  STRONGER_THAN:  'WEAKER_THAN',
  WEAKER_THAN:    'STRONGER_THAN',
  OLDER_THAN:     'NEWER_THAN',
  NEWER_THAN:     'OLDER_THAN',
  HIGHER_THAN:    'LOWER_THAN',
  LOWER_THAN:     'HIGHER_THAN',
  CLOSER_THAN:    'FURTHER_THAN',
  FURTHER_THAN:   'CLOSER_THAN',
  // Temporal
  BEFORE:         'AFTER',
  AFTER:          'BEFORE',
  FOLLOWS:        'PRECEDES',
  PRECEDES:       'FOLLOWS',
  // Directional
  LEFT_OF:        'RIGHT_OF',
  RIGHT_OF:       'LEFT_OF',
  ABOVE:          'BELOW',
  BELOW:          'ABOVE',
  NORTH_OF:       'SOUTH_OF',
  SOUTH_OF:       'NORTH_OF',
  EAST_OF:        'WEST_OF',
  WEST_OF:        'EAST_OF',
  NORTH_EAST_OF:  'SOUTH_WEST_OF',
  SOUTH_WEST_OF:  'NORTH_EAST_OF',
  NORTH_WEST_OF:  'SOUTH_EAST_OF',
  SOUTH_EAST_OF:  'NORTH_WEST_OF',
  INSIDE_OF:      'OUTSIDE_OF',
  OUTSIDE_OF:     'INSIDE_OF',
  // Semantic inverses (commutative / reversible)
  SAME_AS:        'SAME_AS',      // symmetric
  OPPOSITE_OF:    'OPPOSITE_OF',  // symmetric
  MATCHES:        'MATCHES',      // symmetric
  MIRRORS:        'MIRRORS',      // symmetric
  NEXT_TO:        'NEXT_TO',      // symmetric
  CAUSES:         'DEPENDS_ON',
  DEPENDS_ON:     'CAUSES',
  CONTAINS:       'PART_OF',
  PART_OF:        'CONTAINS',
  BELONGS_TO:     'CONTAINS',
};

// Given a relationship and its [wordA, wordB], produce the inverted form:
// inverted rel = INVERSE_RELATIONSHIP[rel], and swap the words.
// Returns { rel, wordA, wordB } or null if no inverse defined.
export function makeInverseStimulus(stimulus) {
  const inv = INVERSE_RELATIONSHIP[stimulus.rel];
  if (!inv) return null;
  return {
    ...stimulus,
    rel: inv,
    wordA: stimulus.wordB,
    wordB: stimulus.wordA,
    // renderMode stays the same so layout is identical but words/rel flip
  };
}

// ─── Template phrases for verbal display ──────────────────────────────────────
const VERBAL_TEMPLATES = {
  // Semantic
  SAME_AS:          ([a, b]) => [a, `is the same as`, b],
  OPPOSITE_OF:      ([a, b]) => [a, `is opposite to`, b],
  PART_OF:          ([a, b]) => [a, `is part of`, b],
  CAUSES:           ([a, b]) => [a, `causes`, b],
  CONTAINS:         ([a, b]) => [a, `contains`, b],
  BELONGS_TO:       ([a, b]) => [a, `belongs to`, b],
  DEFINES:          ([a, b]) => [a, `defines`, b],
  REPLACES:         ([a, b]) => [a, `replaces`, b],
  NEGATES:          ([a, b]) => [a, `negates`, b],
  MATCHES:          ([a, b]) => [a, `matches`, b],
  TRANSFORMS_INTO:  ([a, b]) => [a, `→`, b],
  DEPENDS_ON:       ([a, b]) => [a, `depends on`, b],
  // Comparison
  BIGGER_THAN:      ([a, b]) => [a, `>`, b],
  SMALLER_THAN:     ([a, b]) => [a, `<`, b],
  MORE_THAN:        ([a, b]) => [a, `more than`, b],
  LESS_THAN:        ([a, b]) => [a, `less than`, b],
  FASTER_THAN:      ([a, b]) => [a, `faster than`, b],
  SLOWER_THAN:      ([a, b]) => [a, `slower than`, b],
  HEAVIER_THAN:     ([a, b]) => [a, `heavier than`, b],
  LIGHTER_THAN:     ([a, b]) => [a, `lighter than`, b],
  HOTTER_THAN:      ([a, b]) => [a, `hotter than`, b],
  COLDER_THAN:      ([a, b]) => [a, `colder than`, b],
  LOUDER_THAN:      ([a, b]) => [a, `louder than`, b],
  SOFTER_THAN:      ([a, b]) => [a, `softer than`, b],
  STRONGER_THAN:    ([a, b]) => [a, `stronger than`, b],
  WEAKER_THAN:      ([a, b]) => [a, `weaker than`, b],
  OLDER_THAN:       ([a, b]) => [a, `older than`, b],
  NEWER_THAN:       ([a, b]) => [a, `newer than`, b],
  HIGHER_THAN:      ([a, b]) => [a, `higher than`, b],
  LOWER_THAN:       ([a, b]) => [a, `lower than`, b],
  CLOSER_THAN:      ([a, b]) => [a, `closer than`, b],
  FURTHER_THAN:     ([a, b]) => [a, `further than`, b],
  // Temporal
  BEFORE:           ([a, b]) => [a, `before`, b],
  AFTER:            ([a, b]) => [a, `after`, b],
  FOLLOWS:          ([a, b]) => [a, `follows`, b],
  PRECEDES:         ([a, b]) => [a, `precedes`, b],
  EXCEEDS:          ([a, b]) => [a, `exceeds`, b],
  MIRRORS:          ([a, b]) => [a, `mirrors`, b],
  // Directional
  LEFT_OF:          ([a, b]) => [a, `is left of`, b],
  RIGHT_OF:         ([a, b]) => [a, `is right of`, b],
  ABOVE:            ([a, b]) => [a, `is above`, b],
  BELOW:            ([a, b]) => [a, `is below`, b],
  NORTH_OF:         ([a, b]) => [a, `is north of`, b],
  SOUTH_OF:         ([a, b]) => [a, `is south of`, b],
  EAST_OF:          ([a, b]) => [a, `is east of`, b],
  WEST_OF:          ([a, b]) => [a, `is west of`, b],
  NORTH_EAST_OF:    ([a, b]) => [a, `is NE of`, b],
  NORTH_WEST_OF:    ([a, b]) => [a, `is NW of`, b],
  SOUTH_EAST_OF:    ([a, b]) => [a, `is SE of`, b],
  SOUTH_WEST_OF:    ([a, b]) => [a, `is SW of`, b],
  INSIDE_OF:        ([a, b]) => [a, `is inside`, b],
  OUTSIDE_OF:       ([a, b]) => [a, `is outside`, b],
  NEXT_TO:          ([a, b]) => [a, `is next to`, b],
  FAR_FROM:         ([a, b]) => [a, `is far from`, b],
};

export function buildVerbalDisplay(relationship, pair) {
  const fn = VERBAL_TEMPLATES[relationship];
  if (!fn) return [pair[0], relationship.replace(/_/g,' '), pair[1]];
  return fn(pair);
}

export const isVerbal = (rel) => RELATIONSHIP_CATEGORIES.VERBAL.includes(rel);
export const isSound = (rel) => RELATIONSHIP_CATEGORIES.SOUND.includes(rel);

const SOUND_WORDS = ['alpha', 'bravo', 'delta', 'echo', 'nova', 'pulse', 'signal', 'vector'];
const SOUND_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'K', 'M', 'R', 'T'];
const SOUND_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function getSoundPair(relationship) {
  if (relationship.includes('WORD')) {
    const a = pickRandom(SOUND_WORDS);
    const b = relationship.includes('SAME') ? a : pickRandomExcluding(SOUND_WORDS, a);
    return [a, b];
  }
  if (relationship.includes('LETTER')) {
    const a = pickRandom(SOUND_LETTERS);
    const b = relationship.includes('SAME') ? a : pickRandomExcluding(SOUND_LETTERS, a);
    return [a, b];
  }
  if (relationship.includes('NUMBER')) {
    const a = pickRandom(SOUND_NUMBERS);
    const candidates = relationship === 'SOUND_HIGHER_NUMBER'
      ? SOUND_NUMBERS.filter(n => n < a)
      : SOUND_NUMBERS.filter(n => n > a);
    const b = pickRandom(candidates.length ? candidates : SOUND_NUMBERS.filter(n => n !== a));
    return [String(a), String(b)];
  }
  return ['tone A', 'tone B'];
}

export function buildSoundDisplay(relationship, pair) {
  const [a, b] = pair;
  const labels = {
    PITCH_HIGHER: [a, 'higher pitch than', b],
    PITCH_LOWER: [a, 'lower pitch than', b],
    RHYTHM_FASTER: ['fast', 'rhythm', 'beat'],
    RHYTHM_SLOWER: ['slow', 'rhythm', 'beat'],
    SOUND_SAME_WORD: [a, 'same spoken word as', b],
    SOUND_DIFFERENT_WORD: [a, 'different word from', b],
    SOUND_SAME_LETTER: [a, 'same letter as', b],
    SOUND_DIFFERENT_LETTER: [a, 'different letter from', b],
    SOUND_HIGHER_NUMBER: [a, 'higher number than', b],
    SOUND_LOWER_NUMBER: [a, 'lower number than', b],
  };
  return labels[relationship] || [a, relationship.replace(/_/g, ' ').toLowerCase(), b];
}

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