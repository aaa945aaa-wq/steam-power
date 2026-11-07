import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as taxonomy from './public/taxonomy.js';
import * as engine from './public/engine.js';
import * as signalsMod from './public/signals.js';
import * as attractionMod from './public/attraction.js';
import {mergeCatalog} from './public/metadata.js';
import {signals} from './public/signals.js';
import {attraction} from './public/attraction.js';
import {validateInput} from './lib/discovery.mjs';
import cat from './public/catalog.json' with {type: 'json'};

const rej = (reason, extra = {}) => ({choice: 'not_for_me', reason, features: ['build', 'action'], presentation: ['pixel'], ...extra});
const answers = {200710: {rating: 'like', reasons: ['build', 'strategy'], taxonomyVersion: 3}};
const lib = [{appid: 200710, minutes: 600}];
const W = fb => signals(answers, cat, lib, 6, fb).weights;

test('Content rejection with a chosen aspect adjusts only that mechanic', () => {
  const base = W({});
  const w = W({1: rej('content', {aspect: 'action'})});
  assert.ok(Math.abs(w.action - ((base.action || 0) - 0.18)) < 1e-9);
  assert.equal(w.build, base.build);
});

test('Content rejection without an aspect keeps the previous behavior (all matched features)', () => {
  const base = W({}), w = W({1: rej('content')});
  assert.ok(Math.abs(w.build - (base.build - 0.18)) < 1e-9);
  assert.ok(Math.abs(w.action - ((base.action || 0) - 0.18)) < 1e-9);
});

test('price, era, saturated, other, skip and no-reason rejections never change mechanics', () => {
  const base = W({});
  for (const reason of ['price', 'era', 'saturated', 'other', 'skip', undefined]) {
    assert.deepEqual(W({1: rej(reason, {aspect: 'action'})}), base);
  }
});

test('Aspect only matters together with reason=content', () => {
  assert.deepEqual(W({1: rej('style', {aspect: 'action'})}), W({}));
});

test('validateInput accepts saturated, keeps only known aspects, and is prototype-safe', () => {
  const base = {owned: [], answers: {1: {rating: 'like', reasons: [], taxonomyVersion: 3}}};
  const f = validateInput({...base, feedback: {
    1: {choice: 'not_for_me', reason: 'saturated', features: ['build']},
    2: {choice: 'not_for_me', reason: 'content', aspect: 'action', features: ['build']},
    3: {choice: 'not_for_me', reason: 'content', aspect: 'constructor', features: ['build']},
    4: {choice: 'not_for_me', reason: 'content', aspect: '__proto__', features: ['build']},
    5: {choice: 'not_for_me', reason: 'content', aspect: 7, features: ['build']},
    6: {choice: 'not_for_me', reason: 'style', features: ['build'], presentation: ['__proto__', 'constructor', 'toString', 'pixel']},
  }}).feedback;
  assert.equal(f[1].reason, 'saturated');
  assert.equal(f[2].aspect, 'action');
  for (const id of [1, 3, 4, 5]) assert.equal(f[id].aspect, null);
  assert.deepEqual(f[6].presentation, ['pixel']);
});

test('Unfiltered prototype keys cannot crash the preference model', () => {
  assert.doesNotThrow(() => attraction({}, cat, [], {1: {choice: 'not_for_me', reason: 'style', presentation: ['__proto__', 'constructor', 'pixel']}}));
  assert.doesNotThrow(() => W({1: rej('content', {aspect: '__proto__'}), 2: rej('content', {aspect: 'constructor'})}));
});

function harness() {
  const source = readFileSync(new URL('./public/app.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').split("document.querySelectorAll('[data-nav]').forEach(b=>b.onclick")[0];
  const storage = new Map(), nodes = new Map(), items = {};
  const node = s => {
    if (!nodes.has(s)) {
      const n = {innerHTML: '', textContent: '', style: {}, classList: {toggle() {}}, remove() {}};
      n.querySelectorAll = sel => { const attr = sel.match(/data-(\w+)/)[1]; items[attr] = [...n.innerHTML.matchAll(new RegExp(`<button data-${attr}="([^"]*)"`, 'g'))].map(m => ({dataset: {[attr]: m[1]}})); return items[attr]; };
      nodes.set(s, n);
    }
    return nodes.get(s);
  };
  const document = {querySelector: s => node(s), querySelectorAll: () => [], createElement: () => ({click() {}, setAttribute() {}, style: {}}), body: {prepend() {}}};
  const ctx = vm.createContext({...taxonomy, ...engine, ...signalsMod, ...attractionMod, mergeCatalog, document, Blob, structuredClone,
    URL: {createObjectURL() { return 'blob:t'; }, revokeObjectURL() {}}, setTimeout() {}, confirm: () => true, window: {scrollTo() {}},
    localStorage: {getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v)}});
  vm.runInContext(source, ctx); vm.runInContext('render=()=>{}', ctx);
  const saved = id => JSON.parse(storage.get('steam-power-v1')).feedback[id];
  const click = (attr, value) => items[attr].find(x => x.dataset[attr] === value).onclick();
  return {run: c => vm.runInContext(c, ctx), node, saved, click, box: id => node(`[data-feedback-box="${id}"]`), items};
}
const show = (h, g) => h.run(`shownDiscovery={games:[${JSON.stringify(g)}]}`);

