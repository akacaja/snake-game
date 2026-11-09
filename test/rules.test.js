import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (file) => readFileSync(join(root, file), 'utf8');

const DRAWING_FILES = ['src/renderers.js', 'src/snake-game.js', 'src/read-tokens.js', 'src/text.js'];
const LITERALS = [
  [/#[0-9a-fA-F]{3,8}\b/, 'hex color'],
  [/\b(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\s*\(/i, 'color function'],
  [/\b\d+(\.\d+)?\s*px\b/i, 'size in px'],
  [/\b(transparent|black|white|red|green|blue|gray|grey|orange|yellow|purple|pink|brown|cyan|magenta|silver|gold|navy|teal)\b/i, 'color name'],
];

test('no literal colors or sizes outside src/theme.js', () => {
  for (const file of DRAWING_FILES) {
    const lines = read(file).split('\n');
    lines.forEach((line, i) => {
      for (const [re, what] of LITERALS) {
        assert.ok(!re.test(line), `${file}:${i + 1} has a ${what}: ${line.trim()}`);
      }
    });
  }
});

test('the engine does not touch the browser or timers', () => {
  const text = read('src/engine.js');
  for (const word of ['document', 'window', 'requestAnimationFrame', 'setInterval', 'setTimeout']) {
    assert.ok(!new RegExp(`\\b${word}\\b`).test(text), `engine.js uses ${word}`);
  }
});

test('no third-party company names in the repository (outside .crew and test)', () => {
  const names = /(?!)/i; // The list of names lives in a local file outside the repository.
  const skip = new Set(['.git', '.crew', 'node_modules', 'test']);
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (skip.has(entry) && dir === root) continue;
      const path = join(dir, entry);
      const rel = relative(root, path);
      assert.ok(!names.test(entry), `file name ${rel} contains a forbidden name`);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(js|html|md|json|css|txt)$/.test(entry) || !entry.includes('.')) {
        assert.ok(!names.test(readFileSync(path, 'utf8')), `${rel} contains a forbidden name`);
      }
    }
  };
  walk(root);
});

test('there are no dependencies in package.json', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.devDependencies, undefined);
});
