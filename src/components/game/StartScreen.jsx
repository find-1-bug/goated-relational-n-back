import React from 'react';
import { Button } from '@/components/ui/button';
import { Brain, Zap, TrendingUp, Layers, GitBranch, Shuffle, ChevronDown, ChevronUp, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RELATIONSHIP_CATEGORIES, setTokenWeights, getTokenWeights, filterTransitiveRelationships } from '@/lib/gameConstants';

// Build a weighted pool from category weights + enabled rels
// Each category's rels are repeated proportionally to its weight
function buildWeightedPool(enabledRels, catWeights) {
  const REPEAT = 10; // granularity
  const pool = [];
  const cats = Object.keys(RELATIONSHIP_CATEGORIES);
  const totalWeight = cats.reduce((s, c) => s + (catWeights[c] || 0), 0);
  if (totalWeight === 0) return [...enabledRels];
  for (const cat of cats) {
    const w = catWeights[cat] || 0;
    if (w === 0) continue;
    const members = RELATIONSHIP_CATEGORIES[cat].filter(r => enabledRels.has(r));
    if (members.length === 0) continue;
    const repeats = Math.max(1, Math.round((w / totalWeight) * REPEAT * cats.length));
    for (let i = 0; i < repeats; i++) pool.push(...members);
  }
  return pool.length > 0 ? pool : [...enabledRels];
}

const MODE_OPTIONS = [
  { id: 'type_nback',    icon: Brain,      label: 'Type N-Back',       desc: 'Each relation type has its own N-back queue. Match fires when this relation appeared N times ago in its own history — regardless of trial distance. Very hard.' },
  { id: 'rint',          icon: GitBranch,  label: 'Relational Integration', desc: 'Entities (alpha, beta…) persist across trials. A target fires when the current stimulus is a VALID logical conclusion from chaining the N previous facts (e.g. A>B, B>C → A>C). Requires N≥2.', minN: 2 },
  { id: 'mixed_nback',   icon: Shuffle,    label: 'Mixed N-Back',      desc: 'Randomly switches between Normal and Type N-back each trial. You never know which rule applies.' },
  { id: 'mixed_rint',    icon: Shuffle,    label: 'Mixed RINT',        desc: 'Three-way random per trial: Normal / Type / RINT. Maximum flexibility demand. Requires N≥2.', minN: 2 },
  { id: 'impossible',    icon: Zap,        label: 'Impossible',        desc: 'Each stream independently randomizes between Normal, Type, and RINT every trial — different rules per stream simultaneously. Requires ≥2 streams and N≥2.', minN: 2, minStreams: 2 },
  { id: 'binary_logic',  icon: GitBranch,  label: 'Binary Logic',      desc: 'Each trial, each stream is assigned a random pair: <NBack type> <OP> <NBack type> (e.g. NRM AND NOT RINT). A match fires only when the combined boolean condition is true. Shown as live badges on each stream. Requires N≥2.', minN: 2 },
  { id: 'alien_cube',      icon: Layers,     label: 'Alien Cube Mode',      desc: 'Each stream appears inside a rotating transparent 3×3×3 cube. Relation and position can be answered with separate keys.' },
  { id: 'alien_tesseract', icon: Layers,     label: 'Alien Tesseract Mode', desc: 'Each stream appears inside a projected 4D tesseract. Position targets include the visible cube cell plus an inner/outer hyperspace layer.' },
  { id: 'alien_square',    icon: Layers,     label: 'Alien Square Mode',    desc: 'Each stream appears inside a rotating 3×3 square. Relation and square position can be answered with separate keys.' },
  { id: 'variable_n',    icon: Shuffle,    label: 'Variable N',        desc: 'N changes randomly each trial (±1 around your chosen N). Forces flexible updating.' },
  { id: 'adaptive',      icon: TrendingUp, label: 'Adaptive N',        desc: 'N auto-adjusts between sessions based on accuracy (≥80% → up, ≤50% → down).' },
  { id: 'distractors',   icon: Shuffle,    label: 'Distractors',       desc: 'Near-match stimuli from the same category create interference in normal mode.' },
];

// Modes that are mutually exclusive with each other (only one from each group active)
const EXCLUSIVE_GROUPS = [
  ['type_nback', 'mixed_nback', 'mixed_rint', 'impossible'],
  ['rint', 'mixed_rint', 'impossible'],
  // binary_logic overrides the primary nback type selection per trial so conflicts with fixed-mode selectors
  ['binary_logic', 'mixed_nback', 'mixed_rint', 'impossible'],
  ['alien_cube', 'alien_tesseract', 'alien_square'],
];

const CATEGORY_META = {
  SPATIAL:    { label: 'Spatial',      color: 'text-cyan-400',     border: 'border-cyan-400/40',   bg: 'bg-cyan-400/10'  },
  SPATIAL_3D: { label: 'Spatial 3D',   color: 'text-sky-400',      border: 'border-sky-400/40',    bg: 'bg-sky-400/10'  },
  TRAIT:      { label: 'Trait',        color: 'text-violet-400',   border: 'border-violet-400/40', bg: 'bg-violet-400/10' },
  QUANT:      { label: 'Quantitative', color: 'text-amber-400',    border: 'border-amber-400/40',  bg: 'bg-amber-400/10' },
  VERBAL:     { label: 'Verbal',       color: 'text-emerald-400',  border: 'border-emerald-400/40',bg: 'bg-emerald-400/10' },
  SOUND:      { label: 'Sound',        color: 'text-rose-400',     border: 'border-rose-400/40',   bg: 'bg-rose-400/10' },
};

