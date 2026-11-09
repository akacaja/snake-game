import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../src/engine.js';

const fixed = (value) => () => value;
const at = (x, y) => ({ x, y });

function make(extra = {}) {
  return createEngine({ cols: 10, rows: 10, random: fixed(0), ...extra });
}

test('starts with the requested length, heading right, with food on a free cell', () => {
  const state = make().getState();
  assert.equal(state.snake.length, 3);
  assert.equal(state.direction, 'right');
  assert.equal(state.status, 'running');
  assert.ok(!state.snake.some((c) => c.x === state.food.x && c.y === state.food.y));
});

test('moving advances the head one cell and keeps the length', () => {
  const engine = make({ initial: { snake: [at(5, 5), at(4, 5), at(3, 5)], direction: 'right', food: at(0, 0) } });
  engine.step();
  const state = engine.getState();
  assert.deepEqual(state.snake[0], at(6, 5));
  assert.equal(state.snake.length, 3);
});

test('opposite direction is ignored', () => {
  const engine = make({ initial: { snake: [at(5, 5), at(4, 5), at(3, 5)], direction: 'right', food: at(0, 0) } });
  assert.equal(engine.turn('left'), false);
  engine.step();
  assert.deepEqual(engine.getState().snake[0], at(6, 5));
});

test('two quick turns are applied in two steps', () => {
  const engine = make({ initial: { snake: [at(5, 5), at(4, 5), at(3, 5)], direction: 'right', food: at(0, 0) } });
  assert.equal(engine.turn('up'), true);
  assert.equal(engine.turn('left'), true);
  engine.step();
  assert.deepEqual(engine.getState().snake[0], at(5, 4));
  engine.step();
  assert.deepEqual(engine.getState().snake[0], at(4, 4));
});

test('eating gives a point, grows the snake and emits eat and score', () => {
  const engine = make({ initial: { snake: [at(5, 5), at(4, 5), at(3, 5)], direction: 'right', food: at(6, 5) } });
  const seen = [];
  engine.on('eat', (d) => seen.push(['eat', d]));
  engine.on('score', (d) => seen.push(['score', d]));
  engine.step();
  const state = engine.getState();
  assert.equal(state.score, 1);
  assert.equal(state.snake.length, 4);
  assert.deepEqual(seen, [['eat', { score: 1, length: 4 }], ['score', { score: 1 }]]);
});

test('speed rises by speedStep per food up to maxSpeed, and interval follows', () => {
  const engine = createEngine({
    cols: 20, rows: 3, speed: 5, speedStep: 1, maxSpeed: 6, random: fixed(0),
    initial: { snake: [at(1, 1), at(0, 1)], direction: 'right', food: at(2, 1) },
  });
  assert.equal(engine.getState().interval, 200);
  engine.step();
  assert.equal(engine.getState().speed, 6);
  assert.ok(Math.abs(engine.getState().interval - 1000 / 6) < 1e-9);
  // already at the cap: stays there
  const again = createEngine({
    cols: 20, rows: 3, speed: 6, speedStep: 1, maxSpeed: 6, random: fixed(0),
    initial: { snake: [at(1, 1), at(0, 1)], direction: 'right', food: at(2, 1) },
  });
  again.step();
  assert.equal(again.getState().speed, 6);
});

test('food lands on the cell chosen by the injected random', () => {
  const engine = createEngine({ cols: 4, rows: 4, startLength: 1, random: fixed(0) });
  // snake head at x=2,y=1 ; first free cell in reading order is (0,0)
  assert.deepEqual(engine.getState().food, at(0, 0));
  const last = createEngine({ cols: 4, rows: 4, startLength: 1, random: fixed(0.999) });
  assert.deepEqual(last.getState().food, at(3, 3));
});

test('food never lands on the snake in a nearly full grid', () => {
  for (const r of [0, 0.3, 0.6, 0.999]) {
    const engine = createEngine({
      cols: 3, rows: 2, random: fixed(r),
      initial: { snake: [at(2, 1), at(1, 1), at(0, 1), at(0, 0)], direction: 'right' },
    });
    // two free cells remain: (1,0) and (2,0)
    const food = engine.getState().food;
    assert.ok(food.y === 0 && (food.x === 1 || food.x === 2), `random=${r}`);
  }
});

