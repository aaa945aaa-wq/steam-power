// Shadow ranker (measurement only). Never reorders, filters or explains anything the user sees.
// Preference = sum over library games of log1p(hours) x tag IDF; score = cosine(preference, candidate IDF vector).
// Tags are the existing vocabulary (mechanics + conditions + presentation) until a richer tag source is adopted.
const GROUPS = ['mechanics', 'conditions', 'presentation'];
export const SHADOW_VERSION = 1;
export function tagsOf(game) {
  const out = new Set();
  for (const k of GROUPS) {
    const list = game?.facets?.[k];
    if (Array.isArray(list)) for (const t of list) if (typeof t === 'string' && t) out.add(t);
  }
  return [...out];
}
export function buildIdf(games) {
  const df = new Map();
  let n = 0;
  for (const g of games || []) {
    const ts = tagsOf(g);
    if (!ts.length) continue;
    n++;
    for (const t of ts) df.set(t, (df.get(t) || 0) + 1);
  }
  const idf = new Map();
  for (const [t, c] of df) idf.set(t, Math.log(n / c + 1));
  return {idf, n, unseen: Math.log(n + 1)};
}
export function buildPreference(library, catalog, model, {minHours = 0} = {}) {
  const byId = new Map((catalog || []).map(g => [g.appid, g]));
  const pref = new Map();
  for (const l of library || []) {
    const g = byId.get(l?.appid);
    if (!g) continue;
    const ts = tagsOf(g);
    if (!ts.length) continue;
    const hours = Math.max(0, Number(l.minutes) / 60);
    if (!Number.isFinite(hours) || hours < minHours) continue;
    const w = Math.log1p(hours);
    for (const t of ts) pref.set(t, (pref.get(t) || 0) + w * (model.idf.get(t) ?? model.unseen));
  }
  return pref;
}
// null = cannot score (no usable tags or no preference). Unknown is never reported as a low score.
export function shadowScore(game, pref, model) {
  const ts = tagsOf(game);
  if (!ts.length) return null;
  let np = 0;
  for (const v of pref.values()) np += v * v;
  if (!np) return null;
  let dot = 0, nv = 0;
  for (const t of ts) {
    const w = model.idf.get(t) ?? model.unseen;
    nv += w * w;
    dot += (pref.get(t) || 0) * w;
  }
  return nv ? Math.round(dot / Math.sqrt(np * nv) * 10000) / 10000 : null;
}
export function withShadow(shown, checked, library, catalog) {
  const model = buildIdf(catalog), pref = buildPreference(library, catalog, model);
  const scores = {};
  for (const g of checked || []) scores[g.appid] = shadowScore(g, pref, model);
  return {
    games: (shown || []).map(g => ({...g, shadowScore: scores[g.appid] ?? shadowScore(g, pref, model)})),
    shadow: {version: SHADOW_VERSION, scores},
  };
}
