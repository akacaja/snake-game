import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const file = new URL('../addons/leaderboard.js', import.meta.url);
const plain = (value) => JSON.parse(JSON.stringify(value)); // the addon runs in its own realm: compare plain data

// Runs the addon as a classic script, like a <script> tag, and returns its parts. `extra` adds browser things to the sandbox.
function load(extra = {}) {
  const warnings = [];
  const sandbox = {
    console: { warn: (m) => warnings.push(m), error() {}, log() {} },
    URL,
    AbortController,
    clearTimeout,
    setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms, 20)), // the 5 s timeout, in 20 ms
    document: { baseURI: 'https://game.example.org/page/' },
    ...extra,
  };
  vm.runInNewContext(readFileSync(file, 'utf8'), sandbox);
  const [name, fn] = sandbox.snakeGameAddons[0];
  return { name, fn, lib: fn.lib, warnings, sandbox };
}

const gameWith = (attrs = {}, leaderboard) => ({ getAttribute: (n) => (n in attrs ? attrs[n] : null), leaderboard });

function memoryStorage(seed = {}, { broken = false } = {}) {
  const data = { ...seed };
  const calls = { set: [] };
  return {
    data,
    calls,
    getItem: (k) => { if (broken) throw new Error('blocked'); return k in data ? data[k] : null; },
    setItem: (k, v) => { calls.set.push(k); if (broken) throw new Error('blocked'); data[k] = String(v); },
  };
}

const { lib, name: addonName, fn } = load();

test('the addon registers itself in the addons queue as "leaderboard"', () => {
  assert.equal(addonName, 'leaderboard');
  assert.equal(typeof fn, 'function');
});

test('username rules: each bad name gets the right message', () => {
  const error = (raw) => lib.checkName(raw).error;
  for (const raw of ['ab', '', 'abcdefghijklm']) assert.equal(error(raw), 'length', raw);
  for (const raw of ['a b', 'a\u{1F600}b', 'ab​c', 'abㅤc', 'ab️c', '1⃣ab', 'ab c']) assert.equal(error(raw), 'chars', JSON.stringify(raw));
  for (const raw of ['_ana', '123', '-ana', '1_2', '1.2.3', '12-34-5', '___1']) assert.equal(error(raw), 'start', raw);
  for (const raw of ['ana@x', 'www.ana', 'x.com', 'site.com.br', 'carol.me', 'http:ab', 'ana123456', 'ana-12-34-56', '１２３４５６ab']) {
    assert.equal(error(raw), 'personal-data', raw);
  }
});

test('username rules: good names pass, and the name is trimmed', () => {
  for (const raw of ['José', 'ana.maria', '1_2a', 'ca.rol', 'ana12345', 'Ana-Lu', 'abc', 'abcdefghijkl']) assert.equal(lib.checkName(raw).error, null, raw);
  assert.deepEqual(plain(lib.checkName('  Carol  ')), { name: 'Carol', error: null });
  assert.equal(lib.checkName('﻿Carol').name, 'Carol');
});

test('username rules: the first rule that fails decides the message', () => {
  assert.equal(lib.checkName('a b@x.com').error, 'personal-data');
  assert.equal(lib.checkName('a\u{1F600}').error, 'chars');
  assert.equal(lib.checkName('___').error, 'start');
});

test('a name with many combining marks is too long (counted by code point)', () => {
  assert.equal(lib.checkName(`a${'́̂̃̄'.repeat(5)}`).error, 'length');
});

test('nameKey: Carol, carol, cárol, ca_rol, CA.RÓL and a full-width Carol are the same name; Carla is not', () => {
  const keys = ['Carol', 'carol', 'cárol', 'ca_rol', 'CA.RÓL', 'Ｃａｒｏｌ'].map(lib.nameKey);
  assert.deepEqual(new Set(keys), new Set(['carol']));
  assert.notEqual(lib.nameKey('Carla'), 'carol');
});

