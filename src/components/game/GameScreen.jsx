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

function StreamModeBadge({ mode, alwaysShow }) {
  if (!mode) return null;
  const cfg = {
    normal:       { label: 'NRM',  cls: 'bg-secondary border-border text-muted-foreground' },
    type:         { label: 'TYPE', cls: 'bg-chart-4/10 border-chart-4/30 text-chart-4' },
    rint:         { label: 'RINT', cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
    hierarchical: { label: 'HIER', cls: 'bg-violet-500/10 border-violet-500/30 text-violet-400' },
  }[mode];
  if (!cfg) return null;
  if (mode === 'normal' && !alwaysShow) return null;
  return (
    <span className={`px-1 py-0.5 rounded border font-mono text-xs font-semibold leading-none ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

const STREAM_COLORS = ['text-primary', 'text-accent', 'text-chart-3', 'text-chart-4', 'text-chart-5', 'text-primary', 'text-accent', 'text-chart-3', 'text-chart-4'];
const STREAM_BORDER_COLORS = ['border-border', 'border-accent/20', 'border-chart-3/20', 'border-chart-4/20', 'border-chart-5/20', 'border-border', 'border-accent/20', 'border-chart-3/20', 'border-chart-4/20'];
const STREAM_DOT_COLORS = ['bg-primary/60', 'bg-accent/60', 'bg-chart-3/60', 'bg-chart-4/60', 'bg-chart-5/60', 'bg-primary/60', 'bg-accent/60', 'bg-chart-3/60', 'bg-chart-4/60'];
const STREAM_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

export default function GameScreen({ nLevel, modes, relationshipPool, totalRounds, stimulusDuration, extraStreams, streamA, noobMode, onFinish, onExit }) {
  // extraStreams: [{ key, label, keyDisplay }]
  const allStreams = [
    { key: streamA?.key || 'Space', keyDisplay: streamA?.keyDisplay || 'SPACE', label: 'A' },
    ...(extraStreams || []),
  ];
  const numExtra = (extraStreams || []).length;

  const [gameState, setGameState] = useState(() =>
    createGameState({ nLevel, modes, relationshipPool, totalRounds, extraStreams: extraStreams || [] })
  );
  const [phase, setPhase] = useState('stimulus');
  const [clearCanvas, setClearCanvas] = useState(false);
  const [trialStates, setTrialStates] = useState([]); // Store full game state after each trial

  // One responded ref per stream (index 0 = stream A, 1..N = extra streams)
  const respondedRefs = useRef(allStreams.map(() => false));
  const phaseTimerRef = useRef(null);
  const gameStateRef = useRef(gameState);
  const phaseRef = useRef(phase);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const startRound = useCallback((currentState, historicalState = null) => {
    const nextState = historicalState || (() => {
      const stimulus = generateNextStimulus(currentState);
      return advanceRound(currentState, stimulus);
    })();
    
    setGameState(nextState);
    respondedRefs.current = allStreams.map(() => false);
    setClearCanvas(false);
    setPhase('stimulus');
    
    // Store this state for later playback (only if new trial, not from history)
    // Store indexed by round number for easy lookup during prev/next
    if (!historicalState && noobMode) {
      setTrialStates(prev => {
        const updated = Array.isArray(prev) ? [...prev] : [];
        updated[nextState.round] = nextState;
        return updated;
      });
    }
    
    // In noob mode, don't auto-advance — wait for user to click Next
    if (!noobMode) {
      phaseTimerRef.current = setTimeout(() => endStimulus(nextState), stimulusDuration || 2800);
    }
  }, [noobMode]);

  const endStimulus = useCallback((currentState) => {
    if (noobMode) {
      // In noob mode, stimulus stays visible, just wait for user action
      setPhase('feedback');
      return;
    }
    
    setClearCanvas(true);
    setPhase('wipe');
    phaseTimerRef.current = setTimeout(() => {
      const state = gameStateRef.current;
      const pressedA = respondedRefs.current[0];
      const pressedExtra = respondedRefs.current.slice(1);

      const updatedState = processResponses(state, { pressedA, pressedExtra });
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
  }, [onFinish, startRound, noobMode]);

  const handleNextTrial = useCallback(() => {
    // In noob mode, can advance from stimulus phase; otherwise only from feedback
    if (noobMode && phaseRef.current !== 'stimulus') return;
    if (!noobMode && phaseRef.current !== 'feedback') return;
    
    const state = gameStateRef.current;
    const pressedA = respondedRefs.current[0];
    const pressedExtra = respondedRefs.current.slice(1);

    const updatedState = processResponses(state, { pressedA, pressedExtra });
    if (updatedState.round >= updatedState.totalRounds) {
      onFinish(updatedState);
    } else {
      startRound(updatedState);
    }
  }, [noobMode, onFinish, startRound]);

  const handlePrevTrial = useCallback(() => {
    const currentRound = gameStateRef.current?.round ?? 0;
    if (currentRound === 0) return;
    const prevRound = currentRound - 1;
    const historicalState = trialStates?.[prevRound];
    if (historicalState) {
      setGameState(historicalState);
      respondedRefs.current = Array(allStreams.length).fill(false);
      setClearCanvas(false);
      setPhase('stimulus');
    }
  }, [trialStates, allStreams.length]);

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
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase]);

  // Get current stimulus & rel for each stream (A + extras)
  const allTrialModes = [gameState.trialMode, ...(gameState.extraTrialModes || [])];
  const allTrialBinaryConfigs = gameState.trialBinaryConfigs || [];
  const isBinaryLogic = modes.includes('binary_logic');
  const streamStimuli = [
    { rel: gameState.currentRelationship, stimulus: gameState.currentStimulusA, responded: gameState.respondedA },
    ...(gameState.extraCurrentRels || []).map((rel, i) => ({
      rel,
      stimulus: (gameState.extraCurrentStimuli || [])[i],
      responded: (gameState.extraResponded || [])[i],
    })),
  ];

  const numStreams = streamStimuli.length;
  // Desktop cols: 1→1, 2→2, 3→3, 4→2(2×2), 5→3, 6→3, 7→4, 8→4, 9→3(3×3)
  // Mobile (< 768px): 2+ streams → 1 col (vertical stack)
  const desktopCols = numStreams === 1 ? 1
    : numStreams === 2 ? 2
    : numStreams === 3 ? 3
    : numStreams === 4 ? 2
    : numStreams <= 6 ? 3
    : numStreams <= 8 ? 4
    : Math.ceil(Math.sqrt(numStreams));
  const cols = numStreams > 1 ? 1 : desktopCols; // Mobile: stack vertically if multi-stream
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
            modes={modes}
            numStreams={allStreams.length}
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
                  rintChain={gameState.rintStates?.[idx]?.chainLog}
                />
                <div className="absolute top-2 left-3 flex items-center gap-1 flex-wrap max-w-[90%]">
                  <span className={`text-xs font-mono uppercase tracking-widest ${STREAM_COLORS[idx % STREAM_COLORS.length]} opacity-70 shrink-0`}>
                    {STREAM_LABELS[idx]}
                  </span>
                  {isBinaryLogic ? (() => {
                    const bc = allTrialBinaryConfigs[idx];
                    if (!bc) return null;
                    return (
                      <>
                        <StreamModeBadge mode={bc.primaryMode} alwaysShow />
                        <span className="text-muted-foreground/40 font-mono text-xs leading-none">{(bc.binaryOp || 'AND').replace('_', ' ')}</span>
                        <StreamModeBadge mode={bc.binaryMode} alwaysShow />
                      </>
                    );
                  })() : (
                    <StreamModeBadge mode={allTrialModes[idx]} />
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


      {/* Controls hint */}
      <div className="mt-1 shrink-0 text-center">
        <p className="text-xs font-mono text-muted-foreground/40 flex flex-wrap justify-center gap-x-2 gap-y-0.5">
          {allStreams.map((stream, idx) => (
            <span key={idx}>
              <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-semibold text-xs">{stream.keyDisplay}</kbd>
              {' '}={' '}{STREAM_LABELS[idx]}
            </span>
          ))}

          <span className="text-muted-foreground/25 ml-1">· N={gameState.nLevel}</span>
          {noobMode && <span className="text-amber-400 ml-1">· NOOB MODE</span>}
        </p>
      </div>

      {/* Mobile buttons */}
      {(phase === 'stimulus' || (noobMode && phase === 'stimulus')) && (
        <div className="mt-1 shrink-0 md:hidden flex gap-2 w-full max-w-lg mx-auto">
          {noobMode ? (
            <>
              <button
                onClick={handlePrevTrial}
                disabled={gameState.round === 0}
                className="flex-1 h-12 rounded-lg bg-secondary border border-border text-muted-foreground font-mono text-xs hover:border-muted-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              {allStreams.map((stream, idx) => (
                <button key={idx}
                  className={`flex-1 h-12 rounded-lg bg-secondary border font-mono text-xs text-muted-foreground transition-colors ${STREAM_BORDER_COLORS[idx]}`}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  onTouchStart={(e) => {
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
                  }}>
                  {stream.keyDisplay}
                </button>
              ))}
              <button
                onClick={handleNextTrial}
                className="flex-1 h-12 rounded-lg bg-primary text-primary-foreground font-mono text-xs hover:bg-primary/90 transition-colors"
              >
                Next →
              </button>
            </>
          ) : (
            allStreams.map((stream, idx) => (
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
            ))
          )}
        </div>
      )}

      {/* Desktop noob mode navigation buttons */}
      {noobMode && phase === 'stimulus' && (
        <div className="mt-2 shrink-0 hidden md:flex justify-center gap-3 flex-wrap">
          <button
            onClick={handlePrevTrial}
            disabled={gameState.round === 0}
            className="px-6 h-10 rounded-lg bg-secondary border border-border text-muted-foreground font-mono text-sm hover:border-muted-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev Trial
          </button>
          {allStreams.map((stream, idx) => (
            <button key={idx}
              onMouseDown={(e) => {
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
              }}
              className={`px-6 h-10 rounded-lg bg-secondary border font-mono text-sm transition-colors ${STREAM_BORDER_COLORS[idx]}`}>
              {stream.keyDisplay}
            </button>
          ))}
          <button
            onClick={handleNextTrial}
            className="px-6 h-10 rounded-lg bg-primary text-primary-foreground font-mono text-sm hover:bg-primary/90 transition-colors"
          >
            Next Trial →
          </button>
        </div>
      )}
    </div>
  );
}