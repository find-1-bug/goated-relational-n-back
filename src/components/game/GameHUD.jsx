import React from 'react';

const CAT_LABEL = { SPATIAL: 'Spatial', TRAIT: 'Trait', QUANT: 'Quantitative', VERBAL: 'Verbal' };

export default function GameHUD({ round, totalRounds, nLevel, effectiveN, hitsA, missesA, falseAlarmsA, relationship, category, phase, modes = [], isDistractor, numStreams, trialIsTypeNback }) {
  const isHier = modes.includes('hierarchical');
  const isMixed = modes.includes('mixed_nback');

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
          <span className="font-mono text-xs font-semibold text-primary">
            N={effectiveN ?? nLevel}
          </span>
        </div>
        {numStreams > 1 && (
          <div className="px-2 py-0.5 rounded bg-accent/10 border border-accent/20">
            <span className="font-mono text-xs font-semibold text-accent">{numStreams}×</span>
          </div>
        )}
        {isHier && (
          <div className="px-2 py-0.5 rounded bg-chart-3/10 border border-chart-3/20">
            <span className="font-mono text-xs font-semibold text-chart-3">HIER</span>
          </div>
        )}
        {isMixed && phase === 'stimulus' && (
          <div className={`px-2 py-0.5 rounded border transition-all ${trialIsTypeNback ? 'bg-chart-4/10 border-chart-4/30' : 'bg-secondary border-border'}`}>
            <span className={`font-mono text-xs font-semibold ${trialIsTypeNback ? 'text-chart-4' : 'text-muted-foreground'}`}>
              {trialIsTypeNback ? 'TYPE' : 'NORMAL'}
            </span>
          </div>
        )}
      </div>

      {/* Center: only show category for hierarchical mode — static enough to not distract */}
      <div className="font-mono text-xs text-muted-foreground text-center flex-1 min-w-0">
        {isHier && phase === 'stimulus' && category && (
          <span className="text-chart-3/60">{CAT_LABEL[category] || category}</span>
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