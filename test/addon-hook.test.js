import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SnakeGameElement } from '../src/snake-game.js';

// The game side of the addons: the box it gives to an addon, and when it does not. No DOM in Node, so the methods run on a stand-in.
const proto = SnakeGameElement.prototype;
const source = readFileSync(new URL('../src/snake-game.js', import.meta.url), 'utf8');

function standIn(attrs = {}) {
  const calls = { focus: 0, removed: 0, inserted: [] };
  const action = { hidden: false, focus() { calls.focus += 1; } };
  const box = { className: '', remove() { calls.removed += 1; } };
  const game = Object.create(proto);
  Object.assign(game, {
    _warned: new Set(),
    _addon: null,
    _option: (name) => (attrs[name] === undefined ? 'on' : attrs[name]),
    _ui: { action, overlay: { insertBefore: (node, before) => calls.inserted.push([node, before]) } },
  });
  return { game, calls, action, box };
}
globalThis.document = { createElement: () => ({ className: '', remove() { globalThis.__removed = (globalThis.__removed || 0) + 1; } }) };

test('without the addon, a game over focuses "Play again" as in 0.2.0 and nothing is added', () => {
  const { game, calls, action } = standIn();
  assert.equal(game._leaderboard(5), null);
  game._offerAddon(5);
  assert.equal(calls.focus, 1);
  assert.equal(calls.inserted.length, 0);
  assert.equal(action.hidden, false);
  assert.equal(game._addon, null);
});

test('the addons queue of the page is adopted by the game: a later push registers at once', () => {
  assert.equal(typeof globalThis.snakeGameAddons.push, 'function');
  assert.equal(Array.isArray(globalThis.snakeGameAddons), false);
});

test('with the addon: it runs only with leaderboard on and a score above 0', () => {
  const seen = [];
  const addon = (...args) => { seen.push(args); return () => seen.push('cleaned'); };
  globalThis.snakeGameAddons.push(['leaderboard', addon]);

  assert.equal(standIn().game._leaderboard(3), addon);
  assert.equal(standIn().game._leaderboard(0), null);
  assert.equal(standIn({ leaderboard: 'off' }).game._leaderboard(3), null);

  const off = standIn({ leaderboard: 'off' });
  off.game._offerAddon(3);
  assert.equal(off.calls.focus, 1, 'off: the same as 0.2.0');
  assert.equal(off.calls.inserted.length, 0);
  assert.equal(seen.length, 0);
});

test('with the addon: the box goes above "Play again", the addon gets what it needs, skip gives the button back', () => {
  const seen = [];
  const addon = (game, parts) => { seen.push(parts); return () => seen.push('cleaned'); };
  globalThis.snakeGameAddons.push(['leaderboard', addon]);
  const { game, calls, action } = standIn();
  globalThis.__removed = 0;
  game._offerAddon(7);
  assert.equal(calls.inserted.length, 1);
  assert.equal(calls.inserted[0][1], action);
  assert.equal(calls.inserted[0][0].className, 'addon');
  const parts = seen[0];
  assert.equal(parts.score, 7);
  assert.equal(parts.action, action);
  assert.equal(parts.box, calls.inserted[0][0]);
  assert.equal(calls.focus, 0, 'the addon decides the focus');
  action.hidden = true; // what the addon does while the form is open
  parts.skip();
  assert.deepEqual(seen.slice(1), ['cleaned']);
  assert.equal(globalThis.__removed, 1);
  assert.equal(action.hidden, false);
  assert.equal(calls.focus, 1);
  assert.equal(game._addon, null);
});

test('_dropAddon runs the cleanup once, removes the box and shows the button; it does nothing without a box', () => {
  const { game, action } = standIn();
  game._dropAddon();
  assert.equal(action.hidden, false);
  let cleaned = 0;
  let removed = 0;
  action.hidden = true;
  game._addon = { box: { remove: () => { removed += 1; } }, off: () => { cleaned += 1; } };
  game._dropAddon();
  game._dropAddon();
  assert.deepEqual([cleaned, removed, action.hidden], [1, 1, false]);
  game._addon = { box: { remove() {} }, off: () => { throw new Error('boom'); } };
  assert.doesNotThrow(() => game._dropAddon());
});

test('an addon that throws: the game warns once, drops the box and focuses "Play again"', () => {
  globalThis.snakeGameAddons.push(['leaderboard', () => { throw new Error('broken addon'); }]);
  const errors = [];
  const original = console.error;
  console.error = (...args) => errors.push(args[0]);
  try {
    const { game, calls, action } = standIn();
    globalThis.__removed = 0;
    game._offerAddon(2);
    game._offerAddon(2);
    assert.equal(errors.length, 1);
    assert.equal(calls.focus, 2);
    assert.equal(globalThis.__removed, 2);
    assert.equal(action.hidden, false);
    assert.equal(game._addon, null);
  } finally {
    console.error = original;
  }
});

test('_onKey leaves a text field alone: the check comes before Escape, Space and the directions', () => {
  const body = source.slice(source.indexOf('_onKey = (e) =>'), source.indexOf('  _onPointerDown(e) {'));
  const typing = body.indexOf('isTyping(target)');
  assert.ok(typing > 0);
  for (const later of ["e.key === 'Escape'", "e.key === ' '", 'directionFromKey(e.key)']) assert.ok(body.indexOf(later) > typing, later);
});

test('_onPointerDown does nothing inside an addon box: no board focus, no swipe', () => {
  const body = source.slice(source.indexOf('  _onPointerDown(e) {'), source.indexOf('  _onPointerMove(e) {'));
  assert.ok(body.indexOf("closest('.addon')") > 0);
  assert.ok(body.indexOf("closest('.addon')") < body.indexOf('board.focus'));
  assert.ok(body.indexOf("closest('.addon')") < body.indexOf('setPointerCapture'));

  let focused = 0;
  const game = Object.create(proto);
  game._anchor = null;
  game._ui = { board: { focus: () => { focused += 1; }, setPointerCapture() { focused += 100; } } };
  const inside = { closest: (s) => (s === '.addon' ? {} : null) };
  game._onPointerDown({ composedPath: () => [inside], pointerType: 'touch', clientX: 1, clientY: 1, pointerId: 1 });
  assert.equal(focused, 0);
  assert.equal(game._anchor, null);
  const outside = { closest: () => null, tagName: 'DIV' };
  game._onPointerDown({ composedPath: () => [outside], pointerType: 'touch', clientX: 1, clientY: 1, pointerId: 1 });
  assert.equal(focused, 101);
  assert.deepEqual(game._anchor, { x: 1, y: 1 });
});

test('the box is removed when the game stops or a new game starts', () => {
  assert.ok(/_newGame\(first\) \{\s*this\._dropAddon\(\);/.test(source));
  const stop = source.slice(source.indexOf('  _stop() {'), source.indexOf('// ---- frame loop'));
  assert.ok(stop.includes('this._dropAddon()'));
});
