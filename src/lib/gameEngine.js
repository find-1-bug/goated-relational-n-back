import {
  RELATIONSHIPS as ALL_RELATIONSHIPS,
  RELATIONSHIP_CATEGORIES,
  SHAPES,
  COLORS,
  MATCH_CHANCE,
  DUAL_MATCH_CHANCE,
  HIER_MATCH_CHANCE,
  DISTRACTOR_CHANCE,
  TOTAL_ROUNDS,
  N_MIN,
  N_MAX,
  ADAPT_UP_THRESHOLD,
  ADAPT_DOWN_THRESHOLD,
  getCategory,
  pickRandom,
  pickRandomExcluding,
  isVerbal,
  getVerbalPair,
  pickTokenType,
  pickTokenWord,
  makeInverseStimulus,
  INVERSE_RELATIONSHIP,
} from './gameConstants';

import { createRINTState, createRINTStates, generateRINTStimulus, RINT_MIN_N } from './relationalIntegration.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeStimulusEntry(rel) {
  const shapeA = pickRandom(SHAPES);
  const shapeB = pickRandomExcluding(SHAPES, shapeA);
  const colorA = pickRandom(COLORS);
  const colorB = pickRandomExcluding(COLORS, colorA);
  const renderMode = Math.floor(Math.random() * 3);
  if (isVerbal(rel)) {
    let wordA, wordB;
    if (Math.random() < 0.40) {
      [wordA, wordB] = getVerbalPair(rel);
    } else {
      wordA = pickTokenWord(pickTokenType());
      wordB = pickTokenWord(pickTokenType());
    }
    return { rel, wordA, wordB, shapeA, shapeB, colorA, colorB, renderMode };
  }
  return { rel, shapeA, shapeB, colorA, colorB, renderMode };
}

function maybeInvertVisual(entry) {
  if (!entry || Math.random() >= 0.25) return entry;
  return { ...entry, shapeA: entry.shapeB, shapeB: entry.shapeA, colorA: entry.colorB, colorB: entry.colorA };
}

function getTypeHistory(typeHistoryMap, rel) {
  const inv = INVERSE_RELATIONSHIP[rel];
  const own = typeHistoryMap.get(rel) || [];
  const invEntries = (inv && inv !== rel) ? (typeHistoryMap.get(inv) || []) : [];
  return [...own, ...invEntries].sort((a, b) => a.trialIndex - b.trialIndex);
}

function pushTypeHistory(typeHistoryMap, rel, entry) {
  const next = new Map(typeHistoryMap);
  const existing = next.get(rel) || [];
  next.set(rel, [...existing, entry]);
  return next;
}

function pickTypeNbackTargetRel(typeHistoryMap, pool, effectiveN) {
  const candidates = pool.filter(rel => getTypeHistory(typeHistoryMap, rel).length >= effectiveN);
  if (candidates.length === 0) return null;
  return pickRandom(candidates);
}

function makeDistractor(targetRelationship, pool) {
  const cat = getCategory(targetRelationship);
  const sameCategory = (RELATIONSHIP_CATEGORIES[cat] || ALL_RELATIONSHIPS).filter(r => pool.includes(r));
  const candidates = sameCategory.length > 1 ? sameCategory : pool;
  return pickRandomExcluding(candidates, targetRelationship);
}

// Roll a random trial mode for a single stream given the global modes config
// Returns 'normal' | 'type' | 'rint'
function rollTrialMode(modes, effectiveN) {
  const isImpossible = modes.includes('impossible');
  const isMixedRINT = modes.includes('mixed_rint');
  const isMixed = modes.includes('mixed_nback');
  const isTypeNback = modes.includes('type_nback');
  const isRINT = modes.includes('rint');

  if (isImpossible) {
    // Three-way random, RINT only if N>=2
    const r = Math.random();
    if (r < 0.33) return 'normal';
    if (r < 0.66) return 'type';
    return effectiveN >= RINT_MIN_N ? 'rint' : 'type';
  }
  if (isMixedRINT) {
    const r = Math.random();
    if (r < 0.33) return 'normal';
    if (r < 0.66) return 'type';
    return effectiveN >= RINT_MIN_N ? 'rint' : 'normal';
  }
  if (isMixed) {
    return Math.random() < 0.5 ? 'type' : 'normal';
  }
  if (isRINT && effectiveN >= RINT_MIN_N) return 'rint';
  if (isTypeNback) return 'type';
  return 'normal';
}

