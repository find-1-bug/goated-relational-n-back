import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Brain } from 'lucide-react';

const MODES = [
  { mode: 'Normal', rule: 'Match relationship from N trials ago' },
  { mode: 'Type N-Back', rule: 'Match by relationship type/category, not trial distance' },
  { mode: 'RINT', rule: 'Transitive chaining — A>B + B>C → target is A>C' },
  { mode: 'Mixed N-Back', rule: 'Normal ↔ Type, randomized per trial' },
  { mode: 'Mixed RINT', rule: 'Normal / Type / RINT, randomized per trial' },
  { mode: 'Impossible', rule: 'Per-stream independent mode randomization' },
  { mode: 'Binary Logic', rule: 'Two conditions per stream combined with AND/OR/XOR/AND_NOT' },
  { mode: 'Variable N', rule: 'N drifts ±1 randomly each trial' },
  { mode: 'Adaptive N', rule: 'N auto-scales between sessions (≥80% → up, ≤50% → down)' },
  { mode: 'Distractors', rule: 'Near-miss stimuli from same category' },
];

const CATEGORIES = [
  { name: 'Spatial', desc: 'Geometric arrangements (Inside, Overlapping, Above/Below…)' },
  { name: 'Spatial 3D', desc: 'Volumetric arrangements rendered via Three.js' },
  { name: 'Trait', desc: 'Visual properties (Same Color, Rotated, Hollow vs Solid…)' },
  { name: 'Quantitative', desc: 'Numeric ratios (2:1, Pyramid, Equal Count…)' },
  { name: 'Verbal', desc: 'Semantic/comparative/directional/temporal language (Bigger Than, Causes, North Of, Before…)' },
];

const TOKENS = [
  { name: 'Words', desc: 'Real meaningful words (sun, fire, mind…)' },
  { name: 'Nonsense', desc: 'Pronounceable but meaningless syllables (blim, quor…)' },
  { name: 'Garbage', desc: 'Random letter strings (xqz, bvp…)' },
  { name: 'Emoji', desc: 'Emoji symbols (🔥, 💧, 🌀…)' },
  { name: 'Abstract', desc: 'Geometric unicode symbols (◈, ⬡, ⟐…)' },
  { name: 'Random Str', desc: 'Alphanumeric codes (Xk3F, aB9z…)' },
  { name: 'Voronoi', desc: 'Mini Voronoi cell diagrams as tokens' },
];

const Section = ({ title, color = 'primary', children }) => (
  <div className={`rounded-lg bg-${color}/10 border border-${color}/30 p-6 mb-6`}>
    <h2 className={`text-lg font-mono font-semibold text-${color} mb-4`}>{title}</h2>
    {children}
  </div>
);

