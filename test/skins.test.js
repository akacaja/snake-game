import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adoptQueue, foodName, normalizeSkin, paletteCSS, pickFood, usableEmoji, usableFoods } from '../src/skins.js';

// A fake probe. `broken` = codepoints the "device" cannot draw (drawn black, like a missing-glyph box).
// A codepoint in `split` makes a sequence wider than its first codepoint (the emoji came apart).
function fakeProbe({ broken = [], split = [], plain = [] } = {}) {
  const first = (text) => String.fromCodePoint(text.codePointAt(0));
  return {
    width: (text) => (split.includes(first(text)) && [...text].length > 1 ? [...text].length * 10 : 10),
    pixels: (text) => {
      const missing = [...text].some((c) => broken.includes(c)) && !plain.includes(text);
      return missing ? [0, 0, 0, 255, 0, 0, 0, 0] : [0, 0, 0, 0, 200, 40, 10, 255];
    },
  };
}
const all = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));

test('pickFood never repeats the previous index and is uniform', () => {
  for (const previous of [-1, 0, 3, 6]) {
    const seen = new Set();
    for (let k = 0; k < 7; k += 1) {
      const index = pickFood(7, previous, () => k / 7 + 0.01);
      assert.ok(index >= 0 && index < 7);
      if (previous >= 0) assert.notEqual(index, previous);
      seen.add(index);
    }
    assert.equal(seen.size, previous < 0 ? 7 : 6, `previous ${previous}`);
  }
  assert.equal(pickFood(1, 0), 0);
  assert.equal(pickFood(1, -1), 0);
  assert.equal(pickFood(0, -1), 0);
  assert.equal(pickFood(5, 2, () => 0.999999), 4);
  assert.equal(pickFood(5, 4, () => 0.999999), 3);
});

test('pickFood: a run of picks never repeats', () => {
  let previous = -1;
  for (let k = 0; k < 200; k += 1) {
    const index = pickFood(4, previous);
    assert.notEqual(index, previous);
    previous = index;
  }
});

test('usableEmoji: a drawable emoji passes, a missing glyph (black box) does not', () => {
  assert.equal(usableEmoji('🎁', fakeProbe()), '🎁');
  assert.equal(usableEmoji('\u{10FFFD}', fakeProbe({ broken: ['\u{10FFFD}'] })), null);
});

test('usableEmoji: a sequence that came apart (wider than its first codepoint) is refused', () => {
  const probe = fakeProbe({ split: ['👯'] });
  assert.equal(usableEmoji('👯‍♂️', probe), null);
});

test('usableEmoji: without skin tone is the fallback; a white emoji is accepted', () => {
  const tone = '🎅🏼';
  // The version with the tone does not show (the tone codepoint is missing); the plain one does.
  const probe = fakeProbe({ broken: ['\u{1F3FC}'] });
  assert.equal(usableEmoji(tone, probe), '🎅');
  // Both versions fail: null.
  assert.equal(usableEmoji(tone, fakeProbe({ broken: ['\u{1F3FC}', '🎅'] })), null);
  // White glyph (like a skull): channels above the limit count as their own color.
  const white = { width: () => 10, pixels: () => [255, 255, 255, 255] };
  assert.equal(usableEmoji('💀', white), '💀');
});

test('usableFoods keeps order and names, swaps the emoji, drops what fails, and caches', () => {
  const foods = [
    { emoji: '🎁', names: { en: 'gift' } },
    { emoji: '\u{10FFFD}', names: { en: 'ghost' } },
    { emoji: '🎅🏼', names: { en: 'santa' } },
  ];
  const probe = fakeProbe({ broken: ['\u{10FFFD}', '\u{1F3FC}'] });
  let calls = 0;
  const counting = { width: (t) => { calls += 1; return probe.width(t); }, pixels: probe.pixels };
  const cache = new Map();
  const list = usableFoods(foods, counting, cache);
  assert.deepEqual(list.map((f) => f.emoji), ['🎁', '🎅']);
  assert.deepEqual(list.map((f) => f.names.en), ['gift', 'santa']);
  const before = calls;
  assert.equal(usableFoods(foods, counting, cache).length, 2);
  assert.equal(calls, before, 'the second run uses the cache');
  assert.deepEqual(usableFoods([foods[1]], probe, new Map()), []);
});

test('normalizeSkin: refuses a food without a name, ignores a key that is not a color or a value with ;', () => {
  const warnings = [];
  const warn = (m) => warnings.push(m);
  const colors = ['color', 'background'];
  const skin = normalizeSkin({
    foods: [
      { emoji: '🎁', names: { en: 'gift' } },
      { emoji: '🎄', names: {} },
      { emoji: '', names: { en: 'x' } },
      { names: { en: 'y' } },
      null,
    ],
    palette: { color: '#112233', 'grid-dot-size': '8px', background: 'red; color: blue', 'food-color': '#fff' },
  }, colors, warn);
  assert.deepEqual(skin.foods.map((f) => f.emoji), ['🎁']);
  assert.deepEqual(skin.palette, { color: '#112233' });
  assert.equal(warnings.length, 4 + 1 + 1 + 1);
  for (const bad of ['a{b}', 'x<y', 'x>y', 'a;b']) {
    assert.deepEqual(normalizeSkin({ palette: { color: bad } }, colors, warn).palette, {}, bad);
  }
  assert.equal(normalizeSkin(null, colors, warn), null);
  assert.equal(normalizeSkin('natal', colors, warn), null);
  assert.deepEqual(normalizeSkin({}, colors, warn), { foods: [], palette: {} });
});

