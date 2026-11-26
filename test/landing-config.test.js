import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ATTRIBUTE_NAMES, NO_TOKENS_CSS, OPTIONS, PAGES_URL, attributesFor, cssFor, defaultState, fromQuery, htmlFor,
  promptFor, scriptsFor, summary, tagFor, toQuery, tokensFor, withSkin,
} from '../site/config.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const COMMENT = `<!-- Shown on the page. To hide it as an easter egg, remove mode="inline" and open,
     then call document.querySelector('snake-game').open() from your trigger. -->`;

const FULL = {
  skin: 'natal', grid: 'lines', snake: 'uniform', gap: 4, walls: 'wrap', intro: 'off', speed: 'fast', leaderboard: 'off',
  colors: { color: '#0f766e' },
};

test('the default state generates only the game, the leaderboard addon, the comment and the tag', () => {
  assert.equal(htmlFor(defaultState()), `<script src="${PAGES_URL}dist/snake-game.js"></script>
<script src="${PAGES_URL}addons/leaderboard.js"></script>

${COMMENT}
<snake-game mode="inline" open></snake-game>`);
});

test('the full state generates the exact HTML', () => {
  assert.equal(htmlFor(FULL), `<script src="${PAGES_URL}dist/snake-game.js"></script>
<script src="${PAGES_URL}skins/natal.js"></script>

<style>
  snake-game {
    --snake-color: #0f766e;
    --snake-gap: 4px;
  }
</style>

