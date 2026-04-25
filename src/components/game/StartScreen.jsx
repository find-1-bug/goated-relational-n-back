import React from 'react';
import { Button } from '@/components/ui/button';
import { Brain, Zap, TrendingUp, Layers, GitBranch, Shuffle } from 'lucide-react';
import { motion } from 'framer-motion';

const N_LEVELS = [1, 2, 3, 4, 5];

const RELATIONSHIP_DESCRIPTIONS = [
  { name: 'INSIDE', desc: 'A is contained within B' },
  { name: 'OVERLAPPING', desc: 'A and B intersect partially' },
  { name: 'TOUCHING', desc: 'A and B sit flush, no overlap' },
  { name: 'SIZE_MISMATCH', desc: 'A is 3x+ larger than B' },
  { name: 'HOLLOW vs SOLID', desc: 'One filled, one outline only' },
  { name: 'SHARED TRAIT', desc: 'Same color OR same shape only' },
  { name: 'ONE to MANY', desc: '1 of A, 3 of B' },
  { name: 'ABOVE / BELOW', desc: 'A is strictly above or below B' },
  { name: 'DIAGONAL', desc: 'A and B offset both axes' },
  { name: 'ROTATED', desc: 'Same shape, one rotated 45°' },
  { name: 'EQUAL COUNT', desc: '2 of A and 2 of B' },
  { name: 'TWO to ONE', desc: '2 of A, 1 of B' },
  { name: 'PYRAMID', desc: '1 on top, 2 below in a row' },
  { name: 'CONNECTED', desc: 'A line bridges A and B' },
  { name: 'SURROUNDED', desc: 'A is encircled by 4 copies of B' },
  { name: 'BETWEEN', desc: 'C sits between A and B' },
];

const MODE_OPTIONS = [
  {
    id: 'adaptive',
    icon: TrendingUp,
    label: 'Adaptive N',
    desc: 'N auto-adjusts based on your accuracy after each session',
  },
  {
    id: 'dual',
    icon: Layers,
    label: 'Dual Stream',
    desc: 'Track two independent relationship streams simultaneously (SPACE + A)',
  },
  {
    id: 'hierarchical',
    icon: GitBranch,
    label: 'Hierarchical',
    desc: 'Also track relationship category (Spatial / Trait / Quantitative) N-back (L)',
  },
  {
    id: 'distractors',
    icon: Shuffle,
    label: 'Distractors',
    desc: 'Near-match stimuli from the same category create interference',
  },
];

export default function StartScreen({ onStart, suggestedN }) {
  const [nLevel, setNLevel] = React.useState(suggestedN || 2);
  const [modes, setModes] = React.useState([]);

  const toggleMode = (id) => {
    setModes(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-screen px-4 py-8"
    >
      <div className="max-w-lg w-full space-y-6">
        {/* Title */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-1">
            <Brain className="w-7 h-7 text-primary" />
            <h1 className="text-3xl font-mono font-bold tracking-tight text-foreground">
              Relational N-Back
            </h1>
          </div>
          <p className="text-xs font-mono text-muted-foreground leading-relaxed max-w-md mx-auto">
            Match the abstract <span className="text-primary">relationship</span> between shapes from{' '}
            <span className="text-primary">N</span> steps ago.
          </p>
          {suggestedN && suggestedN !== 2 && (
            <p className="text-xs font-mono text-accent">
              ↑ Adaptive suggestion: N={suggestedN}
            </p>
          )}
        </div>

        {/* N-Level */}
        <div className="space-y-2">
          <label className="block text-xs font-mono text-muted-foreground uppercase tracking-widest text-center">
            N-Level
          </label>
          <div className="flex items-center justify-center gap-2">
            {N_LEVELS.map((n) => (
              <button
                key={n}
                onClick={() => setNLevel(n)}
                className={`w-13 h-13 rounded-lg font-mono text-xl font-bold transition-all duration-200 border-2 px-4 py-2
                  ${nLevel === n
                    ? 'bg-primary/15 border-primary text-primary shadow-lg shadow-primary/10'
                    : 'bg-secondary border-border text-muted-foreground hover:border-muted-foreground/50'
                  }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Mode Toggles */}
        <div className="space-y-2">
          <label className="block text-xs font-mono text-muted-foreground uppercase tracking-widest">
            Enhancement Modes
          </label>
          <div className="grid grid-cols-1 gap-2">
            {MODE_OPTIONS.map(({ id, icon: Icon, label, desc }) => {
              const active = modes.includes(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleMode(id)}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all duration-150
                    ${active
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-secondary/40 text-muted-foreground hover:border-muted-foreground/40'
                    }`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <div className={`text-xs font-mono font-semibold ${active ? 'text-primary' : ''}`}>{label}</div>
                    <div className="text-xs font-mono opacity-70 mt-0.5">{desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Relationship Reference */}
        <div className="bg-secondary/50 rounded-lg border border-border p-3 space-y-2">
          <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            Relationship Types ({RELATIONSHIP_DESCRIPTIONS.length})
          </h3>
          <div className="grid grid-cols-1 gap-1 max-h-36 overflow-y-auto pr-1">
            {RELATIONSHIP_DESCRIPTIONS.map((r) => (
              <div key={r.name} className="flex items-center gap-3 text-xs font-mono">
                <span className="text-primary font-semibold w-32 shrink-0">{r.name}</span>
                <span className="text-muted-foreground">{r.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/70 border border-border">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-mono text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-semibold">SPACE</kbd> = Match A
              {modes.includes('dual') && <> &nbsp; <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-semibold">A</kbd> = Match B</>}
              {modes.includes('hierarchical') && <> &nbsp; <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-semibold">L</kbd> = Category</>}
            </span>
          </div>
        </div>

        {/* Start */}
        <div className="flex justify-center">
          <Button
            onClick={() => onStart(nLevel, modes)}
            className="h-12 px-10 font-mono font-semibold text-sm tracking-wide bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Start Training
          </Button>
        </div>
      </div>
    </motion.div>
  );
}