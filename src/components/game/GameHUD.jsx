import React from 'react';

const CAT_LABEL = { SPATIAL: 'Spatial', TRAIT: 'Trait', QUANT: 'Quantitative' };

export default function GameHUD({ round, totalRounds, nLevel, hitsA, missesA, falseAlarmsA, relationship, relationshipB, category, phase, modes = [], isDistractor }) {
  const isDual = modes.includes('dual');
  const isHier = modes.includes('hierarchical');

  return (
    <div className="flex items-center justify-between w-full px-2 gap-2 flex-wrap">
      {/* Left: Round & N-Level */}
      <div className="flex items-center gap-3">
        <div className="font-mono text-xs text-muted-foreground">
          <span className="text-foreground font-semibold">{round}</span>
          <span className="mx-0.5">/</span>
          <span>{totalRounds}</span>
        </div>
        <div className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
          <span className="font-mono text-xs font-semibold text-primary">N={nLevel}</span>
        </div>
        {isDual && (
          <div className="px-2 py-0.5 rounded bg-accent/10 border border-accent/20">
            <span className="font-mono text-xs font-semibold text-accent">DUAL</span>
          </div>
        )}
        {isHier && (
          <div className="px-2 py-0.5 rounded bg-chart-3/10 border border-chart-3/20">
            <span className="font-mono text-xs font-semibold text-chart-3">HIER</span>
          </div>
        )}
      </div>

      {/* Center: labels */}
      <div className="font-mono text-xs text-muted-foreground text-center flex-1 min-w-0 space-y-0.5">
        {phase === 'stimulus' && relationship && (
          <div className="text-foreground/60 truncate">
            A: {relationship.replace(/_/g, ' ')}
            {isDistractor && <span className="ml-1 text-amber-400/60 text-xs">~</span>}
          </div>
        )}
        {phase === 'stimulus' && isDual && relationshipB && (
          <div className="text-accent/50 truncate">B: {relationshipB.replace(/_/g, ' ')}</div>
        )}
        {phase === 'stimulus' && isHier && category && (
          <div className="text-chart-3/50 truncate">{CAT_LABEL[category] || category}</div>
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