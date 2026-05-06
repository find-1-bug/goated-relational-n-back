import React from 'react';

const CAT_LABEL = { VISUAL: 'Visual', SPATIAL: 'Spatial', TRAIT: 'Trait', QUANT: 'Quantitative', VERBAL: 'Verbal' };

export default function GameHUD({ round, totalRounds, nLevel, effectiveN, hitsA, missesA, falseAlarmsA, relationship, relationshipB, category, phase, modes = [], isDistractor }) {
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
          <span className="font-mono text-xs font-semibold text-primary">
            N={effectiveN ?? nLevel}
          </span>
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