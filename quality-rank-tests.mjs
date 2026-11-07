import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateReviews,wilsonLowerBound,QUALITY_BASE} from './lib/review-policy.mjs';
import {discoveryOrder} from './public/signals.js';
import {discover} from './lib/discovery.mjs';

test('Wilson lower bound discounts small samples and is monotonic', () => {
  assert.ok(Math.abs(wilsonLowerBound(20, 20) - 0.8389) < 0.001);
  assert.ok(wilsonLowerBound(1000, 1000) > wilsonLowerBound(20, 20));
  assert.ok(wilsonLowerBound(95, 100) > wilsonLowerBound(90, 100));
  assert.ok(wilsonLowerBound(190, 200) > wilsonLowerBound(19, 20));
  assert.equal(wilsonLowerBound(0, 0), 0);
  assert.equal(wilsonLowerBound(5, 4), 0);
  assert.equal(wilsonLowerBound(-1, 10), 0);
});

test('Quality factor exists only for eligible candidates and stays within [QUALITY_BASE, 1]', () => {
  const low = evaluateReviews({ total_reviews: 20, total_positive: 4 });
  assert.equal(low.eligible, true);
  assert.equal(low.positiveRate, 0.2);
  assert.ok(low.qualityFactor >= QUALITY_BASE && low.qualityFactor < 0.6);
  const high = evaluateReviews({ total_reviews: 5000, total_positive: 4800 });
  assert.ok(high.qualityFactor > 0.95 && high.qualityFactor <= 1);
  for (const s of [{ total_reviews: 19, total_positive: 19 }, { total_reviews: 20, total_positive: 3 }, null, { total_reviews: 20 }]) {
    const r = evaluateReviews(s);
    assert.equal(r.eligible, false);
    assert.equal(r.qualityFactor, null);
    assert.equal(r.quality, null);
  }
});

test('Eligibility floors are unchanged by the quality extension', () => {
  assert.equal(evaluateReviews({ total_reviews: 20, total_positive: 4 }).eligible, true);
  assert.equal(evaluateReviews({ total_reviews: 20, total_positive: 3 }).eligible, false);
  assert.equal(evaluateReviews({ total_reviews: 19, total_positive: 19 }).eligible, false);
  assert.equal(evaluateReviews({ total_reviews: 100, total_positive: 19 }).eligible, false);
});

test('Equal fit: higher review quality ranks first', () => {
  const gs = [
    { appid: 1, score: 5, matched: ['a'], discovery: 0.5, qualityFactor: 0.6 },
    { appid: 2, score: 5, matched: ['b'], discovery: 0.5, qualityFactor: 0.97 },
    { appid: 3, score: 5, matched: ['c'], discovery: 0.5, qualityFactor: 0.8 },
  ];
  assert.deepEqual(discoveryOrder(gs, 3).map(g => g.appid), [2, 3, 1]);
});

test('Quality cannot overturn a fit gap above 2x, but can reorder comparable fits', () => {
  const worst = evaluateReviews({ total_reviews: 20, total_positive: 4 }).qualityFactor;
  const best = evaluateReviews({ total_reviews: 100000, total_positive: 99000 }).qualityFactor;
  const far = [{ appid: 1, score: 8.5, matched: ['a'], discovery: 0, qualityFactor: worst }, { appid: 2, score: 4, matched: ['b'], discovery: 0, qualityFactor: best }];
  assert.equal(discoveryOrder(far, 2)[0].appid, 1);
  const near = [{ appid: 1, score: 6, matched: ['a'], discovery: 0, qualityFactor: worst }, { appid: 2, score: 5, matched: ['b'], discovery: 0, qualityFactor: best }];
  assert.equal(discoveryOrder(near, 2)[0].appid, 2);
});

test('Missing or invalid factor keeps legacy ordering', () => {
  const gs = [{ appid: 1, score: 3, matched: ['a'], discovery: 0 }, { appid: 2, score: 2, matched: ['b'], discovery: 0, qualityFactor: NaN }, { appid: 3, score: 1, matched: ['c'], discovery: 0, qualityFactor: undefined }];
  assert.deepEqual(discoveryOrder(gs, 3).map(g => g.appid), [1, 2, 3]);
});

test('discover(): identical fit, review quality decides the order and is exposed in the payload', async () => {
  const answers = { 646570: { rating: 'like', reasons: ['build', 'strategy'], taxonomyVersion: 3 } };
  const rows = [104, 105, 106, 107].map(id => `<a data-ds-appid="${id}" data-ds-tagids="[32322,9]"><span class="title">Game ${id}</span></a>`).join('');
  const pos = { 104: 300, 105: 950, 106: 700, 107: 500 };
  const mock = async url => {
    const u = new URL(url);
    if (u.pathname.includes('/GetAppReviews/')) { const id = +JSON.parse(u.searchParams.get('input_json')).appid; return Response.json({ response:{query_summary:{ total_reviews: 1000, total_positive: pos[id] }} }); }
    if (u.pathname.includes('/search/')) return Response.json({ success: 1, results_html: rows });
    const id = +u.searchParams.get('appids');
    return Response.json({ [id]: { success: true, data: { type: 'game', name: `Game ${id}`, release_date: { coming_soon: false, date: '2025' }, is_free: true, short_description: 'x' } } });
  };
  const r = await discover({ owned: [], answers }, mock);
  assert.deepEqual(r.games.map(g => g.appid), [105, 106, 107, 104]);
  assert.ok(r.games.every(g => g.positiveRate > 0 && g.qualityFactor >= 0.5 && g.qualityFactor <= 1));
  assert.ok(r.games[0].qualityFactor > r.games[3].qualityFactor);
});
