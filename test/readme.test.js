import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (file) => readFileSync(join(root, file), 'utf8');
const en = read('README.md');
const pt = read('README.pt-BR.md');

test('the two READMEs link to each other near the top', () => {
  assert.ok(en.split('\n').slice(0, 3).join('\n').includes('(README.pt-BR.md)'), 'README.md does not link to README.pt-BR.md');
  assert.ok(pt.split('\n').slice(0, 3).join('\n').includes('(README.md)'), 'README.pt-BR.md does not link to README.md');
});

test('both READMEs state the gzipped size of dist/snake-game.js', () => {
  const real = gzipSync(readFileSync(join(root, 'dist/snake-game.js'))).length / 1000;
  const inEn = Number(en.match(/\*\*(\d+\.\d) KB\*\* gzipped/)?.[1]);
  const inPt = Number(pt.match(/\*\*(\d+,\d) KB\*\* comprimido com gzip/)?.[1].replace(',', '.'));
  assert.ok(Math.abs(inEn - real) <= 0.2, `README.md says ${inEn} KB, real size is ${real.toFixed(1)} KB`);
  assert.ok(Math.abs(inPt - real) <= 0.2, `README.pt-BR.md says ${inPt} KB, real size is ${real.toFixed(1)} KB`);
});

test('the two READMEs have the same structure', () => {
  const shape = (text) => ({
    headings: (text.match(/^#{1,3} /gm) || []).length,
    fences: (text.match(/^```/gm) || []).length,
    tableRows: (text.match(/^\|/gm) || []).length,
  });
  assert.deepEqual(shape(pt), shape(en));
});

test('no blank line inside a table, and the tables have the same rows in both READMEs', () => {
  const tables = (text) => text.split('\n\n').filter((block) => block.startsWith('|')).map((b) => b.split('\n').length);
  for (const [name, text] of [['README.md', en], ['README.pt-BR.md', pt]]) {
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      if (line.startsWith('|') && lines[i + 1] === '' && lines[i + 2] && lines[i + 2].startsWith('|')) {
        assert.fail(`${name}:${i + 2} has a blank line inside a table`);
      }
    });
  }
  assert.deepEqual(tables(pt), tables(en));
});