test('addScore: a lower score does not replace a higher one, but the newest spelling is kept', () => {
  const first = lib.addScore([], 'Carol', 42);
  const lower = lib.addScore(first.list, 'cárol', 10);
  assert.deepEqual(plain(lower.list), [{ name: 'cárol', score: 42 }]);
  assert.equal(lower.me, 0);
});

test('addScore: a higher score moves the name up, a tie keeps who came first, the list stops at 10', () => {
  let list = [];
  for (const [n, s] of [['Ana', 12], ['Bia', 9], ['Caio', 7]]) list = lib.addScore(list, n, s).list;
  const up = lib.addScore(list, 'Caio', 20);
  assert.deepEqual(plain(up.list.map((e) => e.name)), ['Caio', 'Ana', 'Bia']);
  assert.equal(up.me, 0);
  const tie = lib.addScore(list, 'Duda', 9);
  assert.deepEqual(plain(tie.list.map((e) => e.name)), ['Ana', 'Bia', 'Duda', 'Caio']);
  assert.equal(tie.me, 2);
  let full = [];
  for (let i = 1; i <= 12; i += 1) full = lib.addScore(full, `Player${String.fromCharCode(96 + i)}`, i * 10).list;
  assert.equal(full.length, 10);
  assert.equal(full[0].score, 120);
  const out = lib.addScore(full, 'Zed', 1);
  assert.equal(out.me, -1);
  assert.equal(out.list.length, 10);
});

test('readList: corrupted data is ignored, bad entries go, repeated names keep the best score, at most 10', () => {
  for (const raw of [null, '', '{', '"x"', '{}', '5']) assert.deepEqual(plain(lib.readList(raw)), [], String(raw));
  const raw = JSON.stringify([
    { name: 'Carol', score: 5 }, { name: 'cárol', score: 9 }, { name: 'ab', score: 50 }, { name: 'Ana', score: 0 },
    { name: 'Bia', score: 1.5 }, { name: 'Caio', score: '7' }, null, { name: 'Edu', score: 3 },
  ]);
  assert.deepEqual(plain(lib.readList(raw)), [{ name: 'cárol', score: 9 }, { name: 'Edu', score: 3 }]);
  const many = JSON.stringify(Array.from({ length: 15 }, (_, i) => ({ name: `Player${String.fromCharCode(97 + i)}`, score: i + 1 })));
  assert.equal(lib.readList(many).length, 10);
});

test('local backend: saves the list and never calls fetch', async () => {
  const storage = memoryStorage();
  const sandbox = load({ localStorage: storage, fetch: () => assert.fail('the local ranking must not use the network') });
  const backend = sandbox.lib.localBackend(gameWith());
  let result = await backend.submit({ name: 'Carol', score: 42 });
  assert.deepEqual(plain(result), { top: [{ name: 'Carol', score: 42 }], me: 0 });
  result = await backend.submit({ name: 'ca_rol', score: 10 });
  assert.deepEqual(plain(result), { top: [{ name: 'ca_rol', score: 42 }], me: 0 });
  assert.deepEqual(JSON.parse(storage.data['snake-game-leaderboard']), [{ name: 'ca_rol', score: 42 }]);
});

test('local backend: leaderboard-key sets the key; an empty key stores nothing; broken storage does not break it', async () => {
  const storage = memoryStorage();
  const sandbox = load({ localStorage: storage });
  await sandbox.lib.localBackend(gameWith({ 'leaderboard-key': 'mine' })).submit({ name: 'Ana', score: 3 });
  assert.deepEqual(Object.keys(storage.data), ['mine']);
  const before = storage.calls.set.length;
  const result = await sandbox.lib.localBackend(gameWith({ 'leaderboard-key': '' })).submit({ name: 'Ana', score: 3 });
  assert.equal(storage.calls.set.length, before);
  assert.equal(result.top.length, 1);
  const broken = load({ localStorage: memoryStorage({}, { broken: true }) });
  const fine = await broken.lib.localBackend(gameWith()).submit({ name: 'Ana', score: 3 });
  assert.equal(fine.top.length, 1);
  const none = await load({}).lib.localBackend(gameWith()).submit({ name: 'Ana', score: 3 }); // no localStorage at all
  assert.equal(none.top.length, 1);
});