export default function Framework() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Brain className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-mono font-bold text-foreground">Conceptual Framework</h1>
        </div>

        {/* Core Mechanic */}
        <Section title="Core Mechanic">
          <p className="text-sm font-mono text-foreground/90 leading-relaxed">
            Instead of matching <span className="text-primary font-semibold">positions</span> or <span className="text-primary font-semibold">letters</span> (classic N-Back),
            users match <span className="text-primary font-semibold">abstract relationships</span> between tokens.
            Each trial shows: <span className="text-foreground font-semibold">[Token A] [Relationship] [Token B]</span>.
            A <span className="text-primary font-semibold">target</span> fires when the current relationship matches the one from exactly <span className="text-primary font-semibold">N trials ago</span>.
          </p>
        </Section>

        {/* Relationship Taxonomy */}
        <Section title="Relationship Taxonomy">
          <div className="space-y-2">
            {CATEGORIES.map(({ name, desc }) => (
              <div key={name} className="flex gap-3 text-sm font-mono">
                <span className="text-primary font-semibold shrink-0 w-28">{name}</span>
                <span className="text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Enhancement Modes */}
        <Section title="Enhancement Modes (stacked difficulty)" color="accent">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="border-b border-accent/20">
                  <th className="text-left text-accent pb-2 pr-4 font-semibold">Mode</th>
                  <th className="text-left text-accent pb-2 font-semibold">Rule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {MODES.map(({ mode, rule }) => (
                  <tr key={mode}>
                    <td className="py-2 pr-4 text-foreground font-semibold whitespace-nowrap">{mode}</td>
                    <td className="py-2 text-muted-foreground">{rule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Token System */}
        <Section title="Token System">
          <p className="text-sm font-mono text-muted-foreground mb-3">
            Tokens (the A/B entities) can be any of the following types, each with a configurable weight:
          </p>
          <div className="space-y-2">
            {TOKENS.map(({ name, desc }) => (
              <div key={name} className="flex gap-3 text-sm font-mono">
                <span className="text-primary font-semibold shrink-0 w-24">{name}</span>
                <span className="text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Multi-Stream */}
        <Section title="Multi-Stream">
          <p className="text-sm font-mono text-foreground/90 leading-relaxed">
            Multiple independent relationship streams run simultaneously, each with its own{' '}
            <span className="text-primary">key binding</span>, <span className="text-primary">history</span>, and optionally its own{' '}
            <span className="text-primary">mode</span> (in Impossible/Binary Logic modes).
          </p>
        </Section>

        {/* RINT Logic Constraint */}
        <Section title="RINT Logic Constraint">
          <p className="text-sm font-mono text-foreground/90 leading-relaxed">
            RINT and Type N-Back only use <span className="text-primary font-semibold">transitive relationships</span> (comparisons, directional, temporal, semantic chains).
            Non-transitive ones (spatial arrangements, traits, quantities) are automatically excluded since they don't support valid logical chaining.
          </p>
        </Section>

        {/* Scoring */}
        <Section title="Scoring">
          <p className="text-sm font-mono text-foreground/90 leading-relaxed">
            Per stream: <span className="text-primary">Hits</span>, <span className="text-primary">Misses</span>,{' '}
            <span className="text-primary">False Alarms</span>, <span className="text-primary">Correct Rejections</span>{' '}
            → Hit Rate, False Alarm Rate, Accuracy. Sessions are stored locally with full trial-by-trial replay.
          </p>
        </Section>

        {/* Integration */}
        <Section title="Integration Entry Points" color="accent">
          <div className="space-y-3 text-sm font-mono">
            <div>
              <span className="text-accent font-semibold">1. Embed GameScreen</span>
              <p className="text-muted-foreground mt-1">Pass <code className="bg-secondary px-1 rounded text-xs">nLevel</code>, <code className="bg-secondary px-1 rounded text-xs">modes</code>, <code className="bg-secondary px-1 rounded text-xs">relationshipPool</code>, <code className="bg-secondary px-1 rounded text-xs">totalRounds</code>, <code className="bg-secondary px-1 rounded text-xs">stimulusDuration</code>, <code className="bg-secondary px-1 rounded text-xs">streamA</code>, <code className="bg-secondary px-1 rounded text-xs">extraStreams</code>, <code className="bg-secondary px-1 rounded text-xs">noobMode</code>, <code className="bg-secondary px-1 rounded text-xs">onFinish</code>, <code className="bg-secondary px-1 rounded text-xs">onExit</code> as props.</p>
            </div>
            <div>
              <span className="text-accent font-semibold">2. Drive the loop directly</span>
              <p className="text-muted-foreground mt-1">Call <code className="bg-secondary px-1 rounded text-xs">createGameState</code> / <code className="bg-secondary px-1 rounded text-xs">generateNextStimulus</code> / <code className="bg-secondary px-1 rounded text-xs">processResponses</code> from <code className="bg-secondary px-1 rounded text-xs">gameEngine.js</code>.</p>
            </div>
            <div>
              <span className="text-accent font-semibold">3. Populate your own UI</span>
              <p className="text-muted-foreground mt-1">Use <code className="bg-secondary px-1 rounded text-xs">RELATIONSHIP_CATEGORIES</code> + <code className="bg-secondary px-1 rounded text-xs">filterTransitiveRelationships</code> from <code className="bg-secondary px-1 rounded text-xs">gameConstants.js</code>.</p>
            </div>
          </div>
        </Section>

        {/* Back */}
        <div className="flex justify-center pb-4">
          <Link to="/">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono">
              <ChevronLeft className="w-4 h-4" /> Back to Dashboard
            </Button>
          </Link>
        </div>

      </div>
    </motion.div>
  );
}