import React, { useState } from 'react';
import StartScreen from '@/components/game/StartScreen';
import GameScreen from '@/components/game/GameScreen';
import ResultsScreen from '@/components/game/ResultsScreen';
import { calculateResults, computeNextNLevel } from '@/lib/gameEngine';

export default function Game() {
  const [screen, setScreen] = useState('start');
  const [nLevel, setNLevel] = useState(2);
  const [modes, setModes] = useState([]);
  const [relationshipPool, setRelationshipPool] = useState(null);
  const [finalState, setFinalState] = useState(null);
  const [suggestedN, setSuggestedN] = useState(null);
  const [rounds, setRounds] = useState(20);
  const [speedMs, setSpeedMs] = useState(2800);

  const handleStart = (n, selectedModes, selectedRels, totalRounds, stimulusMs) => {
    setNLevel(n);
    setModes(selectedModes);
    setRelationshipPool(selectedRels && selectedRels.length > 0 ? selectedRels : null);
    setRounds(totalRounds || 20);
    setSpeedMs(stimulusMs || 2800);
    setScreen('playing');
  };

  const handleFinish = (state) => {
    setFinalState(state);
    // Compute adaptive N for next session
    if (state.modes?.includes('adaptive')) {
      const results = calculateResults(state);
      const nextN = computeNextNLevel(state.nLevel, results);
      setSuggestedN(nextN);
    }
    setScreen('results');
  };

  const handleRestart = (nextN) => {
    setFinalState(null);
    // If adaptive mode is on, apply the suggested N
    if (modes.includes('adaptive') && nextN) {
      setNLevel(nextN);
    }
    setScreen('playing');
  };

  const handleBack = () => {
    setFinalState(null);
    setScreen('start');
  };

  return (
    <div className="min-h-screen bg-background">
      {screen === 'start' && (
        <StartScreen onStart={handleStart} suggestedN={suggestedN} />
      )}
      {screen === 'playing' && (
        <GameScreen
          key={Date.now()}
          nLevel={nLevel}
          modes={modes}
          relationshipPool={relationshipPool}
          totalRounds={rounds}
          stimulusDuration={speedMs}
          onFinish={handleFinish}
          onExit={handleBack}
        />
      )}
      {screen === 'results' && finalState && (
        <ResultsScreen
          gameState={finalState}
          onRestart={handleRestart}
          onBack={handleBack}
        />
      )}
    </div>
  );
}