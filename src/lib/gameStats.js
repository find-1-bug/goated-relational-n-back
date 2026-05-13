import {
  ADAPT_UP_THRESHOLD,
  ADAPT_DOWN_THRESHOLD,
  N_MIN,
  N_MAX,
} from './gameConstants';

export function streamStats(hits, misses, falseAlarms, correctRejections) {
  const totalTargets = hits + misses;
  const totalNonTargets = falseAlarms + correctRejections;
  const total = totalTargets + totalNonTargets;
  const hitRate = totalTargets > 0 ? Math.round((hits / totalTargets) * 100) : 0;
  const falseAlarmRate = totalNonTargets > 0 ? Math.round((falseAlarms / totalNonTargets) * 100) : 0;
  const scoredAttempts = totalTargets + falseAlarms;
  const accuracy = scoredAttempts > 0 ? Math.round((hits / scoredAttempts) * 100) : 0;
  return { hits, misses, falseAlarms, correctRejections, total, accuracy, hitRate, falseAlarmRate };
}

export function calculateResults(state) {
  const A = streamStats(state.hitsA, state.missesA, state.falseAlarmsA, state.correctRejectionsA);
  const positionA = (state.modes?.includes('alien_cube') || state.modes?.includes('alien_square'))
    ? streamStats(state.positionHitsA || 0, state.positionMissesA || 0, state.positionFalseAlarmsA || 0, state.positionCorrectRejectionsA || 0)
    : null;

  const extra = (state.extraHits || []).map((h, i) =>
    streamStats(
      h || 0,
      (state.extraMisses || [])[i] || 0,
      (state.extraFalseAlarms || [])[i] || 0,
      (state.extraCorrectRejections || [])[i] || 0
    )
  );

  const extraPosition = positionA ? (state.extraPositionHits || []).map((h, i) =>
    streamStats(
      h || 0,
      (state.extraPositionMisses || [])[i] || 0,
      (state.extraPositionFalseAlarms || [])[i] || 0,
      (state.extraPositionCorrectRejections || [])[i] || 0
    )
  ) : [];

  const allStreamsStats = [A, ...extra, ...(positionA ? [positionA, ...extraPosition] : [])];
  const allHits = allStreamsStats.reduce((s, x) => s + x.hits, 0);
  const allMisses = allStreamsStats.reduce((s, x) => s + x.misses, 0);
  const allFA = allStreamsStats.reduce((s, x) => s + x.falseAlarms, 0);
  const allCR = allStreamsStats.reduce((s, x) => s + x.correctRejections, 0);
  const overall = streamStats(allHits, allMisses, allFA, allCR);

  return { A, positionA, extra, extraPosition, overall };
}

export function computeNextNLevel(currentN, results) {
  const acc = results.overall.accuracy;
  if (acc >= ADAPT_UP_THRESHOLD && currentN < N_MAX) return currentN + 1;
  if (acc <= ADAPT_DOWN_THRESHOLD && currentN > N_MIN) return currentN - 1;
  return currentN;
}