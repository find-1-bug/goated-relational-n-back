import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Brain, Zap, Layers, Gamepad2 } from 'lucide-react';

export default function Tutorial() {
  const sections = [
    {
      icon: Brain,
      title: 'What is N-Back?',
      description: 'A cognitive training task where you match a relationship from N steps back in a sequence. For N=2, you match what appeared 2 trials ago.'
    },
    {
      icon: Gamepad2,
      title: 'How to Play',
      description: 'Watch the stimulus appear. If it matches the relationship from N trials ago, press the key for that stream. React quickly but accurately.'
    },
    {
      icon: Zap,
      title: 'Controls',
      description: 'Each stream has a dedicated key (SPACE for Stream A, customizable others for B, C, etc.). Press when you see a match.'
    },
    {
      icon: Layers,
      title: 'Enhancement Modes',
      description: 'Type N-Back matches by relationship type only. RINT uses logical reasoning. Mixed/Impossible randomize rules. Binary Logic combines two conditions.'
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Brain className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-mono font-bold text-foreground">How to Train</h1>
        </div>

        {/* Quick Start */}
        <div className="rounded-lg bg-primary/10 border border-primary/30 p-6 mb-8">
          <h2 className="text-lg font-mono font-semibold text-primary mb-3">Quick Start</h2>
          <ol className="space-y-2 text-sm font-mono text-foreground/90">
            <li><span className="text-primary font-bold">1.</span> Choose N-level (how many trials back to remember)</li>
            <li><span className="text-primary font-bold">2.</span> Pick relationship types (spatial, trait, quantitative, verbal, sound)</li>
            <li><span className="text-primary font-bold">3.</span> Set trial count & speed</li>
            <li><span className="text-primary font-bold">4.</span> Press the key when you see a match</li>
            <li><span className="text-primary font-bold">5.</span> Get feedback on accuracy & track progress in Stats</li>
          </ol>
        </div>

        {/* Core Concepts */}
        <div className="grid gap-4 mb-8">
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="rounded-lg bg-secondary/40 border border-border p-5"
              >
                <div className="flex items-start gap-3">
                  <Icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-mono font-semibold text-foreground mb-2">{section.title}</h3>
                    <p className="text-sm font-mono text-muted-foreground">{section.description}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Settings Guide */}
        <div className="rounded-lg bg-secondary/40 border border-border p-6 mb-8">
          <h2 className="text-lg font-mono font-semibold text-foreground mb-4">Settings Explained</h2>
          <div className="space-y-4 text-sm font-mono text-muted-foreground">
            <div>
              <span className="text-primary font-semibold">N-Level:</span> How many trials back to match (1 = easiest, higher = harder)
            </div>
            <div>
              <span className="text-primary font-semibold">Relationship Types:</span> Categories of visual/verbal relationships to include
            </div>
            <div>
              <span className="text-primary font-semibold">Stimuli Mix:</span> Balance category distribution (equal or custom weights)
            </div>
            <div>
              <span className="text-primary font-semibold">Streams:</span> Multiple simultaneous sequences (Stream A, B, C, etc.)
            </div>
            <div>
              <span className="text-primary font-semibold">Speed:</span> How long each stimulus displays before disappearing
            </div>
            <div>
              <span className="text-primary font-semibold">Noob Mode:</span> Manual trial navigation with Prev/Next buttons
            </div>
          </div>
        </div>

        {/* New Audio-Visual Features */}
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-6 mb-8">
          <h2 className="text-lg font-mono font-semibold text-emerald-400 mb-3">New Audio-Visual Features</h2>
          <div className="space-y-3 text-sm font-mono text-foreground/90">
            <p>
              Sound relationships are now fully non-verbal: instead of spoken words, letters, or numbers, the game uses pure pitch and rhythm cues such as higher/lower tones and faster/slower beats.
            </p>
            <p>
              In multi-stream sessions, the game can play up to two sound streams at once. Active sound streams glow green and show an <span className="text-emerald-300 font-semibold">L</span> or <span className="text-emerald-300 font-semibold">R</span> badge so you know which visual stream belongs to each ear.
            </p>
            <p>
              For speaker users, the right-side sound plays slightly after the left-side sound, making the two streams easier to distinguish even without headphones. Sound-only multi-stream sessions are blocked so the task remains meaningful.
            </p>
          </div>
        </div>

        {/* Enhancement Modes Deep Dive */}
        <div className="rounded-lg bg-accent/10 border border-accent/30 p-6 mb-8">
          <h2 className="text-lg font-mono font-semibold text-accent mb-4">Enhancement Modes</h2>
          <div className="space-y-4 text-sm font-mono text-foreground/90">
            <div>
              <span className="text-accent font-semibold">Type N-Back:</span> Match by <span className="text-foreground font-semibold">relationship category only</span>, not trial distance. If you've seen "Inside" relationships 3 times, all "Inside" entries count as matches, regardless of when they appeared. In this mode, only <span className="text-foreground">transitive relationships</span> are used to ensure logical consistency. Tests <span className="text-foreground">semantic memory & categorization</span>.
            </div>
            <div>
              <span className="text-accent font-semibold">RINT (Relational Integration):</span> Use <span className="text-foreground font-semibold">logical reasoning</span> to chain facts. E.g., "A &gt; B" + "B &gt; C" logically proves "A &gt; C"—that's a match. Only uses <span className="text-foreground">transitive relationships</span> (comparisons, directions, temporal) to ensure valid logical chains. Tests <span className="text-foreground">transitive reasoning & working memory</span>. Requires N≥2.
            </div>
            <div>
              <span className="text-accent font-semibold">Mixed N-Back:</span> Randomly <span className="text-foreground font-semibold">switches between Normal and Type</span> each trial. You never know which rule applies, forcing <span className="text-foreground">cognitive flexibility</span>.
            </div>
            <div>
              <span className="text-accent font-semibold">Mixed RINT:</span> Three-way random per trial: <span className="text-foreground font-semibold">Normal / Type / RINT</span>. Maximum unpredictability. Tests <span className="text-foreground">rapid rule switching &amp; reasoning</span>. Requires N≥2.
            </div>
            <div>
              <span className="text-accent font-semibold">Impossible Mode:</span> On multi-stream sessions, each stream <span className="text-foreground font-semibold">independently randomizes</span> between Normal, Type, and RINT every trial—different rules per stream simultaneously. <span className="text-foreground">Extreme multitasking demand</span>. Requires ≥2 streams & N≥2.
            </div>
            <div>
              <span className="text-accent font-semibold">Binary Logic:</span> Each trial assigns <span className="text-foreground font-semibold">two conditions per stream</span> (e.g., "Normal AND RINT", "Type OR Normal") combined with logic operators (AND, OR, XOR, AND_NOT). A match fires only when the combined condition is true. Tests <span className="text-foreground">boolean reasoning & dual tracking</span>. Requires N≥2.
            </div>
            <div>
              <span className="text-accent font-semibold">3D Void Mode:</span> Focuses the session on <span className="text-foreground font-semibold">animated 3D spatial relationships</span> such as depth, orbiting, stacking, floating, and motion. It emphasizes position tracking in a void-like 3D space.
            </div>
            <div>
              <span className="text-accent font-semibold">Variable N:</span> N <span className="text-foreground font-semibold">randomly shifts ±1</span> each trial around your chosen N. Tests <span className="text-foreground">flexible working memory updating</span>.
            </div>
            <div>
              <span className="text-accent font-semibold">Adaptive N:</span> N <span className="text-foreground font-semibold">auto-adjusts between sessions</span> based on accuracy: ≥80% → increase N, ≤50% → decrease N. Keeps you <span className="text-foreground">at the sweet spot of challenge</span>.
            </div>
            <div>
              <span className="text-accent font-semibold">Distractors:</span> Near-match stimuli from the same category appear as <span className="text-foreground font-semibold">interference</span>. Tests <span className="text-foreground">selective attention & resistance to confusion</span>.
            </div>
          </div>
        </div>

        {/* Accuracy Tips */}
        <div className="rounded-lg bg-accent/10 border border-accent/30 p-6 mb-8">
          <h2 className="text-lg font-mono font-semibold text-accent mb-3">Tips for Better Accuracy</h2>
          <ul className="space-y-2 text-sm font-mono text-foreground/90">
            <li>• <span className="text-accent">Focus:</span> Concentrate on the current stimulus and N-back relationship</li>
            <li>• <span className="text-accent">Consistent Pacing:</span> Start slow, increase speed as you improve</li>
            <li>• <span className="text-accent">Review Sessions:</span> Check your performance in Stats to identify weak modes</li>
            <li>• <span className="text-accent">Progressive Difficulty:</span> Use Adaptive Mode to auto-adjust N-level</li>
          </ul>
        </div>

        {/* Back Button */}
        <Link to="/" className="flex justify-center">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono">
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}