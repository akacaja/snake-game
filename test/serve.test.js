import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer, lanAddresses, normalizeBase, parseArgs, serverUrls } from '../scripts/serve.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

test('parseArgs: port and --base', () => {
  assert.deepEqual(parseArgs([], {}), { port: 8000, base: '' });
  assert.deepEqual(parseArgs(['9000'], {}), { port: 9000, base: '' });
  assert.deepEqual(parseArgs(['--base', '/snake-game/'], {}), { port: 8000, base: '/snake-game' });
  assert.deepEqual(parseArgs(['--base=snake-game'], {}), { port: 8000, base: '/snake-game' });
  assert.deepEqual(parseArgs(['8123', '--base', '/x/'], {}), { port: 8123, base: '/x' });
  assert.deepEqual(parseArgs(['--base', '/x/', '8123'], {}), { port: 8123, base: '/x' });
  assert.deepEqual(parseArgs([], { PORT: '8500' }), { port: 8500, base: '' });
  assert.throws(() => parseArgs(['--base'], {}), /--base needs a value/);
});

test('normalizeBase', () => {
  assert.equal(normalizeBase(''), '');
  assert.equal(normalizeBase('/'), '');
  assert.equal(normalizeBase('x'), '/x');
  assert.equal(normalizeBase('/x'), '/x');
  assert.equal(normalizeBase('/x/'), '/x');
  assert.equal(normalizeBase('/a/b/'), '/a/b');
  for (const bad of ['/../x', '/x?y', '/x#y', '//x', '/a//b']) assert.throws(() => normalizeBase(bad), /Invalid --base/);
});

test('lanAddresses keeps only external IPv4, without repeats', () => {
  const fake = {
    lo0: [{ family: 'IPv4', address: '127.0.0.1', internal: true }],
    en0: [
      { family: 'IPv6', address: 'fe80::1', internal: false },
      { family: 'IPv4', address: '192.168.0.12', internal: false },
    ],
    en1: [{ family: 'IPv4', address: '192.168.0.12', internal: false }],
    utun: [{ family: 4, address: '10.0.0.5', internal: false }],
  };
  assert.deepEqual(lanAddresses(fake), ['192.168.0.12', '10.0.0.5']);
  assert.deepEqual(lanAddresses({}), []);
});

test('serverUrls', () => {
  const plain = serverUrls({ port: 8000, base: '', addresses: ['192.168.0.12'] });
  assert.deepEqual(plain.local, ['http://localhost:8000/demo/', 'http://localhost:8000/examples/module.html']);
  assert.deepEqual(plain.network, ['http://192.168.0.12:8000/demo/']);
  const sub = serverUrls({ port: 8000, base: '/snake-game', addresses: ['192.168.0.12'] });
  assert.ok(sub.local.includes('http://localhost:8000/snake-game/demo/'));
  assert.ok(sub.local.includes('http://localhost:8000/snake-game'));
  assert.deepEqual(sub.network, ['http://192.168.0.12:8000/snake-game/demo/']);
  assert.deepEqual(serverUrls({ port: 8000 }).network, []);
});

async function withServer(base, fn) {
  const server = createStaticServer({ root, base });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(origin);
  } finally {
    await new Promise((ok) => server.close(ok));
  }
}

async function status(origin, path) {
  const res = await fetch(origin + path);
  await res.arrayBuffer();
  return res;
}

test('server without base serves the site as before', async () => {
  await withServer('', async (origin) => {
    const expected = {
      '/demo/': 'text/html',
      '/examples/module.html': 'text/html',
      '/dist/snake-game.js': 'text/javascript',
      '/demo/favicon.svg': 'image/svg+xml',
      '/': 'text/html',
    };
    for (const [path, type] of Object.entries(expected)) {
      const res = await status(origin, path);
      assert.equal(res.status, 200, path);
      assert.ok(res.headers.get('content-type').startsWith(type), `${path}: ${res.headers.get('content-type')}`);
    }
    assert.equal((await status(origin, '/nao-existe')).status, 404);
    assert.notEqual((await status(origin, '/%2e%2e/%2e%2e/etc/passwd')).status, 200);
  });
});

test('server with base /snake-game/ behaves like GitHub Pages in a subfolder', async () => {
  await withServer('/snake-game', async (origin) => {
    for (const path of [
      '/snake-game/demo/',
      '/snake-game/examples/minimal.html',
      '/snake-game/dist/snake-game.js',
      '/snake-game/',
      '/snake-game',
    ]) {
      assert.equal((await status(origin, path)).status, 200, path);
    }
    for (const path of ['/demo/', '/', '/snake-gamex/demo/', '/snake-game/../package.json']) {
      assert.equal((await status(origin, path)).status, 404, path);
    }
  });
});

test('hidden files and folders are never served (404), with and without base', async () => {
  // (The URL parser already turns '/demo/.' into '/demo/', so it never reaches the server as a hidden path.)
  const hidden = [
    '/.git/config',
    '/.crew/profile.md',
    '/.crew/nomes-proibidos.txt',
    '/.DS_Store',
    '/demo/.hidden',
    '/%2egit/config',
    '/.git%2Fconfig',
    '/demo/%2e/.crew/profile.md',
  ];
  // The URL parser resolves these before the server sees them (to '/' and '/package.json'), so without a base
  // they are ordinary files; with a base they fall outside it (404).
  const dots = ['/%2e%2e', '/%2e%2e/package.json'];
  await withServer('', async (origin) => {
    for (const path of hidden) assert.equal((await status(origin, path)).status, 404, path);
    for (const path of ['/demo/', '/examples/module.html', '/dist/snake-game.js', '/demo/favicon.svg']) {
      assert.equal((await status(origin, path)).status, 200, path);
    }
  });
  await withServer('/snake-game', async (origin) => {
    for (const path of hidden.map((p) => '/snake-game' + p)) assert.equal((await status(origin, path)).status, 404, path);
    for (const path of dots.map((p) => '/snake-game' + p)) assert.notEqual((await status(origin, path)).status, 200, path);
    for (const path of ['/snake-game/demo/', '/snake-game/examples/module.html', '/snake-game/dist/snake-game.js', '/snake-game/demo/favicon.svg']) {
      assert.equal((await status(origin, path)).status, 200, path);
    }
  });
});
