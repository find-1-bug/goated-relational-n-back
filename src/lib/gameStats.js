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
  const accuracy = total > 0 ? Math.round(((hits + correctRejections) / total) * 100) : 0;
  return { hits, misses, falseAlarms, correctRejections, total, accuracy, hitRate, falseAlarmRate };
}

export function calculateResults(state) {
  const A = streamStats(state.hitsA, state.missesA, state.falseAlarmsA, state.correctRejectionsA);

  const extra = (state.extraHits || []).map((h, i) =>
    streamStats(
      h || 0,
      (state.extraMisses || [])[i] || 0,
      (state.extraFalseAlarms || [])[i] || 0,
      (state.extraCorrectRejections || [])[i] || 0
    )
  );

  const allStreamsStats = [A, ...extra];
  const allHits = allStreamsStats.reduce((s, x) => s + x.hits, 0);
  const allMisses = allStreamsStats.reduce((s, x) => s + x.misses, 0);
  const allFA = allStreamsStats.reduce((s, x) => s + x.falseAlarms, 0);
  const allCR = allStreamsStats.reduce((s, x) => s + x.correctRejections, 0);
  const overall = streamStats(allHits, allMisses, allFA, allCR);

  return { A, extra, overall };
}

export function computeNextNLevel(currentN, results) {
  const acc = results.overall.accuracy;
  if (acc >= ADAPT_UP_THRESHOLD && currentN < N_MAX) return currentN + 1;
  if (acc <= ADAPT_DOWN_THRESHOLD && currentN > N_MIN) return currentN - 1;
  return currentN;
}