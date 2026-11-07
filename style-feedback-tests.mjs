import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as taxonomy from './public/taxonomy.js';
import * as engine from './public/engine.js';
import * as signalsMod from './public/signals.js';
import * as attractionMod from './public/attraction.js';
import {mergeCatalog} from './public/metadata.js';
import {attraction, STYLE_REJECT} from './public/attraction.js';
import {signals} from './public/signals.js';
import {validateInput, makePlan, assess} from './lib/discovery.mjs';
import cat from './public/catalog.json' with {type: 'json'};

const rej = (presentation, extra = {}) => ({choice: 'not_for_me', reason: 'style', features: ['build'], presentation, ...extra});

test('Style rejection lowers presentation weights, split across the candidate tags', () => {
  const one = attraction({}, cat, [], {1: rej(['pixel'])});
  assert.ok(Math.abs(one.weights.pixel + STYLE_REJECT) < 1e-9);
  const three = attraction({}, cat, [], {1: rej(['pixel', 'cute', 'anime'])});
  for (const t of ['pixel', 'cute', 'anime']) assert.ok(Math.abs(three.weights[t] + STYLE_REJECT / 3) < 1e-9);
  assert.ok(one.evidence.pixel.some(s => s.includes('風格不合')));
});

test('Only not_for_me + style counts; unknown presentation is never treated as neutral evidence', () => {
  const none = attraction({}, cat, [], {});
  for (const f of [
    {choice: 'not_for_me', reason: 'content', presentation: ['pixel']},
    {choice: 'not_for_me', reason: 'price', presentation: ['pixel']},
    {choice: 'not_for_me', reason: 'era', presentation: ['pixel']},
    {choice: 'not_for_me', reason: 'other', presentation: ['pixel']},
    {choice: 'not_for_me', presentation: ['pixel']},
    {choice: 'interested', reason: 'style', presentation: ['pixel']},
    {choice: 'known', reason: 'style', presentation: ['pixel']},
    rej([]), rej(undefined), rej(['not-a-tag', 42, null]),
  ]) assert.deepEqual(attraction({}, cat, [], {1: f}).weights, none.weights);
});

test('Repeated rejections accumulate but stay within the existing -0.6 bound; positive library evidence offsets them', () => {
  const many = Object.fromEntries(Array.from({length: 10}, (_, i) => [i + 1, rej(['pixel'])]));
  assert.equal(attraction({}, cat, [], many).weights.pixel, -0.6);
  const lib = [{appid: 375480, minutes: 600}];
  const base = attraction({}, cat, lib, {}).weights.pixel;
  assert.ok(base > 0);
  assert.ok(Math.abs(attraction({}, cat, lib, {1: rej(['pixel'])}).weights.pixel - (base - STYLE_REJECT)) < 1e-9);
});

test('Style rejection does not generalize to mechanics', () => {
  const lib = [{appid: 200710, minutes: 600}];
  const answers = {200710: {rating: 'like', reasons: ['build'], taxonomyVersion: 3}};
  const a = signals(answers, cat, lib, 6, {});
  const b = signals(answers, cat, lib, 6, {9: rej(['pixel', 'fantasy'], {features: ['build', 'action']})});
  assert.deepEqual(b.weights, a.weights);
  assert.notDeepEqual(b.attraction.weights, a.attraction.weights);
});

test('validateInput keeps valid presentation tags, drops invalid ones, caps at 6, tolerates old exports', () => {
  const base = {owned: [], answers: {1: {rating: 'like', reasons: [], taxonomyVersion: 3}}};
  const out = validateInput({...base, feedback: {
    5: {choice: 'not_for_me', reason: 'style', features: ['build'], presentation: ['pixel', 'pixel', 'bogus', 7, 'cute', 'anime', 'dark', 'horror', 'space', 'fantasy', 'scifi']},
    6: {choice: 'not_for_me', reason: 'style', features: ['build']},
    7: {choice: 'not_for_me', reason: 'style', features: ['build'], presentation: 'pixel'},
  }}).feedback;
  assert.equal(out[5].presentation.length, 6);
  assert.deepEqual(out[5].presentation.slice(0, 3), ['pixel', 'cute', 'anime']);
  assert.ok(out[5].presentation.every(t => typeof t === 'string'));
  assert.deepEqual(out[6].presentation, []);
  assert.deepEqual(out[7].presentation, []);
});