// A fetch that answers with the next item of `answers`: [status, body] or an Error to throw.
function fakeFetch(answers, calls = []) {
  return Object.assign(async (url, init) => {
    calls.push({ url, init });
    const next = answers.shift();
    if (next instanceof Error) throw next;
    const [status, body] = next;
    return { status, json: async () => { if (body === undefined) throw new SyntaxError('bad json'); return body; } };
  }, { calls });
}

const ADDRESS = 'https://scores.example.org/api';
const TOP = [{ name: 'Carol', score: 42 }, { name: 'Ana', score: 12 }];
const KEY = 'k7Qf2m9Xr4TzP1bW8sLc0A';

test('url backend: request shape, privacy options, and the key from the first 201 is sent from then on', async () => {
  const storage = memoryStorage();
  const f = fakeFetch([[201, { key: KEY, top: TOP }], [200, { top: TOP }]]);
  const { lib: l, warnings } = load({ localStorage: storage, fetch: f });
  const backend = l.urlBackend(gameWith(), `${ADDRESS}/`);
  const first = await backend.submit({ name: 'Carol', score: 42 });
  assert.deepEqual(plain(first), { top: TOP, me: 0 });
  const call = f.calls[0];
  assert.equal(call.url, `${ADDRESS}/scores`);
  assert.equal(call.init.method, 'POST');
  assert.equal(call.init.credentials, 'omit');
  assert.equal(call.init.referrerPolicy, 'no-referrer');
  assert.equal(call.init.headers.Accept, 'application/json');
  assert.equal(call.init.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(call.init.body), { name: 'Carol', score: 42 });
  assert.deepEqual(JSON.parse(storage.data['snake-game-leaderboard-keys']), { [ADDRESS]: { carol: KEY } });
  await backend.submit({ name: 'cárol', score: 50 });
  assert.deepEqual(JSON.parse(f.calls[1].init.body), { name: 'cárol', score: 50, key: KEY });
  assert.deepEqual(warnings, []);
});

test('url backend: another service gets no key; a stored key in a bad format is ignored', async () => {
  const stored = { [ADDRESS]: { carol: KEY }, 'https://bad.example.org': { carol: 'short' } };
  const storage = memoryStorage({ 'snake-game-leaderboard-keys': JSON.stringify(stored) });
  const f = fakeFetch([[200, { top: TOP }], [200, { top: TOP }]]);
  const { lib: l } = load({ localStorage: storage, fetch: f });
  await l.urlBackend(gameWith(), 'https://other.example.org').submit({ name: 'Carol', score: 1 });
  assert.deepEqual(JSON.parse(f.calls[0].init.body), { name: 'Carol', score: 1 });
  await l.urlBackend(gameWith(), 'https://bad.example.org').submit({ name: 'Carol', score: 1 });
  assert.deepEqual(JSON.parse(f.calls[1].init.body), { name: 'Carol', score: 1 });
});

test('url backend: a relative address is resolved against the page', async () => {
  const f = fakeFetch([[200, { top: TOP }]]);
  const { lib: l } = load({ localStorage: memoryStorage(), fetch: f });
  await l.urlBackend(gameWith(), '/api/').submit({ name: 'Carol', score: 1 });
  assert.equal(f.calls[0].url, 'https://game.example.org/api/scores');
});

