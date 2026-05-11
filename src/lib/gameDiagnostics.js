import {
  createGameState,
  generateNextStimulus,
  advanceRound,
  processResponses,
  calculateResults,
} from '@/lib/gameEngine';
import { RELATIONSHIP_CATEGORIES, filterTransitiveRelationships } from '@/lib/gameConstants';

const ALL_RELATIONSHIPS = Object.values(RELATIONSHIP_CATEGORIES).flat();
const RINT_POOL = filterTransitiveRelationships(ALL_RELATIONSHIPS, true, false);
const SPATIAL_POOL = RELATIONSHIP_CATEGORIES.SPATIAL || ALL_RELATIONSHIPS;
const VERBAL_POOL = RELATIONSHIP_CATEGORIES.VERBAL || ALL_RELATIONSHIPS;

const MODE_CASES = [
  { label: 'Normal', modes: [] },
  { label: 'Type N-Back', modes: ['type_nback'] },
  { label: 'RINT', modes: ['rint'], minN: 2, needsRintPool: true },
  { label: 'Mixed N-Back', modes: ['mixed_nback'] },
  { label: 'Mixed RINT', modes: ['mixed_rint'], minN: 2, needsRintPool: true },
  { label: 'Impossible', modes: ['impossible'], minN: 2, minStreams: 2, needsRintPool: true },
  { label: 'Binary Logic', modes: ['binary_logic'], minN: 2, needsRintPool: true },
  { label: 'Variable N', modes: ['variable_n'] },
  { label: 'Adaptive', modes: ['adaptive'] },
  { label: 'Distractors', modes: ['distractors'] },
  { label: 'Variable + Adaptive + Distractors', modes: ['variable_n', 'adaptive', 'distractors'] },
  { label: 'Binary + Adaptive + Distractors', modes: ['binary_logic', 'adaptive', 'distractors'], minN: 2, needsRintPool: true },
];

const POOL_CASES = [
  { label: 'All relationships', pool: ALL_RELATIONSHIPS },
  { label: 'Spatial only', pool: SPATIAL_POOL },
  { label: 'Verbal only', pool: VERBAL_POOL },
  { label: 'RINT-safe', pool: RINT_POOL.length ? RINT_POOL : ALL_RELATIONSHIPS },
];

const N_LEVELS = [1, 2, 3, 5, 8];
const ROUND_COUNTS = [1, 2, 5, 20, 50];
const STREAM_COUNTS = [1, 2, 3, 5, 9];

function makeExtraStreams(streamCount) {
  return Array.from({ length: Math.max(0, streamCount - 1) }, (_, i) => ({
    key: `Key${String.fromCharCode(65 + i)}`,
    keyDisplay: String.fromCharCode(66 + i),
    label: String.fromCharCode(66 + i),
  }));
}

function assertCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function assertFiniteNumber(value, label) {
  assertCondition(Number.isFinite(value), `${label} must be a finite number`);
}

function assertStateInvariants(state, expectedStreams, expectedRound) {
  assertCondition(state.round === expectedRound, `round mismatch: expected ${expectedRound}, got ${state.round}`);
  assertCondition(!!state.currentStimulusA, 'Stream A stimulus missing');
  assertCondition(typeof state.currentRelationship === 'string', 'Stream A relationship missing');
  assertCondition((state.extraCurrentStimuli || []).length === expectedStreams - 1, 'extra stimuli length mismatch');
  assertCondition((state.extraIsTargets || []).length === expectedStreams - 1, 'extra target flags length mismatch');
  assertCondition((state.trialBinaryConfigs || []).length === expectedStreams, 'binary config length mismatch');
}

