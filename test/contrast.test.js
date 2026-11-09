import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrastRatio } from '../demo/contrast.js';

const BLACK = [0, 0, 0];
const WHITE = [255, 255, 255];

test('black on white is 21 and white on white is 1', () => {
  assert.ok(Math.abs(contrastRatio(BLACK, WHITE) - 21) < 1e-9);
  assert.equal(contrastRatio(WHITE, WHITE), 1);
});

test('#777777 on white is just under 4.5, #767676 is at least 4.5', () => {
  const r777 = contrastRatio([0x77, 0x77, 0x77], WHITE);
  assert.ok(r777 > 4.47 && r777 < 4.49, String(r777));
  assert.ok(contrastRatio([0x76, 0x76, 0x76], WHITE) >= 4.5);
});

test('argument order does not matter', () => {
  assert.equal(contrastRatio(BLACK, WHITE), contrastRatio(WHITE, BLACK));
});