test('Every rejected candidate is asked why, including low-confidence ones, with the approved options', () => {
  const h = harness();
  show(h, {appid: 5, name: 'X', matched: ['build'], features: ['build'], score: 3, confidence: '有限', release: '2024', price: 'NT$ 300'});
  h.run("candidateFeedback(5,'not_for_me')");
  const html = h.box(5).innerHTML;
  for (const label of ['玩法／系統', '美術／題材', '價格', '年代／畫面老舊', '同類型玩太多了', '其他', '略過']) assert.ok(html.includes(label), label);
  const none = harness();
  show(none, {appid: 5, name: 'X', matched: ['build'], features: ['build'], score: 3, confidence: '有限'});
  none.run("candidateFeedback(5,'interested')");
  assert.ok(!none.box(5).innerHTML.includes('哪裡不合'));
});

test('Price records the displayed price; era records the release year; neither claims to affect recommendations', () => {
  const h = harness();
  show(h, {appid: 5, name: 'X', matched: ['build'], features: ['build'], score: 3, confidence: '有限', release: 'Nov 6, 2024', price: 'NT$ 1,490'});
  h.run("candidateFeedback(5,'not_for_me')"); h.click('follow', 'price');
  assert.equal(h.saved(5).reason, 'price'); assert.equal(h.saved(5).price, 'NT$ 1,490');
  assert.match(h.box(5).innerHTML, /價格不影響玩法偏好/);
  h.run("candidateFeedback(5,'not_for_me')"); h.click('follow', 'era');
  assert.equal(h.saved(5).reason, 'era'); assert.equal(h.saved(5).releaseYear, 2024);
  assert.match(h.box(5).innerHTML, /尚未用於推薦/);
});

test('Release dates without a year record no year (nothing invented)', () => {
  const h = harness();
  show(h, {appid: 5, name: 'X', matched: [], features: [], score: 3, confidence: '有限', release: '未提供'});
  h.run("candidateFeedback(5,'not_for_me')"); h.click('follow', 'era');
  assert.equal(h.saved(5).releaseYear, undefined);
});

test('Saturated, other and skip are stored as chosen', () => {
  for (const reason of ['saturated', 'other', 'skip']) {
    const h = harness();
    show(h, {appid: 5, name: 'X', matched: ['build'], features: ['build'], score: 3, confidence: '有限'});
    h.run("candidateFeedback(5,'not_for_me')"); h.click('follow', reason);
    assert.equal(h.saved(5).reason, reason);
    assert.equal(h.saved(5).aspect, undefined);
  }
});

test('Content asks which mechanic, offering only this candidate\'s own mechanics, and stores the choice', () => {
  const h = harness();
  show(h, {appid: 5, name: 'X', matched: ['build'], features: ['build', 'action', 'bogus', 'constructor'], score: 3, confidence: '有限'});
  h.run("candidateFeedback(5,'not_for_me')"); h.click('follow', 'content');
  const html = h.box(5).innerHTML;
  assert.match(html, /是哪一部分不合/);
  assert.ok(html.includes('data-aspect="build"') && html.includes('data-aspect="action"'));
  assert.ok(!html.includes('bogus') && !html.includes('constructor'));
  assert.ok(html.includes('data-aspect=""'));
  h.click('aspect', 'action');
  assert.equal(h.saved(5).reason, 'content'); assert.equal(h.saved(5).aspect, 'action');
  assert.match(h.box(5).innerHTML, /只會調整「即時操作」/);
});

test('"說不準" leaves the aspect unset; candidates with no known mechanics skip the picker', () => {
  const h = harness();
  show(h, {appid: 5, name: 'X', matched: ['build'], features: ['build'], score: 3, confidence: '有限'});
  h.run("candidateFeedback(5,'not_for_me')"); h.click('follow', 'content'); h.click('aspect', '');
  assert.equal(h.saved(5).reason, 'content'); assert.equal(h.saved(5).aspect, undefined);
  const g = harness();
  show(g, {appid: 6, name: 'Y', matched: [], features: [], score: 3, confidence: '有限'});
  g.run("candidateFeedback(6,'not_for_me')"); g.click('follow', 'content');
  assert.equal(g.saved(6).reason, 'content');
  assert.ok(!g.box(6).innerHTML.includes('是哪一部分不合'));
});
