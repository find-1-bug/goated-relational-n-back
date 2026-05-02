import React from 'react';
import { Button } from '@/components/ui/button';
import { Brain, Zap, TrendingUp, Layers, GitBranch, Shuffle, ChevronDown, ChevronUp, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RELATIONSHIP_CATEGORIES } from '@/lib/gameConstants';

const MODE_OPTIONS = [
  { id: 'variable_n',   icon: Shuffle,    label: 'Variable N',   desc: 'N changes randomly each trial (±1 around your chosen N). Forces flexible updating.' },
  { id: 'adaptive',     icon: TrendingUp, label: 'Adaptive N',   desc: 'N auto-adjusts between sessions based on accuracy (≥80% → up, ≤50% → down)' },
  { id: 'dual',         icon: Layers,     label: 'Dual Stream',  desc: 'Track two independent relationship streams simultaneously (SPACE + A)' },
  { id: 'hierarchical', icon: GitBranch,  label: 'Hierarchical', desc: 'Also track relationship category N-back (L)' },
  { id: 'distractors',  icon: Shuffle,    label: 'Distractors',  desc: 'Near-match stimuli from the same category create interference' },
];

const CATEGORY_META = {
  SPATIAL: { label: 'Spatial',      color: 'text-cyan-400',   border: 'border-cyan-400/40',   bg: 'bg-cyan-400/10'  },
  TRAIT:   { label: 'Trait',        color: 'text-violet-400', border: 'border-violet-400/40', bg: 'bg-violet-400/10' },
  QUANT:   { label: 'Quantitative', color: 'text-amber-400',  border: 'border-amber-400/40',  bg: 'bg-amber-400/10' },
  VERBAL:  { label: 'Verbal',       color: 'text-emerald-400',border: 'border-emerald-400/40',bg: 'bg-emerald-400/10' },
};

const REL_DISPLAY = {
  // Spatial
  INSIDE: 'Inside', OVERLAPPING: 'Overlapping', TOUCHING: 'Touching',
  ABOVE_BELOW: 'Above/Below', DIAGONAL: 'Diagonal', BETWEEN: 'Between',
  SURROUNDED: 'Surrounded', LEFT_RIGHT: 'Left/Right', STACKED: 'Stacked',
  NESTED_3: 'Nested 3', MIRRORED: 'Mirrored', SCATTERED: 'Scattered',
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
};

const SPEED_OPTIONS = [
  { label: 'Slow',   ms: 4000 },
  { label: 'Normal', ms: 2800 },
  { label: 'Fast',   ms: 1800 },
  { label: 'Turbo',  ms: 1000 },
];

export default function StartScreen({ onStart, suggestedN }) {
  const [nLevel, setNLevel] = React.useState(suggestedN || 2);
  const [modes, setModes] = React.useState([]);
  const [showRelTypes, setShowRelTypes] = React.useState(false);
  const [rounds, setRounds] = React.useState(20);
  const [speedMs, setSpeedMs] = React.useState(2800);

  // Selected categories (all on by default)
  const allCats = Object.keys(RELATIONSHIP_CATEGORIES);
  const [enabledCats, setEnabledCats] = React.useState(new Set(allCats));
  // Selected individual relationships (all on by default)
  const [enabledRels, setEnabledRels] = React.useState(
    new Set(Object.values(RELATIONSHIP_CATEGORIES).flat())
  );

  const toggleMode = (id) =>
    setModes(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);

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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
      <div className="max-w-lg w-full space-y-5">

        {/* Title */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-3 mb-1">
            <Brain className="w-7 h-7 text-primary" />
            <h1 className="text-3xl font-mono font-bold tracking-tight text-foreground">Relational N-Back</h1>
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
                    const allOn = members.every(r => enabledRels.has(r));
                    const someOn = members.some(r => enabledRels.has(r));
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
                              ({members.filter(r => enabledRels.has(r)).length}/{members.length})
                            </span>
                          </button>
                        </div>
                        {/* Individual toggles */}
                        <div className="flex flex-wrap gap-1.5">
                          {members.map(rel => {
                            const on = enabledRels.has(rel);
                            return (
                              <button key={rel} onClick={() => toggleRel(rel, cat)}
                                className={`px-2 py-0.5 rounded text-xs font-mono transition-all border
                                  ${on ? `${meta.bg} ${meta.border} ${meta.color}` : 'border-border text-muted-foreground/50 hover:border-muted-foreground/30'}`}>
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
          <label className="block text-xs font-mono text-muted-foreground uppercase tracking-widest">Enhancement Modes</label>
          <div className="grid grid-cols-1 gap-2">
            {MODE_OPTIONS.map(({ id, icon: Icon, label, desc }) => {
              const active = modes.includes(id);
              return (
                <button key={id} onClick={() => toggleMode(id)}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all duration-150
                    ${active ? 'border-primary bg-primary/10' : 'border-border bg-secondary/40 hover:border-muted-foreground/40'}`}>
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <div className={`text-xs font-mono font-semibold ${active ? 'text-primary' : 'text-muted-foreground'}`}>{label}</div>
                    <div className="text-xs font-mono text-muted-foreground/60 mt-0.5">{desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls hint */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/70 border border-border">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-mono text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-semibold">SPACE</kbd> = Match A
              {modes.includes('dual') && <> &nbsp;<kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-semibold">A</kbd> = Match B</>}
              {modes.includes('hierarchical') && <> &nbsp;<kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-semibold">L</kbd> = Category</>}
            </span>
          </div>
        </div>

        {/* Start */}
        <div className="flex justify-center pb-4">
          <Button
            onClick={() => onStart(nLevel, modes, selectedRels, rounds, speedMs)}
            className="h-12 px-10 font-mono font-semibold text-sm tracking-wide bg-primary text-primary-foreground hover:bg-primary/90">
            Start Training
          </Button>
        </div>

      </div>
    </motion.div>
  );
}