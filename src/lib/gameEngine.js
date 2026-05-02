import {
  RELATIONSHIPS as ALL_RELATIONSHIPS,
  RELATIONSHIP_CATEGORIES,
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
} from './gameConstants';

// ─── State Creation ──────────────────────────────────────────────────────────

export function createGameState({ nLevel, modes, relationshipPool, totalRounds }) {
  return {
    nLevel,
    modes, // array: ['adaptive', 'dual', 'hierarchical', 'distractors']
    relationshipPool: relationshipPool || ALL_RELATIONSHIPS,
    round: 0,
    totalRounds: totalRounds || TOTAL_ROUNDS,

    // Stream A: primary relationship
    historyA: [],
    currentRelationship: null,
    isTargetA: false,

    // Stream B: secondary relationship (dual mode)
    historyB: [],
    currentRelationshipB: null,
    isTargetB: false,

    // Hierarchical stream: category-level N-back
    historyCategory: [],
    currentCategory: null,
    isTargetCategory: false,

    // Distractor flag
    isDistractor: false,

    // Responses
    respondedA: false,
    respondedB: false,
    respondedCategory: false,

    // Stats for stream A
    hitsA: 0,
    missesA: 0,
    falseAlarmsA: 0,
    correctRejectionsA: 0,

    // Stats for stream B
    hitsB: 0,
    missesB: 0,
    falseAlarmsB: 0,
    correctRejectionsB: 0,

    // Stats for category
    hitsC: 0,
    missesC: 0,
    falseAlarmsC: 0,
    correctRejectionsC: 0,

    finished: false,
  };
}

// ─── Distractor generation ────────────────────────────────────────────────────

// Returns a "near-match" relationship: same category as the target, different relationship
function makeDistractor(targetRelationship, pool) {
  const cat = getCategory(targetRelationship);
  const sameCategory = (RELATIONSHIP_CATEGORIES[cat] || ALL_RELATIONSHIPS).filter(r => pool.includes(r));
  const candidates = sameCategory.length > 1 ? sameCategory : pool;
  return pickRandomExcluding(candidates, targetRelationship);
}

// ─── Stimulus Generation ──────────────────────────────────────────────────────

export function generateNextStimulus(state) {
  const { nLevel, round, historyA, historyB, historyCategory, modes, relationshipPool } = state;
  const pool = (relationshipPool && relationshipPool.length > 0) ? relationshipPool : ALL_RELATIONSHIPS;
  const isDual = modes.includes('dual');
  const isHier = modes.includes('hierarchical');
  const hasDistractors = modes.includes('distractors');
  const canTarget = round >= nLevel;

  // ── Variable N: pick effective N for this trial ──
  const isVariableN = modes.includes('variable_n');
  let effectiveN = nLevel;
  if (isVariableN && canTarget) {
    const delta = Math.random() < 0.5 ? 1 : -1;
    const candidate = nLevel + delta;
    if (candidate >= 1 && candidate <= round) effectiveN = candidate;
  }
  const canTargetEffective = round >= effectiveN;

  // ── Stream A ──
  let relA, isTargetA, isDistractor = false;
  if (canTargetEffective && Math.random() < MATCH_CHANCE) {
    relA = historyA[historyA.length - effectiveN];
    isTargetA = true;
  } else {
    const nBackA = canTargetEffective ? historyA[historyA.length - effectiveN] : null;
    if (hasDistractors && canTargetEffective && Math.random() < DISTRACTOR_CHANCE) {
      relA = makeDistractor(nBackA, pool);
      isDistractor = true;
    } else {
      relA = nBackA ? pickRandomExcluding(pool, nBackA) : pickRandom(pool);
    }
    isTargetA = false;
  }
  const categoryA = getCategory(relA);

  // ── Stream B (dual mode) ──
  let relB = null, isTargetB = false;
  if (isDual) {
    if (canTarget && Math.random() < DUAL_MATCH_CHANCE) {
      relB = historyB[historyB.length - nLevel];
      isTargetB = true;
    } else {
      const nBackB = canTarget ? historyB[historyB.length - nLevel] : null;
      relB = nBackB ? pickRandomExcluding(pool, nBackB) : pickRandom(pool);
      isTargetB = false;
    }
  }

  // ── Category / Hierarchical stream ──
  let isTargetCategory = false;
  if (isHier) {
    const nBackCat = canTarget ? historyCategory[historyCategory.length - nLevel] : null;
    if (canTarget && Math.random() < HIER_MATCH_CHANCE) {
      isTargetCategory = (categoryA === nBackCat);
    }
  }

  return { relA, isTargetA, relB, isTargetB, categoryA, isTargetCategory, isDistractor, effectiveN };
}

