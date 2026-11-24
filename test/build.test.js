import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { bundle, stripComments } from '../scripts/build.js';

const distPath = new URL('../dist/snake-game.js', import.meta.url);
const normalize = (text) => text.replace(/\r\n/g, '\n');

test('dist/snake-game.js is up to date', () => {
  const saved = normalize(readFileSync(distPath, 'utf8'));
  assert.equal(saved, normalize(bundle()), 'dist/snake-game.js is out of date. Run npm run build');
});

function runDist(sandbox) {
  const script = new vm.Script(readFileSync(distPath, 'utf8'));
  script.runInContext(sandbox);
}

function makeSandbox() {
  const defined = [];
  const warnings = [];
  const registry = new Map();
  const sandbox = {
    HTMLElement: class {},
    customElements: {
      get: (name) => registry.get(name),
      define: (name, ctor) => { defined.push(name); registry.set(name, ctor); },
    },
    console: { warn: (m) => warnings.push(m), error() {}, log() {} },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  return { sandbox, defined, warnings };
}

test('the dist runs as a classic script and registers the tag and the global', () => {
  const { sandbox, defined } = makeSandbox();
  runDist(sandbox);
  assert.deepEqual(defined, ['snake-game']);
  const engine = sandbox.SnakeGame.createEngine({ cols: 10, rows: 10 });
  assert.equal(engine.step(), true);
  for (const name of ['SnakeGameElement', 'drawGrid', 'drawSnake', 'drawFood', 'directionFromKey', 'directionFromSwipe', 'registerSkin']) {
    assert.equal(typeof sandbox.SnakeGame[name], 'function', name);
  }
});

test('loading the dist twice registers the tag once and keeps the first global', () => {
  const { sandbox, defined, warnings } = makeSandbox();
  runDist(sandbox);
  const first = sandbox.SnakeGame;
  runDist(sandbox);
  assert.equal(defined.length, 1);
  assert.equal(sandbox.SnakeGame, first);
  assert.equal(warnings.length, 1);
});

test('the dist does not contain the skin files (they are optional)', () => {
  const text = readFileSync(distPath, 'utf8');
  for (const emoji of ['🎄', '👻', '💃']) assert.ok(!text.includes(emoji), emoji);
  assert.ok(!text.includes("push(['natal'"));
});

test('skins queued before the dist loads are registered, and later ones register at once', () => {
  const { sandbox, warnings } = makeSandbox();
  const skin = { foods: [{ emoji: 'A', names: { en: 'a' } }], palette: {} };
  const bad = { foods: [{}] }; // an invalid food makes the skin warn, which shows it was processed
  sandbox.snakeGameSkins = [['antes', skin], ['fila', bad]];
  runDist(sandbox);
  assert.ok(warnings.some((m) => m.includes('skin "fila"')), 'the queued skin was registered');
  assert.equal(Array.isArray(sandbox.snakeGameSkins), false);
  assert.equal(typeof sandbox.snakeGameSkins.push, 'function');
  sandbox.snakeGameSkins.push(['depois', skin], ['tarde', bad]);
  assert.ok(warnings.some((m) => m.includes('skin "tarde"')), 'a later push registers at once');
  assert.equal(sandbox.SnakeGame.registerSkin('antes', skin), true, 'registering again replaces');
  assert.equal(sandbox.SnakeGame.registerSkin('x', null), false);
  assert.equal(sandbox.SnakeGame.registerSkin('', skin), false);
});

test('a bad item in the queue does not stop the game from loading, and the good one after it registers', () => {
  const { sandbox, defined, warnings } = makeSandbox();
  sandbox.snakeGameSkins = [null, 'x', ['ruim', 5], ['bom', { foods: [{ emoji: 'A', names: { en: 'a' } }, {}], palette: 7 }]];
  runDist(sandbox);
  assert.deepEqual(defined, ['snake-game']);
  assert.equal(typeof sandbox.SnakeGame.registerSkin, 'function');
  assert.ok(warnings.some((m) => m.includes('[name, skin]')), 'a bad item warns');
  assert.ok(warnings.some((m) => m.includes('skin "bom"')), 'the good skin was processed (its bad parts warn)');
  assert.equal(sandbox.SnakeGame.registerSkin(7, {}), false);
  assert.equal(sandbox.SnakeGame.registerSkin('', {}), false);
});

function withFixture(files, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'snake-build-'));
  try {
    for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('the build fails with file:line on export default', () => {
  withFixture({ 'a.js': 'const x = 1;\nexport default x;\n' }, (dir) => {
    assert.throws(() => bundle(join(dir, 'a.js')), /a\.js:2: export default/);
  });
});

test('the build fails with file:line on a repeated top-level name', () => {
  withFixture({
    'a.js': "import { y } from './b.js';\nexport const z = y;\nconst y2 = 1;\nconst shared = 1;\n",
    'b.js': 'export const y = 2;\nconst shared = 2;\n',
  }, (dir) => {
    assert.throws(() => bundle(join(dir, 'a.js')), /a\.js:\d+: "shared" is already declared in/);
  });
});

test('the build fails on circular imports', () => {
  withFixture({
    'a.js': "import { b } from './b.js';\nexport const a = 1;\n",
    'b.js': "import { a } from './a.js';\nexport const b = 2;\n",
  }, (dir) => {
    assert.throws(() => bundle(join(dir, 'a.js')), /circular/);
  });
});

test('stripComments removes // and /* */ comments and the lines that only held them', () => {
  const out = stripComments('// top\nconst a = 1; // end\n/* block\nover lines */\nconst b = /* mid */ 2;\n  // indented\nconst c = 3;\n');
  assert.equal(out, 'const a = 1;\nconst b = 2;\nconst c = 3;\n');
});

test('stripComments keeps // and /* inside strings, templates (also nested) and regex', () => {
  const samples = [
    "const u = 'http://a.b/c'; const v = \"//x /* y */\";",
    'const t = `a // b /* c */ ${x}`;',
    'const t = `a ${`b // ${c} /* d */`} // e ${ { k: 1 }.k } /* f */`;',
    'const r = /\\/\\/ [/] \\/*x/g; const q = str.replace(/\'/g, "");',
    'const d = a / b; const e = c / d; // comment',
    'return /ab\\/\\/c/.test(x);',
    "const s = 'it\\'s // fine';",
  ];
  for (const sample of samples) {
    const out = stripComments(sample);
    assert.equal(out, sample.replace(/ \/\/ comment$/, ''), sample);
  }
  // Code after a template or a regex is still scanned, so a real comment there goes away.
  assert.equal(stripComments('const t = `x // y`; // gone\nconst r = /a\\/\\//; /* gone */ let z;'), 'const t = `x // y`;\nconst r = /a\\/\\//; let z;');
});

test('stripComments is safe on every source file: the result still parses and keeps every string', () => {
  for (const file of ['engine', 'input', 'text', 'geometry', 'theme', 'skins', 'read-tokens', 'renderers', 'snake-game']) {
    const src = readFileSync(new URL(`../src/${file}.js`, import.meta.url), 'utf8');
    const out = stripComments(src);
    assert.ok(out.length < src.length, file);
    const strings = (text) => (text.match(/'[^'\n]*'/g) || []).filter((x) => !x.includes('//'));
    for (const str of strings(out)) assert.ok(src.includes(str), `${file}: ${str}`);
    assert.doesNotThrow(() => new vm.Script(out.replace(/^(import|export \{)[^\n]*\n/gm, '').replace(/^export /gm, '')), file);
  }
});

test('the dist has no comment from src/ (only the header and the file markers)', () => {
  const text = readFileSync(distPath, 'utf8');
  assert.ok(!text.includes('Next food index'), 'comment of src/skins.js');
  assert.ok(!text.includes('Node (the tests) has no HTMLElement'), 'comment of src/snake-game.js');
  assert.ok(!text.includes('Phones: a touch screen'), 'comment of src/theme.js');
  const lines = text.split('\n').filter((l) => /^\s*\/\//.test(l));
  for (const line of lines) assert.match(line, /^\/\/ ---- (src\/[\w-]+\.js|global) ----$/);
  // The CSS comments live inside template literals and must stay (the stylesheet is built from them).
  assert.ok(text.includes('/* Fills the container also in flex/grid rows'));
});

test('the dist does not contain the addons (they are optional files)', () => {
  const text = readFileSync(distPath, 'utf8');
  assert.ok(!text.includes("push(['leaderboard'"));
  assert.ok(!text.includes('checkName'));
  assert.ok(!text.includes('lb-field'));
  // The game only has the hook: the addons queue and the box it gives to the addon.
  assert.ok(text.includes('snakeGameAddons'));
});

test('addons queued before the dist loads, and later ones, are accepted; a bad item warns and the next ones still work', () => {
  const { sandbox, warnings } = makeSandbox();
  sandbox.snakeGameAddons = [['antes', () => {}], 'not a pair', ['sem-funcao', 5]];
  runDist(sandbox);
  assert.deepEqual(warnings.filter((m) => m.includes('addon')), [
    '<snake-game> an addon in the queue must be [name, addon]. Skipped.',
    '<snake-game> TypeError: an addon must be a function. Skipped.',
  ]);
  const before = warnings.length;
  sandbox.snakeGameAddons.push(['depois', () => {}]);
  assert.equal(warnings.length, before);
  sandbox.snakeGameAddons.push(['ruim', null]);
  assert.equal(warnings.length, before + 1);
  assert.equal(Array.isArray(sandbox.snakeGameAddons), false);
});

test('the skin queue still works the same way with the generic queue helper', () => {
  const { sandbox, warnings } = makeSandbox();
  sandbox.snakeGameSkins = [5];
  runDist(sandbox);
  assert.deepEqual(warnings, ['<snake-game> a skin in the queue must be [name, skin]. Skipped.']);
});
