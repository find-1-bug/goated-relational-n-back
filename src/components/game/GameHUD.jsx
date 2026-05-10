import React from 'react';

export default function GameHUD({ round, totalRounds, nLevel, effectiveN, hitsA, missesA, falseAlarmsA, modes = [], numStreams }) {
  const isImpossible = modes.includes('impossible');

  return (
    <div className="flex items-center justify-between w-full px-2 gap-2 flex-wrap">
      {/* Left: Round & N-Level */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="font-mono text-xs text-muted-foreground">
          <span className="text-foreground font-semibold">{round}</span>
          <span className="mx-0.5">/</span>
          <span>{totalRounds}</span>
        </div>
        <div className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
          <span className="font-mono text-xs font-semibold text-primary">N={effectiveN ?? nLevel}</span>
        </div>
        {numStreams > 1 && (
          <div className="px-2 py-0.5 rounded bg-accent/10 border border-accent/20">
            <span className="font-mono text-xs font-semibold text-accent">{numStreams}×</span>
          </div>
        )}
        {isImpossible && (
          <div className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30">
            <span className="font-mono text-xs font-semibold text-red-400">IMPOSSIBLE</span>
          </div>
        )}
      </div>

      {/* Right: Stats */}
      <div className="flex items-center gap-3 font-mono text-xs">
        <span className="text-emerald-400">H:{hitsA}</span>
        <span className="text-amber-400">M:{missesA}</span>
        <span className="text-red-400">FA:{falseAlarmsA}</span>
      </div>
    </div>
  );
}