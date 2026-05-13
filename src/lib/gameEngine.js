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
  getCategory,
  pickRandom,
  pickRandomExcluding,
  isVerbal,
  isSound,
  getVerbalPair,
  getSoundPair,
  pickTokenType,
  pickTokenWord,
  makeInverseStimulus,
  INVERSE_RELATIONSHIP,
  filterTransitiveRelationships,
} from './gameConstants';

import { createRINTState, createRINTStates, generateRINTStimulus, isRINTConclusion, RINT_MIN_N } from './relationalIntegration.js';
export { calculateResults, computeNextNLevel } from './gameStats.js';


// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeStimulusEntry(rel) {
  const shapeA = pickRandom(SHAPES);
  const shapeB = pickRandomExcluding(SHAPES, shapeA);
  const colorA = pickRandom(COLORS);
  const colorB = pickRandomExcluding(COLORS, colorA);
  const renderMode = Math.floor(Math.random() * 3);
  const shape3DA = pickRandom(['cube', 'sphere', 'pyramid', 'cone', 'torus', 'octahedron']);
  const shape3DB = pickRandomExcluding(['cube', 'sphere', 'pyramid', 'cone', 'torus', 'octahedron'], shape3DA);
  const size3DA = 2 + Math.random() * 1.5;
  const size3DB = 2 + Math.random() * 1.5;
  if (isSound(rel)) {
    const [soundA, soundB] = getSoundPair(rel);
    return { rel, soundA, soundB, wordA: soundA, wordB: soundB, shapeA, shapeB, colorA, colorB, renderMode, shape3DA, shape3DB, size3DA, size3DB };
  }
  if (isVerbal(rel)) {
    let wordA, wordB;
    if (Math.random() < 0.40) {
      [wordA, wordB] = getVerbalPair(rel);
    } else {
      wordA = pickTokenWord(pickTokenType());
      wordB = pickTokenWord(pickTokenType());
    }
    return { rel, wordA, wordB, shapeA, shapeB, colorA, colorB, renderMode, shape3DA, shape3DB, size3DA, size3DB };
  }
  return { rel, shapeA, shapeB, colorA, colorB, renderMode, shape3DA, shape3DB, size3DA, size3DB };
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

function isTypeNbackMatch(typeHistoryMap, rel, effectiveN) {
  return getTypeHistory(typeHistoryMap, rel).length >= effectiveN;
}

function relationshipMatches(rel, targetRel) {
  return rel === targetRel || INVERSE_RELATIONSHIP[targetRel] === rel || INVERSE_RELATIONSHIP[rel] === targetRel;
}

function evaluateStimulusForMode({ stim, mode, history, typeHistory, rintState, effectiveN, hierHistory }) {
  if (!stim) return false;
  if (mode === 'rint') return isRINTConclusion(rintState, stim, effectiveN);
  if (mode === 'type') return isTypeNbackMatch(typeHistory, stim.rel, effectiveN);
  if (mode === 'hierarchical') {
    const canHier = (hierHistory || []).length >= effectiveN;
    const nBackCat = canHier ? hierHistory[hierHistory.length - effectiveN] : null;
    return canHier && getCategory(stim.rel) === nBackCat;
  }
  const nBackEntry = history.length >= effectiveN ? history[history.length - effectiveN] : null;
  return !!nBackEntry && relationshipMatches(stim.rel, nBackEntry.rel);
}

function makeNonTargetRelationship(pool, isAccidentalTarget) {
  const candidates = pool.filter(rel => !isAccidentalTarget(rel));
  return pickRandom(candidates.length > 0 ? candidates : pool);
}

function makeDistractor(targetRelationship, pool) {
  const cat = getCategory(targetRelationship);
  const sameCategory = (RELATIONSHIP_CATEGORIES[cat] || ALL_RELATIONSHIPS).filter(r => pool.includes(r));
  const candidates = sameCategory.length > 1 ? sameCategory : pool;
  return pickRandomExcluding(candidates, targetRelationship);
}

function pickSoundStreamIndexes(totalStreams) {
  const indexes = Array.from({ length: totalStreams }, (_, i) => i).sort(() => Math.random() - 0.5);
  return indexes.slice(0, Math.min(2, totalStreams));
}

