// A pretend leaderboard service, for the demo and the tests only. It follows docs/leaderboard-api.md,
// but it lives inside the page: nothing goes to the network. Its address ends in ".invalid", a name that never exists.
//
//   const service = installFakeService(FAKE_URL, { rules, state });
//   <snake-game leaderboard-url="https://fake-leaderboard.invalid/api">
//
// `rules` is { checkName, nameKey } (the username rules of src/addons/leaderboard.js: the real service must use the same).
// `state.mode` picks how the service behaves (see MODES). It can change at any time.

export const FAKE_URL = 'https://fake-leaderboard.invalid/api';
const DATA_KEY = 'snake-game-fake-service';
const TOP = 10;
const MAX_SCORE = 1000000;

// Each mode: the label in the demo, and what it answers instead of following the contract.
export const MODES = {
  works: 'works (follows the contract; "ana" is taken)',
  taken: 'name taken (409)',
  rejected: 'name rejected (422 rejected)',
  unknown422: '422 unknown reason',
  rate: 'too many tries (429)',
  unexpected: 'unexpected response (403)',
  broken: '200 with broken JSON',
  offline: 'offline (network error)',
  slow: 'slow (6 s, the game gives up at 5)',
};

// Names that start with these letters are refused by the "policy" (the contract's `rejected`).
const REJECTED_START = 'xxx';
const SEED = [['Ana', 12], ['Bia', 9], ['Caio', 7], ['Duda', 5], ['Edu', 3]];

const wait = (ms, signal) => new Promise((resolve, reject) => {
  const aborted = () => new DOMException('Aborted', 'AbortError');
  if (signal && signal.aborted) return reject(aborted());
  const onAbort = () => { clearTimeout(timer); reject(aborted()); };
  const timer = setTimeout(() => { if (signal) signal.removeEventListener('abort', onAbort); resolve(); }, ms);
  if (signal) signal.addEventListener('abort', onAbort, { once: true });
});

const randomKey = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

// `storage` is localStorage (or something like it). `slowDelay` is how long the "slow" mode takes.
export function createFakeService({ rules, storage, state = { mode: 'works' }, delay = 400, slowDelay = 6000 }) {
  const load = () => {
    try {
      const data = JSON.parse(storage.getItem(DATA_KEY));
      if (data && Array.isArray(data.entries)) return data;
    } catch { /* first visit, or broken data: start again */ }
    // The seeds have keys nobody in this browser knows, so their names are "taken".
    return { seq: SEED.length, entries: SEED.map(([name, score], seq) => ({ name, score, seq, key: `seed-${randomKey()}` })) };
  };
  const save = (data) => storage.setItem(DATA_KEY, JSON.stringify(data));
  const top = (data) => data.entries
    .slice()
    .sort((a, b) => b.score - a.score || a.seq - b.seq)
    .slice(0, TOP)
    .map(({ name, score }) => ({ name, score }));

  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

  function post(text) {
    let body;
    try { body = JSON.parse(text); } catch { return json(400, { error: 'bad_request' }); }
    if (!body || typeof body.name !== 'string' || !Number.isInteger(body.score) || body.score < 1 || body.score > MAX_SCORE) return json(400, { error: 'bad_request' });
    const { name, error } = rules.checkName(body.name);
    if (error) return json(422, { error: error === 'personal-data' ? 'personal_data' : 'format' });
    const who = rules.nameKey(name);
    if (who.startsWith(REJECTED_START)) return json(422, { error: 'rejected' });
    const data = load();
    const found = data.entries.find((e) => rules.nameKey(e.name) === who);
    if (!found) {
      // The real service keeps only a hash of the key. This pretend one keeps it as it is.
      const key = randomKey();
      data.entries.push({ name, score: body.score, seq: data.seq, key });
      data.seq += 1;
      save(data);
      return json(201, { key, top: top(data) });
    }
    if (typeof body.key !== 'string' || body.key !== found.key) return json(409, { error: 'taken' });
    found.name = name;
    found.score = Math.max(found.score, body.score);
    save(data);
    return json(200, { top: top(data) });
  }

  // Same shape as window.fetch.
  async function fakeFetch(url, init = {}) {
    await wait(state.mode === 'slow' ? slowDelay : delay, init.signal);
    switch (state.mode) {
      case 'offline': throw new TypeError('Failed to fetch');
      case 'taken': return json(409, { error: 'taken' });
      case 'rejected': return json(422, { error: 'rejected' });
      case 'unknown422': return json(422, { error: 'banana' });
      case 'rate': return json(429, { error: 'rate_limited' });
      case 'unexpected': return json(403, { error: 'forbidden' });
      case 'broken': return new Response('{"top": [', { status: 200, headers: { 'Content-Type': 'application/json' } });
      default:
    }
    const { pathname } = new URL(url);
    if (!pathname.endsWith('/scores')) return json(404, { error: 'not_found' });
    if ((init.method || 'GET') === 'POST') return post(init.body);
    return json(200, { top: top(load()) });
  }

  return { fetch: fakeFetch, clear: () => storage.removeItem(DATA_KEY) };
}

// Replaces window.fetch for addresses that start with `base` only. Everything else goes to the real fetch.
export function installFakeService(base, options) {
  const service = createFakeService(options);
  const real = window.fetch.bind(window);
  window.fetch = (url, init) => (String(url).startsWith(base) ? service.fetch(url, init) : real(url, init));
  return service;
}
