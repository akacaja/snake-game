import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCENES, SCENE_IDS, SECRET_KEYS, STACK_TAG, TICK_MS, ringOf } from '../site/scenes.js';

const byId = Object.fromEntries(SCENES.map((s) => [s.id, s]));
const lit = (frame, prefix) => Object.entries(frame).filter(([id, p]) => id.startsWith(prefix) && p.on).length;

test('there are 6 scenes with their durations', () => {
  assert.deepEqual(SCENE_IDS, ['skins', 'tokens', 'leaderboard', 'trigger', 'a11y', 'stack']);
  assert.equal(TICK_MS, 100);
  assert.equal(byId.tokens.ticks, 90); // 9 s
  assert.equal(byId.leaderboard.ticks, 80); // 8 s
  assert.equal(byId.trigger.ticks, 70); // 7 s
  assert.equal(byId.a11y.ticks, 80); // 8 s
  assert.equal(byId.stack.ticks, 100); // 10 s
});

test('a closed ring has no repeated cell and each cell touches the next one', () => {
  const ring = ringOf(1, 1, 10, 5);
  assert.equal(ring.length, 26);
  assert.equal(new Set(ring.map((c) => c.join())).size, 26);
  ring.forEach((c, i) => {
    const n = ring[(i + 1) % ring.length];
    assert.equal(Math.abs(c[0] - n[0]) + Math.abs(c[1] - n[1]), 1);
  });
});

test('skins: the skin changes every 12 steps (2.64 s) and the pointer shows up before the change', () => {
  const frame = byId.skins.frame;
  const at = (step) => frame(Math.ceil((step * 220) / TICK_MS));
  assert.equal(at(0).root.attrs['data-skin'], 'default');
  assert.equal(at(12).root.attrs['data-skin'], 'natal');
  assert.equal(at(24).root.attrs['data-skin'], 'halloween');
  assert.equal(at(4).ptr.on, false);
  assert.equal(at(6).ptr.on, true);
  assert.equal(at(10).ptr.vars['--pressed'], 1);
  assert.equal(byId.skins.still.root.attrs['data-skin'], 'natal');
  assert.equal(byId.skins.stillFor(2).root.attrs['data-skin'], 'halloween');
});

test('tokens: the typed value at tick 12 is #146b; the still frame has the green value done', () => {
  assert.equal(byId.tokens.frame(12).value.text, '#146b');
  assert.equal(byId.tokens.frame(14).value.text, '#146b3a');
  assert.equal(byId.tokens.frame(12).caret.on, true);
  assert.equal(byId.tokens.still.value.text, '#146b3a');
  assert.equal(byId.tokens.still.root.attrs['data-ink'], 1);
  assert.equal(byId.tokens.frame(90).value.text, byId.tokens.frame(0).value.text);
});

test('leaderboard: "carol" is complete at tick 22 and the Top 10 shows at tick 36', () => {
  const frame = byId.leaderboard.frame;
  assert.equal(frame(21).name.text, 'caro');
  assert.equal(frame(22).name.text, 'carol');
  assert.equal(frame(35).form.hidden, false);
  assert.equal(frame(35).list.hidden, true);
  assert.equal(frame(36).list.hidden, false);
  assert.equal(frame(36).form.hidden, true);
  assert.equal(lit(frame(36), 'row-'), 5);
  assert.equal(lit(frame(35), 'row-'), 0);
});

test('trigger: 6 keys at tick 20 and the modal at tick 37', () => {
  const frame = byId.trigger.frame;
  assert.equal(SECRET_KEYS.length, 10);
  assert.equal(lit(frame(20), 'key-'), 6);
  assert.equal(lit(frame(36), 'key-'), 10);
  assert.equal(frame(36).modal.on, false);
  assert.equal(frame(37).modal.on, true);
  assert.equal(frame(4).caption.text, 'A visitor lands on a 404 page');
  assert.equal(frame(37).caption.text, 'the game opens');
});

test('accessible: the balloons show up at the right time and the snake stops after "Paused"', () => {
  const frame = byId.a11y.frame;
  assert.equal(frame(17)['bubble-gift'].on, false);
  assert.equal(frame(18)['bubble-gift'].on, true);
  assert.equal(frame(45)['bubble-star'].on, true);
  assert.equal(frame(68)['bubble-paused'].on, true);
  assert.equal(frame(68)['bubble-gift'].hidden, true); // only the last 2 balloons stay
  assert.equal(frame(67)['bubble-gift'].hidden, false);
  assert.deepEqual(frame(68)['seg-0'], frame(79)['seg-0']);
  assert.notDeepEqual(frame(30)['seg-0'], frame(33)['seg-0']);
  assert.deepEqual(byId.a11y.still['bubble-star'].on, true);
  assert.deepEqual(byId.a11y.still['bubble-paused'].on, true);
  assert.equal(lit(frame(40), 'key-'), 1);
});

test('stack: the Astro tab at tick 25 and the whole tag at tick 8', () => {
  const frame = byId.stack.frame;
  assert.equal(frame(25)['tab-1'].on, true);
  assert.equal(frame(25)['tab-0'].on, false);
  assert.equal(frame(25).file.text, '<!-- src/pages/404.astro -->');
  assert.equal(frame(8).typed.text, STACK_TAG);
  assert.notEqual(frame(7).typed.text, STACK_TAG);
  assert.equal(frame(8).caret.on, true);
});

test('every scene has a still frame without pointer or cursor', () => {
  for (const scene of SCENES) {
    assert.ok(scene.still && Object.keys(scene.still).length > 0, scene.id);
    assert.ok(!scene.still.ptr?.on, `${scene.id} still has a pointer`);
    assert.ok(!scene.still.caret?.on, `${scene.id} still has a cursor`);
  }
});

test('frames are plain data and the same tick gives the same frame', () => {
  for (const scene of SCENES) {
    for (const t of [0, 7, 36, 61]) assert.deepEqual(scene.frame(t), scene.frame(t));
    JSON.stringify(scene.frame(10));
  }
});

test('scenes.js does not use document, window or timers', () => {
  const text = readFileSync(resolve(fileURLToPath(new URL('../site/scenes.js', import.meta.url))), 'utf8')
    .split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
  assert.ok(!/\b(document|window|setTimeout|setInterval|requestAnimationFrame)\b/.test(text));
});
