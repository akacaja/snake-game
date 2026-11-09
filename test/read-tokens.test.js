import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDuration, toCamel } from '../src/read-tokens.js';
import { TOKEN_DEFS, themeCSS } from '../src/theme.js';

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
