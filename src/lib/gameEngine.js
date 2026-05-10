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

// Visual inverse map: relationships where swapping A↔B gives the semantic inverse
// e.g. ABOVE_BELOW: A above B → B above A is the same relationship (symmetric)
// but for directional ones like SIZE_MISMATCH: big A / small B → big B / small A
// We handle this by swapping shapeA/colorA with shapeB/colorB
const VISUAL_SYMMETRIC = new Set([
  'OVERLAPPING','TOUCHING','MIRRORED','CONNECTED','EQUAL_COUNT',
  'SAME_COLOR','SAME_SHAPE','OPPOSITE_COLORS','BORDER_ONLY','BALANCED_SCALE',
  'NEXT_TO','LEFT_RIGHT','SCATTERED','NESTED_3',
]);

// Generate a stable stimulus entry. Visuals (shapes, colors, renderMode) are chosen
// at generation time and stored so a target replay looks identical to the original.
function makeStimulusEntry(rel) {
  const shapeA = pickRandom(SHAPES);
  const shapeB = pickRandomExcluding(SHAPES, shapeA);
  const colorA = pickRandom(COLORS);
  const colorB = pickRandomExcluding(COLORS, colorA);
  const renderMode = Math.floor(Math.random() * 3); // 0, 1, 2 — maps to renderer modes
  if (isVerbal(rel)) {
    // 40% chance: use semantic word pair; 60%: pick typed tokens respecting weights
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

// For non-verbal targets: 25% chance produce a visually "inverted" version
// (swap A/B roles) — same relationship, different assignment of shapes
function maybeInvertVisual(entry) {
  if (!entry || Math.random() >= 0.25) return entry;
  return {
    ...entry,
    shapeA: entry.shapeB,
    shapeB: entry.shapeA,
    colorA: entry.colorB,
    colorB: entry.colorA,
  };
}

// Check if two rels are considered equivalent (same or semantic inverse)
function relsMatch(relA, relB) {
  if (!relA || !relB) return false;
  if (relA === relB) return true;
  return INVERSE_RELATIONSHIP[relA] === relB;
}

// Given a per-type history map and a rel, return the list of past entries for
// this rel AND its semantic inverse (they share the same "type slot").
function getTypeHistory(typeHistoryMap, rel) {
  const inv = INVERSE_RELATIONSHIP[rel];
  const own = typeHistoryMap.get(rel) || [];
  const invEntries = (inv && inv !== rel) ? (typeHistoryMap.get(inv) || []) : [];
  // Merge and sort by insertion order (each entry has a .trialIndex)
  return [...own, ...invEntries].sort((a, b) => a.trialIndex - b.trialIndex);
}

// Push a new entry into the per-type history map
function pushTypeHistory(typeHistoryMap, rel, entry) {
  const next = new Map(typeHistoryMap);
  const existing = next.get(rel) || [];
  next.set(rel, [...existing, entry]);
  return next;
}

// ─── State Creation ──────────────────────────────────────────────────────────

export function createGameState({ nLevel, modes, relationshipPool, totalRounds }) {
  return {
    nLevel,
    modes, // array: ['adaptive', 'dual', 'hierarchical', 'distractors']
    relationshipPool: relationshipPool || ALL_RELATIONSHIPS,
    round: 0,
    totalRounds: totalRounds || TOTAL_ROUNDS,

    // Stream A: primary relationship (stores {rel, wordA?, wordB?} entries)
    historyA: [],
    typeHistoryA: new Map(), // Map<rel, [{...entry, trialIndex}]> for type_nback mode
    currentRelationship: null,
    currentStimulusA: null,  // full entry for renderer
    isTargetA: false,

    // Stream B: secondary relationship (dual mode)
    historyB: [],
    typeHistoryB: new Map(), // Map<rel, [{...entry, trialIndex}]> for type_nback mode
    currentRelationshipB: null,
    currentStimulusB: null,
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

// ─── Type N-back helpers ──────────────────────────────────────────────────────

// Determine if a stimulus should be a type-nback target for a given stream.
// Returns { isTarget, targetEntry } where targetEntry is the N-back entry to replay.
function checkTypeNbackTarget(rel, typeHistoryMap, effectiveN) {
  const typeHistory = getTypeHistory(typeHistoryMap, rel);
  // Need at least N prior occurrences of this rel (or its inverse) to have a target
  if (typeHistory.length < effectiveN) return { isTarget: false, targetEntry: null };
  const targetEntry = typeHistory[typeHistory.length - effectiveN];
  return { isTarget: true, targetEntry };
}

// Build a type-nback stimulus: when we want to force a match, pick a rel that
// already has ≥ effectiveN entries in its per-type history.
function pickTypeNbackTargetRel(typeHistoryMap, pool, effectiveN) {
  const candidates = pool.filter(rel => {
    const h = getTypeHistory(typeHistoryMap, rel);
    return h.length >= effectiveN;
  });
  if (candidates.length === 0) return null;
  return pickRandom(candidates);
}

export function generateNextStimulus(state) {
  const { nLevel, round, historyA, historyB, historyCategory, typeHistoryA, typeHistoryB, modes, relationshipPool } = state;
  const pool = (relationshipPool && relationshipPool.length > 0) ? relationshipPool : ALL_RELATIONSHIPS;
  const isDual = modes.includes('dual');
  const isHier = modes.includes('hierarchical');
  const hasDistractors = modes.includes('distractors');
  const isTypeNback = modes.includes('type_nback');
  const canTarget = round >= nLevel;

  // ── Variable N: pick effective N for this trial ──
  const isVariableN = modes.includes('variable_n');
  let effectiveN = nLevel;
  if (isVariableN && canTarget) {
    const delta = Math.random() < 0.5 ? 1 : -1;
    const candidate = nLevel + delta;
    if (candidate >= 1) {
      if (isTypeNback) {
        // For type_nback: just bound-check; per-type history guards will handle validity
        effectiveN = candidate;
      } else if (candidate <= round && historyA.length >= candidate) {
        effectiveN = candidate;
      }
    }
  }
  const canTargetEffective = isTypeNback ? true : (round >= effectiveN && historyA.length >= effectiveN);

  // ── Stream A ──
  let stimA, isTargetA, isDistractor = false;

  if (isTypeNback) {
    // Type N-back: match against per-type history
    if (Math.random() < MATCH_CHANCE) {
      const forcedRel = pickTypeNbackTargetRel(typeHistoryA, pool, effectiveN);
      if (forcedRel) {
        const { targetEntry } = checkTypeNbackTarget(forcedRel, typeHistoryA, effectiveN);
        if (isVerbal(forcedRel)) {
          // 35% chance: replay as semantic inverse
          const inv = Math.random() < 0.35 ? makeInverseStimulus(targetEntry) : null;
          stimA = inv || makeStimulusEntry(forcedRel);
        } else {
          stimA = maybeInvertVisual(makeStimulusEntry(forcedRel));
        }
        isTargetA = true;
      } else {
        // Not enough history yet — just pick random
        stimA = makeStimulusEntry(pickRandom(pool));
        isTargetA = false;
      }
    } else {
      // Non-target: pick any rel
      stimA = makeStimulusEntry(pickRandom(pool));
      isTargetA = false;
    }
  } else {
    // Classic global N-back
    const nBackEntryA = canTargetEffective ? historyA[historyA.length - effectiveN] : null;
    if (canTargetEffective && nBackEntryA && Math.random() < MATCH_CHANCE) {
      if (isVerbal(nBackEntryA.rel)) {
        const inv = Math.random() < 0.35 ? makeInverseStimulus(nBackEntryA) : null;
        stimA = inv || nBackEntryA;
      } else {
        stimA = maybeInvertVisual(makeStimulusEntry(nBackEntryA.rel));
      }
      isTargetA = true;
    } else {
      if (hasDistractors && canTargetEffective && nBackEntryA && Math.random() < DISTRACTOR_CHANCE) {
        stimA = makeStimulusEntry(makeDistractor(nBackEntryA.rel, pool));
        isDistractor = true;
      } else {
        const excludeRel = nBackEntryA?.rel;
        stimA = makeStimulusEntry(excludeRel ? pickRandomExcluding(pool, excludeRel) : pickRandom(pool));
      }
      isTargetA = false;
    }
  }
  const relA = stimA.rel;
  const categoryA = getCategory(relA);

  // ── Stream B (dual mode) ──
  let stimB = null, relB = null, isTargetB = false;
  if (isDual) {
    if (isTypeNback) {
      if (Math.random() < DUAL_MATCH_CHANCE) {
        const forcedRel = pickTypeNbackTargetRel(typeHistoryB, pool, effectiveN);
        if (forcedRel) {
          const { targetEntry } = checkTypeNbackTarget(forcedRel, typeHistoryB, effectiveN);
          if (isVerbal(forcedRel)) {
            const inv = Math.random() < 0.35 ? makeInverseStimulus(targetEntry) : null;
            stimB = inv || makeStimulusEntry(forcedRel);
          } else {
            stimB = maybeInvertVisual(makeStimulusEntry(forcedRel));
          }
          isTargetB = true;
        } else {
          stimB = makeStimulusEntry(pickRandom(pool));
          isTargetB = false;
        }
      } else {
        stimB = makeStimulusEntry(pickRandom(pool));
        isTargetB = false;
      }
    } else {
      const canTargetB = round >= nLevel && historyB.length >= nLevel;
      const nBackEntryB = canTargetB ? historyB[historyB.length - nLevel] : null;
      if (canTargetB && nBackEntryB && Math.random() < DUAL_MATCH_CHANCE) {
        if (isVerbal(nBackEntryB.rel)) {
          const inv = Math.random() < 0.35 ? makeInverseStimulus(nBackEntryB) : null;
          stimB = inv || nBackEntryB;
        } else {
          stimB = maybeInvertVisual(makeStimulusEntry(nBackEntryB.rel));
        }
        isTargetB = true;
      } else {
        const excludeRel = nBackEntryB?.rel;
        stimB = makeStimulusEntry(excludeRel ? pickRandomExcluding(pool, excludeRel) : pickRandom(pool));
        isTargetB = false;
      }
    }
    relB = stimB.rel;
  }

  // ── Category / Hierarchical stream ──
  let isTargetCategory = false;
  if (isHier) {
    const canTargetCat = round >= nLevel && historyCategory.length >= nLevel;
    const nBackCat = canTargetCat ? historyCategory[historyCategory.length - nLevel] : null;
    if (canTargetCat && nBackCat && Math.random() < HIER_MATCH_CHANCE) {
      const catPool = (RELATIONSHIP_CATEGORIES[nBackCat] || []).filter(r => pool.includes(r));
      if (catPool.length > 0) {
        const forcedRel = pickRandom(catPool);
        stimA = makeStimulusEntry(forcedRel);
        const forcedCatA = getCategory(stimA.rel);
        isTargetCategory = true;
        return {
          stimA, relA: stimA.rel, stimB, relB,
          isTargetA: false,
          isTargetB, categoryA: forcedCatA, isTargetCategory, isDistractor, effectiveN
        };
      }
    }
  }

  return { stimA, relA, stimB, relB, isTargetA, isTargetB, categoryA, isTargetCategory, isDistractor, effectiveN };
}

// ─── Advance Round ────────────────────────────────────────────────────────────

export function advanceRound(state, stimulus) {
  const { stimA, relA, stimB, relB, isTargetA, isTargetB, categoryA, isTargetCategory, isDistractor, effectiveN } = stimulus;
  const trialIndex = state.round;
  const nextTypeHistoryA = pushTypeHistory(state.typeHistoryA, relA, { ...stimA, trialIndex });
  const nextTypeHistoryB = (stimB !== null)
    ? pushTypeHistory(state.typeHistoryB, relB, { ...stimB, trialIndex })
    : state.typeHistoryB;
  return {
    ...state,
    round: state.round + 1,
    currentEffectiveN: effectiveN ?? state.nLevel,
    historyA: [...state.historyA, stimA],
    typeHistoryA: nextTypeHistoryA,
    historyB: stimB !== null ? [...state.historyB, stimB] : state.historyB,
    typeHistoryB: nextTypeHistoryB,
    historyCategory: [...state.historyCategory, categoryA],
    currentRelationship: relA,
    currentStimulusA: stimA,
    currentRelationshipB: relB,
    currentStimulusB: stimB,
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