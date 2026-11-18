import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The demo and the examples must work when the site is published in a subfolder
// (like https://user.github.io/snake-game/demo/). So every path they use has to be
// relative: a path that starts with "/" would point to the root of the whole site.

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (file) => readFileSync(join(root, file), 'utf8');

const PAGES = ['index.html', 'demo/index.html', 'examples/module.html', 'examples/minimal.html'];
const SCRIPTS = readdirSync(join(root, 'demo')).filter((f) => f.endsWith('.js')).map((f) => `demo/${f}`);
const SKIP = /^(https?:|mailto:|data:|#|javascript:)/i;

// Finds src=, href=, import ... from, import '...', import('...') and url(...).
export function findReferences(text) {
  const refs = [];
  const patterns = [
    /\b(?:src|href)\s*=\s*"([^"]*)"/g,
    /\b(?:src|href)\s*=\s*'([^']*)'/g,
    /\bimport\s+(?:[\w*{}\s,]+?\s+from\s+)?['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\burl\(\s*['"]?([^'")]+)['"]?\s*\)/g,
  ];
  for (const re of patterns) for (const m of text.matchAll(re)) refs.push(m[1]);
  return refs.filter((r) => r && !SKIP.test(r));
}

export function problemsIn(file, text) {
  const problems = [];
  for (const ref of findReferences(text)) {
    if (ref.startsWith('/')) {
      problems.push(`${file}: "${ref}" starts with "/" (breaks in a subfolder)`);
      continue;
    }
    let target = resolve(root, dirname(file), ref.split(/[?#]/)[0]);
    if (existsSync(target) && statSync(target).isDirectory()) target = join(target, 'index.html');
    if (!existsSync(target)) problems.push(`${file}: "${ref}" does not exist`);
  }
  return problems;
}

test('pages, demo scripts and examples use only relative paths to files that exist', () => {
  for (const file of [...PAGES, ...SCRIPTS]) {
    assert.deepEqual(problemsIn(file, read(file)), []);
  }
});

test('the check finds paths that start with "/" and paths to missing files', () => {
  const bad = '<script src="/src/snake-game.js"></script><link href="nao-existe.css" rel="stylesheet">';
  assert.equal(problemsIn('demo/index.html', bad).length, 2);
  assert.equal(problemsIn('demo/index.html', "import '/src/x.js'").length, 1);
  assert.equal(problemsIn('demo/index.html', '<script src="https://example.org/a.js"></script>').length, 0);
});

// The temporary root page: run its inline script with a fake location.
function redirectFrom(pathname, search = '', hash = '') {
  const html = read('index.html');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const link = { href: '' };
  let replaced = null;
  const context = {
    location: { pathname, search, hash, replace: (url) => { replaced = url; } },
    document: { getElementById: (id) => (id === 'demo-link' ? link : null) },
  };
  vm.runInNewContext(script, context);
  assert.equal(link.href, replaced, 'the visible link matches the redirect');
  return replaced;
}

test('the root page sends /snake-game, /snake-game/ and /snake-game/index.html to /snake-game/demo/', () => {
  assert.equal(redirectFrom('/snake-game'), '/snake-game/demo/');
  assert.equal(redirectFrom('/snake-game/'), '/snake-game/demo/');
  assert.equal(redirectFrom('/snake-game/index.html'), '/snake-game/demo/');
});

test('the root page sends / and /index.html to /demo/, keeping ?query and #hash', () => {
  assert.equal(redirectFrom('/'), '/demo/');
  assert.equal(redirectFrom('/index.html'), '/demo/');
  assert.equal(redirectFrom('/snake-game/', '?a=1', '#x'), '/snake-game/demo/?a=1#x');
});
