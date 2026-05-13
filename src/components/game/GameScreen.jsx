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
  isSound,
} from '@/lib/gameConstants';
import { playSoundStimulus } from '@/lib/audioRelationships';

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
const STREAM_LABELS = Array.from({ length: 20 }, (_, i) => String.fromCharCode(65 + i));

function getRecordedResponses(progressState, round, streamCount) {
  const records = (progressState?.allTrials || []).filter(trial => trial.trialNumber === round);
  const respondedA = records.find(trial => trial.streamLabel === 'A' && (trial.responseType || 'relation') === 'relation')?.userResponded || false;
  const positionRespondedA = records.find(trial => trial.streamLabel === 'A' && trial.responseType === 'position')?.userResponded || false;
  const extraResponded = Array(Math.max(0, streamCount - 1)).fill(false);
  const extraPositionResponded = Array(Math.max(0, streamCount - 1)).fill(false);

  records.forEach(trial => {
    const index = (trial.streamLabel || '').charCodeAt(0) - 66;
    if (index >= 0 && index < extraResponded.length) {
      if (trial.responseType === 'position') extraPositionResponded[index] = !!trial.userResponded;
      else extraResponded[index] = !!trial.userResponded;
    }
  });

  return { respondedA, positionRespondedA, extraResponded, extraPositionResponded };
}

function makeHistoricalSnapshot(state) {
  return {
    ...structuredClone(state),
    respondedA: false,
    extraResponded: Array(state.numExtraStreams || 0).fill(false),
    positionRespondedA: false,
    extraPositionResponded: Array(state.numExtraStreams || 0).fill(false),
    hitsA: 0,
    missesA: 0,
    falseAlarmsA: 0,
    correctRejectionsA: 0,
    positionHitsA: 0,
    positionMissesA: 0,
    positionFalseAlarmsA: 0,
    positionCorrectRejectionsA: 0,
    extraHits: Array(state.numExtraStreams || 0).fill(0),
    extraMisses: Array(state.numExtraStreams || 0).fill(0),
    extraFalseAlarms: Array(state.numExtraStreams || 0).fill(0),
    extraCorrectRejections: Array(state.numExtraStreams || 0).fill(0),
    extraPositionHits: Array(state.numExtraStreams || 0).fill(0),
    extraPositionMisses: Array(state.numExtraStreams || 0).fill(0),
    extraPositionFalseAlarms: Array(state.numExtraStreams || 0).fill(0),
    extraPositionCorrectRejections: Array(state.numExtraStreams || 0).fill(0),
    scoredTrialKeys: [],
    allTrials: [],
  };
}

function mergeHistoricalWithProgress(historicalState, progressState, streamCount) {
  const historical = structuredClone(historicalState);
  if (!progressState) return historical;
  const recordedResponses = getRecordedResponses(progressState, historical.round, streamCount);
  return {
    ...historical,
    respondedA: recordedResponses.respondedA,
    positionRespondedA: recordedResponses.positionRespondedA,
    extraResponded: recordedResponses.extraResponded,
    extraPositionResponded: recordedResponses.extraPositionResponded,
    hitsA: progressState.hitsA,
    missesA: progressState.missesA,
    falseAlarmsA: progressState.falseAlarmsA,
    correctRejectionsA: progressState.correctRejectionsA,
    positionHitsA: progressState.positionHitsA,
    positionMissesA: progressState.positionMissesA,
    positionFalseAlarmsA: progressState.positionFalseAlarmsA,
    positionCorrectRejectionsA: progressState.positionCorrectRejectionsA,
    extraHits: progressState.extraHits || [],
    extraMisses: progressState.extraMisses || [],
    extraFalseAlarms: progressState.extraFalseAlarms || [],
    extraCorrectRejections: progressState.extraCorrectRejections || [],
    extraPositionHits: progressState.extraPositionHits || [],
    extraPositionMisses: progressState.extraPositionMisses || [],
    extraPositionFalseAlarms: progressState.extraPositionFalseAlarms || [],
    extraPositionCorrectRejections: progressState.extraPositionCorrectRejections || [],
    scoredTrialKeys: progressState.scoredTrialKeys || [],
    allTrials: progressState.allTrials || [],
  };
}