const REL_DISPLAY = {
  // Spatial
  INSIDE: 'Inside', OVERLAPPING: 'Overlapping', TOUCHING: 'Touching',
  ABOVE_BELOW: 'Above/Below', DIAGONAL: 'Diagonal', BETWEEN: 'Between',
  SURROUNDED: 'Surrounded', LEFT_RIGHT: 'Left/Right', STACKED: 'Stacked',
  NESTED_3: 'Nested 3', MIRRORED: 'Mirrored', SCATTERED: 'Scattered',
  // Spatial 3D
  DEPTH_LAYERED: 'Depth Layered', ORBITING: 'Orbiting', ROTATING_PAIR: 'Rotating Pair',
  NESTED_VOLUME: 'Nested Volume', ASCENDING_SPIRAL: 'Ascending Spiral', COLLIDING: 'Colliding',
  REPELLING: 'Repelling', BOUND_BY_GRAVITY: 'Bound by Gravity', INTERSECTING_PLANES: 'Intersecting Planes',
  IN_FRONT_OF: 'In Front Of', BEHIND: 'Behind', STACKED_3D: 'Stacked 3D',
  LEANING_AGAINST: 'Leaning Against', FLOATING_ABOVE: 'Floating Above', CASTING_SHADOW: 'Casting Shadow',
  // Trait
  HOLLOW_VS_SOLID: 'Hollow vs Solid', ONE_SHARED_TRAIT: 'Shared Trait', ROTATED: 'Rotated',
  CONNECTED: 'Connected', SAME_COLOR: 'Same Color', SAME_SHAPE: 'Same Shape',
  OPPOSITE_COLORS: 'Opposite Colors', SIZE_GRADIENT: 'Size Gradient', BORDER_ONLY: 'Border Only',
  SHADOW_COPY: 'Shadow Copy', STRIPED: 'Striped', DASHED_OUTLINE: 'Dashed Outline',
  // Quant
  SIZE_MISMATCH: 'Size Mismatch', ONE_TO_MANY: '1:3', EQUAL_COUNT: 'Equal Count',
  TWO_TO_ONE: '2:1', PYRAMID: 'Pyramid', THREE_TO_ONE: '3:1',
  ONE_TO_FIVE: '1:5', DECREASING_ROW: 'Decreasing Row', INCREASING_ROW: 'Increasing Row',
  BALANCED_SCALE: 'Balanced Scale',
  // Verbal — semantic
  SAME_AS: 'Same As', OPPOSITE_OF: 'Opposite Of', PART_OF: 'Part Of',
  CAUSES: 'Causes', CONTAINS: 'Contains', BELONGS_TO: 'Belongs To',
  DEFINES: 'Defines', REPLACES: 'Replaces', NEGATES: 'Negates',
  MATCHES: 'Matches', TRANSFORMS_INTO: '→', DEPENDS_ON: 'Depends On',
  // Verbal — comparison
  BIGGER_THAN: 'Bigger Than', SMALLER_THAN: 'Smaller Than',
  MORE_THAN: 'More Than', LESS_THAN: 'Less Than',
  FASTER_THAN: 'Faster Than', SLOWER_THAN: 'Slower Than',
  HEAVIER_THAN: 'Heavier Than', LIGHTER_THAN: 'Lighter Than',
  HOTTER_THAN: 'Hotter Than', COLDER_THAN: 'Colder Than',
  LOUDER_THAN: 'Louder Than', SOFTER_THAN: 'Softer Than',
  STRONGER_THAN: 'Stronger Than', WEAKER_THAN: 'Weaker Than',
  OLDER_THAN: 'Older Than', NEWER_THAN: 'Newer Than',
  HIGHER_THAN: 'Higher Than', LOWER_THAN: 'Lower Than',
  CLOSER_THAN: 'Closer Than', FURTHER_THAN: 'Further Than',
  // Verbal — temporal
  BEFORE: 'Before', AFTER: 'After', FOLLOWS: 'Follows', PRECEDES: 'Precedes',
  EXCEEDS: 'Exceeds', MIRRORS: 'Mirrors',
  // Verbal — directional
  LEFT_OF: 'Left Of', RIGHT_OF: 'Right Of', ABOVE: 'Above', BELOW: 'Below',
  NORTH_OF: 'North Of', SOUTH_OF: 'South Of', EAST_OF: 'East Of', WEST_OF: 'West Of',
  NORTH_EAST_OF: 'NE Of', NORTH_WEST_OF: 'NW Of', SOUTH_EAST_OF: 'SE Of', SOUTH_WEST_OF: 'SW Of',
  INSIDE_OF: 'Inside Of', OUTSIDE_OF: 'Outside Of', NEXT_TO: 'Next To', FAR_FROM: 'Far From',
  // Sound
  PITCH_HIGHER: 'Pitch Higher', PITCH_LOWER: 'Pitch Lower',
  RHYTHM_FASTER: 'Rhythm Faster', RHYTHM_SLOWER: 'Rhythm Slower',
};

const KEY_OPTIONS = [
  { code: 'Space',  display: 'SPACE' },
  { code: 'KeyA',   display: 'A' },
  { code: 'KeyS',   display: 'S' },
  { code: 'KeyD',   display: 'D' },
  { code: 'KeyF',   display: 'F' },
  { code: 'KeyG',   display: 'G' },
  { code: 'KeyH',   display: 'H' },
  { code: 'KeyJ',   display: 'J' },
  { code: 'KeyK',   display: 'K' },
  { code: 'KeyP',   display: 'P' },
  { code: 'KeyZ',   display: 'Z' },
  { code: 'KeyX',   display: 'X' },
  { code: 'KeyC',   display: 'C' },
  { code: 'KeyV',   display: 'V' },
  { code: 'Digit1', display: '1' },
  { code: 'Digit2', display: '2' },
  { code: 'Digit3', display: '3' },
  { code: 'Digit4', display: '4' },
  { code: 'Digit5', display: '5' },
  { code: 'Digit6', display: '6' },
  { code: 'Digit7', display: '7' },
  { code: 'Digit8', display: '8' },
  { code: 'Digit9', display: '9' },
  { code: 'Digit0', display: '0' },
  { code: 'KeyQ', display: 'Q' },
  { code: 'KeyW', display: 'W' },
  { code: 'KeyE', display: 'E' },
  { code: 'KeyR', display: 'R' },
  { code: 'KeyT', display: 'T' },
  { code: 'KeyY', display: 'Y' },
  { code: 'KeyU', display: 'U' },
  { code: 'KeyI', display: 'I' },
  { code: 'KeyO', display: 'O' },
  { code: 'KeyL', display: 'L' },
  { code: 'KeyB', display: 'B' },
  { code: 'KeyN', display: 'N' },
  { code: 'KeyM', display: 'M' },
];

