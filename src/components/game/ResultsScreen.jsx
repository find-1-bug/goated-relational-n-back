import React from 'react';
import { Button } from '@/components/ui/button';
import { Brain, RotateCcw, ArrowLeft, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { calculateResults, computeNextNLevel } from '@/lib/gameEngine';

function StatBlock({ label, value, suffix = '', color = 'text-foreground' }) {
  return (
    <div className="text-center space-y-1">
      <div className={`text-2xl font-mono font-bold ${color}`}>{value}{suffix}</div>
      <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest">{label}</div>
    </div>
  );
}

function StreamResults({ title, stats, color = 'text-primary' }) {
  if (!stats) return null;
  return (
    <div className="space-y-2">
      <div className={`text-xs font-mono uppercase tracking-widest font-semibold ${color}`}>{title}</div>
      <div className="grid grid-cols-3 gap-3 bg-secondary/40 rounded-lg p-3 border border-border">
        <StatBlock label="Accuracy" value={stats.accuracy} suffix="%" color={stats.accuracy >= 75 ? 'text-emerald-400' : stats.accuracy >= 50 ? 'text-amber-400' : 'text-red-400'} />
        <StatBlock label="Hit Rate" value={stats.hitRate} suffix="%" color="text-emerald-400" />
        <StatBlock label="FA Rate" value={stats.falseAlarmRate} suffix="%" color="text-red-400" />
      </div>
      <div className="flex gap-4 text-xs font-mono text-muted-foreground justify-center">
        <span className="text-emerald-400">{stats.hits} hits</span>
        <span className="text-amber-400">{stats.misses} miss</span>
        <span className="text-red-400">{stats.falseAlarms} FA</span>
        <span className="text-primary">{stats.correctRejections} CR</span>
      </div>
    </div>
  );
}

export default function ResultsScreen({ gameState, onRestart, onBack }) {
  const results = calculateResults(gameState);
  const nextN = computeNextNLevel(gameState.nLevel, results);
  const nChanged = nextN !== gameState.nLevel;

  const getGrade = (acc) => {
    if (acc >= 90) return { label: 'Excellent', color: 'text-emerald-400' };
    if (acc >= 75) return { label: 'Good', color: 'text-primary' };
    if (acc >= 60) return { label: 'Fair', color: 'text-amber-400' };
    return { label: 'Needs Practice', color: 'text-red-400' };
  };

  const grade = getGrade(results.overall.accuracy);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center min-h-screen px-4 py-8"
    >
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <Brain className="w-7 h-7 text-primary mx-auto mb-2" />
          <h2 className="text-2xl font-mono font-bold text-foreground">Session Complete</h2>
          <p className="text-xs font-mono text-muted-foreground">
            N={gameState.nLevel} &middot; {results.overall.total} trials
            {gameState.modes?.length > 0 && <> &middot; {gameState.modes.join(', ')}</>}
          </p>
        </div>

        {/* Overall */}
        <div className="text-center py-4 border-y border-border">
          <div className={`text-5xl font-mono font-bold ${grade.color}`}>
            {results.overall.accuracy}%
          </div>
          <div className={`text-sm font-mono font-semibold mt-1 ${grade.color}`}>{grade.label}</div>
        </div>

        {/* Adaptive N hint */}
        {gameState.modes?.includes('adaptive') && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border font-mono text-xs
            ${nChanged ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
            {nChanged
              ? `Adaptive: N will change to ${nextN} next session (${nextN > gameState.nLevel ? '↑ level up!' : '↓ easing back'})`
              : `Adaptive: N stays at ${gameState.nLevel} (keep going!)`}
          </div>
        )}

        {/* Per-stream results */}
        <div className="space-y-4">
          <StreamResults title="Stream A — Relationship" stats={results.A} color="text-primary" />
          {results.B && <StreamResults title="Stream B — Dual" stats={results.B} color="text-accent" />}
          {results.C && <StreamResults title="Category — Hierarchical" stats={results.C} color="text-chart-3" />}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" onClick={onBack} className="font-mono text-xs gap-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Menu
          </Button>
          <Button onClick={() => onRestart(nextN)} className="font-mono text-xs gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <RotateCcw className="w-3.5 h-3.5" /> Train Again
          </Button>
        </div>
      </div>
    </motion.div>
  );
}