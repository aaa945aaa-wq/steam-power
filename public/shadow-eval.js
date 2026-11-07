// Offline comparison of the primary prediction score and the shadow score against the user's own feedback.
export function auc(pos, neg) {
  if (!pos.length || !neg.length) return null;
  let w = 0;
  for (const a of pos) for (const b of neg) w += a > b ? 1 : a === b ? 0.5 : 0;
  return w / (pos.length * neg.length);
}
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const aucOf = (rows, key) => auc(rows.filter(r => r.y).map(r => r[key]), rows.filter(r => !r.y).map(r => r[key]));
export function compareRankers(feedback = {}, {resamples = 2000, seed = 1} = {}) {
  const rows = Object.values(feedback || {})
    .filter(f => f && (f.choice === 'interested' || f.choice === 'not_for_me') && Number.isFinite(f.prediction?.score) && Number.isFinite(f.shadowScore))
    .map(f => ({y: f.choice === 'interested' ? 1 : 0, primary: f.prediction.score, shadow: f.shadowScore}));
  const nPos = rows.filter(r => r.y).length, nNeg = rows.length - nPos;
  const primary = aucOf(rows, 'primary'), shadow = aucOf(rows, 'shadow');
  const out = {n: rows.length, nPos, nNeg, primary, shadow, difference: null, ci: null, reliable: nPos >= 10 && nNeg >= 10};
  if (primary === null || shadow === null) return out;
  out.difference = shadow - primary;
  const rand = rng(seed), diffs = [];
  for (let b = 0; b < resamples; b++) {
    const s = rows.map(() => rows[Math.floor(rand() * rows.length)]);
    const p = aucOf(s, 'primary'), q = aucOf(s, 'shadow');
    if (p !== null && q !== null) diffs.push(q - p);
  }
  diffs.sort((x, y) => x - y);
  if (diffs.length >= 20) out.ci = [diffs[Math.floor(0.025 * diffs.length)], diffs[Math.min(diffs.length - 1, Math.floor(0.975 * diffs.length))]];
  return out;
}
