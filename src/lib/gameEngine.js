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

import { createRINTState, generateRINTStimulus, RINT_MIN_N } from './relationalIntegration.js';

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

// Generate one stream's stimulus (shared logic for all extra streams)
function generateStreamStimulus(history, typeHistory, pool, nLevel, effectiveN, modes, isTypeNback, matchChance) {
  const canTarget = history.length >= effectiveN;
  let stim, isTarget = false;

  if (isTypeNback) {
    if (Math.random() < matchChance) {
      const forcedRel = pickTypeNbackTargetRel(typeHistory, pool, effectiveN);
      if (forcedRel) {
        const entries = getTypeHistory(typeHistory, forcedRel);
        const targetEntry = entries[entries.length - effectiveN];
        if (isVerbal(forcedRel)) {
          const inv = Math.random() < 0.35 ? makeInverseStimulus(targetEntry) : null;
          stim = inv || makeStimulusEntry(forcedRel);
        } else {
          stim = maybeInvertVisual(makeStimulusEntry(forcedRel));
        }
        isTarget = true;
      } else {
        stim = makeStimulusEntry(pickRandom(pool));
      }
    } else {
      stim = makeStimulusEntry(pickRandom(pool));
    }
  } else {
    const nBackEntry = canTarget ? history[history.length - effectiveN] : null;
    if (canTarget && nBackEntry && Math.random() < matchChance) {
      if (isVerbal(nBackEntry.rel)) {
        const inv = Math.random() < 0.35 ? makeInverseStimulus(nBackEntry) : null;
        stim = inv || nBackEntry;
      } else {
        stim = maybeInvertVisual(makeStimulusEntry(nBackEntry.rel));
      }
      isTarget = true;
    } else {
      const excludeRel = nBackEntry?.rel;
      stim = makeStimulusEntry(excludeRel ? pickRandomExcluding(pool, excludeRel) : pickRandom(pool));
    }
  }
  return { stim, isTarget };
}

// ─── State Creation ──────────────────────────────────────────────────────────

export function createGameState({ nLevel, modes, relationshipPool, totalRounds, extraStreams = [] }) {
  const numExtra = extraStreams.length;
  return {
    nLevel,
    modes,
    relationshipPool: relationshipPool || ALL_RELATIONSHIPS,
    round: 0,
    totalRounds: totalRounds || TOTAL_ROUNDS,
    numExtraStreams: numExtra,
    rintState: createRINTState(),

    // Stream A
    historyA: [],
    typeHistoryA: new Map(),
    currentRelationship: null,
    currentStimulusA: null,
    isTargetA: false,

    // Extra streams (dynamic array)
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

    finished: false,
  };
}

// ─── Stimulus Generation ──────────────────────────────────────────────────────

