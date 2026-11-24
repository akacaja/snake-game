import { test } from 'node:test';
import assert from 'node:assert/strict';
import { directionFromKey, directionFromSwipe, isTyping } from '../src/input.js';

test('arrows and WASD map to directions, any case', () => {
  assert.equal(directionFromKey('ArrowUp'), 'up');
  assert.equal(directionFromKey('ArrowDown'), 'down');
  assert.equal(directionFromKey('ArrowLeft'), 'left');
  assert.equal(directionFromKey('ArrowRight'), 'right');
  for (const [key, dir] of [['w', 'up'], ['A', 'left'], ['s', 'down'], ['D', 'right'], ['W', 'up']]) {
    assert.equal(directionFromKey(key), dir);
  }
});

test('other keys give null', () => {
  for (const key of ['x', ' ', 'Enter', 'Escape', undefined, 5]) assert.equal(directionFromKey(key), null);
});

test('swipe uses the dominant axis', () => {
  assert.equal(directionFromSwipe(40, 10, 24), 'right');
  assert.equal(directionFromSwipe(-40, 10, 24), 'left');
  assert.equal(directionFromSwipe(5, 40, 24), 'down');
  assert.equal(directionFromSwipe(5, -40, 24), 'up');
});

test('swipe below the threshold gives null', () => {
  assert.equal(directionFromSwipe(10, 10, 24), null);
  assert.equal(directionFromSwipe(0, 0, 24), null);
});

test('isTyping is true for a text field and false for anything else', () => {
  assert.equal(isTyping({ tagName: 'INPUT' }), true);
  assert.equal(isTyping({ tagName: 'TEXTAREA' }), true);
  for (const target of [{ tagName: 'BUTTON' }, { tagName: 'DIV' }, {}, null, undefined]) assert.equal(isTyping(target), false);
});