const STREAM_COLORS = ['text-primary', 'text-accent', 'text-chart-3', 'text-chart-4', 'text-chart-5', 'text-primary', 'text-accent', 'text-chart-3', 'text-chart-4'];
const STREAM_LABELS = Array.from({ length: 20 }, (_, i) => String.fromCharCode(65 + i));
const MAX_STREAMS = STREAM_LABELS.length;

const SPEED_OPTIONS = [
  { label: 'Slow',   ms: 4000 },
  { label: 'Normal', ms: 2800 },
  { label: 'Fast',   ms: 1800 },
  { label: 'Turbo',  ms: 1000 },
  { label: 'Random', ms: 'random' },
];

const CAROUSEL_SPEED_OPTIONS = [
  { label: 'Slow', ms: 3600 },
  { label: 'Normal', ms: 2800 },
  { label: 'Fast', ms: 2000 },
  { label: 'Turbo', ms: 1400 },
];

function StreamRow({ label, labelColor, borderColor, keyCode, positionKeyCode, showPositionKey, onKeyChange, onPositionKeyChange, allStreamKeys, thisKey, thisPositionKey, onRemove }) {
  return (
    <div className={`rounded-lg bg-secondary/50 border ${borderColor} p-2`}>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-mono font-semibold ${labelColor} w-16 shrink-0`}>{label}</span>
        {showPositionKey && <span className="text-xs font-mono text-muted-foreground/60 w-8">REL</span>}
        <select
          value={keyCode}
          onChange={e => onKeyChange(e.target.value)}
          className="flex-1 bg-secondary border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
          {KEY_OPTIONS.map(k => (
            <option key={k.code} value={k.code} disabled={allStreamKeys.includes(k.code) && k.code !== thisKey}>
              {k.display}
            </option>
          ))}
        </select>
        {showPositionKey && (
          <>
            <span className="text-xs font-mono text-muted-foreground/60 w-8 text-right">POS</span>
            <select
              value={positionKeyCode}
              onChange={e => onPositionKeyChange(e.target.value)}
              className="flex-1 bg-secondary border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
              {KEY_OPTIONS.map(k => (
                <option key={k.code} value={k.code} disabled={allStreamKeys.includes(k.code) && k.code !== thisPositionKey}>
                  {k.display}
                </option>
              ))}
            </select>
          </>
        )}
        {onRemove && (
          <button onClick={onRemove}
            className="w-6 h-6 rounded bg-secondary border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 flex items-center justify-center transition-colors text-sm shrink-0">
            ×
          </button>
        )}
      </div>
    </div>
  );
}

export default function StartScreen({ onStart, suggestedN, lastSettings }) {
  const allCats = Object.keys(RELATIONSHIP_CATEGORIES);
  const allRels = Object.values(RELATIONSHIP_CATEGORIES).flat();
  const savedRels = (lastSettings?.rels || []).filter(rel => allRels.includes(rel));

  const [nLevel, setNLevel] = React.useState(suggestedN || lastSettings?.n || 2);
  const [modes, setModes] = React.useState(lastSettings?.modes || []);

  // Multi-stream config: stream A key + extra streams
  const [streamAKey, setStreamAKey] = React.useState(
    lastSettings?.streamA?.key || 'Space'
  );
  const [streamAPositionKey, setStreamAPositionKey] = React.useState(
    lastSettings?.streamA?.positionKey || 'KeyP'
  );
  const [extraStreams, setExtraStreams] = React.useState(
    lastSettings?.extraStreams || []
  );

  const [alienSettings, setAlienSettings] = React.useState(lastSettings?.alienSettings || {
    cubeDirection: 'cw',
    cubeSpeed: 1,
    cubeSpeedMode: 'fixed',
    squareDirection: 'cw',
    squareSpeed: 1,
    squareSpeedMode: 'fixed',
    tesseractDirection: 'cw',
    tesseractSpeed: 1,
    tesseractSpeedMode: 'fixed',
  });
  const [carouselSettings, setCarouselSettings] = React.useState({
    enabled: true,
    streamsPerSlide: 'auto',
    slideMs: 2800,
    ...(lastSettings?.carouselSettings || {}),
  });
  const alienModeActive = modes.includes('alien_cube') || modes.includes('alien_tesseract') || modes.includes('alien_square');

  // extra stream: { key, keyDisplay, positionKey, positionKeyDisplay, label }
  const allStreamKeys = [streamAKey, ...(alienModeActive ? [streamAPositionKey] : []), ...extraStreams.flatMap(s => [s.key, ...(alienModeActive ? [s.positionKey] : [])]).filter(Boolean)];
  const addStream = () => {
    if (1 + extraStreams.length >= MAX_STREAMS) return;
    const nextLabel = STREAM_LABELS[1 + extraStreams.length];
    const available = KEY_OPTIONS.find(k => !allStreamKeys.includes(k.code));
    const positionAvailable = KEY_OPTIONS.find(k => k.code !== available?.code && !allStreamKeys.includes(k.code));
    if (!available) return;
    setExtraStreams(prev => [...prev, { key: available.code, keyDisplay: available.display, positionKey: positionAvailable?.code || available.code, positionKeyDisplay: positionAvailable?.display || available.display, label: nextLabel }]);
  };
  const removeStream = (idx) => {
    setExtraStreams(prev => prev.filter((_, i) => i !== idx));
  };
  const setStreamKey = (idx, code) => {
    const opt = KEY_OPTIONS.find(k => k.code === code);
    if (!opt) return;
    setExtraStreams(prev => prev.map((s, i) => i === idx ? { ...s, key: opt.code, keyDisplay: opt.display } : s));
  };
  const setStreamPositionKey = (idx, code) => {
    const opt = KEY_OPTIONS.find(k => k.code === code);
    if (!opt) return;
    setExtraStreams(prev => prev.map((s, i) => i === idx ? { ...s, positionKey: opt.code, positionKeyDisplay: opt.display } : s));
  };
  const updateAlienSetting = (key, value) => setAlienSettings(prev => ({ ...prev, [key]: value }));
  const [showRelTypes, setShowRelTypes] = React.useState(false);
  const [rounds, setRounds] = React.useState(lastSettings?.rounds || 20);
  const [speedMs, setSpeedMs] = React.useState(lastSettings?.speedMs || 2800);
  const [noobMode, setNoobMode] = React.useState(lastSettings?.noobMode || false);

  // Category mix weights (0–100 sliders, equal by default)
  const [catWeights, setCatWeights] = React.useState(
    lastSettings?.catWeights || { SPATIAL: 20, SPATIAL_3D: 15, TRAIT: 20, QUANT: 20, VERBAL: 10, SOUND: 15 }
  );
  const [useCustomMix, setUseCustomMix] = React.useState(lastSettings?.useCustomMix || false);
  const [showStimuliMix, setShowStimuliMix] = React.useState(false);

  // Token type weights for verbal stimuli
  const [tokenWeights, setTokenWeightsState] = React.useState(() => {
    const defaults = getTokenWeights();
    const saved = lastSettings?.tokenWeights || {};
    return { ...defaults, ...saved };
  });
  const [showTokenMix, setShowTokenMix] = React.useState(false);
  const [showEnhancementModes, setShowEnhancementModes] = React.useState(false);

  const TOKEN_META = [
    { id: 'meaningful',    label: 'Words',       color: '#22d3ee', desc: 'Real words (sun, fire, mind…)' },
    { id: 'nonsense',      label: 'Nonsense',    color: '#a78bfa', desc: 'Pronounceable but meaningless (blim, quor…)' },
    { id: 'garbage',       label: 'Garbage',     color: '#f87171', desc: 'Random letter strings (xqz, bvp…)' },
    { id: 'emoji',         label: 'Emoji',       color: '#fbbf24', desc: 'Emoji symbols (🔥, 💧, 🌀…)' },
    { id: 'voronoi_emoji', label: 'Abstract',    color: '#34d399', desc: 'Geometric unicode symbols (◈, ⬡, ⟐…)' },
    { id: 'random_string', label: 'Random Str',  color: '#fb923c', desc: 'Alphanumeric codes (Xk3F, aB9z…)' },
    { id: 'voronoi',       label: 'Voronoi',     color: '#f472b6', desc: 'Mini Voronoi cell diagrams as tokens' },
  ];

  const setTokenWeight = (id, val) => setTokenWeightsState(prev => ({ ...prev, [id]: Number(val) }));
  const totalTW = Object.values(tokenWeights).reduce((s, v) => s + v, 0);
  const tokenPct = (id) => totalTW > 0 ? Math.round((tokenWeights[id] / totalTW) * 100) : 0;

  // Selected individual relationships
  const [enabledRels, setEnabledRels] = React.useState(
    savedRels.length ? new Set(savedRels) : new Set(allRels)
  );
  // Derive enabled cats from enabled rels
  const [enabledCats, setEnabledCats] = React.useState(() => {
    const initRels = savedRels.length ? new Set(savedRels) : new Set(allRels);
    return new Set(allCats.filter(cat =>
      RELATIONSHIP_CATEGORIES[cat].some(r => initRels.has(r))
    ));
  });

  const toggleMode = (id) => {
    const opt = MODE_OPTIONS.find(m => m.id === id);
    const isActive = modes.includes(id);
    if (!isActive) {
      if (opt?.minN && nLevel < opt.minN) setNLevel(opt.minN);
      // Enforce stream requirement
      if (opt?.minStreams && (1 + extraStreams.length) < opt.minStreams) {
        // Auto-add a stream if missing
        const available = KEY_OPTIONS.find(k => ![streamAKey, ...extraStreams.map(s => s.key)].includes(k.code));
        if (available) setExtraStreams(prev => [...prev, { key: available.code, keyDisplay: available.display, label: STREAM_LABELS[1 + prev.length] || String(2 + prev.length) }]);
      }
      // Remove conflicting modes from exclusive groups
      const toRemove = new Set();
      EXCLUSIVE_GROUPS.forEach(group => {
        if (group.includes(id)) group.forEach(m => { if (m !== id) toRemove.add(m); });
      });
      setModes(prev => {
        const newModes = [...prev.filter(m => !toRemove.has(m)), id];
        
        // Auto-filter only for modes that can generate RINT trials
        const isRINTMode = newModes.includes('rint') || newModes.includes('mixed_rint') || newModes.includes('impossible');
        if (isRINTMode) {
          const filtered = filterTransitiveRelationships([...enabledRels], true, false);
          setEnabledRels(new Set(filtered));
        }
        
        return newModes;
      });
    } else {
      setModes(prev => prev.filter(m => m !== id));
    }
  };

  const toggleCat = (cat) => {
    const members = RELATIONSHIP_CATEGORIES[cat];
    const allOn = members.every(r => enabledRels.has(r));
    const next = new Set(enabledRels);
    if (allOn) {
      // only allow deselect if other cats remain
      const otherEnabled = [...next].filter(r => !members.includes(r));
      if (otherEnabled.length === 0) return;
      members.forEach(r => next.delete(r));
      setEnabledCats(prev => { const s = new Set(prev); s.delete(cat); return s; });
    } else {
      members.forEach(r => next.add(r));
      setEnabledCats(prev => new Set([...prev, cat]));
    }
    setEnabledRels(next);
  };

  const toggleRel = (rel, cat) => {
    const next = new Set(enabledRels);
    if (next.has(rel)) {
      // prevent disabling last one
      if (next.size === 1) return;
      next.delete(rel);
    } else {
      next.add(rel);
    }
    setEnabledRels(next);
    // sync cat toggle state
    const members = RELATIONSHIP_CATEGORIES[cat];
    const anyOn = members.some(r => next.has(r));
    setEnabledCats(prev => {
      const s = new Set(prev);
      if (anyOn) s.add(cat); else s.delete(cat);
      return s;
    });
  };

  const selectedRels = [...enabledRels];
  const totalRels = Object.values(RELATIONSHIP_CATEGORIES).flat().length;
  const streamCount = 1 + extraStreams.length;
  const soundOnlySelection = streamCount >= 2 && selectedRels.length > 0 && selectedRels.every(rel => RELATIONSHIP_CATEGORIES.SOUND.includes(rel));

  // Build final pool (weighted or flat)
  const mixedPool = useCustomMix ? buildWeightedPool(enabledRels, catWeights) : selectedRels;
  const finalPool = mixedPool;

  const setCatWeight = (cat, val) => setCatWeights(prev => ({ ...prev, [cat]: Number(val) }));

  // Normalize weights to show % of total
  const totalW = Object.values(catWeights).reduce((s, v) => s + v, 0);
  const normalizedPct = (cat) => totalW > 0 ? Math.round((catWeights[cat] / totalW) * 100) : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
      <div className="max-w-lg w-full space-y-5">

        {/* Title */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-3 mb-1">
            <Brain className="w-7 h-7 text-primary" />
            <h1 className="text-3xl font-mono font-bold tracking-tight text-foreground">GOATED Relational n Back</h1>
          </div>
          <p className="text-xs font-mono text-muted-foreground max-w-md mx-auto">
            Match the abstract <span className="text-primary">relationship</span> from{' '}
            <span className="text-primary">N</span> steps ago.
          </p>
          {suggestedN && suggestedN !== 2 && (
            <p className="text-xs font-mono text-accent">↑ Adaptive suggestion: N={suggestedN}</p>
          )}
        </div>

        {/* N-Level spinner */}
        <div className="space-y-2">
          <label className="block text-xs font-mono text-muted-foreground uppercase tracking-widest text-center" title="How many trials back you must remember. N=2 means match what appeared 2 trials ago.">
            N-Level {modes.includes('variable_n') && <span className="text-primary/60 normal-case">(base)</span>}
          </label>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setNLevel(n => Math.max(1, n - 1))}
              className="w-10 h-10 rounded-lg bg-secondary border border-border text-muted-foreground hover:border-muted-foreground/50 flex items-center justify-center transition-colors">
              <Minus className="w-4 h-4" />
            </button>
            <div className="w-20 h-12 rounded-xl bg-primary/15 border-2 border-primary flex items-center justify-center">
              <span className="font-mono text-2xl font-bold text-primary">{nLevel}</span>
            </div>
            <button
              onClick={() => setNLevel(n => n + 1)}
              className="w-10 h-10 rounded-lg bg-secondary border border-border text-muted-foreground hover:border-muted-foreground/50 flex items-center justify-center transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Relationship Type Selector */}
        <div className="space-y-2">
          <button
            onClick={() => setShowRelTypes(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/50 border border-border hover:border-muted-foreground/40 transition-colors">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              Relationship Types
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-primary">{selectedRels.length}/{totalRels}</span>
              {showRelTypes ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
            </div>
          </button>

          <AnimatePresence>
            {showRelTypes && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden">
                <div className="space-y-3 pt-1">
                  {Object.entries(RELATIONSHIP_CATEGORIES).map(([cat, members]) => {
                    const meta = CATEGORY_META[cat];
                    if (!meta) return null; // Skip categories without metadata

                    // Only RINT-capable modes require transitive relationships
                    const isRINTMode = modes.includes('rint') || modes.includes('mixed_rint') || modes.includes('impossible');
                    const restrictedRels = isRINTMode
                      ? new Set(filterTransitiveRelationships(members, true, false))
                      : new Set(members);

                    const allOn = members.every(r => enabledRels.has(r) && restrictedRels.has(r));
                    const someOn = members.some(r => enabledRels.has(r) && restrictedRels.has(r));
                    return (
                      <div key={cat} className={`rounded-lg border p-3 space-y-2 ${someOn ? meta.border : 'border-border'} ${someOn ? meta.bg : 'bg-secondary/20'}`}>
                        {/* Category header toggle */}
                        <div className="flex items-center justify-between">
                          <button onClick={() => toggleCat(cat)}
                            className="flex items-center gap-2">
                            <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-colors
                              ${allOn ? `${meta.bg} ${meta.border}` : someOn ? `${meta.bg} ${meta.border}` : 'border-border bg-transparent'}`}>
                              {allOn && <div className={`w-1.5 h-1.5 rounded-sm ${meta.color.replace('text-', 'bg-')}`} />}
                              {!allOn && someOn && <div className="w-1.5 h-0.5 bg-amber-400 rounded" />}
                            </div>
                            <span className={`text-xs font-mono font-semibold ${meta.color}`}>{meta.label}</span>
                            <span className="text-xs font-mono text-muted-foreground">
                              ({members.filter(r => enabledRels.has(r) && restrictedRels.has(r)).length}/{restrictedRels.size})
                            </span>
                          </button>
                        </div>
                        {/* Individual toggles */}
                        <div className="flex flex-wrap gap-1.5">
                          {members.map(rel => {
                            const on = enabledRels.has(rel);
                            const allowed = restrictedRels.has(rel);
                            const disabled = !allowed && isRINTMode;
                            return (
                              <button key={rel} onClick={() => allowed && toggleRel(rel, cat)}
                                disabled={disabled}
                                className={`px-2 py-0.5 rounded text-xs font-mono transition-all border
                                  ${disabled ? 'border-border/30 text-muted-foreground/30 cursor-not-allowed' : on ? `${meta.bg} ${meta.border} ${meta.color}` : 'border-border text-muted-foreground/50 hover:border-muted-foreground/30'}`}>
                                {REL_DISPLAY[rel] || rel}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stimuli Mix */}
        <div className="space-y-2">
          <div
            onClick={() => setShowStimuliMix(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/50 border border-border hover:border-muted-foreground/40 transition-colors cursor-pointer">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Stimuli Mix</span>
            <div className="flex items-center gap-2">
              <button
                onClick={e => { e.stopPropagation(); setUseCustomMix(v => !v); }}
                className={`px-2 py-0.5 rounded text-xs font-mono border transition-all ${useCustomMix ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground'}`}>
                {useCustomMix ? 'Custom' : 'Equal'}
              </button>
              {showStimuliMix ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
            </div>
          </div>

          <AnimatePresence>
            {showStimuliMix && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden">
                <div className="space-y-3 pt-1 px-1">
                  {Object.entries(CATEGORY_META).map(([cat, meta]) => {
                    const members = RELATIONSHIP_CATEGORIES[cat];
                    if (!members) return null; // Skip if category doesn't exist
                    const hasMembersEnabled = members.some(r => enabledRels.has(r));
                    if (!hasMembersEnabled) return null;
                    const pct = normalizedPct(cat);
                    const accentColor = cat === 'SPATIAL' ? '#22d3ee' : cat === 'TRAIT' ? '#a78bfa' : cat === 'QUANT' ? '#fbbf24' : '#34d399';
                    return (
                      <div key={cat} className={`space-y-1 rounded-lg p-2 border ${useCustomMix ? meta.border + ' ' + meta.bg : 'border-border bg-secondary/20'}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-mono font-semibold ${meta.color}`}>{meta.label}</span>
                          <span className="text-xs font-mono text-muted-foreground">{useCustomMix ? `${pct}%` : 'equal'}</span>
                        </div>
                        {useCustomMix && (
                          <div className="flex items-center gap-2 md:gap-3">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={catWeights[cat] ?? 25}
                              onChange={e => setCatWeight(cat, e.target.value)}
                              className="hidden md:flex flex-1 h-1.5 rounded-full cursor-pointer"
                              style={{ accentColor }}
                            />
                            <div className="flex gap-1 flex-1 md:flex-none">
                              <button onClick={() => setCatWeight(cat, Math.max(0, (catWeights[cat] ?? 25) - 5))}
                                className="flex-1 md:w-5 h-8 md:h-5 rounded bg-secondary border border-border text-muted-foreground hover:border-muted-foreground/50 flex items-center justify-center text-xs md:text-xs transition-colors font-semibold">−</button>
                              <button onClick={() => setCatWeight(cat, Math.min(100, (catWeights[cat] ?? 25) + 5))}
                                className="flex-1 md:w-5 h-8 md:h-5 rounded bg-secondary border border-border text-muted-foreground hover:border-muted-foreground/50 flex items-center justify-center text-xs md:text-xs transition-colors font-semibold">+</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <p className="text-xs font-mono text-muted-foreground/50">Toggle "Equal/Custom" to bias category frequencies. Weights are relative.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Token Mix (for verbal stimuli) */}
        <div className="space-y-2">
          <button
            onClick={() => setShowTokenMix(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/50 border border-border hover:border-muted-foreground/40 transition-colors">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Token Style Mix</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-primary/70 truncate max-w-[160px]">
                {TOKEN_META.filter(t => tokenWeights[t.id] > 0).map(t => `${t.label} ${tokenPct(t.id)}%`).join(' · ')}
              </span>
              {showTokenMix ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
            </div>
          </button>

          <AnimatePresence>
            {showTokenMix && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden">
                <div className="space-y-3 pt-1 px-1">
                  {TOKEN_META.map(({ id, label, color, desc }) => (
                    <div key={id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-mono font-semibold" style={{ color }}>{label}</span>
                          <span className="hidden md:inline text-xs font-mono text-muted-foreground/50 ml-2">{desc}</span>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">{tokenPct(id)}%</span>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={tokenWeights[id]}
                          onChange={e => setTokenWeight(id, e.target.value)}
                          className="hidden md:flex flex-1 h-1.5 rounded-full cursor-pointer"
                          style={{ accentColor: color }}
                        />
                        <div className="flex gap-1 flex-1 md:flex-none">
                          <button onClick={() => setTokenWeight(id, Math.max(0, tokenWeights[id] - 5))}
                            className="flex-1 md:w-5 h-8 md:h-5 rounded bg-secondary border border-border text-muted-foreground hover:border-muted-foreground/50 flex items-center justify-center text-xs transition-colors font-semibold">−</button>
                          <button onClick={() => setTokenWeight(id, Math.min(100, tokenWeights[id] + 5))}
                            className="flex-1 md:w-5 h-8 md:h-5 rounded bg-secondary border border-border text-muted-foreground hover:border-muted-foreground/50 flex items-center justify-center text-xs transition-colors font-semibold">+</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs font-mono text-muted-foreground/50">Controls token style in verbal stimuli. Set to 0 to disable a type.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Streams */}
        <div className="space-y-2">
          <label className="block text-xs font-mono text-muted-foreground uppercase tracking-widest">Streams</label>
          <div className="space-y-2">
            {/* Stream A */}
            <StreamRow
              label="Stream A" labelColor="text-primary" borderColor="border-primary/20"
              keyCode={streamAKey} positionKeyCode={streamAPositionKey} showPositionKey={alienModeActive}
              onKeyChange={setStreamAKey} onPositionKeyChange={setStreamAPositionKey}
              allStreamKeys={allStreamKeys} thisKey={streamAKey} thisPositionKey={streamAPositionKey}
            />
            {/* Extra streams */}
            {extraStreams.map((stream, idx) => {
              const label = STREAM_LABELS[1 + idx] || String(2 + idx);
              const color = STREAM_COLORS[1 + idx] || 'text-primary';
              const border = 'border-accent/20';
              return (
                <StreamRow key={idx}
                  label={`Stream ${label}`} labelColor={color} borderColor={border}
                  keyCode={stream.key} positionKeyCode={stream.positionKey || stream.key} showPositionKey={alienModeActive}
                  onKeyChange={code => setStreamKey(idx, code)} onPositionKeyChange={code => setStreamPositionKey(idx, code)}
                  allStreamKeys={allStreamKeys} thisKey={stream.key} thisPositionKey={stream.positionKey}
                  onRemove={() => removeStream(idx)}
                />
              );
            })}
            {/* Add stream button */}
            <button onClick={addStream}
              disabled={1 + extraStreams.length >= MAX_STREAMS}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 border border-dashed border-border hover:border-muted-foreground/40 text-xs font-mono text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <Plus className="w-3.5 h-3.5" />
              {1 + extraStreams.length >= MAX_STREAMS ? 'Max Streams Reached' : 'Add Stream'}
            </button>
          </div>
        </div>

        {/* Alien Settings */}
        {alienModeActive && (
          <div className="space-y-3 rounded-lg bg-secondary/30 border border-border p-3">
            <label className="block text-xs font-mono text-muted-foreground uppercase tracking-widest">Alien Rotation</label>
            {[
              { id: 'cube', label: 'Cube', active: modes.includes('alien_cube') },
              { id: 'tesseract', label: 'Tesseract', active: modes.includes('alien_tesseract') },
              { id: 'square', label: 'Square', active: modes.includes('alien_square') },
            ].filter(item => item.active).map(item => (
              <div key={item.id} className="space-y-2">
                <div className="grid grid-cols-3 gap-1 rounded border border-border overflow-hidden">
                  {['cw', 'ccw', 'random'].map(dir => (
                    <button key={dir} onClick={() => updateAlienSetting(`${item.id}Direction`, dir)}
                      className={`px-2 py-1 text-xs font-mono ${alienSettings[`${item.id}Direction`] === dir ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}>
                      {dir === 'cw' ? 'Clockwise' : dir === 'ccw' ? 'Counter' : 'Random'}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center">
                  <button onClick={() => updateAlienSetting(`${item.id}SpeedMode`, alienSettings[`${item.id}SpeedMode`] === 'random' ? 'fixed' : 'random')}
                    className={`px-2 py-1 rounded border text-xs font-mono ${alienSettings[`${item.id}SpeedMode`] === 'random' ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground'}`}>
                    {alienSettings[`${item.id}SpeedMode`] === 'random' ? 'Random Speed' : 'Fixed Speed'}
                  </button>
                  <input type="range" min="0.25" max="3" step="0.25" value={alienSettings[`${item.id}Speed`] || 1}
                    disabled={alienSettings[`${item.id}SpeedMode`] === 'random'}
                    onChange={e => updateAlienSetting(`${item.id}Speed`, Number(e.target.value))}
                    className="h-1.5 disabled:opacity-40" />
                  <span className="text-xs font-mono text-primary w-16 text-right">
                    {alienSettings[`${item.id}SpeedMode`] === 'random' ? '0.25–3×' : `${alienSettings[`${item.id}Speed`] || 1}×`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Carousel */}
        <div className="space-y-2 rounded-lg bg-secondary/30 border border-border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-widest">Automated Carousel</label>
              <p className="text-xs font-mono text-muted-foreground/50 mt-1">Splits many streams into timed slides, then unlocks responses after all slides.</p>
            </div>
            <button
              onClick={() => setCarouselSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
              className="grid grid-cols-2 rounded-lg border border-border bg-background/60 p-0.5 text-xs font-mono shrink-0"
            >
              <span className={`px-2.5 py-1 rounded-md transition-colors ${!carouselSettings.enabled ? 'bg-secondary text-foreground' : 'text-muted-foreground/50'}`}>Off</span>
              <span className={`px-2.5 py-1 rounded-md transition-colors ${carouselSettings.enabled ? 'bg-primary text-primary-foreground' : 'text-muted-foreground/50'}`}>On</span>
            </button>
          </div>
          {carouselSettings.enabled && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-1 rounded border border-border overflow-hidden">
                {['auto', 6, 8, 10, 12, 15].map(value => (
                  <button key={value} onClick={() => setCarouselSettings(prev => ({ ...prev, streamsPerSlide: value }))}
                    className={`px-2 py-1 text-xs font-mono ${carouselSettings.streamsPerSlide === value ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}>
                    {value === 'auto' ? 'Auto' : `${value}/slide`}
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-mono text-muted-foreground/60 uppercase tracking-widest">Carousel Speed</label>
                <div className="grid grid-cols-4 gap-1">
                  {CAROUSEL_SPEED_OPTIONS.map(opt => (
                    <button key={opt.ms} onClick={() => setCarouselSettings(prev => ({ ...prev, slideMs: opt.ms }))}
                      className={`px-2 py-1.5 rounded text-xs font-mono transition-all border ${carouselSettings.slideMs === opt.ms ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground/40'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Session Length & Speed */}
        <div className="grid grid-cols-2 gap-3">
          {/* Trials */}
          <div className="space-y-2">
            <label className="block text-xs font-mono text-muted-foreground uppercase tracking-widest text-center" title="Total number of stimuli presented in the session.">Trials</label>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setRounds(r => Math.max(1, r - 1))}
                className="w-8 h-8 rounded-lg bg-secondary border border-border text-muted-foreground hover:border-muted-foreground/50 flex items-center justify-center transition-colors">
                <Minus className="w-3.5 h-3.5" />
              </button>
              <div className="w-16 h-10 rounded-lg bg-secondary/80 border border-border flex items-center justify-center">
                <span className="font-mono text-lg font-bold text-foreground">{rounds}</span>
              </div>
              <button
                onClick={() => setRounds(r => r + 1)}
                className="w-8 h-8 rounded-lg bg-secondary border border-border text-muted-foreground hover:border-muted-foreground/50 flex items-center justify-center transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Speed */}
          <div className="space-y-2">
            <label className="block text-xs font-mono text-muted-foreground uppercase tracking-widest text-center" title="Time each stimulus is shown before disappearing.">Speed</label>
            <div className="grid grid-cols-2 gap-1">
              {SPEED_OPTIONS.map(opt => (
                <button key={opt.ms} onClick={() => setSpeedMs(opt.ms)}
                  className={`px-2 py-1.5 rounded text-xs font-mono transition-all border
                    ${speedMs === opt.ms ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground/40'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Enhancement Modes */}
        <div className="space-y-2">
          <button
            onClick={() => setShowEnhancementModes(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/50 border border-border hover:border-muted-foreground/40 transition-colors">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Enhancement Modes</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-primary">{modes.length} active</span>
              {showEnhancementModes ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
            </div>
          </button>

          <AnimatePresence>
            {showEnhancementModes && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden">
                <div className="grid grid-cols-1 gap-2 pt-1">
            {MODE_OPTIONS.map(({ id, icon: Icon, label, desc, minN, minStreams }) => {
              const active = modes.includes(id);
              const needsHigherN = minN && nLevel < minN;
              const needsMoreStreams = minStreams && (1 + extraStreams.length) < minStreams;
              // Check if this mode is blocked by an active exclusive mode
              const blockedBy = !active && EXCLUSIVE_GROUPS.some(g => g.includes(id) && g.some(m => m !== id && modes.includes(m)))
                ? EXCLUSIVE_GROUPS.find(g => g.includes(id) && g.some(m => m !== id && modes.includes(m)))?.find(m => m !== id && modes.includes(m))
                : null;
              return (
                <button key={id} onClick={() => toggleMode(id)}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all duration-150
                    ${active ? 'border-primary bg-primary/10' : blockedBy ? 'border-border bg-secondary/20 opacity-50' : 'border-border bg-secondary/40 hover:border-muted-foreground/40'}`}>
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-mono font-semibold ${active ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
                      {minN && (
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${needsHigherN ? 'border-amber-500/40 text-amber-400 bg-amber-500/10' : 'border-border text-muted-foreground/50'}`}>
                          N≥{minN}
                        </span>
                      )}
                      {minStreams && (
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${needsMoreStreams ? 'border-amber-500/40 text-amber-400 bg-amber-500/10' : 'border-border text-muted-foreground/50'}`}>
                          ≥{minStreams} streams
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground/60 mt-0.5">{desc}</div>
                    {active && needsHigherN && <div className="text-xs font-mono text-amber-400 mt-1">↑ N bumped to {minN}</div>}
                    {active && needsMoreStreams && <div className="text-xs font-mono text-amber-400 mt-1">↑ Stream added automatically</div>}
                    {blockedBy && <div className="text-xs font-mono text-muted-foreground/40 mt-1">conflicts with {blockedBy.replace(/_/g,' ')}</div>}
                  </div>
                </button>
              );
            })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls hint */}
        <div className="text-center">
          <div className="inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/70 border border-border justify-center">
            <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-xs font-mono text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-semibold">
                {KEY_OPTIONS.find(k => k.code === streamAKey)?.display || 'SPACE'}
              </kbd> = Stream A REL
              {alienModeActive && <>{' '}<kbd className="px-1.5 py-0.5 rounded bg-muted text-amber-400 font-semibold">{KEY_OPTIONS.find(k => k.code === streamAPositionKey)?.display || 'P'}</kbd> = Stream A POS</>}
              {extraStreams.map((s, i) => (
                <span key={i}>
                  {' '}&nbsp;<kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-semibold">{s.keyDisplay}</kbd> = Stream {STREAM_LABELS[1 + i]} REL
                  {alienModeActive && <>{' '}<kbd className="px-1.5 py-0.5 rounded bg-muted text-amber-400 font-semibold">{s.positionKeyDisplay || s.keyDisplay}</kbd> = Stream {STREAM_LABELS[1 + i]} POS</>}
                </span>
              ))}

            </span>
          </div>
        </div>

        {/* Noob Mode Toggle */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/40 border border-border">
          <span className="text-xs font-mono text-muted-foreground">Noob Mode (manual next/prev)</span>
          <button
            onClick={() => setNoobMode(!noobMode)}
            className={`relative w-12 h-6 rounded-full transition-colors ${noobMode ? 'bg-primary' : 'bg-secondary border border-border'}`}
          >
            <div
              className={`absolute w-5 h-5 rounded-full bg-foreground transition-transform ${noobMode ? 'translate-x-6' : 'translate-x-0.5'}`}
              style={{ top: '2.5px' }}
            />
          </button>
        </div>

        {/* Start */}
        {soundOnlySelection && (
          <p className="text-center text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
            With 2+ streams, choose at least one non-sound relationship too.
          </p>
        )}
        <div className="flex justify-center pb-4">
          <Button
            disabled={soundOnlySelection}
            onClick={() => {
              if (soundOnlySelection) return;
              setTokenWeights(tokenWeights);
              const streamAObj = { key: streamAKey, keyDisplay: KEY_OPTIONS.find(k => k.code === streamAKey)?.display || 'SPACE' };
              const streamAWithPosition = { ...streamAObj, positionKey: streamAPositionKey, positionKeyDisplay: KEY_OPTIONS.find(k => k.code === streamAPositionKey)?.display || 'P' };
              onStart(nLevel, modes, finalPool, rounds, speedMs, { catWeights, useCustomMix, rels: selectedRels, tokenWeights, streamA: streamAWithPosition, extraStreams, streams: [streamAWithPosition, ...extraStreams], alienSettings, carouselSettings }, noobMode);
            }}
            className="h-12 px-10 font-mono font-semibold text-sm tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
            Start Training
          </Button>
        </div>

      </div>
    </motion.div>
  );
}