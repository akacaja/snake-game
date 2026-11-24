import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const gzipped = (file) => gzipSync(readFileSync(new URL(`../${file}`, import.meta.url))).length;

// Size limits (gzip, in bytes). If one of these tests fails, make the code smaller before raising the limit,
// and then update the sizes written in README.md and README.pt-BR.md.

// The main file was 14,729 B in 0.2.0. The leaderboard hook (card 6) may add about 1 KB.
const MAIN_MAX_GZIP = 15700;
// The leaderboard addon is a separate, optional file. 6,500 B is the safety limit set with the card.
const ADDON_MAX_GZIP = 6500;

test(`dist/snake-game.js is at most ${MAIN_MAX_GZIP} bytes gzipped`, () => {
  const size = gzipped('dist/snake-game.js');
  assert.ok(size <= MAIN_MAX_GZIP, `dist/snake-game.js is ${size} B gzipped (limit ${MAIN_MAX_GZIP})`);
});

test(`addons/leaderboard.js is at most ${ADDON_MAX_GZIP} bytes gzipped`, () => {
  const size = gzipped('addons/leaderboard.js');
  assert.ok(size <= ADDON_MAX_GZIP, `addons/leaderboard.js is ${size} B gzipped (limit ${ADDON_MAX_GZIP})`);
});
