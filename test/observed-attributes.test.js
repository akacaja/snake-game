import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SnakeGameElement } from '../src/snake-game.js';

test('observedAttributes includes open and mode (mode change reopens the game)', () => {
  const observed = SnakeGameElement.observedAttributes;
  assert.ok(observed.includes('open'));
  assert.ok(observed.includes('mode'));
  assert.ok(observed.includes('text-title'));
});
