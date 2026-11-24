import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawFood } from '../src/renderers.js';

// A fake canvas context that records every call and every property that is set.
function fakeCtx() {
  const calls = [];
  const target = { measureText: () => ({ actualBoundingBoxLeft: 2, actualBoundingBoxRight: 22, actualBoundingBoxAscent: 20, actualBoundingBoxDescent: 4 }) };
  return {
    calls,
    ctx: new Proxy(target, {
      get(t, prop) {
        if (prop in t) return (...args) => { calls.push([prop, ...args]); return t[prop](...args); };
        return (...args) => { calls.push([prop, ...args]); };
      },
      set(t, prop, value) { calls.push(['set', prop, value]); return true; },
    }),
  };
}

const tokens = { foodColor: 'C', foodHaloColor: 'H' };
const scene = (foodItem, options = {}) => ({ tokens, options: { food: 'circle', foodHalo: 'soft', ...options }, foodItem, dpr: 2 });
const names = (calls) => calls.map((c) => (c[0] === 'set' ? `set:${c[1]}` : c[0]));

test('drawFood with an emoji draws text, no circle and no glow', () => {
  const { ctx, calls } = fakeCtx();
  drawFood(ctx, scene({ cx: 100, cy: 50, size: 24, haloSize: 24, emoji: '🎁' }));
  const list = names(calls);
  assert.ok(list.includes('fillText'));
  assert.ok(!list.includes('arc'));
  assert.ok(!list.includes('fillRect'));
  assert.ok(!list.includes('set:shadowBlur'));
  assert.ok(!list.includes('set:shadowColor'));
  const font = calls.find((c) => c[0] === 'set' && c[1] === 'font');
  assert.match(font[2], /^24px /);
  // The box is centered on (cx, cy): x = 100 - (22 - 2) / 2, y = 50 + (20 - 4) / 2.
  assert.deepEqual(calls.find((c) => c[0] === 'fillText'), ['fillText', '🎁', 90, 58]);
  assert.equal(list.at(-1), 'restore');
});

test('drawFood without an emoji keeps the same calls as before (circle, with the glow)', () => {
  const { ctx, calls } = fakeCtx();
  drawFood(ctx, scene({ cx: 10, cy: 20, size: 12, haloSize: 24, emoji: null }));
  assert.deepEqual(calls, [
    ['save'],
    ['set', 'shadowColor', 'H'],
    ['set', 'shadowBlur', 48],
    ['set', 'fillStyle', 'C'],
    ['beginPath'],
    ['arc', 10, 20, 6, 0, Math.PI * 2],
    ['fill'],
    ['restore'],
  ]);
});

test('drawFood without an emoji still draws a square, and a size 0 draws nothing', () => {
  const square = fakeCtx();
  drawFood(square.ctx, scene({ cx: 10, cy: 20, size: 12, haloSize: 0, emoji: null }, { food: 'square', foodHalo: 'none' }));
  assert.deepEqual(square.calls.find((c) => c[0] === 'fillRect'), ['fillRect', 4, 14, 12, 12]);
  const none = fakeCtx();
  drawFood(none.ctx, scene({ cx: 0, cy: 0, size: 0, haloSize: 0, emoji: '🎁' }));
  assert.equal(none.calls.length, 0);
});
