import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as taxonomy from './public/taxonomy.js';
import * as engine from './public/engine.js';
import * as signalsMod from './public/signals.js';
import * as attractionMod from './public/attraction.js';
import {mergeCatalog} from './public/metadata.js';
import {tagsOf, buildIdf, buildPreference, shadowScore, withShadow} from './public/shadow-rank.js';
import {auc, compareRankers} from './public/shadow-eval.js';
import {discoveryOrder} from './public/signals.js';
import {discover} from './lib/discovery.mjs';

const G = (appid, ...mech) => ({appid, facets: {mechanics: mech, conditions: [], presentation: []}});

test('IDF follows ln(N/df + 1): rarer tags weigh more', () => {
  const m = buildIdf([G(1, 'a', 'b'), G(2, 'a'), G(3)]);
  assert.equal(m.n, 2);
  assert.ok(Math.abs(m.idf.get('a') - Math.log(2)) < 1e-12);
  assert.ok(Math.abs(m.idf.get('b') - Math.log(3)) < 1e-12);
  assert.ok(m.idf.get('b') > m.idf.get('a'));
});

test('Playtime is log-smoothed: 100x the hours is less than 2x the weight', () => {
  const cat = [G(1, 'a'), G(2, 'a')], model = buildIdf(cat);
  const one = buildPreference([{appid: 1, minutes: 100 * 60}], cat, model).get('a');
  const big = buildPreference([{appid: 2, minutes: 10000 * 60}], cat, model).get('a');
  assert.ok(big / one < 2.1 && big > one);
  assert.equal(buildPreference([{appid: 1, minutes: 0}], cat, model).get('a'), 0);
});

test('Library games without tags are ignored, not counted as zeros', () => {
  const cat = [G(1, 'a'), {appid: 2, facets: {mechanics: [], conditions: [], presentation: []}}], model = buildIdf(cat);
  const p = buildPreference([{appid: 1, minutes: 600}, {appid: 2, minutes: 99999}, {appid: 3, minutes: 99999}], cat, model);
  assert.deepEqual([...p.keys()], ['a']);
});

test('Cosine: identical signature = 1, disjoint = 0, unknown = null (never a low score)', () => {
  const cat = [G(1, 'a', 'b'), G(2, 'c')], model = buildIdf(cat);
  const pref = buildPreference([{appid: 1, minutes: 600}], cat, model);
  assert.ok(Math.abs(shadowScore(G(9, 'a', 'b'), pref, model) - 1) < 1e-3);
  assert.equal(shadowScore(G(9, 'c'), pref, model), 0);
  assert.equal(shadowScore(G(9), pref, model), null);
  assert.equal(shadowScore(G(9, 'a'), new Map(), model), null);
  const mid = shadowScore(G(9, 'a', 'c'), pref, model);
  assert.ok(mid > 0 && mid < 1);
});

test('Prototype-like tag names and frozen inputs are handled safely', () => {
  const cat = Object.freeze([G(1, '__proto__', 'constructor', 'a')]);
  const model = buildIdf(cat);
  const lib = Object.freeze([Object.freeze({appid: 1, minutes: 600})]);
  const pref = buildPreference(lib, cat, model);
  const s = shadowScore(G(9, '__proto__', 'toString', 'a'), pref, model);
  assert.ok(Number.isFinite(s));
  assert.deepEqual(tagsOf({facets: {mechanics: ['x', 7, null, '']}}), ['x']);
});

test('withShadow adds scores without changing games, order or primary fields', () => {
  const cat = [G(1, 'a'), G(2, 'b')];
  const shown = [{appid: 10, score: 5, facets: cat[0].facets}, {appid: 11, score: 4, facets: cat[1].facets}];
  const before = JSON.stringify(shown);
  const r = withShadow(shown, shown, [{appid: 1, minutes: 600}], cat);
  assert.equal(JSON.stringify(shown), before);
  assert.deepEqual(r.games.map(g => g.appid), [10, 11]);
  assert.deepEqual(r.games.map(g => g.score), [5, 4]);
  assert.equal(r.shadow.version, 1);
  assert.ok(Object.hasOwn(r.shadow.scores, 10));
});

test('discoveryOrder never reads shadowScore', () => {
  const mk = (a, b) => [{appid: 1, score: 5, matched: ['x'], discovery: 0.5, shadowScore: a}, {appid: 2, score: 4, matched: ['y'], discovery: 0.5, shadowScore: b}];
  assert.deepEqual(discoveryOrder(mk(0, 1), 2).map(g => g.appid), discoveryOrder(mk(1, 0), 2).map(g => g.appid));
});

