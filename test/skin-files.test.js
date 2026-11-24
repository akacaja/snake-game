import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { TOKEN_DEFS } from '../src/theme.js';
import { normalizeSkin } from '../src/skins.js';
import { contrastRatio } from '../demo/contrast.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dir = join(root, 'skins');
const files = readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
const colorNames = TOKEN_DEFS.filter((t) => t.kind === 'color').map((t) => t.name);

// Runs a skin file as a classic script and returns what it put in the queue.
function load(file) {
  const sandbox = {};
  sandbox.globalThis = sandbox;
  vm.runInNewContext(readFileSync(join(dir, file), 'utf8'), sandbox);
  return sandbox.snakeGameSkins;
}

// The emojis of the card, in escapes, so FE0F (emoji style), ZWJ (200D) and the skin tone (1F3FC) are checked.
const EXPECTED = {
  'natal.js': ['\u{1F384}', '\u{1F385}\u{1F3FC}', '\u{1FACE}', '⛄️', '\u{1F381}', '\u{1F968}', '\u{1F320}'],
  'halloween.js': ['\u{1F47B}', '\u{1F480}', '\u{1F383}', '\u{1F9DB}\u{1F3FC}', '\u{1F36D}', '\u{1F36C}', '\u{1F36B}'],
  'carnaval.js': ['\u{1F483}', '\u{1F389}', '\u{1F38A}', '\u{1F46F}‍♂️', '\u{1FA85}', '\u{1F57A}'],
};

test('there are exactly the three skin files', () => {
  assert.deepEqual(files, ['carnaval.js', 'halloween.js', 'natal.js']);
});

for (const file of files) {
  const name = file.replace('.js', '');

  test(`${file}: runs as a classic script and queues [name, skin]`, () => {
    const queue = load(file);
    assert.equal(queue.length, 1);
    assert.equal(queue[0][0], name);
  });

  test(`${file}: the emoji list is exactly the one in the card`, () => {
    const [, skin] = load(file)[0];
    assert.deepEqual(Array.from(skin.foods, (f) => f.emoji), EXPECTED[file]);
  });

  test(`${file}: every food has an English and a Portuguese name, and nothing is skipped`, () => {
    const [, skin] = load(file)[0];
    const warnings = [];
    const clean = normalizeSkin(skin, colorNames, (m) => warnings.push(m));
    assert.deepEqual(warnings, []);
    assert.equal(clean.foods.length, skin.foods.length);
    assert.deepEqual(Object.keys(clean.palette).sort(), Object.keys(skin.palette).sort());
    for (const food of skin.foods) {
      assert.ok(food.names.en && food.names.pt, food.emoji);
    }
  });

  test(`${file}: the palette has the 8 colors and the contrasts are enough`, () => {
    const [, skin] = load(file)[0];
    const p = skin.palette;
    for (const key of ['color', 'grid-color', 'background', 'backdrop', 'text-color', 'focus-color', 'food-color', 'food-halo-color']) {
      assert.ok(p[key], key);
    }
    const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const bg = rgb(p.background);
    assert.ok(contrastRatio(rgb(p['text-color']), bg) >= 4.5, 'text on the background');
    assert.ok(contrastRatio(rgb(p.color), bg) >= 3, 'snake on the background');
    assert.ok(contrastRatio(rgb(p['food-color']), bg) >= 3, 'food on the background');
    assert.ok(contrastRatio(rgb(p['focus-color']), bg) >= 3, 'focus outline on the background');
  });
}
