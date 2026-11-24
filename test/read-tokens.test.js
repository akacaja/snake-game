import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDuration, parsePercent, toCamel } from '../src/read-tokens.js';
import { readFileSync } from 'node:fs';
import { TOKEN_DEFS, TAIL_RATIO, themeCSS } from '../src/theme.js';
import { emojiSize } from '../src/geometry.js';

test('toCamel converts token names', () => {
  assert.equal(toCamel('food-halo-size'), 'foodHaloSize');
  assert.equal(toCamel('spacing'), 'spacing');
});

test('parseDuration returns milliseconds', () => {
  assert.equal(parseDuration('180ms'), 180);
  assert.equal(parseDuration('0.9s'), 900);
  assert.equal(parseDuration('0.18s, 1s'), 180);
  assert.equal(parseDuration(''), 0);
});

test('every token is declared in the theme CSS with a comment', () => {
  for (const t of TOKEN_DEFS) {
    const fallback = t.kind === 'color' ? `var(--_skin-${t.name}, ${t.value})` : t.value;
    assert.ok(themeCSS.includes(`--_${t.name}: var(--snake-${t.name}, ${fallback});`), t.name);
    assert.ok(t.doc && t.doc.length > 5, `${t.name} needs a doc`);
  }
});

test('inline mode fills the width of its container', () => {
  assert.match(themeCSS, /:host\(\[mode="inline"\]\)\s*\{[^}]*width:\s*100%/);
});

test('head and tail default to auto; gap is read by a property that accepts negatives', () => {
  const def = (name) => TOKEN_DEFS.find((t) => t.name === name);
  assert.equal(def('head-size').value, 'auto');
  assert.equal(def('tail-size').value, 'auto');
  assert.equal(def('gap').kind, 'signed-length');
  const source = readFileSync(new URL('../src/read-tokens.js', import.meta.url), 'utf8');
  assert.match(source, /signed-length[\s\S]*?marginLeft = ref/);
  assert.equal(TAIL_RATIO, 0.8);
});

test('a phone board keeps a floor even if board-share is invalid', () => {
  assert.match(themeCSS, /var\(--_board-share\); min-width: 50%/);
  assert.match(themeCSS, /var\(--_board-share\); min-height: 50%/);
});

test('only color tokens have the skin layer (--_skin-*), after --snake-* and before the default', () => {
  for (const t of TOKEN_DEFS) {
    const uses = themeCSS.includes(`var(--_skin-${t.name}`);
    assert.equal(uses, t.kind === 'color', `${t.name} (${t.kind})`);
  }
});

test('food-emoji-size is a share of the spacing: 75% by default, an invalid value falls back', () => {
  const def = TOKEN_DEFS.find((t) => t.name === 'food-emoji-size');
  assert.equal(def.kind, 'percentage');
  assert.equal(def.value, '75%');
  assert.equal(parsePercent('75%', def.value), 0.75);
  assert.equal(parsePercent(' 50% ', def.value), 0.5);
  assert.equal(parsePercent('120%', def.value), 1.2);
  for (const bad of ['', 'auto', '-10%', '24px', 'calc(1% + 1%)', '%']) assert.equal(parsePercent(bad, def.value), 0.75, bad);
  assert.equal(emojiSize(32, parsePercent('75%', def.value)), 24);
  assert.equal(emojiSize(40, 0.75), 30);
});

test('highlight-color follows the focus color by default and has the skin layer; field-font-size is 16px', () => {
  const def = (name) => TOKEN_DEFS.find((t) => t.name === name);
  assert.equal(def('highlight-color').kind, 'color');
  assert.equal(def('highlight-color').value, 'var(--_focus-color)');
  assert.ok(themeCSS.includes('--_highlight-color: var(--snake-highlight-color, var(--_skin-highlight-color, var(--_focus-color)));'));
  assert.equal(def('field-font-size').kind, 'length');
  assert.equal(def('field-font-size').value, '16px');
});
