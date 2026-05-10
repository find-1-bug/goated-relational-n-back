import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import StartScreen from '@/components/game/StartScreen';
import GameScreen from '@/components/game/GameScreen';
import ResultsScreen from '@/components/game/ResultsScreen';
import { calculateResults, computeNextNLevel } from '@/lib/gameEngine';
import { addSession, saveSettings, getSettings } from '@/lib/localStorageManager';

export default function Game() {
  const [screen, setScreen] = useState('start');
  const [nLevel, setNLevel] = useState(2);
  const [modes, setModes] = useState([]);
  const [relationshipPool, setRelationshipPool] = useState(null);
  const [finalState, setFinalState] = useState(null);
  const [suggestedN, setSuggestedN] = useState(null);
  const [rounds, setRounds] = useState(20);
  const [speedMs, setSpeedMs] = useState(2800);
  const [extraStreams, setExtraStreams] = useState([]);
  const [streamA, setStreamA] = useState({ key: 'Space', keyDisplay: 'SPACE' });
  const [noobMode, setNoobMode] = useState(false);
  const [startTime, setStartTime] = useState(null);

  // Persisted settings restored on mount
  const [lastSettings, setLastSettings] = useState(() => {
    try {
      const settings = getSettings();
      return settings.lastGame || null;
    } catch {
      return null;
    }
  });

  const handleStart = (n, selectedModes, poolRels, totalRounds, stimulusMs, extraSettings, noob) => {
    setNLevel(n);
    setModes(selectedModes);
    setRelationshipPool(poolRels && poolRels.length > 0 ? poolRels : null);
    setRounds(totalRounds || 20);
    setSpeedMs(stimulusMs || 2800);
    setExtraStreams(extraSettings?.extraStreams || []);
    setStreamA(extraSettings?.streamA || { key: 'Space', keyDisplay: 'SPACE' });
    setNoobMode(noob || false);
    setStartTime(Date.now());

    const settings = {
      lastGame: {
        n, modes: selectedModes,
        rels: extraSettings?.rels || poolRels,
        rounds: totalRounds || 20,
        speedMs: stimulusMs || 2800,
        catWeights: extraSettings?.catWeights,
        useCustomMix: extraSettings?.useCustomMix,
        tokenWeights: extraSettings?.tokenWeights,
        extraStreams: extraSettings?.extraStreams || [],
        streamA: extraSettings?.streamA || { key: 'Space', keyDisplay: 'SPACE' },
      }
    };
    saveSettings(settings);
    setLastSettings(settings.lastGame);
    setScreen('playing');
  };

  const handleFinish = (state) => {
    const results = calculateResults(state);
    const durationSeconds = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
    
    // Save session to localStorage
    const sessionData = {
      nLevel: state.nLevel,
      modes: state.modes,
      totalTrials: state.round,
      accuracy: results.overall.accuracy,
      hitRate: results.overall.hitRate,
      falseAlarmRate: results.overall.falseAlarmRate,
      hitsA: results.A.hits,
      missesA: results.A.misses,
      falseAlarmsA: results.A.falseAlarms,
      correctRejectionsA: results.A.correctRejections,
      extraStreamStats: results.extra || [],
      durationSeconds,
      noobMode,
      trials: state.allTrials || [] // trials saved during gameplay
    };
    addSession(sessionData);

    setFinalState(state);
    if (state.modes?.includes('adaptive')) {
      const nextN = computeNextNLevel(state.nLevel, results);
      setSuggestedN(nextN);
    }
    setScreen('results');
  };

  const handleRestart = (nextN) => {
    setFinalState(null);
    if (modes.includes('adaptive') && nextN) setNLevel(nextN);
    setScreen('playing');
  };

  const handleBack = () => {
    setFinalState(null);
    setScreen('start');
  };

  return (
    <div className="min-h-screen bg-background">
      {screen === 'start' && (
        <StartScreen onStart={handleStart} suggestedN={suggestedN} lastSettings={lastSettings} />
      )}
      {screen === 'playing' && (
        <GameScreen
          key={Date.now()}
          nLevel={nLevel}
          modes={modes}
          relationshipPool={relationshipPool}
          totalRounds={rounds}
          stimulusDuration={speedMs}
          extraStreams={extraStreams}
          streamA={streamA}
          noobMode={noobMode}
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
      {/* Top nav — stats & tutorial links from start screen only (exit handled by GameScreen) */}
      <div className="fixed top-3 right-3 z-10 flex gap-2">
        {screen === 'start' && (
          <>
            <Link to="/tutorial" className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground text-xs font-mono transition-colors">
              Tutorial
            </Link>
            <Link to="/stats" className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground text-xs font-mono transition-colors">
              Stats
            </Link>
          </>
        )}
      </div>
    </div>
  );
}