import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Every published JavaScript file starts with the license header (name, @akacaja and MIT):
// the generated files (dist/, addons/, skins/) carry the version, the sources in src/ carry the short line.

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SOURCE_HEADER = '/* snake-game | MIT (c) 2026 Carolina Cajazeira (@akacaja) */';
const GENERATED_HEADER = /^\/\* snake-game v(\d+\.\d+\.\d+) \| MIT \(c\) 2026 Carolina Cajazeira \(@akacaja\) \| Generated (by scripts\/build\.js from src\/|from src\/(addons|skins)\/[\w-]+\.js)\. Do not edit\. \*\/$/;
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;

const firstLine = (text) => text.split('\n')[0].replace(/\r$/, '');
const jsFiles = (dir) => readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
  const path = `${dir}/${entry.name}`;
  if (entry.isDirectory()) return jsFiles(path);
  return entry.name.endsWith('.js') ? [path] : [];
});

// Returns the problems found in the first line of a generated file (an empty list means it is fine).
export function generatedProblems(file, text, expectedVersion = version) {
  const match = GENERATED_HEADER.exec(firstLine(text));
  if (!match) return [`${file}: line 1 is not the generated license header`];
  if (match[1] !== expectedVersion) return [`${file}: header says v${match[1]}, package.json says v${expectedVersion}. Run npm run build`];
  return [];
}

export function sourceProblems(file, text) {
  return firstLine(text) === SOURCE_HEADER ? [] : [`${file}: line 1 is not the license header`];
}

const generated = ['dist/snake-game.js', ...jsFiles('addons'), ...jsFiles('skins')];
const sources = jsFiles('src');

test('the generated files (dist, addons and skins) start with the license header and the current version', () => {
  assert.ok(generated.includes('addons/leaderboard.js'));
  for (const name of ['natal', 'halloween', 'carnaval']) assert.ok(generated.includes(`skins/${name}.js`), name);
  for (const file of generated) {
    assert.deepEqual(generatedProblems(file, readFileSync(join(root, file), 'utf8')), []);
  }
});

test('every source in src/ (also src/addons and src/skins) starts with the license header', () => {
  assert.ok(sources.length >= 10, `only ${sources.length} sources found`);
  for (const file of sources) assert.deepEqual(sourceProblems(file, readFileSync(join(root, file), 'utf8')), []);
});

test('the check fails for a file without the header and for a wrong version', () => {
  const good = `/* snake-game v${version} | MIT (c) 2026 Carolina Cajazeira (@akacaja) | Generated from src/skins/x.js. Do not edit. */\nlet a;\n`;
  assert.deepEqual(generatedProblems('x.js', good), []);
  assert.equal(generatedProblems('x.js', 'let a;\n').length, 1);
  assert.equal(generatedProblems('x.js', good.replace(`v${version}`, 'v0.0.1')).length, 1);
  assert.equal(generatedProblems('x.js', good.replace('@akacaja', '@outro')).length, 1);
  assert.equal(sourceProblems('x.js', 'let a;\n').length, 1);
  assert.equal(sourceProblems('x.js', `\n${SOURCE_HEADER}\n`).length, 1);
  assert.equal(sourceProblems('x.js', `${SOURCE_HEADER}\nlet a;\n`).length, 0);
});
