import React from 'react';

export default function GameHUD({ round, totalRounds, nLevel, hits, misses, falseAlarms, relationship, phase }) {
  return (
    <div className="flex items-center justify-between w-full px-2">
      {/* Left: Round & N-Level */}
      <div className="flex items-center gap-4">
        <div className="font-mono text-xs text-muted-foreground">
          <span className="text-foreground font-semibold">{round}</span>
          <span className="mx-0.5">/</span>
          <span>{totalRounds}</span>
        </div>
        <div className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
          <span className="font-mono text-xs font-semibold text-primary">N={nLevel}</span>
        </div>
      </div>

      {/* Center: Current relationship label (only during stimulus) */}
      <div className="font-mono text-xs text-muted-foreground h-5">
        {phase === 'stimulus' && relationship && (
          <span className="text-foreground/60">{relationship.replace(/_/g, ' ')}</span>
        )}
      </div>

      {/* Right: Score */}
      <div className="flex items-center gap-3 font-mono text-xs">
        <span className="text-emerald-400">H:{hits}</span>
        <span className="text-amber-400">M:{misses}</span>
        <span className="text-red-400">FA:{falseAlarms}</span>
      </div>
    </div>
  );
}