// Generate stimulus for a single stream, given its own history/typeHistory/rintState
function generateOneStreamStimulus({ history, typeHistory, rintState, pool, effectiveN, trialMode, matchChance, hasDistractors, trialIndex }) {
  let stim, isTarget = false, nextRINTState = rintState;
  const canTarget = history.length >= effectiveN;

  if (trialMode === 'rint') {
    const rintResult = generateRINTStimulus(rintState, pool, effectiveN, matchChance);
    stim = rintResult.stim;
    isTarget = rintResult.isTarget;
    nextRINTState = rintResult.rintState;
  } else if (trialMode === 'type') {
    const forcedRel = Math.random() < matchChance ? pickTypeNbackTargetRel(typeHistory, pool, effectiveN) : null;
    if (forcedRel) {
      const entries = getTypeHistory(typeHistory, forcedRel);
      const targetEntry = entries[entries.length - effectiveN];
      stim = isVerbal(forcedRel)
        ? (Math.random() < 0.35 ? makeInverseStimulus(targetEntry) : null) || makeStimulusEntry(forcedRel)
        : maybeInvertVisual(makeStimulusEntry(forcedRel));
      isTarget = true;
    } else {
      stim = makeStimulusEntry(pickRandom(pool));
    }
  } else {
    // normal
    const nBackEntry = canTarget ? history[history.length - effectiveN] : null;
    if (canTarget && nBackEntry && Math.random() < matchChance) {
      stim = isVerbal(nBackEntry.rel)
        ? (Math.random() < 0.35 ? makeInverseStimulus(nBackEntry) : null) || nBackEntry
        : maybeInvertVisual(makeStimulusEntry(nBackEntry.rel));
      isTarget = true;
    } else if (hasDistractors && canTarget && nBackEntry && Math.random() < DISTRACTOR_CHANCE) {
      stim = makeStimulusEntry(makeDistractor(nBackEntry.rel, pool));
    } else {
      const exc = canTarget ? history[history.length - effectiveN]?.rel : null;
      stim = makeStimulusEntry(exc ? pickRandomExcluding(pool, exc) : pickRandom(pool));
    }
  }

  return { stim, isTarget, nextRINTState };
}

// ─── State Creation ──────────────────────────────────────────────────────────

export function createGameState({ nLevel, modes, relationshipPool, totalRounds, extraStreams = [] }) {
  const numExtra = extraStreams.length;
  const totalStreams = 1 + numExtra; // stream A + extras

  return {
    nLevel,
    modes,
    relationshipPool: relationshipPool || ALL_RELATIONSHIPS,
    round: 0,
    totalRounds: totalRounds || TOTAL_ROUNDS,
    numExtraStreams: numExtra,

    // Per-stream RINT states (index 0 = stream A, 1..N = extra streams)
    rintStates: createRINTStates(Math.max(1, totalStreams)),

    // Stream A
    historyA: [],
    typeHistoryA: new Map(),
    currentRelationship: null,
    currentStimulusA: null,
    isTargetA: false,

    // Extra streams
    extraHistories: Array.from({ length: numExtra }, () => []),
    extraTypeHistories: Array.from({ length: numExtra }, () => new Map()),
    extraCurrentRels: Array(numExtra).fill(null),
    extraCurrentStimuli: Array(numExtra).fill(null),
    extraIsTargets: Array(numExtra).fill(false),
    extraResponded: Array(numExtra).fill(false),
    extraHits: Array(numExtra).fill(0),
    extraMisses: Array(numExtra).fill(0),
    extraFalseAlarms: Array(numExtra).fill(0),
    extraCorrectRejections: Array(numExtra).fill(0),
    // Hierarchical stream
    historyCategory: [],
    currentCategory: null,
    isTargetCategory: false,

    isDistractor: false,
    respondedA: false,
    respondedCategory: false,

    hitsA: 0,
    missesA: 0,
    falseAlarmsA: 0,
    correctRejectionsA: 0,

    hitsC: 0,
    missesC: 0,
    falseAlarmsC: 0,
    correctRejectionsC: 0,

    trialMode: 'normal',
    extraTrialModes: Array(numExtra).fill('normal'),
    finished: false,
  };
}

// ─── Stimulus Generation ──────────────────────────────────────────────────────

