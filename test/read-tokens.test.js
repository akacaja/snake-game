import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDuration, toCamel } from '../src/read-tokens.js';
import { readFileSync } from 'node:fs';
import { TOKEN_DEFS, TAIL_RATIO, themeCSS } from '../src/theme.js';

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
    assert.ok(themeCSS.includes(`--_${t.name}: var(--snake-${t.name}, ${t.value});`), t.name);
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
