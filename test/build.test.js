import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { bundle } from '../scripts/build.js';

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
  for (const name of ['SnakeGameElement', 'drawGrid', 'drawSnake', 'drawFood', 'directionFromKey', 'directionFromSwipe']) {
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