export function generateNextStimulus(state) {
  const {
    nLevel, round, historyA, historyCategory, typeHistoryA, modes, relationshipPool,
    extraHistories, extraTypeHistories, rintStates,
  } = state;

  const pool = (relationshipPool && relationshipPool.length > 0) ? relationshipPool : ALL_RELATIONSHIPS;
  const isHier = modes.includes('hierarchical');
  const hasDistractors = modes.includes('distractors');
  const isImpossible = modes.includes('impossible');

  // Variable N
  const isVariableN = modes.includes('variable_n');
  let effectiveN = nLevel;
  if (isVariableN && round >= nLevel) {
    const delta = Math.random() < 0.5 ? 1 : -1;
    const candidate = nLevel + delta;
    if (candidate >= 1 && historyA.length >= candidate) effectiveN = candidate;
  }

  const trialIndex = round;

  // ── Stream A: roll its own trial mode ──
  const trialModeA = rollTrialMode(modes, effectiveN);
  const rintStateA = (rintStates && rintStates[0]) ? rintStates[0] : createRINTState();

  const { stim: stimA, isTarget: isTargetA, nextRINTState: nextRINTStateA } = generateOneStreamStimulus({
    history: historyA,
    typeHistory: typeHistoryA,
    rintState: rintStateA,
    pool,
    effectiveN,
    trialMode: trialModeA,
    matchChance: MATCH_CHANCE,
    hasDistractors,
    trialIndex,
  });

  const relA = stimA.rel;
  const categoryA = getCategory(relA);

  // ── Hierarchical override for category stream ──
  let isTargetCategory = false;
  let finalStimA = stimA;
  if (isHier) {
    const canTargetCat = round >= nLevel && historyCategory.length >= nLevel;
    const nBackCat = canTargetCat ? historyCategory[historyCategory.length - nLevel] : null;
    if (canTargetCat && nBackCat && Math.random() < HIER_MATCH_CHANCE) {
      const catPool = (RELATIONSHIP_CATEGORIES[nBackCat] || []).filter(r => pool.includes(r));
      if (catPool.length > 0) {
        finalStimA = makeStimulusEntry(pickRandom(catPool));
        isTargetCategory = true;
      }
    }
  }

  // ── Extra streams: each rolls its OWN trial mode (Impossible) or inherits global ──
  const extraStreamModes = (extraHistories || []).map(() =>
    isImpossible ? rollTrialMode(modes, effectiveN) : trialModeA
  );

  const extraResults = (extraHistories || []).map((hist, i) => {
    const streamRINTState = (rintStates && rintStates[1 + i]) ? rintStates[1 + i] : createRINTState();
    return generateOneStreamStimulus({
      history: hist,
      typeHistory: extraTypeHistories[i] || new Map(),
      rintState: streamRINTState,
      pool,
      effectiveN,
      trialMode: extraStreamModes[i],
      matchChance: DUAL_MATCH_CHANCE,
      hasDistractors,
      trialIndex,
    });
  });

  // Compute next RINT states array
  const nextRINTStates = (rintStates || []).map((rs, i) => {
    if (i === 0) return nextRINTStateA;
    const res = extraResults[i - 1];
    return res ? res.nextRINTState : rs;
  });

  return {
    stimA: finalStimA,
    relA: finalStimA.rel,
    isTargetA: isTargetCategory ? false : isTargetA,
    isTargetCategory,
    categoryA: getCategory(finalStimA.rel),
    isDistractor: false,
    effectiveN,
    trialMode: trialModeA,
    extraTrialModes: extraStreamModes,
    extraStimuli: extraResults.map(r => r.stim),
    extraIsTargets: extraResults.map(r => r.isTarget),
    nextRINTStates,
  };
}

// ─── Advance Round ────────────────────────────────────────────────────────────

export function advanceRound(state, stimulus) {
  const {
    stimA, relA, extraStimuli, extraIsTargets,
    isTargetA, categoryA, isTargetCategory, isDistractor,
    effectiveN, trialMode, extraTrialModes, nextRINTStates,
  } = stimulus;
  const trialIndex = state.round;

  const nextTypeHistoryA = pushTypeHistory(state.typeHistoryA, relA, { ...stimA, trialIndex });

  const nextExtraHistories = (state.extraHistories || []).map((hist, i) =>
    extraStimuli[i] ? [...hist, extraStimuli[i]] : hist
  );
  const nextExtraTypeHistories = (state.extraTypeHistories || []).map((th, i) =>
    extraStimuli[i] ? pushTypeHistory(th, extraStimuli[i].rel, { ...extraStimuli[i], trialIndex }) : th
  );

  return {
    ...state,
    round: state.round + 1,
    currentEffectiveN: effectiveN ?? state.nLevel,
    historyA: [...state.historyA, stimA],
    typeHistoryA: nextTypeHistoryA,
    extraHistories: nextExtraHistories,
    extraTypeHistories: nextExtraTypeHistories,
    extraCurrentRels: (extraStimuli || []).map(s => s?.rel ?? null),
    extraCurrentStimuli: extraStimuli || [],
    extraIsTargets: extraIsTargets || [],
    extraResponded: Array(state.numExtraStreams).fill(false),
    extraTrialModes: extraTrialModes || Array(state.numExtraStreams).fill('normal'),
    historyCategory: [...state.historyCategory, categoryA],
    currentRelationship: relA,
    currentStimulusA: stimA,
    currentCategory: categoryA,
    isTargetA,
    isTargetCategory,
    isDistractor,
    trialMode: trialMode ?? 'normal',
    rintStates: nextRINTStates ?? state.rintStates,
    respondedA: false,
    respondedCategory: false,
    finished: state.round + 1 >= state.totalRounds,
  };
}

