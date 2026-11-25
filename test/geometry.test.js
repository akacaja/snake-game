import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dotDiameter, gridSize, resolveSnakeSizes, snakeFit } from '../src/geometry.js';

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not ${b}`);
const base = { headSize: 30, tailSize: 24, gap: 2, scale: 1 };

test('default snake: head 30, tail tip 24, gap 2 between the first dots', () => {
  const k = snakeFit({ fitted: 32, scale: 1, headSize: 30, gap: 2 });
  assert.equal(k, 1);
  const dots = [0, 1, 2, 3].map((index) => dotDiameter({ ...base, index, count: 4, uniform: false, k }));
  near(dots[0], 30);
  near(dots[3], 24);
  // Gap between the edges of the first two dots of a long snake is a little over 2 (the second dot is a bit smaller).
  const long = [0, 1].map((index) => dotDiameter({ ...base, index, count: 20, uniform: false, k }));
  const gap = 32 - (long[0] + long[1]) / 2;
  assert.ok(gap >= 2 && gap < 2.5, `gap ${gap}`);
});

test('uniform snake keeps a gap of exactly 2', () => {
  const d = dotDiameter({ ...base, index: 2, count: 5, uniform: true, k: 1 });
  near(32 - d, 2);
});

test('squeezed grid: head 20 and gap 2 when each cell is 22', () => {
  const scale = 22 / 32;
  const k = snakeFit({ fitted: 22, scale, headSize: 30, gap: 2 });
  const head = dotDiameter({ ...base, index: 0, count: 3, uniform: false, scale, k });
  near(head, 20);
  near(22 - head, 2);
});

test('a fixed head-size of 16 stays 16', () => {
  const k = snakeFit({ fitted: 32, scale: 1, headSize: 16, gap: 2 });
  near(dotDiameter({ headSize: 16, tailSize: 8, gap: 2, scale: 1, index: 0, count: 3, uniform: false, k }), 16);
});

test('a negative gap makes the dots overlap and gap 0 makes them touch', () => {
  const touch = dotDiameter({ ...base, headSize: 32, index: 0, count: 3, uniform: true, k: snakeFit({ fitted: 32, scale: 1, headSize: 32, gap: 0 }) });
  near(32 - touch, 0);
  const k = snakeFit({ fitted: 32, scale: 1, headSize: 34, gap: -2 });
  near(32 - dotDiameter({ ...base, headSize: 34, index: 0, count: 3, uniform: true, k }), -2);
});

test('snakeFit never goes above 1, and its floor is 20% of a cell (0 only with minShare 0)', () => {
  near(snakeFit({ fitted: 1, scale: 1, headSize: 30, gap: 2 }) * 30, 0.2);
  assert.equal(snakeFit({ fitted: 1, scale: 1, headSize: 30, gap: 2, minShare: 0 }), 0);
  assert.equal(snakeFit({ fitted: 100, scale: 1, headSize: 30, gap: 2 }), 1);
});

test('a gap as big as the cell or bigger does not make the snake vanish: the head keeps 20% of a cell', () => {
  const auto = (gap) => resolveSnakeSizes({ spacing: 32, gap, head: null, tail: null, ratio: 0.8 });
  near(auto(40).headSize, 6.4);
  near(auto(40).tailSize, 5.12);
  near(auto(32).headSize, 6.4);
  near(auto(-2).headSize, 34); // a negative gap is not changed
  // squeezed grid: cell 22 on screen, gap 25, head 30 (scale 22/32)
  const scale = 22 / 32;
  const k = snakeFit({ fitted: 22, scale, headSize: 30, gap: 25 });
  near(dotDiameter({ ...base, index: 0, count: 3, uniform: false, scale, k }), 4.4);
  // a fixed head of 16 with gap 40 shrinks to the floor; a fixed head of 4 with gap 2 stays 4
  near(dotDiameter({ headSize: 16, tailSize: 8, scale: 1, index: 0, count: 3, uniform: false, k: snakeFit({ fitted: 32, scale: 1, headSize: 16, gap: 40 }) }), 6.4);
  near(dotDiameter({ headSize: 4, tailSize: 2, scale: 1, index: 0, count: 3, uniform: false, k: snakeFit({ fitted: 32, scale: 1, headSize: 4, gap: 2 }) }), 4);
});

test('gridSize counts whole cells and respects the minimum', () => {
  assert.deepEqual(gridSize(550, 350, 32, 5), { cols: 17, rows: 10 });
  assert.deepEqual(gridSize(50, 40, 32, 5), { cols: 5, rows: 5 });
});

test('auto head and tail: spacing - gap, then 80% of the head', () => {
  const r = (o) => resolveSnakeSizes({ spacing: 32, gap: 2, head: null, tail: null, ratio: 0.8, ...o });
  const d = r({});
  near(d.headSize, 30); near(d.tailSize, 24);
  const z = r({ gap: 0 });
  near(z.headSize, 32); near(z.tailSize, 25.6);
  const n = r({ gap: -2 });
  near(n.headSize, 34); near(n.tailSize, 27.2);
  const h = r({ head: 16 });
  near(h.headSize, 16); near(h.tailSize, 12.8);
  const t = r({ tail: 8 });
  near(t.headSize, 30); near(t.tailSize, 8);
  const both = r({ head: 16, tail: 8 });
  near(both.headSize, 16); near(both.tailSize, 8);
});
