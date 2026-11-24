import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { FAKE_URL, MODES, createFakeService } from '../demo/fake-service.js';

// The addon in a sandbox (as a classic script). Its username rules are also the ones the pretend service uses.
function loadAddon(extra = {}) {
  const warnings = [];
  const sandbox = {
    console: { warn: (m) => warnings.push(m), error() {}, log() {} },
    URL,
    AbortController,
    clearTimeout,
    setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms, 20)), // the 5 s timeout, in 20 ms
    document: { baseURI: 'https://game.example.org/' },
    ...extra,
  };
  vm.runInNewContext(readFileSync(new URL('../addons/leaderboard.js', import.meta.url), 'utf8'), sandbox);
  return { lib: sandbox.snakeGameAddons[0][1].lib, warnings };
}

const memory = () => {
  const data = {};
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  };
};
const rules = loadAddon().lib;
const plain = (value) => JSON.parse(JSON.stringify(value));

// One "browser": its own storage, with the service's data in `serviceStorage` (the service is shared between browsers).
function browser(serviceStorage, state, options = {}) {
  const service = createFakeService({ rules, storage: serviceStorage, state, delay: 0, slowDelay: 100, ...options });
  const localStorage = memory();
  const { lib, warnings } = loadAddon({ localStorage, fetch: service.fetch });
  const game = { getAttribute: () => null };
  return { localStorage, warnings, submit: (name, score) => lib.urlBackend(game, FAKE_URL).submit({ name, score }) };
}

test('the address is reserved (.invalid), so nothing can reach the network', () => {
  assert.match(new URL(FAKE_URL).hostname, /\.invalid$/);
});

test('works: the pretend service follows the contract (list, 201 with a key, then 200)', async () => {
  const storage = memory();
  const service = createFakeService({ rules, storage, delay: 0 });
  const list = await service.fetch(`${FAKE_URL}/scores?limit=10`);
  assert.equal(list.status, 200);
  assert.match(list.headers.get('content-type'), /application\/json/);
  const seeded = (await list.json()).top;
  assert.deepEqual(seeded.map((e) => [e.name, e.score]), [['Ana', 12], ['Bia', 9], ['Caio', 7], ['Duda', 5], ['Edu', 3]]);

  const post = (body) => service.fetch(`${FAKE_URL}/scores`, { method: 'POST', body: JSON.stringify(body) });
  const first = await post({ name: 'Carol', score: 10 });
  assert.equal(first.status, 201);
  const { key, top } = await first.json();
  assert.match(key, /^[A-Za-z0-9_-]{16,128}$/);
  assert.deepEqual(top.map((e) => e.name), ['Ana', 'Carol', 'Bia', 'Caio', 'Duda', 'Edu']);
  assert.equal((await post({ name: 'Carol', score: 10 })).status, 409);
  const again = await post({ name: 'cárol', score: 20, key });
  assert.equal(again.status, 200);
  assert.deepEqual((await again.json()).top.slice(0, 2).map((e) => [e.name, e.score]), [['cárol', 20], ['Ana', 12]]);
  const lower = await post({ name: 'Carol', score: 1, key });
  assert.equal((await lower.json()).top[0].score, 20); // a lower score does not change anything
});

test('works: the errors of the contract (400, 422 format, personal_data and rejected)', async () => {
  const service = createFakeService({ rules, storage: memory(), delay: 0 });
  const post = async (text) => {
    const r = await service.fetch(`${FAKE_URL}/scores`, { method: 'POST', body: text });
    return [r.status, (await r.json()).error];
  };
  assert.deepEqual(await post('{'), [400, 'bad_request']);
  assert.deepEqual(await post('{"name":"Carol","score":1.5}'), [400, 'bad_request']);
  assert.deepEqual(await post('{"name":"Carol","score":0}'), [400, 'bad_request']);
  assert.deepEqual(await post('{"name":"ab","score":5}'), [422, 'format']);
  assert.deepEqual(await post('{"name":"ana.com","score":5}'), [422, 'personal_data']);
  assert.deepEqual(await post('{"name":"Xxxxx","score":5}'), [422, 'rejected']);
});

test('end to end with the addon: the same browser gets 201 then 200; another browser with the same name gets 409', async () => {
  const shared = memory();
  const state = { mode: 'works' };
  const mine = browser(shared, state);
  const first = await mine.submit('Carol', 10);
  assert.equal(first.me, 1);
  assert.ok(Object.keys(mine.localStorage.data).includes('snake-game-leaderboard-keys'));
  const update = await mine.submit('Carol', 30);
  assert.deepEqual(plain(update.top.slice(0, 2)), [{ name: 'Carol', score: 30 }, { name: 'Ana', score: 12 }]);
  assert.equal(update.me, 0);

  const other = browser(shared, state);
  await assert.rejects(other.submit('carol', 99), (e) => e.code === 'taken');
  await assert.rejects(other.submit('ana', 20), (e) => e.code === 'taken'); // a name of the seeds
});

test('every state gives the right code to the addon', async () => {
  const expected = {
    taken: 'taken',
    rejected: 'rejected',
    unknown422: 'rejected',
    rate: 'rate_limited',
    unexpected: 'offline',
    broken: 'offline',
    offline: 'offline',
    slow: 'offline',
  };
  assert.deepEqual(Object.keys(MODES).sort(), ['works', ...Object.keys(expected)].sort());
  for (const [mode, code] of Object.entries(expected)) {
    const state = { mode };
    const b = browser(memory(), state);
    await assert.rejects(b.submit('Carol', 5), (e) => e.code === code, mode);
  }
});

test('the console says why for the offline states', async () => {
  const warnFor = async (mode) => {
    const b = browser(memory(), { mode });
    await b.submit('Carol', 5).catch(() => {});
    return b.warnings;
  };
  assert.deepEqual(await warnFor('unexpected'), ['snake-game leaderboard: unexpected response 403']);
  assert.deepEqual(await warnFor('broken'), ['snake-game leaderboard: unexpected response 200']);
  assert.deepEqual(await warnFor('offline'), ['snake-game leaderboard: network error']);
  assert.deepEqual(await warnFor('slow'), ['snake-game leaderboard: timeout']);
});

test('the mode can change at any time, and a request that is aborted stops', async () => {
  const state = { mode: 'offline' };
  const b = browser(memory(), state);
  await assert.rejects(b.submit('Carol', 5), (e) => e.code === 'offline');
  state.mode = 'works';
  assert.equal((await b.submit('Carol', 5)).top.length, 6);
  const service = createFakeService({ rules, storage: memory(), state: { mode: 'slow' }, slowDelay: 1000 });
  const control = new AbortController();
  const pending = service.fetch(`${FAKE_URL}/scores`, { signal: control.signal });
  control.abort();
  await assert.rejects(pending, (e) => e.name === 'AbortError');
});

test('clear() forgets the pretend service data', async () => {
  const storage = memory();
  const service = createFakeService({ rules, storage, delay: 0 });
  await service.fetch(`${FAKE_URL}/scores`, { method: 'POST', body: '{"name":"Carol","score":5}' });
  assert.ok(Object.keys(storage.data).length > 0);
  service.clear();
  assert.deepEqual(Object.keys(storage.data), []);
});
