import test from 'node:test';
import assert from 'node:assert/strict';
import {channelStats} from './public/channel-stats.js';
import {signals} from './public/signals.js';
import {attraction} from './public/attraction.js';
import {buildIdf, buildPreference, shadowScore} from './public/shadow-rank.js';
import {validateInput, makePlan} from './lib/discovery.mjs';
import cat from './public/catalog.json' with {type: 'json'};

const HOSTILE = ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf', 'prototype', 'isPrototypeOf'];
const TARGETS = [Object, Object.prototype, Array.prototype, Function.prototype];
const names = () => TARGETS.map(t => Object.getOwnPropertyNames(t));
const BASE = names();
const cleanup = () => names().forEach((ns, i) => { for (const n of ns) if (!BASE[i].includes(n)) try { delete TARGETS[i][n]; } catch {} });
function guarded(label, fn) {
  const before = JSON.stringify(names());
  let out;
  try { out = fn(); } finally {
    const polluted = JSON.stringify(names()) !== before;
    if (polluted) cleanup();
    assert.equal(polluted, false, `${label} mutated a global prototype or constructor`);
  }
  const bad = JSON.stringify(out, (k, v) => typeof v === 'number' && !Number.isFinite(v) ? '__NaN__' : v);
  assert.ok(!bad || !bad.includes('__NaN__'), `${label} produced NaN`);
  return out;
}

test('channelStats counts a channel named "constructor" as an ordinary channel and touches no global', () => {
  const s = guarded('channelStats', () => channelStats({
    1: {choice: 'interested', sources: ['broad:constructor']},
    2: {choice: 'not_for_me', reason: 'saturated', sources: ['extended:constructor', 'broad:build']},
  }));
  assert.equal(s.byChannel.constructor.judged, 2);
  assert.equal(s.byChannel.constructor.interested, 1);
  assert.equal(s.byChannel.constructor.saturated, 1);
  assert.equal(s.byChannel.constructor.rate, 0.5);
  assert.equal(s.byChannel.build.judged, 1);
  assert.equal(Object.getPrototypeOf(s.byChannel), Object.prototype);
  assert.equal(Object.hasOwn(s.byChannel, 'constructor'), true);
  assert.equal(Object.judged, undefined);
  assert.equal(Object.interested, undefined);
});

test('Hostile names in every external field cannot throw, produce NaN or mutate globals', () => {
  const lib = [{appid: 200710, minutes: 600}];
  const ans = {200710: {rating: 'like', reasons: ['build'], taxonomyVersion: 3}};
  for (const k of HOSTILE) {
    const raw = {
      5: {choice: 'not_for_me', reason: 'content', aspect: k, features: [k, 'build'], presentation: [k]},
      6: {choice: 'interested', features: [k], presentation: [k]},
      7: {choice: 'not_for_me', reason: 'style', features: [k], presentation: [k]},
    };
    guarded('signals ' + k, () => signals(ans, cat, lib, 6, raw));
    guarded('attraction ' + k, () => attraction(ans, cat, lib, raw));
    guarded('makePlan(raw) ' + k, () => makePlan(ans, lib, 6, raw, cat));
    const v = guarded('validateInput ' + k, () => validateInput({owned: [200710], answers: ans, library: lib, feedback: raw}));
    guarded('makePlan(validated) ' + k, () => makePlan(v.answers, v.library, v.threshold, v.feedback, cat));
    guarded('channelStats ' + k, () => channelStats({1: {choice: 'interested', sources: ['broad:' + k.toLowerCase(), 'deep:' + k]}}));
    guarded('shadow ' + k, () => {
      const c = [{appid: 1, facets: {mechanics: [k], conditions: [k], presentation: [k]}}];
      const m = buildIdf(c);
      return shadowScore(c[0], buildPreference([{appid: 1, minutes: 60}], c, m), m);
    });
    guarded('validateInput answers ' + k, () => validateInput({owned: [200710], answers: {200710: {rating: 'like', reasons: [k, 'build'], categories: [k], taxonomyVersion: 3}}, library: lib}));
  }
});

test('Feedback features must be real feature names: hostile ones are dropped, real ones kept', () => {
  const ans = {200710: {rating: 'like', reasons: ['build'], taxonomyVersion: 3}};
  const out = validateInput({owned: [200710], answers: ans, library: [{appid: 200710, minutes: 600}], feedback: {
    5: {choice: 'not_for_me', reason: 'content', features: ['toString', 'constructor', '__proto__', 'valueOf', 'build', 'strategy', 'nonsense', 7]},
  }}).feedback;
  assert.deepEqual(out[5].features, ['build', 'strategy']);
  const base = signals(ans, cat, [{appid: 200710, minutes: 600}], 6, {});
  const hostile = signals(ans, cat, [{appid: 200710, minutes: 600}], 6, {5: {choice: 'not_for_me', reason: 'content', features: ['toString', 'constructor']}});
  assert.deepEqual(hostile.weights, base.weights);
});
