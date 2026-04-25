import {
  RELATIONSHIPS,
  MATCH_CHANCE,
  TOTAL_ROUNDS,
  pickRandom,
  pickRandomExcluding,
} from './gameConstants';

export function createGameState(nLevel) {
  return {
    nLevel,
    round: 0,
    totalRounds: TOTAL_ROUNDS,
    history: [],        // array of relationship strings
    targets: 0,
    hits: 0,
    misses: 0,
    falseAlarms: 0,
    correctRejections: 0,
    currentRelationship: null,
    isTarget: false,
    responded: false,
    finished: false,
  };
}

export function generateNextRelationship(state) {
  const { nLevel, history, round } = state;
  
  let relationship;
  let isTarget = false;

  // Can only create a target if we have enough history
  if (round >= nLevel && Math.random() < MATCH_CHANCE) {
    // Target: match the relationship from N steps ago
    relationship = history[history.length - nLevel];
    isTarget = true;
  } else {
    // Non-target: pick a relationship that does NOT match N steps ago
    if (round >= nLevel) {
      const nBackRelationship = history[history.length - nLevel];
      relationship = pickRandomExcluding(RELATIONSHIPS, nBackRelationship);
    } else {
      relationship = pickRandom(RELATIONSHIPS);
    }
    isTarget = false;
  }

  return { relationship, isTarget };
}

export function processResponse(state, userPressed) {
  const { isTarget } = state;

  if (isTarget && userPressed) {
    return { ...state, hits: state.hits + 1 };
  } else if (isTarget && !userPressed) {
    return { ...state, misses: state.misses + 1 };
  } else if (!isTarget && userPressed) {
    return { ...state, falseAlarms: state.falseAlarms + 1 };
  } else {
    return { ...state, correctRejections: state.correctRejections + 1 };
  }
}

export function advanceRound(state, relationship, isTarget) {
  const newHistory = [...state.history, relationship];
  return {
    ...state,
    round: state.round + 1,
    history: newHistory,
    currentRelationship: relationship,
    isTarget,
    responded: false,
    finished: state.round + 1 >= state.totalRounds,
  };
}

export function calculateResults(state) {
  const { hits, misses, falseAlarms, correctRejections, targets } = state;
  const totalTargets = hits + misses;
  const totalNonTargets = falseAlarms + correctRejections;
  const total = totalTargets + totalNonTargets;
  const correct = hits + correctRejections;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const hitRate = totalTargets > 0 ? Math.round((hits / totalTargets) * 100) : 0;
  const falseAlarmRate = totalNonTargets > 0 ? Math.round((falseAlarms / totalNonTargets) * 100) : 0;

  return {
    accuracy,
    hitRate,
    falseAlarmRate,
    hits,
    misses,
    falseAlarms,
    correctRejections,
    totalTargets,
    totalNonTargets,
    total,
  };
}