test('foodName: language, then en, then any', () => {
  const food = { names: { en: 'gift', pt: 'presente' } };
  assert.equal(foodName(food, 'pt-BR'), 'presente');
  assert.equal(foodName(food, 'pt'), 'presente');
  assert.equal(foodName(food, 'en'), 'gift');
  assert.equal(foodName(food, 'fr'), 'gift');
  assert.equal(foodName({ names: { es: 'regalo' } }, 'en'), 'regalo');
});

test('paletteCSS: empty without a palette, otherwise one :host rule with the --_skin-* layer', () => {
  assert.equal(paletteCSS(null), '');
  assert.equal(paletteCSS({}), '');
  assert.equal(paletteCSS({ color: '#123456', background: '#fff' }), ':host{--_skin-color:#123456;--_skin-background:#fff}');
});

test('adoptQueue: registers what was queued and what arrives later', () => {
  const seen = [];
  const target = { snakeGameSkins: [['a', 1], ['b', 2]] };
  adoptQueue(target, (name, skin) => seen.push([name, skin]));
  assert.deepEqual(seen, [['a', 1], ['b', 2]]);
  target.snakeGameSkins.push(['c', 3]);
  assert.deepEqual(seen.at(-1), ['c', 3]);
  const empty = {};
  adoptQueue(empty, (name) => seen.push(name));
  empty.snakeGameSkins.push(['d', 4]);
  assert.equal(seen.at(-1), 'd');
  // A second copy of the game on the page leaves the first one's queue alone.
  const queue = target.snakeGameSkins;
  adoptQueue(target, () => assert.fail('should not run'));
  assert.equal(target.snakeGameSkins, queue);
  assert.equal(all(1, () => 0).length, 1);
});

test('normalizeSkin never throws: foods that is not a list, a palette that is not an object', () => {
  const warnings = [];
  const warn = (m) => warnings.push(m);
  for (const foods of [{}, 'ab', 5, null, true]) {
    assert.deepEqual(normalizeSkin({ foods }, ['color'], warn).foods, [], String(foods));
  }
  for (const palette of ['text', 5, ['color'], true]) {
    const before = warnings.length;
    assert.deepEqual(normalizeSkin({ palette }, ['color'], warn).palette, {}, String(palette));
    assert.equal(warnings.length, before + 1, `${palette} warns`);
  }
  assert.deepEqual(normalizeSkin({ palette: null }, ['color'], warn).palette, {});
  assert.deepEqual(normalizeSkin({ foods: [{ emoji: 'a', names: 'ab' }] }, ['color'], warn).foods, []);
});

test('normalizeSkin refuses values that could break out of the CSS', () => {
  const warn = () => {};
  for (const bad of ['red /* x', 'a */ b', 'url(http://x)', 'URL(x)', 'a\\b', 'a;b', 'a{b', 'a}b', '<b', 'b>']) {
    assert.deepEqual(normalizeSkin({ palette: { color: bad } }, ['color'], warn).palette, {}, bad);
  }
  assert.deepEqual(normalizeSkin({ palette: { color: 'rgb(1 2 3 / 0.5)' } }, ['color'], warn).palette, { color: 'rgb(1 2 3 / 0.5)' });
});

test('normalizeSkin asks the browser (CSS.supports) when it exists', () => {
  globalThis.CSS = { supports: (prop, value) => value !== 'not-a-color' };
  try {
    const palette = normalizeSkin({ palette: { color: 'not-a-color', background: '#fff' } }, ['color', 'background'], () => {}).palette;
    assert.deepEqual(palette, { background: '#fff' });
  } finally {
    delete globalThis.CSS;
  }
});

test('adoptQueue: another queue name and word (addons), and the skin queue is left alone', () => {
  const seen = [];
  const warnings = [];
  const target = { snakeGameAddons: [['leaderboard', 1], 'bad'], snakeGameSkins: [['natal', 2]] };
  adoptQueue(target, (name, fn) => seen.push([name, fn]), (m) => warnings.push(m), 'snakeGameAddons', 'addon');
  assert.deepEqual(seen, [['leaderboard', 1]]);
  assert.deepEqual(warnings, ['an addon in the queue must be [name, addon]. Skipped.']);
  target.snakeGameAddons.push(['later', 3]);
  assert.deepEqual(seen.at(-1), ['later', 3]);
  assert.equal(target.snakeGameSkins.length, 1);
});

test('adoptQueue: a bad item warns and the next ones still register', () => {
  const seen = [];
  const warnings = [];
  const target = { snakeGameSkins: [null, 'x', 5, ['boom', 1], ['ok', { a: 1 }]] };
  adoptQueue(target, (name, skin) => {
    if (name === 'boom') throw new Error('boom');
    seen.push([name, skin]);
  }, (m) => warnings.push(m));
  assert.deepEqual(seen, [['ok', { a: 1 }]]);
  assert.equal(warnings.length, 4);
  target.snakeGameSkins.push(null, ['later', 1]);
  assert.deepEqual(seen.at(-1), ['later', 1]);
});
