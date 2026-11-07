// Measurement only: per-source acceptance among JUDGED candidates (interested / not_for_me / known). Candidates that were
// displayed but never judged are not recorded, so `rate` is a conditional rate and overstates the true hit rate per impression.
// Nothing in the recommender reads this.
// A source is "tier:channel" (for example "broad:build"); older feedback without sources is counted as "unknown".
const blank = () => ({judged: 0, interested: 0, notForMe: 0, known: 0, saturated: 0, rate: null});
export function channelStats(feedback = {}) {
  const byChannel = {}, byTier = {}, total = blank();
  const bump = (map, key, f) => {
    const s = (map[key] ??= blank());
    s.judged++;
    if (f.choice === 'interested') s.interested++;
    else if (f.choice === 'known') s.known++;
    else if (f.choice === 'not_for_me') { s.notForMe++; if (f.reason === 'saturated') s.saturated++; }
  };
  for (const f of Object.values(feedback || {})) {
    if (!f || !['interested', 'not_for_me', 'known'].includes(f.choice)) continue;
    const sources = Array.isArray(f.sources) ? f.sources.filter(x => typeof x === 'string' && /^(broad|extended|deep):[a-z]{2,20}$/.test(x)) : [];
    bump({t: total}, 't', f);
    if (!sources.length) { bump(byChannel, 'unknown', f); bump(byTier, 'unknown', f); continue; }
    for (const ch of new Set(sources.map(x => x.split(':')[1]))) bump(byChannel, ch, f);
    for (const tr of new Set(sources.map(x => x.split(':')[0]))) bump(byTier, tr, f);
  }
  for (const s of [total, ...Object.values(byChannel), ...Object.values(byTier)]) s.rate = s.judged ? s.interested / s.judged : null;
  return {basis: 'judged-only', total, byChannel, byTier};
}