// Evaluate binary logic between two boolean signals
// op: 'AND' | 'OR' | 'XOR' | 'AND_NOT'
export function evalBinaryOp(a, b, op) {
  switch (op) {
    case 'AND':     return a && b;
    case 'OR':      return a || b;
    case 'XOR':     return a !== b;
    case 'AND_NOT': return a && !b;
    default:        return a;
  }
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
// streamConfig: { trialMode, binaryMode, binaryOp, hierHistory } for Hierarchical and Binary Logic
function generateOneStreamStimulus({ history, typeHistory, rintState, pool, effectiveN, trialMode, matchChance, hasDistractors, trialIndex, hierHistory, binaryMode, binaryOp, signalOnly = false, baseStim = null }) {
   let stim, isPrimaryTarget = false, nextRINTState = rintState;
   const canTarget = history.length >= effectiveN;

   // RINT requires transitive relationships; Type N-Back can use all relationship types
   const isRINTMode = trialMode === 'rint';
   const effectivePool = isRINTMode
     ? filterTransitiveRelationships(pool, true, false)
     : pool;
   const finalPool = effectivePool.length > 0 ? effectivePool : pool;

  if (signalOnly && baseStim) {
    const isSignalTarget = evaluateStimulusForMode({
      stim: baseStim, mode: trialMode, history, typeHistory, rintState, effectiveN, hierHistory,
    });
    return { stim: baseStim, isTarget: isSignalTarget, isPrimaryTarget: isSignalTarget, isHierTarget: isSignalTarget, nextRINTState };
  }

  if (trialMode === 'rint') {
    const rintResult = generateRINTStimulus(rintState, finalPool, effectiveN, matchChance);
    stim = rintResult.stim;
    isPrimaryTarget = rintResult.isTarget;
    nextRINTState = rintResult.rintState;
  } else if (trialMode === 'type') {
    const forcedRel = Math.random() < matchChance ? pickTypeNbackTargetRel(typeHistory, finalPool, effectiveN) : null;
    if (forcedRel) {
      const entries = getTypeHistory(typeHistory, forcedRel);
      const targetEntry = entries[entries.length - effectiveN];
      stim = isVerbal(forcedRel)
        ? (Math.random() < 0.35 ? makeInverseStimulus(targetEntry) : null) || makeStimulusEntry(forcedRel)
        : maybeInvertVisual(makeStimulusEntry(forcedRel));
    } else {
      stim = makeStimulusEntry(makeNonTargetRelationship(finalPool, rel => isTypeNbackMatch(typeHistory, rel, effectiveN)));
    }
    isPrimaryTarget = isTypeNbackMatch(typeHistory, stim.rel, effectiveN);
  } else if (trialMode === 'hierarchical') {
    const canHier = (hierHistory || []).length >= effectiveN;
    const nBackCat = canHier ? hierHistory[hierHistory.length - effectiveN] : null;
    const rel = canHier && Math.random() < matchChance
      ? pickRandom(finalPool.filter(r => getCategory(r) === nBackCat))
      : makeNonTargetRelationship(finalPool, r => canHier && getCategory(r) === nBackCat);
    stim = makeStimulusEntry(rel);
    isPrimaryTarget = canHier && getCategory(stim.rel) === nBackCat;
  } else {
    const nBackEntry = canTarget ? history[history.length - effectiveN] : null;
    if (canTarget && nBackEntry && finalPool.includes(nBackEntry.rel) && Math.random() < matchChance) {
      stim = isVerbal(nBackEntry.rel)
        ? (Math.random() < 0.35 ? makeInverseStimulus(nBackEntry) : null) || nBackEntry
        : maybeInvertVisual(makeStimulusEntry(nBackEntry.rel));
    } else if (hasDistractors && canTarget && nBackEntry && Math.random() < DISTRACTOR_CHANCE) {
      stim = makeStimulusEntry(makeDistractor(nBackEntry.rel, pool));
    } else {
      stim = makeStimulusEntry(makeNonTargetRelationship(finalPool, rel => canTarget && relationshipMatches(rel, nBackEntry?.rel)));
    }
    isPrimaryTarget = canTarget && relationshipMatches(stim.rel, nBackEntry?.rel);
  }

  // Hierarchical signal: is the category of this stim the same as N back?
  let isHierTarget = false;
  const hierH = hierHistory || [];
  if (binaryMode === 'hierarchical' || trialMode === 'hierarchical') {
    const canHier = hierH.length >= effectiveN;
    if (canHier) {
      const nBackCat = hierH[hierH.length - effectiveN];
      isHierTarget = getCategory(stim.rel) === nBackCat;
    }
  }

  // Binary Logic: secondary mode generates its own independent signal
  let isSecondaryTarget = false;
  if (binaryMode && binaryMode !== 'hierarchical' && binaryMode !== 'none') {
    // Generate secondary signal using the same history but different mode
    const secResult = generateOneStreamStimulus({
      history, typeHistory, rintState, pool, effectiveN,
      trialMode: binaryMode, matchChance, hasDistractors, trialIndex,
      hierHistory, signalOnly: true, baseStim: stim,
    });
    isSecondaryTarget = secResult.isPrimaryTarget;
  }

  // Compute final isTarget
  let isTarget;
  if (binaryMode === 'hierarchical') {
    isTarget = evalBinaryOp(isPrimaryTarget, isHierTarget, binaryOp || 'AND');
  } else if (binaryMode && binaryMode !== 'none') {
    isTarget = evalBinaryOp(isPrimaryTarget, isSecondaryTarget, binaryOp || 'AND');
  } else {
    isTarget = isPrimaryTarget;
  }

  return { stim, isTarget, isPrimaryTarget, isHierTarget, nextRINTState };
}

// Random binary config for a single stream
const BINARY_MODES = ['normal', 'type', 'rint', 'hierarchical'];
const BINARY_OPS = ['AND', 'OR', 'XOR', 'AND_NOT'];

function randomBinaryConfig(effectiveN) {
  const modes = effectiveN >= RINT_MIN_N ? BINARY_MODES : BINARY_MODES.filter(m => m !== 'rint');
  const primary = pickRandom(modes);
  // secondary must differ from primary
  const secondaryPool = modes.filter(m => m !== primary);
  const secondary = pickRandom(secondaryPool);
  const op = pickRandom(BINARY_OPS);
  return { primaryMode: primary, binaryMode: secondary, binaryOp: op };
}

// ─── State Creation ──────────────────────────────────────────────────────────

export function createGameState({ nLevel, modes, relationshipPool, totalRounds, extraStreams = [] }) {
  const numExtra = extraStreams.length;
  const totalStreams = 1 + numExtra;

  return {
    nLevel,
    modes,
    relationshipPool: relationshipPool || ALL_RELATIONSHIPS,
    round: 0,
    totalRounds: totalRounds || TOTAL_ROUNDS,
    numExtraStreams: numExtra,
    // Per-trial randomized binary configs (only used when binary_logic mode is active)
    trialBinaryConfigs: Array(totalStreams).fill(null).map(() => ({ primaryMode: 'normal', binaryMode: null, binaryOp: 'AND' })),
    audioStreamIndexes: [],

    // Per-stream RINT states (index 0 = stream A, 1..N = extra streams)
    rintStates: createRINTStates(Math.max(1, totalStreams)),

    // Per-stream hierarchical category histories
    hierHistories: Array.from({ length: totalStreams }, () => []),

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

    isDistractor: false,
    respondedA: false,

    hitsA: 0,
    missesA: 0,
    falseAlarmsA: 0,
    correctRejectionsA: 0,

    trialMode: 'normal',
    extraTrialModes: Array(numExtra).fill('normal'),
    allTrials: [],
    scoredTrialKeys: [],
    finished: false,
  };
}

// ─── Stimulus Generation ──────────────────────────────────────────────────────

export function generateNextStimulus(state) {
  const {
    nLevel, round, historyA, typeHistoryA, modes, relationshipPool,
    extraHistories, extraTypeHistories, rintStates, hierHistories, streamConfigs,
  } = state;

  const pool = (relationshipPool && relationshipPool.length > 0) ? relationshipPool : ALL_RELATIONSHIPS;
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
  const isBinaryLogic = modes.includes('binary_logic');
  const totalStreams = 1 + (extraHistories || []).length;
  const soundPool = pool.filter(isSound);
  const nonSoundPool = pool.filter(rel => !isSound(rel));
  const allNonSoundPool = ALL_RELATIONSHIPS.filter(rel => !isSound(rel));
  const audioStreamIndexes = totalStreams >= 2 && soundPool.length > 0 ? pickSoundStreamIndexes(totalStreams) : [];
  const streamPoolFor = (index) => {
    if (audioStreamIndexes.includes(index)) return soundPool;
    if (audioStreamIndexes.length > 0) return nonSoundPool.length > 0 ? nonSoundPool : allNonSoundPool;
    return pool;
  };

  // Generate per-trial binary configs if binary_logic mode is active
  const trialBinaryConfigs = isBinaryLogic
    ? Array.from({ length: totalStreams }, () => randomBinaryConfig(effectiveN))
    : Array(totalStreams).fill({ primaryMode: 'normal', binaryMode: null, binaryOp: 'AND' });

  // ── Stream A ──
  // When binary_logic: override trialMode with the randomized primary mode
  const trialModeA = isBinaryLogic
    ? (trialBinaryConfigs[0].primaryMode === 'rint' && effectiveN >= RINT_MIN_N ? 'rint'
        : trialBinaryConfigs[0].primaryMode === 'type' ? 'type'
        : trialBinaryConfigs[0].primaryMode === 'hierarchical' ? 'hierarchical'
        : 'normal')
    : rollTrialMode(modes, effectiveN);

  const rintStateA = (rintStates && rintStates[0]) ? rintStates[0] : createRINTState();
  const cfgA = trialBinaryConfigs[0];

  const resultA = generateOneStreamStimulus({
    history: historyA,
    typeHistory: typeHistoryA,
    rintState: rintStateA,
    pool: streamPoolFor(0), effectiveN,
    trialMode: trialModeA,
    matchChance: MATCH_CHANCE,
    hasDistractors, trialIndex,
    hierHistory: (hierHistories || [])[0] || [],
    binaryMode: isBinaryLogic ? cfgA.binaryMode : null,
    binaryOp: cfgA.binaryOp,
  });

  const stimA = resultA.stim;
  const categoryA = getCategory(stimA.rel);

  // ── Extra streams ──
  const extraStreamModes = (extraHistories || []).map((_, i) => {
    if (isBinaryLogic) {
      const pm = trialBinaryConfigs[1 + i]?.primaryMode;
      return pm === 'rint' && effectiveN >= RINT_MIN_N ? 'rint' : pm === 'type' ? 'type' : pm === 'hierarchical' ? 'hierarchical' : 'normal';
    }
    return isImpossible ? rollTrialMode(modes, effectiveN) : trialModeA;
  });

  const extraResults = (extraHistories || []).map((hist, i) => {
    const streamRINTState = (rintStates && rintStates[1 + i]) ? rintStates[1 + i] : createRINTState();
    const cfg = trialBinaryConfigs[1 + i] || { primaryMode: 'normal', binaryMode: null, binaryOp: 'AND' };
    return generateOneStreamStimulus({
      history: hist,
      typeHistory: extraTypeHistories[i] || new Map(),
      rintState: streamRINTState,
      pool: streamPoolFor(1 + i), effectiveN,
      trialMode: extraStreamModes[i],
      matchChance: DUAL_MATCH_CHANCE,
      hasDistractors, trialIndex,
      hierHistory: (hierHistories || [])[1 + i] || [],
      binaryMode: isBinaryLogic ? cfg.binaryMode : null,
      binaryOp: cfg.binaryOp,
    });
  });

  // Compute next RINT states array
  const nextRINTStates = (rintStates || []).map((rs, i) => {
    if (i === 0) return resultA.nextRINTState;
    const res = extraResults[i - 1];
    return res ? res.nextRINTState : rs;
  });

  return {
    stimA,
    relA: stimA.rel,
    isTargetA: resultA.isTarget,
    categoryA,
    isDistractor: false,
    effectiveN,
    trialMode: trialModeA,
    extraTrialModes: extraStreamModes,
    extraStimuli: extraResults.map(r => r.stim),
    extraIsTargets: extraResults.map(r => r.isTarget),
    nextRINTStates,
    trialBinaryConfigs,
    audioStreamIndexes,
    // Per-stream categories for hierarchical history update
    allCategories: [categoryA, ...extraResults.map(r => getCategory(r.stim.rel))],
  };
}

// ─── Advance Round ────────────────────────────────────────────────────────────

export function advanceRound(state, stimulus) {
  const {
    stimA, relA, extraStimuli, extraIsTargets,
    isTargetA, categoryA, isDistractor,
    effectiveN, trialMode, extraTrialModes, nextRINTStates, allCategories, trialBinaryConfigs, audioStreamIndexes,
  } = stimulus;
  const trialIndex = state.round;

  const nextTypeHistoryA = pushTypeHistory(state.typeHistoryA, relA, { ...stimA, trialIndex });

  const nextExtraHistories = (state.extraHistories || []).map((hist, i) =>
    extraStimuli[i] ? [...hist, extraStimuli[i]] : hist
  );
  const nextExtraTypeHistories = (state.extraTypeHistories || []).map((th, i) =>
    extraStimuli[i] ? pushTypeHistory(th, extraStimuli[i].rel, { ...extraStimuli[i], trialIndex }) : th
  );

  // Update per-stream hier histories
  const nextHierHistories = (state.hierHistories || []).map((hh, i) => {
    const cat = (allCategories || [])[i];
    return cat ? [...hh, cat] : hh;
  });

  return {
    ...state,
    round: state.round + 1,
    currentEffectiveN: effectiveN ?? state.nLevel,
    historyA: [...state.historyA, stimA],
    typeHistoryA: nextTypeHistoryA,
    extraHistories: nextExtraHistories,
    extraTypeHistories: nextExtraTypeHistories,
    hierHistories: nextHierHistories,
    extraCurrentRels: (extraStimuli || []).map(s => s?.rel ?? null),
    extraCurrentStimuli: extraStimuli || [],
    extraIsTargets: extraIsTargets || [],
    extraResponded: Array(state.numExtraStreams).fill(false),
    extraTrialModes: extraTrialModes || Array(state.numExtraStreams).fill('normal'),
    currentRelationship: relA,
    currentStimulusA: stimA,
    currentCategory: categoryA,
    isTargetA,
    isDistractor,
    trialMode: trialMode ?? 'normal',
    rintStates: nextRINTStates ?? state.rintStates,
    trialBinaryConfigs: trialBinaryConfigs ?? state.trialBinaryConfigs,
    audioStreamIndexes: audioStreamIndexes ?? [],
    respondedA: false,
    finished: state.round + 1 >= state.totalRounds,
  };
}

// ─── Process Responses ────────────────────────────────────────────────────────

export function processResponses(state, { pressedA, pressedExtra = [] }) {
  const trialKey = state.round;
  if ((state.scoredTrialKeys || []).includes(trialKey)) return state;

  let next = { ...state, scoredTrialKeys: [...(state.scoredTrialKeys || []), trialKey] };
  const trialRecords = [];

  // Stream A
  if (state.isTargetA && pressedA) next.hitsA++;
  else if (state.isTargetA && !pressedA) next.missesA++;
  else if (!state.isTargetA && pressedA) next.falseAlarmsA++;
  else next.correctRejectionsA++;

  trialRecords.push({
    trialNumber: state.round,
    streamLabel: 'A',
    relationship: state.currentRelationship,
    stimulus: state.currentStimulusA,
    trialMode: state.trialMode,
    isTarget: state.isTargetA,
    userResponded: !!pressedA,
    correct: state.isTargetA === !!pressedA,
    nBackValue: state.currentEffectiveN ?? state.nLevel,
    binaryLogicPrimary: state.trialBinaryConfigs?.[0]?.primaryMode,
    binaryLogicSecondary: state.trialBinaryConfigs?.[0]?.binaryMode,
    binaryLogicOp: state.trialBinaryConfigs?.[0]?.binaryOp,
  });

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

    trialRecords.push({
      trialNumber: state.round,
      streamLabel: String.fromCharCode(66 + i),
      relationship: state.extraCurrentRels?.[i],
      stimulus: state.extraCurrentStimuli?.[i],
      trialMode: state.extraTrialModes?.[i] || 'normal',
      isTarget,
      userResponded: pressed,
      correct: isTarget === pressed,
      nBackValue: state.currentEffectiveN ?? state.nLevel,
      binaryLogicPrimary: state.trialBinaryConfigs?.[i + 1]?.primaryMode,
      binaryLogicSecondary: state.trialBinaryConfigs?.[i + 1]?.binaryMode,
      binaryLogicOp: state.trialBinaryConfigs?.[i + 1]?.binaryOp,
    });
  });
  next.extraHits = nextExtraHits;
  next.extraMisses = nextExtraMisses;
  next.extraFalseAlarms = nextExtraFA;
  next.extraCorrectRejections = nextExtraCR;
  next.allTrials = [...(state.allTrials || []), ...trialRecords];

  return next;
}