import React from 'react';
import { Button } from '@/components/ui/button';
import { Brain, RotateCcw, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { calculateResults } from '@/lib/gameEngine';

function StatBlock({ label, value, suffix = '', color = 'text-foreground' }) {
  return (
    <div className="text-center space-y-1">
      <div className={`text-3xl md:text-4xl font-mono font-bold ${color}`}>
        {value}{suffix}
      </div>
      <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
        {label}
      </div>
    </div>
  );
}

export default function ResultsScreen({ gameState, onRestart, onBack }) {
  const results = calculateResults(gameState);

  const getGrade = (acc) => {
    if (acc >= 90) return { label: 'Excellent', color: 'text-emerald-400' };
    if (acc >= 75) return { label: 'Good', color: 'text-primary' };
    if (acc >= 60) return { label: 'Fair', color: 'text-amber-400' };
    return { label: 'Needs Practice', color: 'text-red-400' };
  };

  const grade = getGrade(results.accuracy);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-screen px-4 py-8"
    >
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <Brain className="w-8 h-8 text-primary mx-auto mb-3" />
          <h2 className="text-2xl font-mono font-bold text-foreground">Session Complete</h2>
          <p className="text-xs font-mono text-muted-foreground">
            N-Level: {gameState.nLevel} &middot; {results.total} trials
          </p>
        </div>

        {/* Main Accuracy */}
        <div className="text-center py-6 border-y border-border">
          <div className={`text-6xl font-mono font-bold ${grade.color}`}>
            {results.accuracy}%
          </div>
          <div className={`text-sm font-mono font-semibold mt-2 ${grade.color}`}>
            {grade.label}
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-2 gap-6">
          <StatBlock label="Hit Rate" value={results.hitRate} suffix="%" color="text-emerald-400" />
          <StatBlock label="False Alarm Rate" value={results.falseAlarmRate} suffix="%" color="text-red-400" />
          <StatBlock label="Hits" value={results.hits} color="text-emerald-400" />
          <StatBlock label="Misses" value={results.misses} color="text-amber-400" />
          <StatBlock label="False Alarms" value={results.falseAlarms} color="text-red-400" />
          <StatBlock label="Correct Rejections" value={results.correctRejections} color="text-primary" />
        </div>

        {/* Breakdown Bar */}
        <div className="space-y-2">
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            Response Breakdown
          </div>
          <div className="h-3 rounded-full bg-secondary overflow-hidden flex">
            {results.hits > 0 && (
              <div
                className="bg-emerald-500 h-full"
                style={{ width: `${(results.hits / results.total) * 100}%` }}
              />
            )}
            {results.correctRejections > 0 && (
              <div
                className="bg-primary h-full"
                style={{ width: `${(results.correctRejections / results.total) * 100}%` }}
              />
            )}
            {results.misses > 0 && (
              <div
                className="bg-amber-500 h-full"
                style={{ width: `${(results.misses / results.total) * 100}%` }}
              />
            )}
            {results.falseAlarms > 0 && (
              <div
                className="bg-red-500 h-full"
                style={{ width: `${(results.falseAlarms / results.total) * 100}%` }}
              />
            )}
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Hits</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> CR</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Miss</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> FA</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onBack}
            className="font-mono text-xs gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Menu
          </Button>
          <Button
            onClick={onRestart}
            className="font-mono text-xs gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Train Again
          </Button>
        </div>
      </div>
    </motion.div>
  );
}