// ─── Process Responses ────────────────────────────────────────────────────────

export function processResponses(state, { pressedA, pressedExtra = [], pressedCategory }) {
  let next = { ...state };

  // Stream A
  if (state.isTargetA && pressedA) next.hitsA++;
  else if (state.isTargetA && !pressedA) next.missesA++;
  else if (!state.isTargetA && pressedA) next.falseAlarmsA++;
  else next.correctRejectionsA++;

  // Extra streams
  const nextExtraHits = [...(state.extraHits || [])];
  const nextExtraMisses = [...(state.extraMisses || [])];
  const nextExtraFA = [...(state.extraFalseAlarms || [])];
  const nextExtraCR = [...(state.extraCorrectRejections || [])];
  (state.extraIsTargets || []).forEach((isTarget, i) => {
    const pressed = pressedExtra[i] || false;
    if (isTarget && pressed) nextExtraHits[i] = (nextExtraHits[i] || 0) + 1;
    else if (isTarget && !pressed) nextExtraMisses[i] = (nextExtraMisses[i] || 0) + 1;
    else if (!isTarget && pressed) nextExtraFA[i] = (nextExtraFA[i] || 0) + 1;
    else nextExtraCR[i] = (nextExtraCR[i] || 0) + 1;
  });
  next.extraHits = nextExtraHits;
  next.extraMisses = nextExtraMisses;
  next.extraFalseAlarms = nextExtraFA;
  next.extraCorrectRejections = nextExtraCR;

  // Category (hierarchical)
  if (state.modes.includes('hierarchical')) {
    if (state.isTargetCategory && pressedCategory) next.hitsC++;
    else if (state.isTargetCategory && !pressedCategory) next.missesC++;
    else if (!state.isTargetCategory && pressedCategory) next.falseAlarmsC++;
    else next.correctRejectionsC++;
  }

  return next;
}

// ─── Results Calculation ──────────────────────────────────────────────────────

function streamStats(hits, misses, falseAlarms, correctRejections) {
  const totalTargets = hits + misses;
  const totalNonTargets = falseAlarms + correctRejections;
  const hitRate = totalTargets > 0 ? Math.round((hits / totalTargets) * 100) : 0;
  const falseAlarmRate = totalNonTargets > 0 ? Math.round((falseAlarms / totalNonTargets) * 100) : 0;
  const signalScore = totalTargets > 0
    ? Math.max(0, Math.round(((hits - falseAlarms) / totalTargets) * 100))
    : 0;
  return { hits, misses, falseAlarms, correctRejections, total: totalTargets + totalNonTargets, accuracy: signalScore, hitRate, falseAlarmRate };
}

export function calculateResults(state) {
  const A = streamStats(state.hitsA, state.missesA, state.falseAlarmsA, state.correctRejectionsA);

  // extra[] maps to all extra streams (stream B, C, D…)
  const extra = (state.extraHits || []).map((h, i) =>
    streamStats(
      h || 0,
      (state.extraMisses || [])[i] || 0,
      (state.extraFalseAlarms || [])[i] || 0,
      (state.extraCorrectRejections || [])[i] || 0
    )
  );

  const C = state.modes.includes('hierarchical')
    ? streamStats(state.hitsC, state.missesC, state.falseAlarmsC, state.correctRejectionsC)
    : null;

  const allStreamsStats = [A, ...extra, ...(C ? [C] : [])];
  const allHits = allStreamsStats.reduce((s, x) => s + x.hits, 0);
  const allMisses = allStreamsStats.reduce((s, x) => s + x.misses, 0);
  const allFA = allStreamsStats.reduce((s, x) => s + x.falseAlarms, 0);
  const allCR = allStreamsStats.reduce((s, x) => s + x.correctRejections, 0);
  const overall = streamStats(allHits, allMisses, allFA, allCR);

  return { A, extra, C, overall };
}

// ─── Adaptive N-Level ─────────────────────────────────────────────────────────

export function computeNextNLevel(currentN, results) {
  const acc = results.overall.accuracy;
  if (acc >= ADAPT_UP_THRESHOLD && currentN < N_MAX) return currentN + 1;
  if (acc <= ADAPT_DOWN_THRESHOLD && currentN > N_MIN) return currentN - 1;
  return currentN;
}