test('discover(): shadow scores and raw tags are in the payload; the primary list is unchanged', async () => {
  const answers = {646570: {rating: 'like', reasons: ['build', 'strategy'], taxonomyVersion: 3}};
  const rows = [104, 105, 106, 107].map(id => `<a data-ds-appid="${id}" data-ds-tagids="[32322,9]"><span class="title">Game ${id}</span></a>`).join('');
  const pos = {104: 300, 105: 950, 106: 700, 107: 500};
  const mock = async url => {
    const u = new URL(url);
    if (u.pathname.includes('/appreviews/')) { const id = +u.pathname.split('/').pop(); return Response.json({success: 1, query_summary: {total_reviews: 1000, total_positive: pos[id]}}); }
    if (u.pathname.includes('/search/')) return Response.json({success: 1, results_html: rows});
    const id = +u.searchParams.get('appids');
    return Response.json({[id]: {success: true, data: {type: 'game', name: `Game ${id}`, release_date: {coming_soon: false, date: '2025'}, is_free: true, short_description: 'x'}}});
  };
  const r = await discover({owned: [646570], answers, library: [{appid: 646570, minutes: 6000}]}, mock);
  assert.deepEqual(r.games.map(g => g.appid), [105, 106, 107, 104]);
  for (const g of r.games) { assert.ok(Number.isFinite(g.shadowScore) && g.shadowScore > 0 && g.shadowScore <= 1); assert.ok(g.tagIds.includes(32322)); }
  assert.equal(r.shadow.version, 1);
  assert.equal(Object.keys(r.shadow.scores).length, 4);
  const none = await discover({owned: [], answers}, mock);
  assert.ok(none.games.every(g => g.shadowScore === null));
  assert.deepEqual(none.games.map(g => g.appid), [105, 106, 107, 104]);
});

test('AUC and compareRankers: ties, missing data, determinism, reliability flag', () => {
  assert.equal(auc([3, 4], [1, 2]), 1);
  assert.equal(auc([1], [1]), 0.5);
  assert.equal(auc([], [1]), null);
  const fb = {};
  for (let i = 0; i < 6; i++) fb[i] = {choice: 'interested', prediction: {score: 2 + i * 0.01}, shadowScore: 0.9 - i * 0.01};
  for (let i = 6; i < 14; i++) fb[i] = {choice: 'not_for_me', prediction: {score: 2 + (i - 6) * 0.01}, shadowScore: 0.2 + i * 0.01};
  fb[20] = {choice: 'interested', prediction: {score: 3}, shadowScore: null};
  fb[21] = {choice: 'known', prediction: {score: 3}, shadowScore: 0.5};
  fb[22] = null;
  const a = compareRankers(fb), b = compareRankers(fb);
  assert.equal(a.n, 14); assert.equal(a.nPos, 6); assert.equal(a.nNeg, 8);
  assert.equal(a.shadow, 1); assert.ok(a.primary < 0.7); assert.ok(a.difference > 0.3);
  assert.equal(a.reliable, false);
  assert.deepEqual(a.ci, b.ci);
  assert.equal(compareRankers({}).primary, null);
  assert.equal(compareRankers({}).ci, null);
});

function harness() {
  const source = readFileSync(new URL('./public/app.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').split("document.querySelectorAll('[data-nav]').forEach(b=>b.onclick")[0];
  const storage = new Map(), nodes = new Map();
  const node = s => { if (!nodes.has(s)) nodes.set(s, {innerHTML: '', textContent: '', style: {}, classList: {toggle() {}}, remove() {}, querySelectorAll: () => []}); return nodes.get(s); };
  const document = {querySelector: s => node(s), querySelectorAll: () => [], createElement: () => ({click() {}, setAttribute() {}, style: {}}), body: {prepend() {}}};
  const ctx = vm.createContext({...taxonomy, ...engine, ...signalsMod, ...attractionMod, mergeCatalog, document, Blob, structuredClone,
    URL: {createObjectURL() { return 'blob:t'; }, revokeObjectURL() {}}, setTimeout() {}, confirm: () => true, window: {scrollTo() {}},
    localStorage: {getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v)}});
  vm.runInContext(source, ctx); vm.runInContext('render=()=>{}', ctx);
  return {run: c => vm.runInContext(c, ctx), saved: id => JSON.parse(storage.get('steam-power-v1')).feedback[id]};
}

test('Client stores raw tag ids (valid integers, order kept, max 40) and the shadow score', () => {
  const h = harness();
  const ids = Array.from({length: 45}, (_, i) => i + 1);
  h.run(`shownDiscovery={games:[{appid:5,name:'X',matched:[],features:[],score:3,confidence:'有限',shadowScore:0.4321,tagIds:${JSON.stringify([9, 32322, 1.5, 'x', 7, null])}},{appid:6,name:'Y',matched:[],features:[],score:3,confidence:'有限',tagIds:${JSON.stringify(ids)}},{appid:7,name:'Z',matched:[],features:[],score:3,confidence:'有限'}]}`);
  h.run("candidateFeedback(5,'interested')"); h.run("candidateFeedback(6,'interested')"); h.run("candidateFeedback(7,'interested')");
  assert.deepEqual(h.saved(5).tagIds, [9, 32322, 7]);
  assert.equal(h.saved(5).shadowScore, 0.4321);
  assert.equal(h.saved(6).tagIds.length, 40);
  assert.equal(h.saved(6).shadowScore, null);
  assert.deepEqual(h.saved(7).tagIds, []);
});
