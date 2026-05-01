import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GameCanvas from './GameCanvas';
import GameHUD from './GameHUD';
import {
  createGameState,
  generateNextStimulus,
  processResponses,
  advanceRound,
} from '@/lib/gameEngine';
import {
  STIMULUS_DURATION,
  WIPE_DURATION,
  FEEDBACK_DURATION,
} from '@/lib/gameConstants';

export default function GameScreen({ nLevel, modes, relationshipPool, onFinish }) {
  const [gameState, setGameState] = useState(() => createGameState({ nLevel, modes, relationshipPool }));
  const [phase, setPhase] = useState('stimulus');
  const [feedbackA, setFeedbackA] = useState(null);
  const [feedbackB, setFeedbackB] = useState(null);
  const [feedbackC, setFeedbackC] = useState(null);
  const [clearCanvas, setClearCanvas] = useState(false);
  const [prevVisuals, setPrevVisuals] = useState(null);

  const respondedARef = useRef(false);
  const respondedBRef = useRef(false);
  const respondedCRef = useRef(false);
  const phaseTimerRef = useRef(null);
  const gameStateRef = useRef(gameState);

  const isDual = modes.includes('dual');
  const isHier = modes.includes('hierarchical');

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const startRound = useCallback((currentState) => {
    const stimulus = generateNextStimulus(currentState);
    const nextState = advanceRound(currentState, stimulus);

    setGameState(nextState);
    respondedARef.current = false;
    respondedBRef.current = false;
    respondedCRef.current = false;
    setClearCanvas(false);
    setPhase('stimulus');
    setFeedbackA(null);
    setFeedbackB(null);
    setFeedbackC(null);

    phaseTimerRef.current = setTimeout(() => endStimulus(nextState), STIMULUS_DURATION);
  }, []);

  const endStimulus = useCallback((currentState) => {
    setClearCanvas(true);
    setPhase('wipe');

    phaseTimerRef.current = setTimeout(() => {
      const state = gameStateRef.current;
      const pressedA = respondedARef.current;
      const pressedB = respondedBRef.current;
      const pressedCategory = respondedCRef.current;

      const updatedState = processResponses(state, { pressedA, pressedB, pressedCategory });

      // Feedback per stream
      const fbA = state.isTargetA && pressedA ? 'hit' : state.isTargetA && !pressedA ? 'miss' : !state.isTargetA && pressedA ? 'false_alarm' : null;
      const fbB = isDual ? (state.isTargetB && pressedB ? 'hit' : state.isTargetB && !pressedB ? 'miss' : !state.isTargetB && pressedB ? 'false_alarm' : null) : null;
      const fbC = isHier ? (state.isTargetCategory && pressedCategory ? 'hit' : state.isTargetCategory && !pressedCategory ? 'miss' : !state.isTargetCategory && pressedCategory ? 'false_alarm' : null) : null;

      setGameState(updatedState);
      setFeedbackA(fbA);
      setFeedbackB(fbB);
      setFeedbackC(fbC);
      setPhase('feedback');

      phaseTimerRef.current = setTimeout(() => {
        setFeedbackA(null); setFeedbackB(null); setFeedbackC(null);
        if (updatedState.round >= updatedState.totalRounds) {
          onFinish(updatedState);
        } else {
          startRound(updatedState);
        }
      }, FEEDBACK_DURATION);
    }, WIPE_DURATION);
  }, [onFinish, startRound, isDual, isHier]);

  useEffect(() => {
    startRound(gameState);
    return () => { if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current); };
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e) => {
      if (phase !== 'stimulus') return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (!respondedARef.current) {
          respondedARef.current = true;
          setGameState(prev => ({ ...prev, respondedA: true }));
        }
      }
      // Stream B: press 'A' key
      if (e.code === 'KeyA' && isDual) {
        e.preventDefault();
        if (!respondedBRef.current) {
          respondedBRef.current = true;
          setGameState(prev => ({ ...prev, respondedB: true }));
        }
      }
      // Category: press 'L' key
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
  }, [phase, isDual, isHier]);

  const getBorderColor = () => {
    if (phase !== 'feedback') return 'border-transparent';
    if (feedbackA === 'hit') return 'border-emerald-500';
    if (feedbackA === 'miss') return 'border-amber-500';
    if (feedbackA === 'false_alarm') return 'border-red-500';
    return 'border-transparent';
  };

  const categoryLabel = { SPATIAL: 'Spatial', TRAIT: 'Trait', QUANT: 'Quantitative' };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-4 select-none">
      <div className="w-full max-w-xl mb-4">
        <GameHUD
          round={gameState.round}
          totalRounds={gameState.totalRounds}
          nLevel={gameState.nLevel}
          hitsA={gameState.hitsA}
          missesA={gameState.missesA}
          falseAlarmsA={gameState.falseAlarmsA}
          relationship={gameState.currentRelationship}
          relationshipB={gameState.currentRelationshipB}
          category={gameState.currentCategory}
          phase={phase}
          modes={modes}
          isDistractor={gameState.isDistractor}
        />
      </div>

      {/* Main canvas */}
      <div className={`relative w-full max-w-xl aspect-[4/3] rounded-xl bg-secondary/30 border-4 transition-colors duration-200 ${getBorderColor()}`}>
        <GameCanvas
          relationship={!clearCanvas ? gameState.currentRelationship : null}
          prevVisuals={prevVisuals}
          onVisualsRendered={(v) => setPrevVisuals(v)}
          clearCanvas={clearCanvas}
        />

        {/* Stream A responded indicator */}
        <AnimatePresence>
          {gameState.respondedA && phase === 'stimulus' && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="absolute bottom-3 right-3 px-2 py-1 rounded bg-primary/20 border border-primary/30">
              <span className="text-xs font-mono text-primary font-semibold">MATCH A</span>
            </motion.div>
          )}
        </AnimatePresence>

        {phase === 'wipe' && (
          <div className="absolute inset-0 bg-background/90 rounded-xl flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-pulse" />
          </div>
        )}
      </div>

      {/* Stream B canvas (dual mode) */}
      {isDual && (
        <div className={`relative w-full max-w-xl aspect-[4/3] mt-3 rounded-xl bg-secondary/30 border-4 transition-colors duration-200
          ${phase === 'feedback' ? feedbackB === 'hit' ? 'border-emerald-500' : feedbackB === 'miss' ? 'border-amber-500' : feedbackB === 'false_alarm' ? 'border-red-500' : 'border-transparent' : 'border-accent/40'}`}>
          <GameCanvas
            relationship={!clearCanvas ? gameState.currentRelationshipB : null}
            prevVisuals={null}
            onVisualsRendered={() => {}}
            clearCanvas={clearCanvas}
          />
          <div className="absolute top-2 left-3">
            <span className="text-xs font-mono text-accent/70 uppercase tracking-widest">Stream B</span>
          </div>
          <AnimatePresence>
            {gameState.respondedB && phase === 'stimulus' && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="absolute bottom-3 right-3 px-2 py-1 rounded bg-accent/20 border border-accent/30">
                <span className="text-xs font-mono text-accent font-semibold">MATCH B</span>
              </motion.div>
            )}
          </AnimatePresence>
          {phase === 'wipe' && (
            <div className="absolute inset-0 bg-background/90 rounded-xl flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-pulse" />
            </div>
          )}
        </div>
      )}

      {/* Hierarchical category display */}
      {isHier && gameState.currentCategory && phase === 'stimulus' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className={`mt-3 px-4 py-2 rounded-lg border font-mono text-xs text-center
            ${phase === 'feedback' ? feedbackC === 'hit' ? 'border-emerald-500 text-emerald-400' : feedbackC === 'miss' ? 'border-amber-500 text-amber-400' : feedbackC === 'false_alarm' ? 'border-red-500 text-red-400' : 'border-border text-muted-foreground' : 'border-border text-muted-foreground'}`}>
          Category: <span className="text-accent font-semibold">{categoryLabel[gameState.currentCategory] || gameState.currentCategory}</span>
          {gameState.respondedCategory && <span className="ml-3 text-accent">✓ CAT MATCH</span>}
        </motion.div>
      )}

      {/* Controls hint */}
      <div className="mt-4 text-center space-y-1">
        <p className="text-xs font-mono text-muted-foreground/50">
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold text-xs">SPACE</kbd> = Match A (relationship)
          {isDual && <> &nbsp; <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold text-xs">A</kbd> = Match B</>}
          {isHier && <> &nbsp; <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold text-xs">L</kbd> = Category match</>}
        </p>
        <p className="text-xs font-mono text-muted-foreground/30">Match from {gameState.nLevel} turn{gameState.nLevel > 1 ? 's' : ''} ago</p>
      </div>

      {/* Mobile buttons */}
      <div className="mt-3 md:hidden flex gap-2 w-full max-w-xs">
        <button className="flex-1 h-12 rounded-lg bg-secondary border border-border font-mono text-xs text-muted-foreground active:bg-primary/20 active:text-primary active:border-primary/30 transition-colors"
          onTouchStart={(e) => {
            e.preventDefault();
            if (phase === 'stimulus' && !respondedARef.current) {
              respondedARef.current = true;
              setGameState(prev => ({ ...prev, respondedA: true }));
            }
          }}>MATCH A</button>
        {isDual && (
          <button className="flex-1 h-12 rounded-lg bg-secondary border border-accent/30 font-mono text-xs text-muted-foreground active:bg-accent/20 active:text-accent transition-colors"
            onTouchStart={(e) => {
              e.preventDefault();
              if (phase === 'stimulus' && !respondedBRef.current) {
                respondedBRef.current = true;
                setGameState(prev => ({ ...prev, respondedB: true }));
              }
            }}>MATCH B</button>
        )}
        {isHier && (
          <button className="flex-1 h-12 rounded-lg bg-secondary border border-accent/20 font-mono text-xs text-muted-foreground active:bg-accent/10 active:text-accent transition-colors"
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