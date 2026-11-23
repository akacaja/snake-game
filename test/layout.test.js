import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOKEN_DEFS, themeCSS } from '../src/theme.js';

// Pieces of the CSS inside "@media ... { ... }" blocks (the blocks have rules inside, so we count braces).
function mediaBlocks(css) {
  const blocks = [];
  const re = /@media\s*([^{]+)\{/g;
  let m;
  while ((m = re.exec(css))) {
    let depth = 1;
    let i = re.lastIndex;
    while (depth > 0 && i < css.length) {
      if (css[i] === '{') depth += 1;
      if (css[i] === '}') depth -= 1;
      i += 1;
    }
    blocks.push({ query: m[1].trim(), body: css.slice(re.lastIndex, i - 1) });
  }
  return blocks;
}

const phone = mediaBlocks(themeCSS).filter((b) => /pointer:\s*coarse/.test(b.query));

test('there are two phone layouts: lying down and standing, both for touch screens', () => {
  assert.equal(phone.length, 2);
  assert.ok(phone.some((b) => /orientation:\s*landscape/.test(b.query)));
  assert.ok(phone.some((b) => /orientation:\s*portrait/.test(b.query)));
});

test('phone layouts use board-share, dvh and the safe areas', () => {
  for (const b of phone) {
    assert.ok(b.body.includes('var(--_board-share)'), b.query);
    assert.ok(b.body.includes('100dvh'), b.query);
    assert.ok(b.body.includes('env(safe-area-inset'), b.query);
  }
});

test('phone layouts only touch the modal (dialog.frame), never inline', () => {
  for (const b of phone) {
    const selectors = b.body.split('{').slice(0, -1).map((chunk) => chunk.split('}').pop().trim());
    assert.ok(selectors.length > 0);
    for (const sel of selectors) assert.ok(sel.startsWith('dialog.frame'), `${b.query}: ${sel}`);
  }
});

test('the base board rule still uses board-height (desktop is unchanged)', () => {
  const base = themeCSS.replace(/@media[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  assert.match(base, /\.board\s*\{[^}]*height:\s*var\(--_board-height\)/);
});

test('board-share is a percentage token', () => {
  const t = TOKEN_DEFS.find((d) => d.name === 'board-share');
  assert.equal(t.kind, 'percentage');
  assert.equal(t.value, '75%');
});

test('the snake head does not depend on the time of the last step', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../src/snake-game.js', import.meta.url), 'utf8');
  assert.ok(!/_lastStep|headGrow/.test(source));
});
