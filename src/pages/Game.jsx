import React, { useState } from 'react';
import StartScreen from '@/components/game/StartScreen';
import GameScreen from '@/components/game/GameScreen';
import ResultsScreen from '@/components/game/ResultsScreen';

export default function Game() {
  const [screen, setScreen] = useState('start'); // 'start' | 'playing' | 'results'
  const [nLevel, setNLevel] = useState(2);
  const [finalState, setFinalState] = useState(null);

  const handleStart = (n) => {
    setNLevel(n);
    setScreen('playing');
  };

  const handleFinish = (state) => {
    setFinalState(state);
    setScreen('results');
  };

  const handleRestart = () => {
    setFinalState(null);
    setScreen('playing');
  };

  const handleBack = () => {
    setFinalState(null);
    setScreen('start');
  };

  return (
    <div className="min-h-screen bg-background">
      {screen === 'start' && <StartScreen onStart={handleStart} />}
      {screen === 'playing' && (
        <GameScreen
          key={Date.now()}
          nLevel={nLevel}
          onFinish={handleFinish}
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