// Each row of the table "how the game reads each answer" in docs/leaderboard-api.md: [answer, code, console warning].
const ANSWERS = [
  [[409, { error: 'taken' }], 'taken', ''],
  [[409, undefined], 'taken', ''],
  [[422, { error: 'format' }], 'format', ''],
  [[422, { error: 'personal_data' }], 'personal_data', ''],
  [[422, { error: 'rejected' }], 'rejected', ''],
  [[422, { error: 'whatever' }], 'rejected', ''],
  [[422, {}], 'rejected', ''],
  [[422, undefined], 'rejected', ''],
  [[429, { error: 'rate_limited' }], 'rate_limited', ''],
  [[400, { error: 'bad_request' }], 'offline', 'unexpected response 400'],
  [[401, {}], 'offline', 'unexpected response 401'],
  [[403, {}], 'offline', 'unexpected response 403'],
  [[404, {}], 'offline', 'unexpected response 404'],
  [[413, {}], 'offline', 'unexpected response 413'],
  [[500, {}], 'offline', 'unexpected response 500'],
  [[503, { error: 'unavailable' }], 'offline', 'unexpected response 503'],
  [[200, undefined], 'offline', 'unexpected response 200'],
  [[200, { top: 'nope' }], 'offline', 'unexpected response 200'],
  [[200, { top: { a: 1 } }], 'offline', 'unexpected response 200'],
  [[200, { top: [{ name: 'Ana' }] }], 'offline', 'unexpected response 200'],
  [[201, { key: KEY, top: [1] }], 'offline', 'unexpected response 201'],
  [[204, undefined], 'offline', 'unexpected response 204'],
];

for (const [answer, code, warning] of ANSWERS) {
  test(`url backend: ${answer[0]} ${JSON.stringify(answer[1])} -> ${code}${warning ? ' with a console warning' : ''}`, async () => {
    const { lib: l, warnings } = load({ localStorage: memoryStorage(), fetch: fakeFetch([answer]) });
    await assert.rejects(l.urlBackend(gameWith(), ADDRESS).submit({ name: 'Carol', score: 1 }), (e) => e.code === code);
    assert.deepEqual(warnings, warning ? [`snake-game leaderboard: ${warning}`] : []);
  });
}

test('url backend: an answer without a list asks for it with GET /scores?limit=10', async () => {
  const f = fakeFetch([[200, {}], [200, { top: TOP }]]);
  const { lib: l } = load({ localStorage: memoryStorage(), fetch: f });
  const result = await l.urlBackend(gameWith(), ADDRESS).submit({ name: 'Ana', score: 12 });
  assert.equal(f.calls[1].url, `${ADDRESS}/scores?limit=10`);
  assert.equal(f.calls[1].init.method, undefined);
  assert.equal(f.calls[1].init.body, undefined);
  assert.equal(f.calls[1].init.headers['Content-Type'], undefined);
  assert.equal(result.me, 1);
  const bad = load({ localStorage: memoryStorage(), fetch: fakeFetch([[200, {}], [500, {}]]) });
  await assert.rejects(bad.lib.urlBackend(gameWith(), ADDRESS).submit({ name: 'Ana', score: 12 }), (e) => e.code === 'offline');
});

test('url backend: network failure, timeout and an invalid address are offline, with the reason in the console', async () => {
  const net = load({ localStorage: memoryStorage(), fetch: fakeFetch([new TypeError('failed')]) });
  await assert.rejects(net.lib.urlBackend(gameWith(), ADDRESS).submit({ name: 'Ana', score: 1 }), (e) => e.code === 'offline');
  assert.deepEqual(net.warnings, ['snake-game leaderboard: network error']);

  let signal = null;
  const slow = load({
    localStorage: memoryStorage(),
    fetch: (url, init) => new Promise((resolve, reject) => {
      signal = init.signal;
      init.signal.addEventListener('abort', () => reject(new Error('aborted')));
    }),
  });
  await assert.rejects(slow.lib.urlBackend(gameWith(), ADDRESS).submit({ name: 'Ana', score: 1 }), (e) => e.code === 'offline');
  assert.equal(signal.aborted, true);
  assert.deepEqual(slow.warnings, ['snake-game leaderboard: timeout']);

  const bad = load({ localStorage: memoryStorage(), fetch: () => assert.fail('no request for an invalid address') });
  for (const address of ['not a url', 'ftp://example.org']) {
    await assert.rejects(bad.lib.urlBackend(gameWith(), address).submit({ name: 'Ana', score: 1 }), (e) => e.code === 'offline');
  }
  assert.equal(bad.warnings.length, 2);
});

