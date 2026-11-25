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
// Each skin is a small file. The biggest one (natal) is 519 B in 0.3.1: the limit is that plus about 3%, rounded to 10.
const SKIN_MAX_GZIP = 540;

test(`dist/snake-game.js is at most ${MAIN_MAX_GZIP} bytes gzipped`, () => {
  const size = gzipped('dist/snake-game.js');
  assert.ok(size <= MAIN_MAX_GZIP, `dist/snake-game.js is ${size} B gzipped (limit ${MAIN_MAX_GZIP})`);
});

test(`addons/leaderboard.js is at most ${ADDON_MAX_GZIP} bytes gzipped`, () => {
  const size = gzipped('addons/leaderboard.js');
  assert.ok(size <= ADDON_MAX_GZIP, `addons/leaderboard.js is ${size} B gzipped (limit ${ADDON_MAX_GZIP})`);
});

for (const name of ['natal', 'halloween', 'carnaval']) {
  test(`skins/${name}.js is at most ${SKIN_MAX_GZIP} bytes gzipped`, () => {
    const size = gzipped(`skins/${name}.js`);
    assert.ok(size <= SKIN_MAX_GZIP, `skins/${name}.js is ${size} B gzipped (limit ${SKIN_MAX_GZIP})`);
  });
}

test('the generated addon and skins are smaller than their sources (the comments are gone)', () => {
  for (const file of ['addons/leaderboard.js', 'skins/natal.js', 'skins/halloween.js', 'skins/carnaval.js']) {
    const generated = gzipped(file);
    const source = gzipped(`src/${file}`);
    assert.ok(generated < source, `${file} is ${generated} B gzipped, the source is ${source} B`);
  }
});
