// ─── Relational Integration N-Back (RINT) ────────────────────────────────────
//
// Entities (alpha, beta, gamma…) persist across trials in a fact-graph.
// A target fires when the current stimulus is a VALID transitive conclusion
// derivable by chaining the N most-recent facts in the same relation family.
//
// Only transitive relation families are supported (comparisons, directional,
// temporal, and a subset of semantic relations).

export const RINT_MIN_N = 2;

// Named entities used as subjects/objects in the fact graph
const ENTITIES = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta'];

// Transitive relation families: each entry lists relations that chain
// (A rel B, B rel C → A rel C). Pairs are [forward, inverse].
const TRANSITIVE_FAMILIES = [
  // Magnitude comparisons
  { rels: ['BIGGER_THAN', 'SMALLER_THAN'], inv: { BIGGER_THAN: 'SMALLER_THAN', SMALLER_THAN: 'BIGGER_THAN' } },
  { rels: ['MORE_THAN', 'LESS_THAN'],       inv: { MORE_THAN: 'LESS_THAN', LESS_THAN: 'MORE_THAN' } },
  { rels: ['FASTER_THAN', 'SLOWER_THAN'],   inv: { FASTER_THAN: 'SLOWER_THAN', SLOWER_THAN: 'FASTER_THAN' } },
  { rels: ['HEAVIER_THAN', 'LIGHTER_THAN'], inv: { HEAVIER_THAN: 'LIGHTER_THAN', LIGHTER_THAN: 'HEAVIER_THAN' } },
  { rels: ['HOTTER_THAN', 'COLDER_THAN'],   inv: { HOTTER_THAN: 'COLDER_THAN', COLDER_THAN: 'HOTTER_THAN' } },
  { rels: ['LOUDER_THAN', 'SOFTER_THAN'],   inv: { LOUDER_THAN: 'SOFTER_THAN', SOFTER_THAN: 'LOUDER_THAN' } },
  { rels: ['STRONGER_THAN', 'WEAKER_THAN'], inv: { STRONGER_THAN: 'WEAKER_THAN', WEAKER_THAN: 'STRONGER_THAN' } },
  { rels: ['OLDER_THAN', 'NEWER_THAN'],     inv: { OLDER_THAN: 'NEWER_THAN', NEWER_THAN: 'OLDER_THAN' } },
  { rels: ['HIGHER_THAN', 'LOWER_THAN'],    inv: { HIGHER_THAN: 'LOWER_THAN', LOWER_THAN: 'HIGHER_THAN' } },
  { rels: ['CLOSER_THAN', 'FURTHER_THAN'],  inv: { CLOSER_THAN: 'FURTHER_THAN', FURTHER_THAN: 'CLOSER_THAN' } },
  // Temporal
  { rels: ['BEFORE', 'AFTER'],              inv: { BEFORE: 'AFTER', AFTER: 'BEFORE' } },
  { rels: ['PRECEDES', 'FOLLOWS'],          inv: { PRECEDES: 'FOLLOWS', FOLLOWS: 'PRECEDES' } },
  // Directional
  { rels: ['LEFT_OF', 'RIGHT_OF'],          inv: { LEFT_OF: 'RIGHT_OF', RIGHT_OF: 'LEFT_OF' } },
  { rels: ['ABOVE', 'BELOW'],               inv: { ABOVE: 'BELOW', BELOW: 'ABOVE' } },
  { rels: ['NORTH_OF', 'SOUTH_OF'],         inv: { NORTH_OF: 'SOUTH_OF', SOUTH_OF: 'NORTH_OF' } },
  { rels: ['EAST_OF', 'WEST_OF'],           inv: { EAST_OF: 'WEST_OF', WEST_OF: 'EAST_OF' } },
  // Semantic chains
  { rels: ['CAUSES'],       inv: {} },
  { rels: ['CONTAINS'],     inv: {} },
  { rels: ['DEPENDS_ON'],   inv: {} },
  { rels: ['TRANSFORMS_INTO'], inv: {} },
];

// Build a quick lookup: rel → family index
const REL_TO_FAMILY = new Map();
TRANSITIVE_FAMILIES.forEach((fam, idx) => {
  fam.rels.forEach(r => REL_TO_FAMILY.set(r, idx));
});

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomExcluding(arr, ...excl) {
  const filtered = arr.filter(x => !excl.includes(x));
  return filtered.length > 0 ? pickRandom(filtered) : pickRandom(arr);
}

// Get the canonical forward relation for a family (first in rels list)
function canonicalRel(familyIdx) {
  return TRANSITIVE_FAMILIES[familyIdx].rels[0];
}