test('url backend: a request cancelled by the game is offline without a console warning', async () => {
  const control = new AbortController();
  const { lib: l, warnings } = load({
    localStorage: memoryStorage(),
    fetch: (url, init) => new Promise((resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')))),
  });
  const pending = l.urlBackend(gameWith(), ADDRESS).submit({ name: 'Ana', score: 1 }, control.signal);
  control.abort();
  await assert.rejects(pending, (e) => e.code === 'offline');
  assert.deepEqual(warnings, []);
});

test('url backend: the key is only saved when it has the right format, and not when leaderboard-key is empty', async () => {
  const storage = memoryStorage();
  const { lib: l } = load({ localStorage: storage, fetch: fakeFetch([[201, { key: 'short', top: TOP }]]) });
  await l.urlBackend(gameWith(), ADDRESS).submit({ name: 'Carol', score: 1 });
  assert.deepEqual(Object.keys(storage.data), []);
  const second = load({ localStorage: storage, fetch: fakeFetch([[201, { key: KEY, top: TOP }]]) });
  await second.lib.urlBackend(gameWith({ 'leaderboard-key': '' }), ADDRESS).submit({ name: 'Carol', score: 1 });
  assert.deepEqual(Object.keys(storage.data), []);
});

test('hook backend: submit is used, top() is the fallback, and the name is highlighted by its key', async () => {
  const { lib: l } = load();
  const calls = [];
  const withTop = { submit: async (d) => { calls.push(d); return { top: [{ name: 'Ana', score: 5 }, { name: 'cárol', score: 3 }] }; } };
  const result = await l.hookBackend(gameWith({}, withTop)).submit({ name: 'Carol', score: 3 });
  assert.deepEqual(plain(calls), [{ name: 'Carol', score: 3 }]);
  assert.equal(result.me, 1);
  const fallback = { submit: async () => ({}), top: async () => [{ name: 'Ana', score: 5 }] };
  assert.deepEqual(plain(await l.hookBackend(gameWith({}, fallback)).submit({ name: 'Ana', score: 5 })), { top: [{ name: 'Ana', score: 5 }], me: 0 });
});

test('hook backend: each known code passes through; an unknown code, no code, a bad top and a timeout are offline', async () => {
  const { lib: l, warnings } = load();
  const failing = (error) => l.hookBackend(gameWith({}, { submit: async () => { throw error; } })).submit({ name: 'Ana', score: 1 });
  for (const code of ['format', 'personal_data', 'rejected', 'taken', 'rate_limited', 'offline']) {
    await assert.rejects(failing(Object.assign(new Error('x'), { code })), (e) => e.code === code, code);
  }
  await assert.rejects(failing(Object.assign(new Error('x'), { code: 'weird' })), (e) => e.code === 'offline');
  await assert.rejects(failing(new Error('plain')), (e) => e.code === 'offline');
  assert.ok(warnings.length >= 2);
  for (const result of [{ top: 'x' }, { top: [{ name: 1 }] }, null, undefined, {}]) {
    await assert.rejects(l.hookBackend(gameWith({}, { submit: async () => result })).submit({ name: 'Ana', score: 1 }), (e) => e.code === 'offline');
  }
  const slow = { submit: () => new Promise(() => {}) };
  await assert.rejects(l.hookBackend(gameWith({}, slow)).submit({ name: 'Ana', score: 1 }), (e) => e.code === 'offline');
  assert.equal(warnings.at(-1), 'snake-game leaderboard: timeout');
});

test('the texts have the defaults from the card', () => {
  assert.equal(lib.TEXTS.label, 'Username');
  assert.equal(lib.TEXTS['error-offline'], 'Service unavailable. Try again later.');
  assert.equal(lib.TEXTS['error-length'], 'Use 3 to 12 characters.');
  assert.equal(lib.TEXTS['error-chars'], 'Use only letters, numbers, _, - and .');
  assert.equal(lib.TEXTS['error-personal-data'], "Don't use links, emails or long numbers.");
  assert.equal(lib.TEXTS['error-rejected'], 'Choose another name.');
  assert.equal(lib.TEXTS['error-taken'], 'This name is already taken. Choose another one.');
});

test('codeFromResponse follows the table of the contract', () => {
  const c = lib.codeFromResponse;
  assert.equal(c(201, { key: KEY, top: [] }), 'ok');
  assert.equal(c(200, {}), 'top');
  assert.equal(c(409, null), 'taken');
  assert.equal(c(422, { error: 'format' }), 'format');
  assert.equal(c(422, null), 'rejected');
  assert.equal(c(429, null), 'rate_limited');
  assert.equal(c(500, null), 'offline');
  assert.equal(c(200, null), 'offline');
});

test('a name needs at least one letter (1_2, 1.2.3 and 12-34-5 are "start")', () => {
  for (const raw of ['1_2', '1.2.3', '12-34-5', '\uff11\uff12\uff13']) assert.equal(lib.checkName(raw).error, 'start', raw);
  assert.equal(lib.checkName('1a2').error, null);
});

test('url backend: a key in a 201 without top is kept when the fallback GET answers, and goes in the next POST', async () => {
  const storage = memoryStorage();
  const f = fakeFetch([[201, { key: KEY }], [200, { top: TOP }], [200, { top: TOP }]]);
  const { lib: l } = load({ localStorage: storage, fetch: f });
  const backend = l.urlBackend(gameWith(), ADDRESS);
  await backend.submit({ name: 'Carol', score: 42 });
  assert.deepEqual(JSON.parse(storage.data['snake-game-leaderboard-keys']), { [ADDRESS]: { carol: KEY } });
  await backend.submit({ name: 'Carol', score: 50 });
  assert.deepEqual(JSON.parse(f.calls[2].init.body), { name: 'Carol', score: 50, key: KEY });
});

test('url backend: a key that is not a text (a list, a number) is ignored, also a stored one', async () => {
  const storage = memoryStorage({ 'snake-game-leaderboard-keys': JSON.stringify({ [ADDRESS]: { carol: [KEY] } }) });
  const f = fakeFetch([[201, { key: [KEY], top: TOP }], [200, { top: TOP }]]);
  const { lib: l } = load({ localStorage: storage, fetch: f });
  const backend = l.urlBackend(gameWith(), ADDRESS);
  await backend.submit({ name: 'Carol', score: 1 });
  assert.deepEqual(JSON.parse(f.calls[0].init.body), { name: 'Carol', score: 1 });
  assert.deepEqual(JSON.parse(storage.data['snake-game-leaderboard-keys']), { [ADDRESS]: { carol: [KEY] } });
});

test('an empty leaderboard-key stores and reads nothing: not the list, not -name, not -keys', async () => {
  const storage = memoryStorage({ '-name': 'Old', '-keys': '{}' });
  const { lib: l } = load({ localStorage: storage, fetch: fakeFetch([[201, { key: KEY, top: TOP }]]) });
  assert.equal(l.store.get('-name'), null);
  assert.equal(l.store.get('-keys'), null);
  l.store.set('-name', 'Carol');
  l.store.set('-keys', '{}');
  await l.urlBackend(gameWith({ 'leaderboard-key': '' }), ADDRESS).submit({ name: 'Carol', score: 1 });
  await l.localBackend(gameWith({ 'leaderboard-key': '' })).submit({ name: 'Carol', score: 1 });
  assert.deepEqual(storage.calls.set, []);
  l.store.set('mine-name', 'Carol');
  assert.equal(storage.data['mine-name'], 'Carol');
});