export default function GameScreen({ nLevel, modes, relationshipPool, totalRounds, stimulusDuration, extraStreams, streamA, alienSettings, carouselSettings, noobMode, onFinish, onExit }) {
  // extraStreams: [{ key, label, keyDisplay, positionKey, positionKeyDisplay }]
  const getStimulusDuration = useCallback(() => {
    const duration = stimulusDuration === 'random' ? 1000 + Math.random() * 3000 : stimulusDuration || 2800;
    return modes.includes('alien_cube') || modes.includes('alien_tesseract') ? Math.max(1400, duration) : duration;
  }, [stimulusDuration, modes]);
  const hasAlienPosition = modes.includes('alien_cube') || modes.includes('alien_tesseract') || modes.includes('alien_square');
  const allStreams = [
    { key: streamA?.key || 'Space', keyDisplay: streamA?.keyDisplay || 'SPACE', positionKey: streamA?.positionKey || 'KeyP', positionKeyDisplay: streamA?.positionKeyDisplay || 'P', label: 'A' },
    ...(extraStreams || []).map((stream) => ({
      ...stream,
      positionKey: stream.positionKey || stream.key,
      positionKeyDisplay: stream.positionKeyDisplay || stream.keyDisplay,
    })),
  ];
  const numExtra = (extraStreams || []).length;

  const [gameState, setGameState] = useState(() =>
    createGameState({ nLevel, modes, relationshipPool, totalRounds, extraStreams: extraStreams || [], alienSettings })
  );
  const [phase, setPhase] = useState('stimulus');
  const [clearCanvas, setClearCanvas] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [responsesUnlocked, setResponsesUnlocked] = useState(true);
  // Store full game state after each generated trial, indexed by round number.

  // One response ref per stream (index 0 = stream A, 1..N = extra streams)
  const respondedRefs = useRef(allStreams.map(() => false));
  const positionRespondedRefs = useRef(allStreams.map(() => false));
  const phaseTimerRef = useRef([]);
  const gameStateRef = useRef(gameState);
  const phaseRef = useRef(phase);
  const progressStateRef = useRef(gameState);
  const trialStatesRef = useRef([]);
  const navigationLockRef = useRef(false);
  const hasFinishedRef = useRef(false);
  const hasStartedRef = useRef(false);

  const clearPhaseTimers = useCallback(() => {
    phaseTimerRef.current.forEach(timer => clearTimeout(timer));
    phaseTimerRef.current = [];
  }, []);

  const scheduleTimer = useCallback((callback, delay) => {
    const timer = setTimeout(callback, delay);
    phaseTimerRef.current.push(timer);
    return timer;
  }, []);

  const getCarouselCapacity = useCallback(() => {
    if (!carouselSettings?.enabled) return allStreams.length;
    if (carouselSettings.streamsPerSlide !== 'auto') return Math.max(1, Number(carouselSettings.streamsPerSlide) || allStreams.length);
    const width = window.innerWidth || 1280;
    const height = window.innerHeight || 800;
    const reservedHeight = width < 768 ? 240 : 160;
    const minStreamWidth = width < 768 ? 170 : 320;
    const minStreamHeight = width < 768 ? 280 : 340;
    const cols = width < 768 ? 1 : Math.max(1, Math.floor((width - 24) / minStreamWidth));
    const rows = Math.max(1, Math.floor((height - reservedHeight) / minStreamHeight));
    return Math.max(1, cols * rows);
  }, [carouselSettings, allStreams.length]);

  const finishGame = useCallback((finalState) => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    clearPhaseTimers();
    onFinish(finalState);
  }, [onFinish, clearPhaseTimers]);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const startRound = useCallback((currentState, historicalState = null) => {
    const nextState = historicalState || (() => {
      const stimulus = generateNextStimulus(currentState);
      return advanceRound(currentState, stimulus);
    })();
    
    clearPhaseTimers();
    setGameState(nextState);
    respondedRefs.current = allStreams.map(() => false);
    positionRespondedRefs.current = allStreams.map(() => false);
    setClearCanvas(false);
    setActiveSlide(0);
    setResponsesUnlocked(false);
    setPhase('stimulus');
    
    // Store this state for later playback (only if new trial, not from history)
    // Store indexed by round number for easy lookup during prev/next
    if (!historicalState && noobMode) {
      const updated = Array.isArray(trialStatesRef.current) ? [...trialStatesRef.current] : [];
      updated[nextState.round] = makeHistoricalSnapshot(nextState);
      trialStatesRef.current = updated;
    }
    
    const slideCount = Math.ceil(allStreams.length / getCarouselCapacity());
    const duration = getStimulusDuration();
    const carouselActive = carouselSettings?.enabled && slideCount > 1;
    const slideDuration = carouselActive ? Math.max(1200, carouselSettings?.slideMs || 2800) : 0;
    const responseWindow = carouselActive ? Math.max(1000, duration) : 0;
    const totalWatchTime = carouselActive ? slideDuration * slideCount : duration;

    if (!carouselActive) {
      setResponsesUnlocked(true);
    } else {
      setResponsesUnlocked(false);
      for (let i = 1; i < slideCount; i += 1) {
        scheduleTimer(() => setActiveSlide(i), slideDuration * i);
      }
      scheduleTimer(() => setResponsesUnlocked(true), totalWatchTime);
    }

    // In noob mode, don't auto-advance — wait for user to click Next
    if (!noobMode) {
      scheduleTimer(() => endStimulus(nextState), totalWatchTime + responseWindow);
    }
  }, [noobMode, getStimulusDuration, getCarouselCapacity, scheduleTimer, allStreams.length]);

  const endStimulus = useCallback((currentState) => {
    if (noobMode) {
      // In noob mode, stimulus stays visible, just wait for user action
      setPhase('feedback');
      return;
    }
    
    setClearCanvas(true);
    setPhase('wipe');
    scheduleTimer(() => {
      const state = gameStateRef.current;
      const pressedA = respondedRefs.current[0];
      const pressedExtra = respondedRefs.current.slice(1);
      const pressedPositionA = positionRespondedRefs.current[0];
      const pressedPositionExtra = positionRespondedRefs.current.slice(1);

      const updatedState = processResponses(state, { pressedA, pressedExtra, pressedPositionA, pressedPositionExtra });
      progressStateRef.current = updatedState;
      setGameState(updatedState);
      setPhase('feedback');

      scheduleTimer(() => {
        if (updatedState.round >= updatedState.totalRounds) {
          finishGame(updatedState);
        } else {
          startRound(updatedState);
        }
      }, FEEDBACK_DURATION);
    }, WIPE_DURATION);
  }, [finishGame, startRound, noobMode, scheduleTimer]);

  const handleNextTrial = useCallback(() => {
    // In noob mode, can advance from stimulus phase; otherwise only from feedback
    if (noobMode && phaseRef.current !== 'stimulus') return;
    if (!noobMode && phaseRef.current !== 'feedback') return;
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    const unlockNavigation = () => requestAnimationFrame(() => { navigationLockRef.current = false; });
    
    const state = gameStateRef.current;
    const pressedA = respondedRefs.current[0];
    const pressedExtra = respondedRefs.current.slice(1);
    const pressedPositionA = positionRespondedRefs.current[0];
    const pressedPositionExtra = positionRespondedRefs.current.slice(1);

    if (noobMode) {
      const alreadyScored = (progressStateRef.current?.scoredTrialKeys || []).includes(state.round);
      const progressState = alreadyScored
        ? progressStateRef.current
        : processResponses(state, { pressedA, pressedExtra, pressedPositionA, pressedPositionExtra });

      progressStateRef.current = progressState;

      if (state.round >= state.totalRounds) {
        finishGame(progressState);
        return;
      }

      const nextRound = state.round + 1;
      const savedNextState = trialStatesRef.current?.[nextRound];
      if (savedNextState) {
        const restoredState = mergeHistoricalWithProgress(savedNextState, progressState, allStreams.length);
        setGameState(restoredState);
        respondedRefs.current = [restoredState.respondedA, ...(restoredState.extraResponded || [])];
        positionRespondedRefs.current = [restoredState.positionRespondedA, ...(restoredState.extraPositionResponded || [])];
        setClearCanvas(false);
        setPhase('stimulus');
      } else {
        startRound(progressState);
      }
      unlockNavigation();
      return;
    }

    const updatedState = processResponses(state, { pressedA, pressedExtra, pressedPositionA, pressedPositionExtra });
    progressStateRef.current = updatedState;

    if (updatedState.round >= updatedState.totalRounds) {
      finishGame(updatedState);
    } else {
      startRound(updatedState);
      unlockNavigation();
    }
  }, [noobMode, finishGame, startRound, allStreams.length]);

  const handlePrevTrial = useCallback(() => {
    const currentRound = gameStateRef.current?.round ?? 0;
    if (currentRound <= 1) return;
    const historicalState = trialStatesRef.current?.[currentRound - 1];
    if (historicalState) {
      const restoredState = mergeHistoricalWithProgress(historicalState, progressStateRef.current, allStreams.length);
      setGameState(restoredState);
      respondedRefs.current = [restoredState.respondedA, ...(restoredState.extraResponded || [])];
      positionRespondedRefs.current = [restoredState.positionRespondedA, ...(restoredState.extraPositionResponded || [])];
      setClearCanvas(false);
      setPhase('stimulus');
    }
  }, [allStreams.length]);

  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      startRound(gameState);
    }
    return clearPhaseTimers;
  }, []);

  const markResponse = useCallback((idx, type = 'relation') => {
    if (!(phaseRef.current === 'stimulus')) return;
    if (!responsesUnlocked) return;
    if (noobMode && (progressStateRef.current?.scoredTrialKeys || []).includes(gameStateRef.current?.round)) return;
    const refs = type === 'position' ? positionRespondedRefs : respondedRefs;
    if (refs.current[idx]) return;
    refs.current[idx] = true;
    if (idx === 0) {
      setGameState(prev => type === 'position' ? { ...prev, positionRespondedA: true } : { ...prev, respondedA: true });
    } else {
      setGameState(prev => {
        const key = type === 'position' ? 'extraPositionResponded' : 'extraResponded';
        const next = [...(prev[key] || [])];
        next[idx - 1] = true;
        return { ...prev, [key]: next };
      });
    }
  }, [noobMode, responsesUnlocked]);

  // Keyboard controls — dynamic per stream key
  useEffect(() => {
    const handleKey = (e) => {
      if (phase !== 'stimulus') return;
      if (noobMode && (progressStateRef.current?.scoredTrialKeys || []).includes(gameStateRef.current?.round)) return;
      allStreams.forEach((stream, idx) => {
        if (e.code === stream.key) {
          e.preventDefault();
          markResponse(idx, 'relation');
        }
        if (hasAlienPosition && e.code === stream.positionKey) {
          e.preventDefault();
          markResponse(idx, 'position');
        }
      });
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, markResponse, hasAlienPosition]);

  // Get current stimulus & rel for each stream (A + extras)
  const allTrialModes = [gameState.trialMode, ...(gameState.extraTrialModes || [])];
  const allTrialBinaryConfigs = gameState.trialBinaryConfigs || [];
  const isBinaryLogic = modes.includes('binary_logic');
  const streamStimuli = [
    { rel: gameState.currentRelationship, stimulus: gameState.currentStimulusA, responded: gameState.respondedA, positionResponded: gameState.positionRespondedA },
    ...(gameState.extraCurrentRels || []).map((rel, i) => ({
      rel,
      stimulus: (gameState.extraCurrentStimuli || [])[i],
      responded: (gameState.extraResponded || [])[i],
      positionResponded: (gameState.extraPositionResponded || [])[i],
    })),
  ];
  const audioStreamIndexes = gameState.audioStreamIndexes || [];
  const audioEarForIndex = (idx) => {
    if (!isSound(streamStimuli[idx]?.rel)) return null;
    const audioIndex = audioStreamIndexes.indexOf(idx);
    if (audioIndex === -1) return null;
    return audioIndex === 0 ? 'L' : 'R';
  };

  React.useEffect(() => {
    if (phase !== 'stimulus' || clearCanvas) return;
    const allAudible = [
      { rel: gameState.currentRelationship, stimulus: gameState.currentStimulusA, index: 0 },
      ...(gameState.extraCurrentRels || []).map((rel, i) => ({
        rel,
        stimulus: (gameState.extraCurrentStimuli || [])[i],
        index: i + 1,
      })),
    ];

    const selected = (gameState.audioStreamIndexes?.length
      ? gameState.audioStreamIndexes.map(index => allAudible.find(item => item.index === index)).filter(Boolean)
      : allAudible.filter(item => isSound(item.rel)).slice(0, 1)
    ).filter(item => isSound(item.rel));

    selected.slice(0, 2).forEach((item, i) => {
      const pan = selected.length === 1 ? 0 : i === 0 ? -0.85 : 0.85;
      const delaySeconds = selected.length === 2 && i === 1 ? 0.32 : 0;
      playSoundStimulus(item.stimulus, pan, delaySeconds);
    });
  }, [phase, clearCanvas, gameState.round, gameState.audioStreamIndexes, gameState.currentRelationship, gameState.extraCurrentRels]);

  const numStreams = streamStimuli.length;
  const streamsPerSlide = getCarouselCapacity();
  const slideCount = Math.ceil(numStreams / streamsPerSlide);
  const isCarouselActive = carouselSettings?.enabled && slideCount > 1;
  const visibleStart = isCarouselActive ? activeSlide * streamsPerSlide : 0;
  const visibleStimuli = streamStimuli.slice(visibleStart, visibleStart + streamsPerSlide);
  const visibleStreams = allStreams.slice(visibleStart, visibleStart + streamsPerSlide);
  const visibleCount = visibleStimuli.length;
  const mobileCols = 1;
  const desktopCols = visibleCount === 1 ? 1
    : visibleCount === 2 ? 2
    : visibleCount === 3 ? 3
    : visibleCount === 4 ? 2
    : visibleCount <= 6 ? 3
    : visibleCount <= 8 ? 4
    : Math.ceil(Math.sqrt(visibleCount));

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
        className="flex-1 min-h-0 grid gap-2 overflow-y-auto md:overflow-hidden [grid-template-columns:var(--mobile-grid-cols)] md:[grid-template-columns:var(--desktop-grid-cols)] auto-rows-[minmax(300px,1fr)] md:auto-rows-[minmax(0,1fr)]"
        style={{
          '--mobile-grid-cols': `repeat(${mobileCols}, 1fr)`,
          '--desktop-grid-cols': `repeat(${desktopCols}, 1fr)`,
        }}
      >
        {visibleStimuli.map((s, localIdx) => {
          const idx = visibleStart + localIdx;
          const rintChain = gameState.rintStates?.[idx]?.chainLog;
          const showRintChain = phase === 'stimulus' && allTrialModes[idx] === 'rint' && rintChain?.length > 0;
          return (
            <div key={idx} className={`relative rounded-xl border flex flex-col overflow-hidden ${audioEarForIndex(idx) ? 'bg-emerald-500/10 border-emerald-400 shadow-[0_0_28px_rgba(52,211,153,0.28)]' : `bg-secondary/30 ${STREAM_BORDER_COLORS[idx % STREAM_BORDER_COLORS.length]}`}`}>
              <div className="flex-1 min-h-0 relative">
                <GameCanvas
                relationship={!clearCanvas ? s.rel : null}
                stimulus={s.stimulus}
                clearCanvas={clearCanvas}
                rintChain={gameState.rintStates?.[idx]?.chainLog}
                streamCount={numStreams}
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
                {audioEarForIndex(idx) && phase === 'stimulus' && !clearCanvas && (
                  <div className="absolute top-2 right-3 pointer-events-none w-8 h-8 rounded-full bg-emerald-400/25 border border-emerald-300/70 flex items-center justify-center text-sm font-mono font-bold text-emerald-100 shadow-[0_0_16px_rgba(52,211,153,0.35)]">
                    {audioEarForIndex(idx)}
                  </div>
                )}
                {(s.responded || s.positionResponded) && phase === 'stimulus' && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                    {s.responded && <div className={`w-2 h-2 rounded-full ${STREAM_DOT_COLORS[idx % STREAM_DOT_COLORS.length]}`} title="Relation response" />}
                    {s.positionResponded && <div className="w-2 h-2 rounded-full bg-amber-400/80" title="Position response" />}
                  </div>
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


      {isCarouselActive && phase === 'stimulus' && (
        <div className="mt-1 shrink-0 text-center text-xs font-mono">
          <span className="text-primary">Slide {Math.min(activeSlide + 1, slideCount)}/{slideCount}</span>
          <span className="text-muted-foreground/40"> · Streams {STREAM_LABELS[visibleStart]}–{STREAM_LABELS[Math.min(numStreams - 1, visibleStart + streamsPerSlide - 1)]}</span>
          <span className={responsesUnlocked ? 'text-emerald-400' : 'text-amber-400'}> · {responsesUnlocked ? 'responses unlocked' : 'watch only'}</span>
        </div>
      )}

      {/* Controls hint */}
      <div className="mt-1 shrink-0 text-center">
        <p className="text-xs font-mono text-muted-foreground/40 flex flex-wrap justify-center gap-x-2 gap-y-0.5">
          {allStreams.map((stream, idx) => (
            <span key={idx}>
              <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-semibold text-xs">{stream.keyDisplay}</kbd>
              {' '}= {STREAM_LABELS[idx]} REL
              {hasAlienPosition && <><kbd className="ml-1 px-1 py-0.5 rounded bg-muted text-amber-400 font-semibold text-xs">{stream.positionKeyDisplay}</kbd> = {STREAM_LABELS[idx]} POS</>}
            </span>
          ))}

          <span className="text-muted-foreground/25 ml-1">· N={gameState.nLevel}</span>
          {noobMode && <span className="text-amber-400 ml-1">· NOOB MODE</span>}
        </p>
      </div>

      {/* Mobile buttons */}
      {responsesUnlocked && (phase === 'stimulus' || (noobMode && phase === 'stimulus')) && (
        <div className="mt-1 shrink-0 md:hidden grid grid-cols-2 gap-2 w-full max-w-lg mx-auto">
          {noobMode ? (
            <>
              <button
                onClick={handlePrevTrial}
                disabled={gameState.round <= 1}
                className="h-12 rounded-lg bg-secondary border border-border text-muted-foreground font-mono text-xs hover:border-muted-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              {allStreams.flatMap((stream, idx) => [
                <button key={`${idx}-rel`}
                  className={`h-12 rounded-lg bg-secondary border font-mono text-xs text-muted-foreground transition-colors ${STREAM_BORDER_COLORS[idx % STREAM_BORDER_COLORS.length]}`}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  onTouchStart={(e) => { e.preventDefault(); markResponse(idx, 'relation'); }}>
                  {stream.keyDisplay} REL
                </button>,
                hasAlienPosition && <button key={`${idx}-pos`}
                  className={`h-12 rounded-lg bg-secondary border font-mono text-xs text-amber-400 transition-colors ${STREAM_BORDER_COLORS[idx % STREAM_BORDER_COLORS.length]}`}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  onTouchStart={(e) => { e.preventDefault(); markResponse(idx, 'position'); }}>
                  {stream.positionKeyDisplay} POS
                </button>
              ].filter(Boolean))}
              <button
                onClick={handleNextTrial}
                className="h-12 rounded-lg bg-primary text-primary-foreground font-mono text-xs hover:bg-primary/90 transition-colors"
              >
                Next →
              </button>
            </>
          ) : (
            allStreams.flatMap((stream, idx) => [
              <button key={`${idx}-rel`}
                className={`h-12 rounded-lg bg-secondary border font-mono text-xs text-muted-foreground transition-colors ${STREAM_BORDER_COLORS[idx % STREAM_BORDER_COLORS.length]}`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                onTouchStart={(e) => { e.preventDefault(); markResponse(idx, 'relation'); }}>
                {stream.keyDisplay} REL
              </button>,
              hasAlienPosition && <button key={`${idx}-pos`}
                className={`h-12 rounded-lg bg-secondary border font-mono text-xs text-amber-400 transition-colors ${STREAM_BORDER_COLORS[idx % STREAM_BORDER_COLORS.length]}`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                onTouchStart={(e) => { e.preventDefault(); markResponse(idx, 'position'); }}>
                {stream.positionKeyDisplay} POS
              </button>
            ].filter(Boolean))
          )}
        </div>
      )}

      {/* Desktop noob mode navigation buttons */}
      {responsesUnlocked && noobMode && phase === 'stimulus' && (
        <div className="mt-2 shrink-0 hidden md:flex justify-center gap-3 flex-wrap">
          <button
            onClick={handlePrevTrial}
            disabled={gameState.round <= 1}
            className="px-6 h-10 rounded-lg bg-secondary border border-border text-muted-foreground font-mono text-sm hover:border-muted-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev Trial
          </button>
          {allStreams.flatMap((stream, idx) => [
            <button key={`${idx}-rel`}
              onMouseDown={(e) => { e.preventDefault(); markResponse(idx, 'relation'); }}
              className={`px-6 h-10 rounded-lg bg-secondary border font-mono text-sm transition-colors ${STREAM_BORDER_COLORS[idx % STREAM_BORDER_COLORS.length]}`}>
              {stream.keyDisplay} REL
            </button>,
            hasAlienPosition && <button key={`${idx}-pos`}
              onMouseDown={(e) => { e.preventDefault(); markResponse(idx, 'position'); }}
              className={`px-6 h-10 rounded-lg bg-secondary border font-mono text-sm text-amber-400 transition-colors ${STREAM_BORDER_COLORS[idx % STREAM_BORDER_COLORS.length]}`}>
              {stream.positionKeyDisplay} POS
            </button>
          ].filter(Boolean))}
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