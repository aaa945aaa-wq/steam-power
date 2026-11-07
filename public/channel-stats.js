// Measurement only: per-source acceptance among JUDGED candidates (interested / not_for_me / known). Candidates that were
// displayed but never judged are not recorded, so `rate` is a conditional rate and overstates the true hit rate per impression.
// Nothing in the recommender reads this. Counters live in Maps, so channel names such as "constructor" are ordinary keys.
const blank = () => ({judged: 0, interested: 0, notForMe: 0, known: 0, saturated: 0, rate: null});
const SOURCE = /^(broad|extended|deep):[a-z]{2,20}$/;
export function channelStats(feedback = {}) {
  const byChannel = new Map(), byTier = new Map(), total = blank();
  const bump = (s, f) => {
    s.judged++;
    if (f.choice === 'interested') s.interested++;
    else if (f.choice === 'known') s.known++;
    else if (f.choice === 'not_for_me') { s.notForMe++; if (f.reason === 'saturated') s.saturated++; }
  };
  const slot = (map, key) => { if (!map.has(key)) map.set(key, blank()); return map.get(key); };
  for (const f of Object.values(feedback || {})) {
    if (!f || !['interested', 'not_for_me', 'known'].includes(f.choice)) continue;
    const sources = Array.isArray(f.sources) ? f.sources.filter(x => typeof x === 'string' && SOURCE.test(x)) : [];
    bump(total, f);
    if (!sources.length) { bump(slot(byChannel, 'unknown'), f); bump(slot(byTier, 'unknown'), f); continue; }
    for (const ch of new Set(sources.map(x => x.split(':')[1]))) bump(slot(byChannel, ch), f);
    for (const tr of new Set(sources.map(x => x.split(':')[0]))) bump(slot(byTier, tr), f);
  }
  const finish = s => { s.rate = s.judged ? s.interested / s.judged : null; return s; };
  finish(total);
  for (const s of [...byChannel.values(), ...byTier.values()]) finish(s);
  return {basis: 'judged-only', total, byChannel: Object.fromEntries(byChannel), byTier: Object.fromEntries(byTier)};
}