test('End to end: a style-rejected look lowers a later candidate score, within the existing +/-0.18 theme cap', () => {
  const answers = {646570: {rating: 'like', reasons: ['build', 'strategy'], taxonomyVersion: 3}};
  const fb = Object.fromEntries([1, 2, 3, 4].map(i => [i, rej(['pixel'])]));
  const map = {9: 'strategy', 4231: 'build', 500: 'pixel'};
  const withFb = makePlan(answers, [], 6, fb, cat), without = makePlan(answers, [], 6, {}, cat);
  const px = assess({appid: 99, name: 'P', tagIds: [9, 4231, 500]}, withFb, answers, map);
  const plain = assess({appid: 98, name: 'Q', tagIds: [9, 4231]}, withFb, answers, map);
  const pxBefore = assess({appid: 99, name: 'P', tagIds: [9, 4231, 500]}, without, answers, map);
  assert.ok(px.score < pxBefore.score);
  assert.ok(px.score < plain.score);
  assert.ok(pxBefore.score - px.score <= 0.18 + 1e-9);
  assert.equal(px.fit, pxBefore.fit);
});

function harness() {
  const source = readFileSync(new URL('./public/app.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').split("document.querySelectorAll('[data-nav]').forEach(b=>b.onclick")[0];
  const storage = new Map(), nodes = new Map();
  const node = s => { if (!nodes.has(s)) nodes.set(s, {innerHTML: '', textContent: '', style: {}, classList: {toggle() {}}, remove() {}}); return nodes.get(s); };
  const document = {querySelector: s => node(s), querySelectorAll: () => [], createElement: () => ({click() {}, setAttribute() {}, style: {}}), body: {prepend() {}}};
  const ctx = vm.createContext({...taxonomy, ...engine, ...signalsMod, ...attractionMod, mergeCatalog, document, Blob, structuredClone,
    URL: {createObjectURL() { return 'blob:t'; }, revokeObjectURL() {}}, setTimeout() {}, confirm: () => true, window: {scrollTo() {}},
    localStorage: {getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v)}});
  vm.runInContext(source, ctx); vm.runInContext('render=()=>{}', ctx);
  return {run: c => vm.runInContext(c, ctx), node, storage};
}

test('Client records the candidate presentation tags and the chosen style reason', () => {
  const h = harness();
  h.run("shownDiscovery={games:[{appid:5,name:'X',matched:['build','action'],score:3,confidence:'中等',facets:{presentation:['pixel','bogus','cute']}}]}");
  const btn = {dataset: {follow: 'style'}};
  h.node('[data-feedback-box="5"]').querySelectorAll = () => [btn];
  h.run("candidateFeedback(5,'not_for_me')");
  btn.onclick();
  const saved = JSON.parse(h.storage.get('steam-power-v1')).feedback[5];
  assert.equal(saved.choice, 'not_for_me');
  assert.equal(saved.reason, 'style');
  assert.deepEqual(saved.presentation, ['pixel', 'cute']);
  assert.match(h.node('[data-feedback-box="5"]').innerHTML, /風格不合只會調整你的風格偏好/);
});

test('Candidates without facets record an empty presentation list (no invented tags)', () => {
  const h = harness();
  h.run("shownDiscovery={games:[{appid:6,name:'Y',matched:['build'],score:3,confidence:'有限'}]}");
  h.run("candidateFeedback(6,'interested')");
  assert.deepEqual(JSON.parse(h.storage.get('steam-power-v1')).feedback[6].presentation, []);
});
