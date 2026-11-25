import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOKEN_DEFS } from '../src/theme.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (file) => readFileSync(join(root, file), 'utf8');

const DRAWING_FILES = ['src/renderers.js', 'src/snake-game.js', 'src/read-tokens.js', 'src/text.js', 'src/geometry.js', 'src/skins.js'];
const LITERALS = [
  [/#[0-9a-fA-F]{3,8}\b/, 'hex color'],
  [/\b(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\s*\(/i, 'color function'],
  [/\b\d+(\.\d+)?\s*px\b/i, 'size in px'],
  [/\b(transparent|black|white|red|green|blue|gray|grey|orange|yellow|purple|pink|brown|cyan|magenta|silver|gold|navy|teal)\b/i, 'color name'],
];

// Addons draw too (the leaderboard has a form and a list): they may only use the game tokens, as var(--_*).
// Both the source (src/addons) and the generated file (addons) are checked.
const jsIn = (dir) => readdirSync(join(root, dir)).filter((f) => f.endsWith('.js')).map((f) => `${dir}/${f}`);
const ADDON_FILES = [...jsIn('src/addons'), ...jsIn('addons')];

test('no literal colors or sizes outside src/theme.js, src/skins/*.js and src/addons/*.js (the addons use only var(--_*))', () => {
  assert.ok(ADDON_FILES.length > 0);
  for (const file of [...DRAWING_FILES, ...ADDON_FILES]) {
    const lines = read(file).split('\n');
    lines.forEach((line, i) => {
      for (const [re, what] of LITERALS) {
        assert.ok(!re.test(line), `${file}:${i + 1} has a ${what}: ${line.trim()}`);
      }
    });
  }
});

test('skin files have no sizes in px (they only carry colors and emoji)', () => {
  for (const file of [...jsIn('src/skins'), ...jsIn('skins')]) {
    read(file).split('\n').forEach((line, i) => {
      assert.ok(!/\b\d+(\.\d+)?\s*px\b/i.test(line), `${file}:${i + 1} has a size in px`);
    });
  }
});

test('the engine does not touch the browser or timers', () => {
  const text = read('src/engine.js');
  for (const word of ['document', 'window', 'requestAnimationFrame', 'setInterval', 'setTimeout']) {
    assert.ok(!new RegExp(`\\b${word}\\b`).test(text), `engine.js uses ${word}`);
  }
});

// The list of forbidden names lives in a local file that Git ignores, so the names
// never appear in the repository. Without the file, this check is skipped (and says so).
// FORBIDDEN_NAMES_FILE only exists to test this check with a copy of the list; normally it is not set.
const LIST = process.env.FORBIDDEN_NAMES_FILE ? resolve(process.env.FORBIDDEN_NAMES_FILE) : join(root, '.crew/nomes-proibidos.txt');

test('no forbidden names in the repository (list in .crew/nomes-proibidos.txt)', {
  skip: existsSync(LIST) ? false : `forbidden-name list not found at ${relative(root, LIST)}: check SKIPPED`,
}, () => {
  // Keep the real line number of each pattern (comments and blank lines count), for the error message.
  const entries = readFileSync(LIST, 'utf8').split('\n')
    .map((text, i) => ({ text: text.trim(), line: i + 1 }))
    .filter((e) => e.text && !e.text.startsWith('#'));
  if (entries.length === 0) assert.fail('forbidden-name list is empty');
  entries.forEach((e) => {
    try { new RegExp(e.text, 'i'); } catch { assert.fail(`invalid pattern on line ${e.line} of the list`); }
  });
  const lines = entries.map((e) => e.text);
  const names = new RegExp(lines.map((l) => '(?:' + l + ')').join('|'), 'i');
  const skip = new Set(['.git', '.crew', 'node_modules']);
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (skip.has(entry) && dir === root) continue;
      const path = join(dir, entry);
      const rel = relative(root, path);
      assert.ok(!names.test(entry), `file name ${rel} contains a forbidden name`);
      if (statSync(path).isDirectory()) { walk(path); continue; }
      const buf = readFileSync(path);
      if (buf.includes(0)) continue; // binary (PNG, .DS_Store): not text
      buf.toString('utf8').split('\n').forEach((line, i) => {
        assert.ok(!names.test(line), `${rel}:${i + 1} contains a forbidden name`);
      });
    }
  };
  walk(root);
});

test('there are no dependencies in package.json', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.devDependencies, undefined);
});

test('the favicon uses the current snake and food colors from the theme', () => {
  // Remove the comment: the colors must be on the circles, not just in the note.
  const svg = read('demo/favicon.svg').replace(/<!--[\s\S]*?-->/g, '');
  const value = (name) => TOKEN_DEFS.find((t) => t.name === name).value;
  const fills = [...svg.matchAll(/<circle\b[^>]*\bfill="([^"]+)"/g)].map((m) => m[1]);
  const snake = fills.slice(0, -1);
  assert.ok(snake.length > 0, 'favicon has no snake circles');
  assert.ok(snake.every((f) => f === value('color')), 'snake color differs from the theme');
  assert.equal(fills.at(-1), value('food-color'), 'food color differs from the theme');
});

test('demo and module pages point rel="icon" to a file that exists', () => {
  for (const page of ['demo/index.html', 'examples/module.html', 'index.html']) {
    const tag = read(page).match(/<link\b(?=[^>]*\brel="icon")[^>]*>/)?.[0];
    const href = tag?.match(/\bhref="([^"]+)"/)?.[1];
    assert.ok(href, `${page} has no rel="icon"`);
    assert.ok(existsSync(resolve(root, dirname(page), href)), `${page}: ${href} does not exist`);
  }
});

test('the temporary root page has no styles or literal colors/sizes', () => {
  const html = read('index.html');
  assert.ok(!/<style/i.test(html), 'index.html has a <style> tag');
  assert.ok(!/\sstyle=/i.test(html), 'index.html has a style attribute');
  for (const [re, what] of LITERALS) assert.ok(!re.test(html), `index.html has a ${what}`);
});
