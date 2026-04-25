import React from 'react';
import { Button } from '@/components/ui/button';
import { Brain, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const N_LEVELS = [1, 2, 3];

const RELATIONSHIP_DESCRIPTIONS = [
  { name: 'INSIDE', desc: 'A is contained within B' },
  { name: 'OVERLAPPING', desc: 'A and B intersect partially' },
  { name: 'TOUCHING', desc: 'A and B sit flush, no overlap' },
  { name: 'SIZE_MISMATCH', desc: 'A is 3x+ larger than B' },
  { name: 'HOLLOW vs SOLID', desc: 'One filled, one outline' },
  { name: 'SHARED TRAIT', desc: 'Same color OR same shape only' },
  { name: 'ONE to MANY', desc: '1 of A, 3 of B' },
];

export default function StartScreen({ onStart }) {
  const [nLevel, setNLevel] = React.useState(2);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-screen px-4 py-8"
    >
      <div className="max-w-lg w-full space-y-8">
        {/* Title */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Brain className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-mono font-bold tracking-tight text-foreground">
              Relational N-Back
            </h1>
          </div>
          <p className="text-sm font-mono text-muted-foreground leading-relaxed max-w-md mx-auto">
            Match the abstract <span className="text-primary">relationship</span> between shapes
            from <span className="text-primary">N</span> steps ago. Ignore colors, shapes, and positions.
          </p>
        </div>

        {/* N-Level Selector */}
        <div className="space-y-3">
          <label className="block text-xs font-mono text-muted-foreground uppercase tracking-widest text-center">
            Select N-Level
          </label>
          <div className="flex items-center justify-center gap-3">
            {N_LEVELS.map((n) => (
              <button
                key={n}
                onClick={() => setNLevel(n)}
                className={`
                  w-16 h-16 rounded-lg font-mono text-2xl font-bold transition-all duration-200 border-2
                  ${nLevel === n
                    ? 'bg-primary/15 border-primary text-primary shadow-lg shadow-primary/10'
                    : 'bg-secondary border-border text-muted-foreground hover:border-muted-foreground/50'
                  }
                `}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-xs font-mono text-muted-foreground text-center">
            Match relationship from {nLevel} turn{nLevel > 1 ? 's' : ''} ago
          </p>
        </div>

        {/* Relationship Reference */}
        <div className="bg-secondary/50 rounded-lg border border-border p-4 space-y-2">
          <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">
            Relationship Types
          </h3>
          <div className="grid grid-cols-1 gap-1.5">
            {RELATIONSHIP_DESCRIPTIONS.map((r) => (
              <div key={r.name} className="flex items-center gap-3 text-xs font-mono">
                <span className="text-primary font-semibold w-28 shrink-0">{r.name}</span>
                <span className="text-muted-foreground">{r.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Controls Info */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/70 border border-border">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-mono text-muted-foreground">
              Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-semibold">SPACE</kbd> when you detect a match
            </span>
          </div>
        </div>

        {/* Start Button */}
        <div className="flex justify-center">
          <Button
            onClick={() => onStart(nLevel)}
            className="h-12 px-10 font-mono font-semibold text-sm tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
          >
            Start Training
          </Button>
        </div>
      </div>
    </motion.div>
  );
}