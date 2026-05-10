import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import GameCanvas from './GameCanvas';
import GameHUD from './GameHUD';
import {
  createGameState,
  generateNextStimulus,
  processResponses,
  advanceRound,
} from '@/lib/gameEngine';
import {
  WIPE_DURATION,
  FEEDBACK_DURATION,
} from '@/lib/gameConstants';

const STREAM_COLORS = ['text-primary', 'text-accent', 'text-chart-3', 'text-chart-4', 'text-chart-5', 'text-primary', 'text-accent', 'text-chart-3', 'text-chart-4'];
const STREAM_BORDER_COLORS = ['border-border', 'border-accent/20', 'border-chart-3/20', 'border-chart-4/20', 'border-chart-5/20', 'border-border', 'border-accent/20', 'border-chart-3/20', 'border-chart-4/20'];
const STREAM_DOT_COLORS = ['bg-primary/60', 'bg-accent/60', 'bg-chart-3/60', 'bg-chart-4/60', 'bg-chart-5/60', 'bg-primary/60', 'bg-accent/60', 'bg-chart-3/60', 'bg-chart-4/60'];
const STREAM_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

export default function GameScreen({ nLevel, modes, relationshipPool, totalRounds, stimulusDuration, extraStreams, streamA, onFinish, onExit }) {
  // extraStreams: [{ key, label, keyDisplay }]
  const allStreams = [
    { key: streamA?.key || 'Space', keyDisplay: streamA?.keyDisplay || 'SPACE', label: 'A' },
    ...(extraStreams || []),
  ];
  const numExtra = (extraStreams || []).length;
  const isHier = modes.includes('hierarchical');

  const [gameState, setGameState] = useState(() =>
    createGameState({ nLevel, modes, relationshipPool, totalRounds, extraStreams: extraStreams || [] })
  );
  const [phase, setPhase] = useState('stimulus');
  const [clearCanvas, setClearCanvas] = useState(false);

  // One responded ref per stream (index 0 = stream A, 1..N = extra streams)
  const respondedRefs = useRef(allStreams.map(() => false));
  const respondedCRef = useRef(false);
  const phaseTimerRef = useRef(null);
  const gameStateRef = useRef(gameState);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const startRound = useCallback((currentState) => {
    const stimulus = generateNextStimulus(currentState);
    const nextState = advanceRound(currentState, stimulus);
    setGameState(nextState);
    respondedRefs.current = allStreams.map(() => false);
    respondedCRef.current = false;
    setClearCanvas(false);
    setPhase('stimulus');
    phaseTimerRef.current = setTimeout(() => endStimulus(nextState), stimulusDuration || 2800);
  }, []);

  const endStimulus = useCallback((currentState) => {
    setClearCanvas(true);
    setPhase('wipe');
    phaseTimerRef.current = setTimeout(() => {
      const state = gameStateRef.current;
      const pressedA = respondedRefs.current[0];
      const pressedExtra = respondedRefs.current.slice(1);
      const pressedCategory = respondedCRef.current;

      const updatedState = processResponses(state, { pressedA, pressedExtra, pressedCategory });
      setGameState(updatedState);
      setPhase('feedback');

      phaseTimerRef.current = setTimeout(() => {
        if (updatedState.round >= updatedState.totalRounds) {
          onFinish(updatedState);
        } else {
          startRound(updatedState);
        }
      }, FEEDBACK_DURATION);
    }, WIPE_DURATION);
  }, [onFinish, startRound]);

  useEffect(() => {
    startRound(gameState);
    return () => { if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current); };
  }, []);

  // Keyboard controls — dynamic per stream key
  useEffect(() => {
    const handleKey = (e) => {
      if (phase !== 'stimulus') return;
      // Check each stream's key
      allStreams.forEach((stream, idx) => {
        if (e.code === stream.key) {
          e.preventDefault();
          if (!respondedRefs.current[idx]) {
            respondedRefs.current[idx] = true;
            if (idx === 0) {
              setGameState(prev => ({ ...prev, respondedA: true }));
            } else {
              setGameState(prev => {
                const next = [...(prev.extraResponded || [])];
                next[idx - 1] = true;
                return { ...prev, extraResponded: next };
              });
            }
          }
        }
      });
      // Category: always 'L' key
      if (e.code === 'KeyL' && isHier) {
        e.preventDefault();
        if (!respondedCRef.current) {
          respondedCRef.current = true;
          setGameState(prev => ({ ...prev, respondedCategory: true }));
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, allStreams, isHier]);

  // Get current stimulus & rel for each stream (A + extras)
  const allTrialModes = [gameState.trialMode, ...(gameState.extraTrialModes || [])];
  const streamStimuli = [
    { rel: gameState.currentRelationship, stimulus: gameState.currentStimulusA, responded: gameState.respondedA },
    ...(gameState.extraCurrentRels || []).map((rel, i) => ({
      rel,
      stimulus: (gameState.extraCurrentStimuli || [])[i],
      responded: (gameState.extraResponded || [])[i],
    })),
  ];

  const numStreams = streamStimuli.length;
  // cols: 1→1, 2→2, 3→3, 4→2(2×2), 5→3, 6→3, 7→4, 8→4, 9→3(3×3) ...
  const cols = numStreams === 1 ? 1
    : numStreams === 2 ? 2
    : numStreams === 3 ? 3
    : numStreams === 4 ? 2
    : numStreams <= 6 ? 3
    : numStreams <= 8 ? 4
    : Math.ceil(Math.sqrt(numStreams));
  const rows = Math.ceil(numStreams / cols);

  return (
    <div className="flex flex-col min-h-screen h-screen overflow-hidden px-3 py-3 select-none">
      {/* HUD */}
      <div className="w-full flex items-center gap-2 mb-2 shrink-0">
        <div className="flex-1 min-w-0">
          <GameHUD
            round={gameState.round}
            totalRounds={gameState.totalRounds}
            nLevel={gameState.nLevel}
            effectiveN={gameState.currentEffectiveN}
            hitsA={gameState.hitsA}
            missesA={gameState.missesA}
            falseAlarmsA={gameState.falseAlarmsA}
            relationship={gameState.currentRelationship}
            category={gameState.currentCategory}
            phase={phase}
            modes={modes}
            isDistractor={gameState.isDistractor}
            numStreams={allStreams.length}
            trialMode={gameState.trialMode}
            extraTrialModes={gameState.extraTrialModes || []}
          />
        </div>
        {onExit && (
          <button onClick={onExit}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs font-mono text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-colors">
            Exit
          </button>
        )}
      </div>

      {/* Stream canvases — fill remaining vertical space */}
      <div
        className="flex-1 min-h-0 grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {streamStimuli.map((s, idx) => {
          const rintChain = gameState.rintStates?.[idx]?.chainLog;
          const showRintChain = phase === 'stimulus' && allTrialModes[idx] === 'rint' && rintChain?.length > 0;
          return (
            <div key={idx} className={`relative rounded-xl bg-secondary/30 border ${STREAM_BORDER_COLORS[idx % STREAM_BORDER_COLORS.length]} flex flex-col overflow-hidden`}>
              <div className="flex-1 min-h-0 relative">
                <GameCanvas
                  relationship={!clearCanvas ? s.rel : null}
                  stimulus={s.stimulus}
                  clearCanvas={clearCanvas}
                />
                <div className="absolute top-2 left-3 flex items-center gap-1.5">
                  <span className={`text-xs font-mono uppercase tracking-widest ${STREAM_COLORS[idx % STREAM_COLORS.length]} opacity-70`}>
                    Stream {STREAM_LABELS[idx]}
                  </span>
                  {allTrialModes[idx] && allTrialModes[idx] !== 'normal' && (
                    <span className={`px-1 py-0.5 rounded border font-mono text-xs font-semibold leading-none
                      ${allTrialModes[idx] === 'rint' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-chart-4/10 border-chart-4/30 text-chart-4'}`}>
                      {allTrialModes[idx] === 'rint' ? 'RINT' : 'TYPE'}
                    </span>
                  )}
                </div>
                {s.responded && phase === 'stimulus' && (
                  <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${STREAM_DOT_COLORS[idx]}`} />
                )}
                {phase === 'wipe' && (
                  <div className="absolute inset-0 bg-background/90 rounded-xl flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-pulse" />
                  </div>
                )}
              </div>
              {showRintChain && (
                <div className="shrink-0 px-2 py-1 border-t border-emerald-500/20 bg-emerald-500/5 font-mono text-xs overflow-x-auto whitespace-nowrap text-center">
                  {rintChain.slice(-(gameState.nLevel + 1)).map((fact, i, arr) => (
                    <span key={i}>
                      <span className="text-cyan-300">{fact.entityA}</span>
                      <span className="text-emerald-400/70 mx-1">{fact.rel.replace(/_/g, ' ').toLowerCase()}</span>
                      <span className="text-violet-300">{fact.entityB}</span>
                      {i < arr.length - 1 && <span className="text-muted-foreground/40 mx-1">·</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>


      {/* Hierarchical category display */}
      {isHier && gameState.currentCategory && phase === 'stimulus' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mt-1 shrink-0 px-3 py-1 rounded-lg border border-border font-mono text-xs text-center text-muted-foreground">
          Category: <span className="text-accent font-semibold">
            {{ SPATIAL: 'Spatial', TRAIT: 'Trait', QUANT: 'Quantitative', VERBAL: 'Verbal' }[gameState.currentCategory] || gameState.currentCategory}
          </span>
          {gameState.respondedCategory && <span className="ml-3 text-accent">✓ CAT MATCH</span>}
        </motion.div>
      )}

      {/* Controls hint */}
      <div className="mt-1 shrink-0 text-center">
        <p className="text-xs font-mono text-muted-foreground/40 flex flex-wrap justify-center gap-x-2 gap-y-0.5">
          {allStreams.map((stream, idx) => (
            <span key={idx}>
              <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-semibold text-xs">{stream.keyDisplay}</kbd>
              {' '}={' '}{STREAM_LABELS[idx]}
            </span>
          ))}
          {isHier && (
            <span>
              <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-semibold text-xs">L</kbd>
              {' '}=Cat
            </span>
          )}
          <span className="text-muted-foreground/25 ml-1">· N={gameState.nLevel}</span>
        </p>
      </div>

      {/* Mobile buttons */}
      <div className="mt-1 shrink-0 md:hidden flex gap-2 w-full max-w-lg mx-auto">
        {allStreams.map((stream, idx) => (
          <button key={idx}
            className={`flex-1 h-12 rounded-lg bg-secondary border font-mono text-xs text-muted-foreground transition-colors ${STREAM_BORDER_COLORS[idx]}`}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            onTouchStart={(e) => {
              e.preventDefault();
              if (phase === 'stimulus' && !respondedRefs.current[idx]) {
                respondedRefs.current[idx] = true;
                if (idx === 0) {
                  setGameState(prev => ({ ...prev, respondedA: true }));
                } else {
                  setGameState(prev => {
                    const next = [...(prev.extraResponded || [])];
                    next[idx - 1] = true;
                    return { ...prev, extraResponded: next };
                  });
                }
              }
            }}>
            {stream.keyDisplay}
          </button>
        ))}
        {isHier && (
          <button className="flex-1 h-12 rounded-lg bg-secondary border border-accent/20 font-mono text-xs text-muted-foreground transition-colors"
            onTouchStart={(e) => {
              e.preventDefault();
              if (phase === 'stimulus' && !respondedCRef.current) {
                respondedCRef.current = true;
                setGameState(prev => ({ ...prev, respondedCategory: true }));
              }
            }}>CAT</button>
        )}
      </div>
    </div>
  );
}