function assertScoredInvariants(state, expectedStreams, expectedRound) {
  const expectedTrialRecords = expectedRound * expectedStreams;
  const scoredKeys = state.scoredTrialKeys || [];
  const uniqueKeys = new Set(scoredKeys);
  const results = calculateResults(state);

  assertCondition(scoredKeys.length === uniqueKeys.size, 'duplicate scored trial key detected');
  assertCondition((state.allTrials || []).length === expectedTrialRecords, `trial record count mismatch: expected ${expectedTrialRecords}, got ${(state.allTrials || []).length}`);
  assertCondition(results.overall.total === expectedTrialRecords, `overall total mismatch: expected ${expectedTrialRecords}, got ${results.overall.total}`);
  assertFiniteNumber(results.overall.accuracy, 'overall accuracy');
  assertFiniteNumber(results.overall.hitRate, 'overall hit rate');
  assertFiniteNumber(results.overall.falseAlarmRate, 'overall false alarm rate');
}

function simulateCase(testCase) {
  const { nLevel, modes, pool, totalRounds, streamCount } = testCase;
  let state = createGameState({
    nLevel,
    modes,
    relationshipPool: pool,
    totalRounds,
    extraStreams: makeExtraStreams(streamCount),
  });

  for (let i = 0; i < totalRounds; i += 1) {
    const stimulus = generateNextStimulus(state);
    assertCondition(!!stimulus?.stimA, 'generated stimulus missing Stream A');
    assertCondition((stimulus.extraStimuli || []).length === streamCount - 1, 'generated extra stimulus length mismatch');

    state = advanceRound(state, stimulus);
    assertStateInvariants(state, streamCount, i + 1);

    const pressedA = i % 3 === 0;
    const pressedExtra = Array.from({ length: streamCount - 1 }, (_, idx) => (i + idx) % 4 === 0);
    state = processResponses(state, { pressedA, pressedExtra });
    assertScoredInvariants(state, streamCount, i + 1);

    const beforeRecords = state.allTrials.length;
    const beforeKeys = state.scoredTrialKeys.length;
    state = processResponses(state, { pressedA: !pressedA, pressedExtra: pressedExtra.map(v => !v) });
    assertCondition(state.allTrials.length === beforeRecords, 'double scoring changed trial records');
    assertCondition(state.scoredTrialKeys.length === beforeKeys, 'double scoring changed scored keys');
  }

  const results = calculateResults(state);
  assertCondition(results.overall.total === totalRounds * streamCount, 'final result total mismatch');
  return results;
}

export function runGameDiagnostics({ maxCases = 600 } = {}) {
  const startedAt = performance.now();
  const failures = [];
  const samples = [];
  let passed = 0;
  let skipped = 0;
  let caseCount = 0;

  outer: for (const modeCase of MODE_CASES) {
    for (const nLevel of N_LEVELS) {
      for (const totalRounds of ROUND_COUNTS) {
        for (const streamCount of STREAM_COUNTS) {
          for (const poolCase of POOL_CASES) {
            if (caseCount >= maxCases) break outer;
            if (modeCase.minN && nLevel < modeCase.minN) { skipped += 1; continue; }
            if (modeCase.minStreams && streamCount < modeCase.minStreams) { skipped += 1; continue; }
            if (modeCase.needsRintPool && poolCase.label !== 'RINT-safe') { skipped += 1; continue; }

            caseCount += 1;
            const testCase = {
              label: `${modeCase.label} · N=${nLevel} · ${streamCount} stream(s) · ${totalRounds} rounds · ${poolCase.label}`,
              nLevel,
              modes: modeCase.modes,
              pool: poolCase.pool,
              totalRounds,
              streamCount,
            };

            try {
              const results = simulateCase(testCase);
              passed += 1;
              if (samples.length < 8) {
                samples.push({ label: testCase.label, accuracy: results.overall.accuracy, total: results.overall.total });
              }
            } catch (error) {
              failures.push({ label: testCase.label, message: error.message });
            }
          }
        }
      }
    }
  }

  const durationMs = Math.round(performance.now() - startedAt);
  return {
    status: failures.length === 0 ? 'passed' : 'failed',
    passed,
    failed: failures.length,
    skipped,
    totalRun: passed + failures.length,
    durationMs,
    failures,
    samples,
  };
}