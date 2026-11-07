import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as taxonomy from './public/taxonomy.js';
import * as engine from './public/engine.js';
import * as signalsMod from './public/signals.js';
import * as attractionMod from './public/attraction.js';
import {mergeCatalog} from './public/metadata.js';
import {channelStats} from './public/channel-stats.js';
import {tierQueries, makePlan, discover} from './lib/discovery.mjs';
import cat from './public/catalog.json' with {type: 'json'};

const answers = {646570: {rating: 'like', reasons: ['build', 'strategy'], taxonomyVersion: 3}};

test('Every planned query names the channel it belongs to', () => {
  const plan = makePlan(answers, [], 6, {}, cat);
  const qs = tierQueries(plan, {});
  assert.ok(qs.length >= 3);
  for (const q of qs) assert.match(q.channel, /^[a-z]{2,20}$/);
  assert.deepEqual([...new Set(qs.map(q => q.channel))].sort(), plan.choices.map(c => c.feature).sort());
});

test('discover(): candidates carry tier:channel sources; behavior of the list is unchanged', async () => {
  const rows = [104, 105].map(id => `<a data-ds-appid="${id}" data-ds-tagids="[32322,9]"><span class="title">Game ${id}</span></a>`).join('');
  const mock = async url => {
    const u = new URL(url);
    if (u.pathname.includes('/appreviews/')) return Response.json({success: 1, query_summary: {total_reviews: 1000, total_positive: 900}});
    if (u.pathname.includes('/search/')) return Response.json({success: 1, results_html: rows});
    const id = +u.searchParams.get('appids');
    return Response.json({[id]: {success: true, data: {type: 'game', name: `Game ${id}`, release_date: {coming_soon: false, date: '2025'}, is_free: true, short_description: 'x'}}});
  };
  const r = await discover({owned: [], answers}, mock);
  assert.ok(r.games.length >= 2);
  for (const g of r.games) {
    assert.ok(Array.isArray(g.sources) && g.sources.length > 0);
    assert.ok(g.sources.every(s => /^(broad|extended|deep):[a-z]{2,20}$/.test(s)));
    assert.ok(g.sources.some(s => s.startsWith('broad:')));
  }
});

test('channelStats aggregates acceptance per channel and tier, and tolerates old or malformed feedback', () => {
  const fb = {
    1: {choice: 'interested', sources: ['broad:build', 'extended:build', 'extended:strategy']},
    2: {choice: 'not_for_me', reason: 'saturated', sources: ['broad:build']},
    3: {choice: 'not_for_me', reason: 'style', sources: ['deep:strategy']},
    4: {choice: 'known', sources: ['broad:strategy']},
    5: {choice: 'not_for_me'},
    6: {choice: 'bogus', sources: ['broad:build']},
    7: null,
    8: {choice: 'interested', sources: ['__proto__:x', 42, 'broad:BUILD']},
  };
  const s = channelStats(fb);
  assert.equal(s.total.judged, 6);
  assert.equal(s.byChannel.build.judged, 2);
  assert.equal(s.byChannel.build.interested, 1);
  assert.equal(s.byChannel.build.saturated, 1);
  assert.equal(s.byChannel.build.rate, 0.5);
  assert.equal(s.byChannel.strategy.judged, 3);
  assert.equal(s.byChannel.unknown.judged, 2);
  assert.equal(s.byTier.broad.judged, 3);
  assert.equal(s.byTier.extended.interested, 1);
  assert.deepEqual(channelStats({}).total, {judged: 0, interested: 0, notForMe: 0, known: 0, saturated: 0, rate: null});
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

test('Client records sources and list position with each feedback; junk sources are dropped', () => {
  const h = harness();
  h.run(`shownDiscovery={games:[{appid:4,name:'A',matched:[],features:[],score:3,confidence:'有限'},{appid:5,name:'B',matched:['build'],features:['build'],score:3,confidence:'有限',sources:['broad:build','deep:build','x','__proto__:y',7]}]}`);
  h.run("candidateFeedback(5,'interested')");
  assert.deepEqual(h.saved(5).sources, ['broad:build', 'deep:build']);
  assert.equal(h.saved(5).rank, 1);
  h.run("candidateFeedback(4,'interested')");
  assert.deepEqual(h.saved(4).sources, []);
  assert.equal(h.saved(4).rank, 0);
});

test('An AND query is attributed to every channel whose tag it requires, not only the first', () => {
  const plan = makePlan(answers, [], 6, {}, cat);
  assert.ok(plan.choices.length >= 2);
  const qs = tierQueries(plan, {});
  const byFeature = Object.fromEntries(plan.choices.map(c => [c.feature, c.id]));
  for (const q of qs) {
    assert.ok(Array.isArray(q.channels) && q.channels.length >= 1);
    assert.equal(q.channels[0], q.channel);
    for (const ch of q.channels) assert.ok(q.tags.includes(byFeature[ch]), `${q.tier}:${ch} must be required by tags ${q.tags}`);
    for (const t of q.tags) {
      const owner = plan.choices.find(c => c.id === t);
      if (owner) assert.ok(q.channels.includes(owner.feature), `tag ${t} (${owner.feature}) must be attributed`);
    }
  }
  const ext = qs.filter(q => q.tier === 'extended');
  assert.ok(ext.some(q => q.channels.length === 2));
});

test('discover(): a candidate found by a pair query carries both channels as sources', async () => {
  const rows = `<a data-ds-appid="104" data-ds-tagids="[32322,9]"><span class="title">Game 104</span></a>`;
  const mock = async url => {
    const u = new URL(url);
    if (u.pathname.includes('/appreviews/')) return Response.json({success: 1, query_summary: {total_reviews: 1000, total_positive: 900}});
    if (u.pathname.includes('/search/')) return Response.json({success: 1, results_html: rows});
    const id = +u.searchParams.get('appids');
    return Response.json({[id]: {success: true, data: {type: 'game', name: `Game ${id}`, release_date: {coming_soon: false, date: '2025'}, is_free: true, short_description: 'x'}}});
  };
  const plan = makePlan(answers, [], 6, {}, cat);
  const pair = tierQueries(plan, {}).find(q => q.tier === 'extended' && q.channels.length === 2);
  const r = await discover({owned: [], answers}, mock);
  for (const ch of pair.channels) assert.ok(r.games[0].sources.includes(`extended:${ch}`), `missing extended:${ch}`);
});

test('channelStats declares its denominator: judged candidates only', () => {
  const s = channelStats({1: {choice: 'interested', sources: ['broad:build']}});
  assert.equal(s.basis, 'judged-only');
  assert.equal(s.total.judged, 1);
  assert.equal(Object.hasOwn(s.total, 'shown'), false);
});