// Given A rel B and B rel2 C (same family), derive the transitive conclusion A → C
// Returns null if relations are not both in the same transitive family or can't chain
function deriveConclusion(factA, factB) {
  const famIdxA = REL_TO_FAMILY.get(factA.rel);
  const famIdxB = REL_TO_FAMILY.get(factB.rel);
  if (famIdxA === undefined || famIdxB !== famIdxA) return null;
  if (factA.entityB !== factB.entityA) return null; // no chain link

  const fam = TRANSITIVE_FAMILIES[famIdxA];
  // Both forward → A rel C
  const forwardRel = fam.rels[0];
  const isAForward = factA.rel === forwardRel || !fam.inv[factA.rel];
  const isBForward = factB.rel === forwardRel || !fam.inv[factB.rel];

  let resultRel;
  if (isAForward && isBForward) {
    resultRel = forwardRel;
  } else if (!isAForward && !isBForward) {
    // both inverse → conclusion is also forward (double negative)
    resultRel = forwardRel;
  } else {
    // mixed → conclusion is inverse
    resultRel = fam.inv[forwardRel] || forwardRel;
  }

  return { entityA: factA.entityA, rel: resultRel, entityB: factB.entityB };
}

// ─── State ────────────────────────────────────────────────────────────────────

export function createRINTState() {
  return {
    // fact graph: array of { entityA, rel, entityB }
    facts: [],
    // last N facts for chaining (same as facts tail, kept for clarity)
    chainLog: [],
  };
}

// ─── Stimulus Generation ──────────────────────────────────────────────────────

/**
 * Generate a RINT stimulus.
 * With probability matchChance (and if a valid chain exists), produce a target
 * stimulus that IS the transitive conclusion of chaining the last N facts.
 * Otherwise produce a new non-target fact and add it to the graph.
 *
 * Returns { stim, isTarget, rintState }
 */
export function generateRINTStimulus(rintState, pool, effectiveN, matchChance) {
  const { facts } = rintState;

  // Filter pool to only transitive relations
  const transitivePool = pool.filter(r => REL_TO_FAMILY.has(r));
  if (transitivePool.length === 0) {
    // fallback: no transitive rels in pool, generate a dummy non-target
    const rel = pickRandom(pool);
    const [eA, eB] = pickTwoEntities();
    const stim = makeRINTStim(eA, rel, eB);
    return { stim, isTarget: false, rintState };
  }

  // Try to generate a target (valid transitive conclusion)
  const canTarget = facts.length >= effectiveN;
  if (canTarget && Math.random() < matchChance) {
    // Take the last `effectiveN` facts and try to chain them
    const chain = facts.slice(-effectiveN);
    const conclusion = tryChainFacts(chain);
    if (conclusion) {
      const stim = makeRINTStim(conclusion.entityA, conclusion.rel, conclusion.entityB);
      // Don't add the conclusion to facts — it's a derived truth, not a new assertion
      return {
        stim,
        isTarget: true,
        rintState: { ...rintState }, // unchanged
      };
    }
  }

  // Generate a new non-target fact
  // Pick a transitive relation from pool
  const rel = pickRandom(transitivePool);
  // Try to extend an existing chain for coherence
  let entityA, entityB;
  if (facts.length > 0 && Math.random() < 0.6) {
    // Extend: use last fact's entityB as new entityA (build a chain)
    const lastFact = facts[facts.length - 1];
    const famIdxLast = REL_TO_FAMILY.get(lastFact.rel);
    const famIdxNew = REL_TO_FAMILY.get(rel);
    if (famIdxLast === famIdxNew) {
      entityA = lastFact.entityB;
      entityB = pickRandomExcluding(ENTITIES, entityA, lastFact.entityA);
    } else {
      [entityA, entityB] = pickTwoEntities();
    }
  } else {
    [entityA, entityB] = pickTwoEntities();
  }

  const newFact = { entityA, rel, entityB };
  const nextFacts = [...facts, newFact];
  const nextChainLog = nextFacts.slice(-Math.max(effectiveN + 1, 4));
  const stim = makeRINTStim(entityA, rel, entityB);

  return {
    stim,
    isTarget: false,
    rintState: { facts: nextFacts, chainLog: nextChainLog },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickTwoEntities() {
  const a = pickRandom(ENTITIES);
  const b = pickRandomExcluding(ENTITIES, a);
  return [a, b];
}

// Try to chain an array of facts transitively; returns conclusion or null
function tryChainFacts(chain) {
  if (chain.length < 2) return null;
  let current = chain[0];
  for (let i = 1; i < chain.length; i++) {
    const derived = deriveConclusion(current, chain[i]);
    if (!derived) return null;
    current = derived;
  }
  return current;
}

// Make a stimulus object for RINT (verbal-style with entity names as tokens)
function makeRINTStim(entityA, rel, entityB) {
  return {
    rel,
    wordA: entityA,
    wordB: entityB,
    // Use a fixed renderMode=0 (text mode) for RINT so entity names are clear
    renderMode: 0,
    // Provide dummy shape/color fields to satisfy the engine
    shapeA: 'circle',
    shapeB: 'square',
    colorA: '#22d3ee',
    colorB: '#a78bfa',
    isRINTStim: true,
  };
}