${COMMENT}
<snake-game mode="inline" open
  skin="natal" grid="lines" snake="uniform" wrap intro="none" speed="8" leaderboard="off"></snake-game>`);
});

test('tokens: only the changed ones, in order; no tokens means no <style>', () => {
  const state = { ...defaultState(), gap: 0, colors: { background: '#ffffff', color: '#111111', 'grid-color': '#abcdef', 'food-color': '#000000' } };
  assert.deepEqual(tokensFor(state).map(([name]) => name), [
    '--snake-color', '--snake-food-color', '--snake-grid-color', '--snake-background', '--snake-gap',
  ]);
  assert.deepEqual(tokensFor(defaultState()), []);
  assert.ok(!htmlFor(defaultState()).includes('<style>'));
  assert.ok(htmlFor(state).includes('<style>'));
});

test('leaderboard: Off removes the addon and adds leaderboard="off"; Local adds the addon and no attribute', () => {
  const off = { ...defaultState(), leaderboard: 'off' };
  assert.ok(!scriptsFor(off).join('').includes('leaderboard.js'));
  assert.ok(tagFor(off).includes('leaderboard="off"'));
  assert.ok(scriptsFor(defaultState()).join('').includes('addons/leaderboard.js'));
  assert.ok(!tagFor(defaultState()).includes('leaderboard='));
});

test('speed: Slow is 3, Fast is 8, Classic has no attribute', () => {
  const speed = (id) => attributesFor({ ...defaultState(), speed: id }).find(([name]) => name === 'speed')?.[1];
  assert.equal(speed('slow'), '3');
  assert.equal(speed('fast'), '8');
  assert.equal(speed('classic'), undefined);
});

test('intro and walls use the real attributes', () => {
  const attrs = (patch) => attributesFor({ ...defaultState(), ...patch });
  assert.deepEqual(attrs({ intro: 'off' }), [['intro', 'none']]);
  assert.deepEqual(attrs({ intro: 'cascade' }), [['intro', 'cascade']]);
  assert.deepEqual(attrs({ walls: 'wrap' }), [['wrap', '']]);
  assert.deepEqual(attrs({ walls: 'solid' }), []);
});

test('the tag breaks after "open" when it passes 80 characters', () => {
  const short = tagFor({ ...defaultState(), grid: 'lines' });
  assert.ok(!short.includes('\n'));
  assert.ok(short.length <= 80);
  const long = tagFor(FULL);
  assert.ok(long.startsWith('<snake-game mode="inline" open\n  skin="natal"'));
  // between 81 and 120 characters when written flat: already broken
  const middle = tagFor({ ...defaultState(), skin: 'natal', grid: 'lines', snake: 'uniform' });
  const flat = middle.replace('\n  ', ' ');
  assert.ok(flat.length > 80 && flat.length <= 120, `flat length ${flat.length}`);
  assert.equal(middle, '<snake-game mode="inline" open\n  skin="natal" grid="lines" snake="uniform"></snake-game>');
});

test('every script address is on the Pages site, points to a file that exists and is never local', () => {
  assert.equal(scriptsFor({ ...defaultState(), skin: 'halloween', leaderboard: 'local' }).length, 3);
  for (const skin of OPTIONS.skin) {
    for (const line of scriptsFor({ ...defaultState(), skin: skin.id })) {
      const src = line.match(/src="([^"]+)"/)[1];
      assert.ok(src.startsWith(PAGES_URL), src);
      assert.ok(existsSync(join(root, src.slice(PAGES_URL.length))), `${src} does not exist in the repository`);
      assert.ok(!/localhost|127\.0\.0\.1|file:/.test(src));
    }
  }
});

test('CSS tab: no tokens shows "Nothing to add"; the prompt has scripts, tag, CSS and the trigger sentence', () => {
  assert.equal(cssFor(defaultState()), NO_TOKENS_CSS);
  assert.ok(cssFor(defaultState()).includes('Nothing to add'));
  const prompt = promptFor(FULL);
  for (const piece of [...scriptsFor(FULL), tagFor(FULL), cssFor(FULL), 'To hide it as an easter egg instead', 'Do not add dependencies']) {
    assert.ok(prompt.includes(piece), `prompt misses: ${piece}`);
  }
  assert.ok(prompt.includes('3. Add these CSS variables'));
  assert.ok(!promptFor(defaultState()).includes('3. Add these CSS variables'));
  assert.ok(!/404 title/.test(prompt));
});

test('picking a skin erases the edited colors; the tag carries mode="inline" open plus the preview attributes', () => {
  assert.deepEqual(withSkin(FULL, 'natal').colors, {});
  for (const state of [defaultState(), FULL]) {
    const attrs = attributesFor(state).map(([name, value]) => (value === '' ? name : `${name}="${value}"`));
    const expected = ['<snake-game mode="inline" open', ...attrs].join(' ') + '></snake-game>';
    assert.equal(tagFor(state).replace(/\s+/g, ' '), expected);
    for (const [name] of attributesFor(state)) assert.ok(ATTRIBUTE_NAMES.includes(name));
  }
});

test('link: the default state is an empty query', () => {
  assert.equal(toQuery(defaultState()), '');
});

test('link: round trip for 6 states', () => {
  const states = [
    defaultState(),
    FULL,
    { ...defaultState(), skin: 'halloween', gap: 0, speed: 'slow' },
    { ...defaultState(), grid: 'none', intro: 'cascade', colors: { background: '#fdf6ec', 'food-color': '#c62828' } },
    { ...defaultState(), skin: 'carnaval', snake: 'uniform', leaderboard: 'off', gap: 10 },
    { ...defaultState(), walls: 'wrap', grid: 'squares', colors: { 'grid-color': '#d4d4d4', color: '#111111' } },
  ];
  for (const state of states) assert.deepEqual(fromQuery(toQuery(state)), state);
  assert.equal(toQuery(FULL), 'skin=natal&grid=lines&snake=uniform&gap=4&walls=wrap&intro=off&speed=fast&leaderboard=off&color=0f766e');
});

test('link: a tolerant reader', () => {
  const base = defaultState();
  assert.deepEqual(fromQuery('?nothing=1&other'), base);
  assert.deepEqual(fromQuery('grid=hexagon'), base);
  assert.equal(fromQuery('gap=11').gap, 2);
  assert.equal(fromQuery('gap=2.5').gap, 2);
  assert.equal(fromQuery('gap=-1').gap, 2);
  assert.equal(fromQuery('gap=7').gap, 7);
  assert.deepEqual(fromQuery('color=%23ABC').colors, { color: '#aabbcc' });
  assert.deepEqual(fromQuery('color=#ABCDEF').colors, { color: '#abcdef' });
  assert.deepEqual(fromQuery('color=zzz').colors, {});
  assert.equal(fromQuery('GRID=Lines').grid, 'lines');
  assert.equal(fromQuery('intro=none').intro, 'off');
  assert.equal(fromQuery('grid=lines&grid=none').grid, 'lines');
  assert.equal(fromQuery('speed=classic&walls=solid&skin=default&snake=taper').speed, 'classic');
  const both = fromQuery('color=ff0000&skin=natal');
  assert.equal(both.skin, 'natal');
  assert.deepEqual(both.colors, { color: '#ff0000' });
  assert.deepEqual(fromQuery(''), base);
  assert.deepEqual(fromQuery(undefined), base);
});

test('summary: the chips, with the number of custom colors', () => {
  assert.deepEqual(summary(defaultState()), [
    '🐍 Default skin', 'Dots grid', 'Tapered snake', '2px gap', 'Solid walls', 'Wave intro', 'Classic speed', 'Leaderboard local',
  ]);
  const chips = summary({ ...FULL, colors: { color: '#0f766e', background: '#ffffff' } });
  assert.equal(chips.at(-1), '2 custom colors');
  assert.ok(chips.includes('🎄 Christmas skin'));
  assert.equal(summary(FULL).at(-1), '1 custom color');
});
