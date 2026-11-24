import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_TEXTS, formatText, pickPluralText, pluralCategory } from '../src/text.js';

const attrs = (obj) => (name) => (name in obj ? obj[name] : null);

test('formatText replaces {score} and {best}, keeps unknown placeholders', () => {
  assert.equal(formatText('Best {best}', { best: 7 }), 'Best 7');
  assert.equal(formatText('{score} of {best} {x}', { score: 1, best: 2 }), '1 of 2 {x}');
});

test('English plural: 0 is other, 1 is one, 12 is other', () => {
  assert.equal(pluralCategory(0, 'en'), 'other');
  assert.equal(pluralCategory(1, 'en'), 'one');
  assert.equal(pluralCategory(12, 'en'), 'other');
});

test('defaults give "1 point" and "12 points"', () => {
  const get = attrs({});
  const text = (n) => formatText(pickPluralText(get, 'text-game-over', n, 'en', DEFAULT_TEXTS.gameOver), { score: n });
  assert.equal(text(0), 'Game over, 0 points');
  assert.equal(text(1), 'Game over, 1 point');
  assert.equal(text(12), 'Game over, 12 points');
});

test('only -other defined serves 1 as well', () => {
  const get = attrs({ 'text-game-over-other': 'Over: {score}' });
  assert.equal(pickPluralText(get, 'text-game-over', 1, 'en', DEFAULT_TEXTS.gameOver), 'Over: {score}');
});

test('pt-BR uses its own forms', () => {
  const get = attrs({
    'text-game-over-one': 'Fim de jogo, {score} ponto',
    'text-game-over-other': 'Fim de jogo, {score} pontos',
  });
  const text = (n) => formatText(pickPluralText(get, 'text-game-over', n, 'pt-BR', DEFAULT_TEXTS.gameOver), { score: n });
  assert.equal(text(1), 'Fim de jogo, 1 ponto');
  assert.equal(text(12), 'Fim de jogo, 12 pontos');
});

test('invalid lang falls back to English without throwing', () => {
  for (const lang of ['xx-invalid', 'not a locale', '', undefined]) {
    assert.equal(pluralCategory(1, lang), 'one');
    assert.equal(pluralCategory(12, lang), 'other');
  }
});

test('the default texts have the spoken text for skin food', () => {
  assert.equal(formatText(DEFAULT_TEXTS.ateFood, { food: 'gift', score: 3 }), 'Ate gift. Score 3');
  assert.equal(formatText(DEFAULT_TEXTS.ate, { score: 3 }), 'Score 3');
});