test('hitting the wall ends the game with reason wall', () => {
  const engine = make({ initial: { snake: [at(9, 5), at(8, 5), at(7, 5)], direction: 'right', food: at(0, 0) } });
  let over = null;
  engine.on('gameover', (d) => { over = d; });
  engine.step();
  assert.deepEqual(over, { score: 0, reason: 'wall' });
  assert.equal(engine.getState().status, 'over');
  assert.equal(engine.step(), false);
});

test('wrap crosses all four borders', () => {
  const cases = [
    ['right', at(9, 5), at(0, 5)],
    ['left', at(0, 5), at(9, 5)],
    ['up', at(5, 0), at(5, 9)],
    ['down', at(5, 9), at(5, 0)],
  ];
  for (const [dir, from, to] of cases) {
    const body = dir === 'up' || dir === 'down' ? [from, at(from.x, from.y + (dir === 'up' ? 1 : -1))] : [from, at(from.x + (dir === 'right' ? -1 : 1), from.y)];
    const engine = make({ wrap: true, initial: { snake: body, direction: dir, food: at(4, 4) } });
    engine.step();
    assert.deepEqual(engine.getState().snake[0], to, dir);
    assert.equal(engine.getState().status, 'running');
  }
});

test('hitting the own body ends the game with reason self', () => {
  const engine = make({
    initial: {
      snake: [at(5, 5), at(5, 6), at(4, 6), at(4, 5), at(4, 4)],
      direction: 'up', food: at(0, 0),
    },
  });
  engine.turn('left');
  let over = null;
  engine.on('gameover', (d) => { over = d; });
  engine.step();
  assert.equal(over.reason, 'self');
});

test('entering the cell the tail is leaving is allowed', () => {
  const engine = make({
    initial: { snake: [at(1, 0), at(1, 1), at(0, 1), at(0, 0)], direction: 'down', food: at(5, 5) },
  });
  // head (1,0) heading left goes into (0,0) where the tail currently is
  engine.turn('left');
  engine.step();
  assert.equal(engine.getState().status, 'running');
  assert.deepEqual(engine.getState().snake[0], at(0, 0));
});

test('entering the tail cell while eating is a collision', () => {
  const engine = createEngine({
    cols: 2, rows: 2, random: fixed(0),
    initial: { snake: [at(1, 0), at(1, 1), at(0, 1), at(0, 0)], direction: 'left', food: at(0, 0) },
  });
  let over = null;
  engine.on('gameover', (d) => { over = d; });
  engine.step();
  assert.equal(over.reason, 'self');
});

test('pause, resume, togglePause, events and startPaused', () => {
  const engine = make();
  const seen = [];
  engine.on('pause', () => seen.push('pause'));
  engine.on('resume', () => seen.push('resume'));
  engine.pause();
  assert.equal(engine.getState().status, 'paused');
  assert.equal(engine.step(), false);
  assert.equal(engine.turn('up'), false);
  engine.resume();
  engine.togglePause();
  engine.togglePause();
  assert.deepEqual(seen, ['pause', 'resume', 'pause', 'resume']);
  assert.equal(make({ startPaused: true }).getState().status, 'paused');
});

test('restart resets score, speed, length and places food on a free cell', () => {
  const engine = createEngine({
    cols: 10, rows: 10, random: fixed(0.5), speed: 5, speedStep: 1,
    initial: { snake: [at(5, 5), at(4, 5), at(3, 5)], direction: 'right', food: at(6, 5) },
  });
  let restarted = 0;
  engine.on('restart', () => { restarted += 1; });
  engine.step();
  assert.equal(engine.getState().score, 1);
  engine.restart();
  const state = engine.getState();
  assert.equal(restarted, 1);
  assert.equal(state.score, 0);
  assert.equal(state.speed, 5);
  assert.equal(state.snake.length, 3);
  assert.equal(state.status, 'running');
  assert.ok(!state.snake.some((c) => c.x === state.food.x && c.y === state.food.y));
});

test('filling the grid wins with reason full', () => {
  const engine = createEngine({
    cols: 3, rows: 1, startLength: 2, random: fixed(0),
  });
  let over = null;
  engine.on('gameover', (d) => { over = d; });
  engine.step();
  assert.deepEqual(over, { score: 1, reason: 'full' });
  assert.equal(engine.getState().status, 'won');
  assert.equal(engine.getState().food, null);
});

test('on() returns an off() function', () => {
  const engine = make();
  let calls = 0;
  const off = engine.on('step', () => { calls += 1; });
  engine.step();
  off();
  engine.step();
  assert.equal(calls, 1);
});