export function generateNextStimulus(state) {
  const { nLevel, round, historyA, historyCategory, typeHistoryA, modes, relationshipPool,
          extraHistories, extraTypeHistories } = state;
  const pool = (relationshipPool && relationshipPool.length > 0) ? relationshipPool : ALL_RELATIONSHIPS;
  const isHier = modes.includes('hierarchical');
  const hasDistractors = modes.includes('distractors');
  const isMixed = modes.includes('mixed_nback');
  const isMixedRINT = modes.includes('mixed_rint');

  // Variable N — must be computed first so effectiveN is available for RINT check
  const isVariableN = modes.includes('variable_n');
  let effectiveN = nLevel;
  if (isVariableN && round >= nLevel) {
    const delta = Math.random() < 0.5 ? 1 : -1;
    const candidate = nLevel + delta;
    if (candidate >= 1 && (historyA.length >= candidate)) {
      effectiveN = candidate;
    }
  }

  // For mixed mode: randomly pick type_nback, rint, or normal each trial
  const mixedRoll = isMixed || isMixedRINT ? Math.random() : -1;
  let trialIsTypeNback = false;
  let trialIsRINT = false;
  if (isMixedRINT) {
    // three-way: 33% normal, 33% type, 33% rint (but rint only if n>=2)
    if (mixedRoll < 0.33) trialIsTypeNback = false;
    else if (mixedRoll < 0.66) trialIsTypeNback = true;
    else trialIsRINT = (effectiveN >= RINT_MIN_N);
  } else if (isMixed) {
    trialIsTypeNback = mixedRoll < 0.5;
  }
  const isTypeNback = modes.includes('type_nback') || trialIsTypeNback;
  const isRINT = (modes.includes('rint') || trialIsRINT) && effectiveN >= RINT_MIN_N;

  // ── Stream A ──
  let stimA, isTargetA = false, isDistractor = false;
  let nextRINTState = state.rintState;
  const canTargetA = isTypeNback ? true : (round >= effectiveN && historyA.length >= effectiveN);

  if (isRINT) {
    const rintResult = generateRINTStimulus(state.rintState, pool, effectiveN, MATCH_CHANCE);
    stimA = rintResult.stim;
    isTargetA = rintResult.isTarget;
    nextRINTState = rintResult.rintState;
  } else if (isTypeNback) {
    const forcedRel = Math.random() < MATCH_CHANCE ? pickTypeNbackTargetRel(typeHistoryA, pool, effectiveN) : null;
    if (forcedRel) {
      const entries = getTypeHistory(typeHistoryA, forcedRel);
      const targetEntry = entries[entries.length - effectiveN];
      stimA = isVerbal(forcedRel)
        ? (Math.random() < 0.35 ? makeInverseStimulus(targetEntry) : null) || makeStimulusEntry(forcedRel)
        : maybeInvertVisual(makeStimulusEntry(forcedRel));
      isTargetA = true;
    } else {
      stimA = makeStimulusEntry(pickRandom(pool));
    }
  } else {
    const nBackEntryA = canTargetA ? historyA[historyA.length - effectiveN] : null;
    if (canTargetA && nBackEntryA && Math.random() < MATCH_CHANCE) {
      stimA = isVerbal(nBackEntryA.rel)
        ? (Math.random() < 0.35 ? makeInverseStimulus(nBackEntryA) : null) || nBackEntryA
        : maybeInvertVisual(makeStimulusEntry(nBackEntryA.rel));
      isTargetA = true;
    } else if (hasDistractors && canTargetA && historyA[historyA.length - effectiveN] && Math.random() < DISTRACTOR_CHANCE) {
      stimA = makeStimulusEntry(makeDistractor(historyA[historyA.length - effectiveN].rel, pool));
      isDistractor = true;
    } else {
      const exc = canTargetA ? historyA[historyA.length - effectiveN]?.rel : null;
      stimA = makeStimulusEntry(exc ? pickRandomExcluding(pool, exc) : pickRandom(pool));
    }
  }
  // Tag trial mode
  const trialMode = isRINT ? 'rint' : isTypeNback ? 'type' : 'normal';
  const relA = stimA.rel;
  const categoryA = getCategory(relA);

  // ── Hierarchical category check override ──
  if (isHier) {
    const canTargetCat = round >= nLevel && historyCategory.length >= nLevel;
    const nBackCat = canTargetCat ? historyCategory[historyCategory.length - nLevel] : null;
    if (canTargetCat && nBackCat && Math.random() < HIER_MATCH_CHANCE) {
      const catPool = (RELATIONSHIP_CATEGORIES[nBackCat] || []).filter(r => pool.includes(r));
      if (catPool.length > 0) {
        stimA = makeStimulusEntry(pickRandom(catPool));
        const extraStimuli = (extraHistories || []).map((hist, i) =>
          generateStreamStimulus(hist, extraTypeHistories[i], pool, nLevel, effectiveN, modes, isTypeNback, DUAL_MATCH_CHANCE)
        );
        return {
          stimA, relA: stimA.rel,
          extraStimuli: extraStimuli.map(e => e.stim),
          extraIsTargets: extraStimuli.map(e => e.isTarget),
          categoryA: getCategory(stimA.rel),
          isTargetA: false, isTargetCategory: true, isDistractor, effectiveN,
          trialIsTypeNback: isTypeNback, trialIsRINT: isRINT, trialMode,
          nextRINTState,
        };
      }
    }
  }

  // ── Extra streams ──
  const extraStimResults = (extraHistories || []).map((hist, i) =>
    generateStreamStimulus(hist, extraTypeHistories[i], pool, nLevel, effectiveN, modes, isTypeNback, DUAL_MATCH_CHANCE)
  );

  return {
    stimA, relA,
    extraStimuli: extraStimResults.map(e => e.stim),
    extraIsTargets: extraStimResults.map(e => e.isTarget),
    isTargetA, categoryA, isTargetCategory: false, isDistractor, effectiveN,
    trialIsTypeNback: isTypeNback,
    trialIsRINT: isRINT,
    trialMode,
    nextRINTState,
  };
}

// ─── Advance Round ────────────────────────────────────────────────────────────

export function advanceRound(state, stimulus) {
  const { stimA, relA, extraStimuli, extraIsTargets, isTargetA, categoryA, isTargetCategory, isDistractor, effectiveN, trialIsTypeNback, trialIsRINT, trialMode, nextRINTState } = stimulus;
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
    historyCategory: [...state.historyCategory, categoryA],
    currentRelationship: relA,
    currentStimulusA: stimA,
    currentCategory: categoryA,
    isTargetA,
    isTargetCategory,
    isDistractor,
    trialIsTypeNback: trialIsTypeNback ?? state.trialIsTypeNback ?? false,
    trialIsRINT: trialIsRINT ?? state.trialIsRINT ?? false,
    trialMode: trialMode ?? state.trialMode ?? 'normal',
    rintState: nextRINTState ?? state.rintState,
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

  const extra = (state.extraHits || []).map((h, i) =>
    streamStats(h || 0, (state.extraMisses || [])[i] || 0, (state.extraFalseAlarms || [])[i] || 0, (state.extraCorrectRejections || [])[i] || 0)
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