// ─── Advance Round ────────────────────────────────────────────────────────────

export function advanceRound(state, stimulus) {
  const { relA, isTargetA, relB, isTargetB, categoryA, isTargetCategory, isDistractor, effectiveN } = stimulus;
  return {
    ...state,
    round: state.round + 1,
    currentEffectiveN: effectiveN ?? state.nLevel,
    historyA: [...state.historyA, relA],
    historyB: relB !== null ? [...state.historyB, relB] : state.historyB,
    historyCategory: [...state.historyCategory, categoryA],
    currentRelationship: relA,
    currentRelationshipB: relB,
    currentCategory: categoryA,
    isTargetA,
    isTargetB,
    isTargetCategory,
    isDistractor,
    respondedA: false,
    respondedB: false,
    respondedCategory: false,
    finished: state.round + 1 >= state.totalRounds,
  };
}

// ─── Process Responses ────────────────────────────────────────────────────────

export function processResponses(state, { pressedA, pressedB, pressedCategory }) {
  let next = { ...state };

  // Stream A
  if (state.isTargetA && pressedA) next.hitsA++;
  else if (state.isTargetA && !pressedA) next.missesA++;
  else if (!state.isTargetA && pressedA) next.falseAlarmsA++;
  else next.correctRejectionsA++;

  // Stream B (dual)
  if (state.modes.includes('dual')) {
    if (state.isTargetB && pressedB) next.hitsB++;
    else if (state.isTargetB && !pressedB) next.missesB++;
    else if (!state.isTargetB && pressedB) next.falseAlarmsB++;
    else next.correctRejectionsB++;
  }

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
  const total = totalTargets + totalNonTargets;
  const hitRate = totalTargets > 0 ? Math.round((hits / totalTargets) * 100) : 0;
  const falseAlarmRate = totalNonTargets > 0 ? Math.round((falseAlarms / totalNonTargets) * 100) : 0;
  // Accuracy = signal detection only: penalises misses AND false alarms, ignores correct rejections
  // Score = hits - false alarms, normalised over total targets so pressing nothing = 0%
  const signalScore = totalTargets > 0
    ? Math.max(0, Math.round(((hits - falseAlarms) / totalTargets) * 100))
    : 0;
  return { hits, misses, falseAlarms, correctRejections, total, accuracy: signalScore, hitRate, falseAlarmRate };
}

export function calculateResults(state) {
  const A = streamStats(state.hitsA, state.missesA, state.falseAlarmsA, state.correctRejectionsA);
  const B = state.modes.includes('dual')
    ? streamStats(state.hitsB, state.missesB, state.falseAlarmsB, state.correctRejectionsB)
    : null;
  const C = state.modes.includes('hierarchical')
    ? streamStats(state.hitsC, state.missesC, state.falseAlarmsC, state.correctRejectionsC)
    : null;

  // Combined overall accuracy
  const allHits = state.hitsA + (B ? state.hitsB : 0) + (C ? state.hitsC : 0);
  const allMisses = state.missesA + (B ? state.missesB : 0) + (C ? state.missesC : 0);
  const allFA = state.falseAlarmsA + (B ? state.falseAlarmsB : 0) + (C ? state.falseAlarmsC : 0);
  const allCR = state.correctRejectionsA + (B ? state.correctRejectionsB : 0) + (C ? state.correctRejectionsC : 0);
  const overall = streamStats(allHits, allMisses, allFA, allCR);

  return { A, B, C, overall };
}

// ─── Adaptive N-Level ─────────────────────────────────────────────────────────

export function computeNextNLevel(currentN, results) {
  const acc = results.overall.accuracy;
  if (acc >= ADAPT_UP_THRESHOLD && currentN < N_MAX) return currentN + 1;
  if (acc <= ADAPT_DOWN_THRESHOLD && currentN > N_MIN) return currentN - 1;
  return currentN;
}