import React from 'react';


const CAT_LABEL = { SPATIAL: 'Spatial', TRAIT: 'Trait', QUANT: 'Quantitative', VERBAL: 'Verbal' };

function ModeBadge({ mode }) {
  const cfg = {
    rint:   { label: 'RINT',   cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
    type:   { label: 'TYPE',   cls: 'bg-chart-4/10 border-chart-4/30 text-chart-4' },
    normal: { label: 'NRM',    cls: 'bg-secondary border-border text-muted-foreground' },
  }[mode] || { label: '?', cls: 'bg-secondary border-border text-muted-foreground' };
  return (
    <span className={`px-1.5 py-0.5 rounded border font-mono text-xs font-semibold ${cfg.cls}`}>{cfg.label}</span>
  );
}

export default function GameHUD({ round, totalRounds, nLevel, effectiveN, hitsA, missesA, falseAlarmsA, category, phase, modes = [], numStreams, trialMode, extraTrialModes = [] }) {
  const isHier = modes.includes('hierarchical');
  const isMixed = modes.includes('mixed_nback');
  const isMixedRINT = modes.includes('mixed_rint');
  const isRINTMode = modes.includes('rint');
  const isImpossible = modes.includes('impossible');

  // Show per-stream badges only for mixed/impossible/rint/mixed_rint modes
  const showModeBadges = phase === 'stimulus' && (isImpossible || isMixedRINT || isMixed || isRINTMode);

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
        {isHier && (
          <div className="px-2 py-0.5 rounded bg-chart-3/10 border border-chart-3/20">
            <span className="font-mono text-xs font-semibold text-chart-3">HIER</span>
          </div>
        )}
        {isImpossible && (
          <div className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30">
            <span className="font-mono text-xs font-semibold text-red-400">IMPOSSIBLE</span>
          </div>
        )}

        {/* Per-stream mode badges (stream A + extras) */}
        {showModeBadges && (
          <div className="flex items-center gap-1">
            <span className="text-xs font-mono text-muted-foreground/40 mr-0.5">A:</span>
            <ModeBadge mode={trialMode} />
            {extraTrialModes.map((m, i) => (
              <React.Fragment key={i}>
                <span className="text-xs font-mono text-muted-foreground/40">{String.fromCharCode(66 + i)}:</span>
                <ModeBadge mode={m} />
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Center: category label */}
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