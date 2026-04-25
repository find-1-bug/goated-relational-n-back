import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GameCanvas from './GameCanvas';
import GameHUD from './GameHUD';
import {
  createGameState,
  generateNextRelationship,
  processResponse,
  advanceRound,
} from '@/lib/gameEngine';
import {
  STIMULUS_DURATION,
  WIPE_DURATION,
  FEEDBACK_DURATION,
} from '@/lib/gameConstants';

// phases: 'stimulus' | 'wipe' | 'feedback'
export default function GameScreen({ nLevel, onFinish }) {
  const [gameState, setGameState] = useState(() => createGameState(nLevel));
  const [phase, setPhase] = useState('stimulus');
  const [feedbackType, setFeedbackType] = useState(null); // 'hit' | 'miss' | 'false_alarm' | null
  const [clearCanvas, setClearCanvas] = useState(false);
  const [prevVisuals, setPrevVisuals] = useState(null);

  const respondedRef = useRef(false);
  const phaseTimerRef = useRef(null);
  const gameStateRef = useRef(gameState);

  // Keep ref in sync
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Start next round
  const startRound = useCallback((currentState) => {
    const { relationship, isTarget } = generateNextRelationship(currentState);
    const nextState = advanceRound(currentState, relationship, isTarget);
    
    setGameState(nextState);
    respondedRef.current = false;
    setClearCanvas(false);
    setPhase('stimulus');
    setFeedbackType(null);

    // Auto-advance after stimulus duration
    phaseTimerRef.current = setTimeout(() => {
      endStimulus(nextState);
    }, STIMULUS_DURATION);
  }, []);

  // End stimulus phase
  const endStimulus = useCallback((currentState) => {
    setClearCanvas(true);
    setPhase('wipe');

    phaseTimerRef.current = setTimeout(() => {
      const state = gameStateRef.current;
      const userPressed = respondedRef.current;
      const updatedState = processResponse(state, userPressed);
      
      // Determine feedback
      let fb;
      if (state.isTarget && userPressed) fb = 'hit';
      else if (state.isTarget && !userPressed) fb = 'miss';
      else if (!state.isTarget && userPressed) fb = 'false_alarm';
      else fb = null; // correct rejection — no flashy feedback

      setGameState(updatedState);
      setFeedbackType(fb);
      setPhase('feedback');

      phaseTimerRef.current = setTimeout(() => {
        setFeedbackType(null);
        if (updatedState.round >= updatedState.totalRounds) {
          onFinish(updatedState);
        } else {
          startRound(updatedState);
        }
      }, FEEDBACK_DURATION);
    }, WIPE_DURATION);
  }, [onFinish, startRound]);

  // Initialize first round
  useEffect(() => {
    startRound(gameState);
    return () => {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    };
  }, []);

  // Keyboard handler
  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space' && phase === 'stimulus' && !respondedRef.current) {
        e.preventDefault();
        respondedRef.current = true;
        setGameState(prev => ({ ...prev, responded: true }));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase]);

  // Feedback border colors
  const getBorderColor = () => {
    if (phase !== 'feedback' || !feedbackType) return 'border-transparent';
    switch (feedbackType) {
      case 'hit': return 'border-emerald-500';
      case 'miss': return 'border-amber-500';
      case 'false_alarm': return 'border-red-500';
      default: return 'border-transparent';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-4 select-none">
      {/* HUD */}
      <div className="w-full max-w-xl mb-4">
        <GameHUD
          round={gameState.round}
          totalRounds={gameState.totalRounds}
          nLevel={gameState.nLevel}
          hits={gameState.hits}
          misses={gameState.misses}
          falseAlarms={gameState.falseAlarms}
          relationship={gameState.currentRelationship}
          phase={phase}
        />
      </div>

      {/* Canvas Container */}
      <div
        className={`
          relative w-full max-w-xl aspect-[4/3] rounded-xl
          bg-secondary/30 border-4 transition-colors duration-200
          ${getBorderColor()}
        `}
      >
        <GameCanvas
          relationship={!clearCanvas ? gameState.currentRelationship : null}
          prevVisuals={prevVisuals}
          onVisualsRendered={(v) => setPrevVisuals(v)}
          clearCanvas={clearCanvas}
        />

        {/* Response indicator */}
        <AnimatePresence>
          {gameState.responded && phase === 'stimulus' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-3 right-3 px-2 py-1 rounded bg-primary/20 border border-primary/30"
            >
              <span className="text-xs font-mono text-primary font-semibold">MATCH</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase overlay for wipe */}
        {phase === 'wipe' && (
          <div className="absolute inset-0 bg-background/90 rounded-xl flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-pulse" />
          </div>
        )}
      </div>

      {/* Spacebar hint */}
      <div className="mt-6 text-center">
        <p className="text-xs font-mono text-muted-foreground/50">
          Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold text-xs">SPACE</kbd> if the relationship matches {nLevel} back
        </p>
      </div>

      {/* Mobile tap button */}
      <button
        className="mt-4 md:hidden w-full max-w-xs h-14 rounded-lg bg-secondary border border-border font-mono text-sm text-muted-foreground active:bg-primary/20 active:text-primary active:border-primary/30 transition-colors"
        onTouchStart={(e) => {
          e.preventDefault();
          if (phase === 'stimulus' && !respondedRef.current) {
            respondedRef.current = true;
            setGameState(prev => ({ ...prev, responded: true }));
          }
        }}
      >
        TAP FOR MATCH
      </button>
    </div>
  );
}