/* snake-game | MIT (c) 2026 Carolina Cajazeira (@akacaja) */
// Leaderboard for <snake-game>: the Top 10 after a game. Optional file (see the README).
// Load it with <script src="addons/leaderboard.js"></script>, before or after the game.
// Colors and sizes come only from the game tokens (var(--_*)): no literal color, no px.
(function () {
  'use strict';

  const TOP = 10;
  const TIMEOUT = 5000; // ms
  // Typing mode (phone lying down, keyboard open): see `leaderboard` below. The query is PHONE_LANDSCAPE of src/theme.js in em (the theme size in px, divided by 16).
  const TYPING_QUERY = '(pointer: coarse) and (orientation: landscape) and (max-height: 33.75em)';
  const TYPING_ROOM = 1.5; // turns on when the visible height is below this many times the height of the form
  const TYPING_HYSTERESIS = 1.2; // and turns off only above TYPING_ROOM times this
  const DEFAULT_KEY = 'snake-game-leaderboard';
  const KEY_FORMAT = /^[A-Za-z0-9_-]{16,128}$/; // the shape of a key in the contract

  // Texts: text-leaderboard-<name> attributes change them.
  const TEXTS = {
    label: 'Username',
    save: 'Save',
    skip: 'Skip',
    title: 'Top 10',
    retry: 'Try again',
    'error-length': 'Use 3 to 12 characters.',
    'error-chars': 'Use only letters, numbers, _, - and .',
    'error-start': "Start with a letter or number, and don't use only numbers.",
    'error-personal-data': "Don't use links, emails or long numbers.",
    'error-rejected': 'Choose another name.',
    'error-taken': 'This name is already taken. Choose another one.',
    'error-rate-limited': 'Too many tries. Wait a moment and try again.',
    'error-offline': 'Service unavailable. Try again later.',
  };
  // Error code -> name of its text.
  const ERROR_TEXT = {
    format: 'chars',
    personal_data: 'personal-data',
    rejected: 'rejected',
    taken: 'taken',
    rate_limited: 'rate-limited',
    offline: 'offline',
  };

  const text = (game, name) => {
    const own = game.getAttribute(`text-leaderboard-${name}`);
    return own === null ? TEXTS[name] : own;
  };

  // ---- username rules ----

  const CHARS = /^[\p{L}\p{M}\p{N}_.\-]+$/u;
  // Invisible characters and marks that would pass as letters.
  const INVISIBLE = /[\p{Me}͏ᅟᅠ឴឵᠋-᠏ㅤ︀-️ﾠ\u{e0100}-\u{e01ef}]/u;
  const LINK = /https?:|:\/\/|www\.|\.(com|net|org|io|br|co|me|app|dev|gg|tv|ly|xyz|info)(\.|$)/;

  // { name, error }: the trimmed name and the first rule it breaks (personal-data, chars, length, start; null: fine).
  function checkName(raw) {
    const name = String(raw).trim().normalize('NFC');
    const plain = name.normalize('NFKC').toLowerCase();
    const error = (() => {
      // Personal data first, so "ana@x.com" says so.
      if (plain.includes('@') || LINK.test(plain) || /\p{N}{6}/u.test(plain.replace(/[^\p{L}\p{N}]/gu, ''))) return 'personal-data';
      if (name && (!CHARS.test(name) || INVISIBLE.test(name))) return 'chars';
      const size = [...name].length;
      if (size < 3 || size > 12) return 'length';
      if (!/^[\p{L}\p{N}]/u.test(name) || !/\p{L}/u.test(name)) return 'start';
      return null;
    })();
    return { name, error };
  }

  // Same key = same name ("Carol", "cárol", "ca_rol").
  const nameKey = (name) => name.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(/[_.\-]/g, '');

  // ---- local ranking ----

  // Adds a score to a sorted list: a lower score never replaces a higher one, a tie keeps who came first.
  // Returns the list (10 at most) and `me`, the position of the name (-1: did not fit).
  function addScore(list, name, score) {
    const key = nameKey(name);
    const next = list.slice();
    const old = next.findIndex((e) => nameKey(e.name) === key);
    if (old >= 0 && score <= next[old].score) {
      next[old] = { name, score: next[old].score }; // newest spelling
      return { list: next, me: old };
    }
    if (old >= 0) next.splice(old, 1);
    let at = next.findIndex((e) => e.score < score);
    if (at < 0) at = next.length;
    next.splice(at, 0, { name, score });
    return { list: next.slice(0, TOP), me: at < TOP ? at : -1 };
  }

  // The stored text made safe: bad entries go, repeated names keep the best score.
  function readList(raw) {
    let data;
    try { data = JSON.parse(raw); } catch { data = null; }
    const best = new Map();
    for (const e of Array.isArray(data) ? data : []) {
      if (!e || typeof e.name !== 'string' || !Number.isInteger(e.score) || e.score < 1 || checkName(e.name).error) continue;
      const key = nameKey(e.name);
      if (!best.has(key) || e.score > best.get(key).score) best.set(key, { name: e.name, score: e.score });
    }
    return [...best.values()].sort((a, b) => b.score - a.score).slice(0, TOP);
  }

  // Keys starting with '-' are never stored: that is what an empty leaderboard-key gives (`-name`, `-keys`),
  // and a leaderboard-key that starts with '-' is turned into an empty one by `prefix`.
  const store = {
    get(key) { try { return key[0] === '-' ? null : localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { if (key[0] !== '-') localStorage.setItem(key, value); } catch { /* storage blocked */ } },
  };
  const validKey = (key) => typeof key === 'string' && KEY_FORMAT.test(key);
  let warnedKey = false; // the warning for a key that starts with '-' comes once per page
  const prefix = (game) => {
    const own = game.getAttribute('leaderboard-key');
    if (own === null) return DEFAULT_KEY;
    if (own[0] !== '-') return own;
    if (!warnedKey) {
      warnedKey = true;
      console.warn(`snake-game leaderboard: leaderboard-key "${own}" starts with "-": nothing is stored, as with an empty key.`);
    }
    return '';
  };
  let memory = []; // used when the storage key is empty

  // ---- backends: submit({ name, score }, signal) -> Promise<{ top, me }>; they fail with an error that has a `code` ----

  // `detail` goes to the console.
  function fail(code, detail) {
    if (detail) console.warn(`snake-game leaderboard: ${detail}`);
    return Object.assign(new Error(code), { code });
  }

  // { name, score } list, or null.
  function parseTop(top) {
    if (!Array.isArray(top) || top.some((e) => !e || typeof e.name !== 'string' || !Number.isFinite(e.score))) return null;
    return top.slice(0, TOP).map((e) => ({ name: e.name, score: e.score }));
  }

  // How an answer is read (docs/leaderboard-api.md): 'ok', 'top' (fetch the list) or an error code.
  function codeFromResponse(status, body) {
    const error = body && body.error;
    if (status === 409) return 'taken';
    if (status === 422) return error === 'format' || error === 'personal_data' ? error : 'rejected';
    if (status === 429) return 'rate_limited';
    if ((status === 200 || status === 201) && body && typeof body === 'object') {
      return body.top === undefined ? 'top' : Array.isArray(body.top) ? 'ok' : 'offline';
    }
    return 'offline';
  }

  const positionOf = (top, name) => top.findIndex((e) => nameKey(e.name) === nameKey(name));

  function localBackend(game) {
    return {
      async submit({ name, score }) {
        const key = prefix(game);
        const list = key ? readList(store.get(key)) : memory;
        const result = addScore(list, name, score);
        if (key) store.set(key, JSON.stringify(result.list));
        else memory = result.list;
        return { top: result.list, me: result.me };
      },
    };
  }

  function urlBackend(game, address) {
    let base = '';
    try { base = new URL(address, globalThis.document && document.baseURI).href.replace(/\/$/, ''); } catch { /* handled below */ }
    const keysName = `${prefix(game)}-keys`;
    const readKeys = () => {
      try { const keys = JSON.parse(store.get(keysName)); return keys && typeof keys === 'object' ? keys : {}; } catch { return {}; }
    };

    // One request: { status, body } (body null if not JSON). Network, timeout or `outer` aborted: offline.
    async function send(path, init, outer) {
      const control = new AbortController();
      const stop = () => control.abort();
      if (outer) outer.addEventListener('abort', stop, { once: true });
      const timer = setTimeout(stop, TIMEOUT);
      try {
        const headers = { Accept: 'application/json' };
        if (init.body) headers['Content-Type'] = 'application/json';
        const response = await fetch(base + path, { ...init, headers, credentials: 'omit', referrerPolicy: 'no-referrer', signal: control.signal });
        const body = await response.json().catch(() => null);
        return { status: response.status, body };
      } catch {
        throw fail('offline', outer && outer.aborted ? '' : control.signal.aborted ? 'timeout' : 'network error');
      } finally {
        clearTimeout(timer);
        if (outer) outer.removeEventListener('abort', stop);
      }
    }

    return {
      async submit({ name, score }, outer) {
        if (!/^https?:\/\//.test(base)) throw fail('offline', `invalid leaderboard-url "${address}"`);
        const who = nameKey(name);
        const keys = readKeys();
        const saved = keys[base] && keys[base][who];
        let { status, body } = await send('/scores', { method: 'POST', body: JSON.stringify(validKey(saved) ? { name, score, key: saved } : { name, score }) }, outer);
        let code = codeFromResponse(status, body);
        const key = body && body.key; // read now: the fallback GET replaces `body`
        if (code === 'top') { // no list in the answer
          ({ status, body } = await send('/scores?limit=10', {}, outer));
          code = status === 200 && body && Array.isArray(body.top) ? 'ok' : 'offline';
        }
        const top = code === 'ok' && parseTop(body.top);
        if (!top) throw fail(code === 'ok' ? 'offline' : code, code === 'ok' || code === 'offline' ? `unexpected response ${status}` : '');
        if (validKey(key)) {
          keys[base] = { ...keys[base], [who]: key };
          store.set(keysName, JSON.stringify(keys));
        }
        return { top, me: positionOf(top, name) };
      },
    };
  }

  function hookBackend(game) {
    const wait = (promise) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { timeout: true })), TIMEOUT);
      promise.then(resolve, reject).finally(() => clearTimeout(timer));
    });
    return {
      async submit({ name, score }) {
        const hook = game.leaderboard;
        try {
          const result = await wait((async () => hook.submit({ name, score }))());
          let top = parseTop(result && result.top);
          if (!top && result && result.top === undefined && typeof hook.top === 'function') top = parseTop(await wait((async () => hook.top())()));
          if (!top) throw Object.assign(new Error('bad top'), { bad: true });
          return { top, me: positionOf(top, name) };
        } catch (error) {
          const code = error && ERROR_TEXT[error.code] ? error.code : 'offline';
          throw fail(code, code === 'offline' ? (error && error.timeout ? 'timeout' : `unexpected error${error && error.code ? ` ${error.code}` : ''}`) : '');
        }
      },
    };
  }

  const pickBackend = (game) => {
    if (game.leaderboard && typeof game.leaderboard.submit === 'function') return hookBackend(game);
    const address = game.getAttribute('leaderboard-url');
    return address ? urlBackend(game, address) : localBackend(game);
  };

  // ---- screen ----

  // Tokens only. No @media, no animation.
  const STYLE = `
.overlay { overflow: auto; justify-content: flex-start; }
.overlay::before, .overlay::after { content: ''; flex: 1 0 0; }
.addon { display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 20rem; min-height: 0; }
.addon [hidden] { display: none; }
.lb-form, .lb-done { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; width: 100%; min-height: 0; }
.lb-form label { font-weight: 600; }
.lb-field { width: 100%; min-height: var(--_button-size); padding: 0 0.75rem; border: thin solid var(--_text-color); border-radius: 0.5rem; background: none; color: inherit; font: inherit; font-size: var(--_field-font-size); -webkit-user-select: text; user-select: text; }
.lb-field[aria-invalid="true"] { border-width: medium; }
.lb-error { margin: 0; font-weight: 700; }
.lb-buttons { display: flex; gap: 0.5rem; }
.lb-title { margin: 0; font-size: 1em; }
.lb-list { width: 100%; min-height: 0; margin: 0; padding: 0; overflow: auto; list-style: none; touch-action: pan-y; overscroll-behavior: contain; font-variant-numeric: tabular-nums; }
.lb-list li { display: flex; gap: 0.5rem; padding: 0.125rem 0.5rem; }
.lb-name { flex: 1; overflow: hidden; text-overflow: ellipsis; text-align: start; }
.lb-list li[aria-current] { color: var(--_highlight-color); font-weight: 700; }
.addon[data-typing] { position: fixed; z-index: 1; top: var(--lb-top); left: var(--lb-left); width: var(--lb-width); height: var(--lb-height); max-width: none; padding: 0.5rem max(0.75rem, env(safe-area-inset-right, 0rem)) 0.5rem max(0.75rem, env(safe-area-inset-left, 0rem)); overflow: auto; background: var(--_backdrop); visibility: visible; }
.panel:has(.addon[data-typing]) { visibility: hidden; }
.addon[data-typing] .lb-form { flex-flow: row wrap; justify-content: center; max-width: 40rem; margin-block: auto; }
.addon[data-typing] label { flex: none; }
.addon[data-typing] .lb-field { flex: 1 1 8rem; width: auto; min-width: 0; }
.addon[data-typing] .lb-error { order: 1; flex-basis: 100%; }
`;
  const TEMPLATE = `<style>${STYLE}</style>
<form class="lb-form" novalidate>
  <label for="lb-name"></label>
  <input id="lb-name" class="lb-field" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" maxlength="64" aria-describedby="lb-error">
  <p class="lb-error" id="lb-error" role="alert"></p>
  <div class="lb-buttons"><button class="btn lb-save" type="submit"></button><button class="btn lb-skip" type="button"></button></div>
</form>
<section class="lb-done" hidden><h3 class="lb-title" tabindex="-1"></h3><ol class="lb-list"></ol></section>`;

  // Called by the game after a game with points. Fills `box`, returns the cleanup.
  function leaderboard(game, { box, action, score, skip }) {
    const backend = pickBackend(game);
    box.innerHTML = TEMPLATE;
    const $ = (selector) => box.querySelector(selector);
    const [form, input, label, message, save, skipButton, done, title, list] = ['form', 'input', 'label', '.lb-error', '.lb-save', '.lb-skip', '.lb-done', '.lb-title', '.lb-list'].map($);
    let errorName = ''; // text under the field
    let retry = false; // service problem: Save becomes "Try again"
    let checked = false; // after an error, check at every key
    let busy = false;
    let dead = false;
    let control = null;
    let typing = false; // typing mode: only the name row, over the screen, above the keyboard
    let formHeight = 0; // height of the form, measured while typing mode is off
    let rescroll = null; // after saving in typing mode: the row to bring into view when the keyboard closes
    const viewport = globalThis.visualViewport;
    const phone = typeof matchMedia === 'function' ? matchMedia(TYPING_QUERY) : null;

    const say = (type, detail) => game.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
    const paint = () => {
      label.textContent = text(game, 'label');
      save.textContent = text(game, retry ? 'retry' : 'save');
      skipButton.textContent = text(game, 'skip');
      title.textContent = text(game, 'title');
      const shown = errorName ? text(game, `error-${errorName}`) : '';
      if (message.textContent !== shown) message.textContent = shown;
      input.setAttribute('aria-invalid', String(Boolean(errorName) && !retry));
    };
    // Shows a problem, tells the page, focuses where the person can act.
    const problem = (code, name) => {
      errorName = name;
      retry = code === 'offline' || code === 'rate_limited';
      paint();
      say('snake-leaderboard-error', { code });
      (retry ? save : input).focus();
    };
    // Typing mode follows the visual viewport (the part of the page above the keyboard). These are measures of it, not design sizes.
    const setTyping = (on) => {
      if (on) {
        for (const [name, value] of [['top', viewport.offsetTop], ['left', viewport.offsetLeft], ['width', viewport.width], ['height', viewport.height]]) box.style.setProperty(`--lb-${name}`, `${value}px`);
        box.setAttribute('data-typing', '');
      } else if (typing) {
        box.removeAttribute('data-typing');
      }
      typing = on;
    };
    // On when the space above the keyboard is too small for the normal form (only on a phone lying down, in the modal),
    // and the focus is in the box. Once on, it stays on until there is clearly more room (hysteresis).
    const update = (fromResize) => {
      if (dead || !viewport || !phone) return;
      let on = false;
      if (!form.hidden && box.closest('dialog') && phone.matches) {
        if (!typing) formHeight = form.getBoundingClientRect().height;
        const room = formHeight * TYPING_ROOM * (typing ? TYPING_HYSTERESIS : 1);
        const focused = box.contains(box.getRootNode().activeElement);
        on = formHeight > 0 && viewport.height < room && (focused || (typing && !fromResize));
      }
      setTyping(on);
    };
    const show = ({ top, me }) => {
      const wasTyping = typing;
      if (wasTyping) { // close the keyboard and leave typing mode before the list appears
        input.blur();
        setTyping(false);
      }
      form.hidden = true;
      done.hidden = false;
      action.hidden = false;
      list.textContent = '';
      top.forEach((entry, index) => {
        const row = document.createElement('li');
        const cells = [['lb-rank', `${index + 1}.`], ['lb-name', entry.name], ['lb-score', String(entry.score)]];
        for (const [className, value] of cells) {
          const cell = document.createElement('span');
          cell.className = className;
          cell.textContent = value;
          if (className === 'lb-rank') cell.setAttribute('aria-hidden', 'true');
          row.appendChild(cell);
        }
        if (index === me) row.setAttribute('aria-current', 'true');
        list.appendChild(row);
      });
      title.focus();
      const mine = list.children[me];
      if (mine) {
        mine.scrollIntoView({ block: 'nearest' });
        if (wasTyping) rescroll = mine;
      }
    };

    input.value = store.get(`${prefix(game)}-name`) || '';
    action.hidden = true;
    paint();

    input.addEventListener('input', () => {
      retry = false;
      if (checked) errorName = checkName(input.value).error || '';
      paint();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault(); // leaves the field only; the next Escape closes
      save.focus();
    });
    // Keep the field above the phone keyboard (not needed in typing mode: the row is already there).
    const reveal = () => requestAnimationFrame(() => { if (!dead && !typing && !form.hidden) input.scrollIntoView({ block: 'nearest' }); });
    input.addEventListener('focus', reveal);
    const onResize = () => {
      update(true);
      reveal();
      if (rescroll) { // the keyboard closed after saving: show your row again, once
        const row = rescroll;
        rescroll = null;
        requestAnimationFrame(() => { if (!dead) row.scrollIntoView({ block: 'nearest' }); });
      }
    };
    const refresh = () => update(false);
    const onFocusOut = (e) => { if (e.relatedTarget && !box.contains(e.relatedTarget)) setTyping(false); };
    if (viewport) {
      viewport.addEventListener('resize', onResize);
      viewport.addEventListener('scroll', refresh);
    }
    if (phone) phone.addEventListener('change', refresh);
    box.addEventListener('focusin', refresh);
    box.addEventListener('focusout', onFocusOut);
    skipButton.addEventListener('click', () => skip());
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (busy || dead) return;
      const { name, error } = checkName(input.value);
      if (error) {
        checked = true;
        return problem(error === 'personal-data' ? 'personal_data' : 'format', error);
      }
      busy = true;
      control = new AbortController();
      form.setAttribute('aria-busy', 'true');
      input.readOnly = true;
      save.setAttribute('aria-disabled', 'true');
      try {
        const result = await backend.submit({ name, score }, control.signal);
        if (dead) return;
        store.set(`${prefix(game)}-name`, name);
        errorName = '';
        retry = false;
        paint();
        say('snake-leaderboard-save', { name, score });
        show(result);
      } catch (error) {
        if (dead) return;
        const code = error && ERROR_TEXT[error.code] ? error.code : 'offline';
        checked = true;
        problem(code, ERROR_TEXT[code]);
      } finally {
        busy = false;
        form.removeAttribute('aria-busy');
        input.readOnly = false;
        save.removeAttribute('aria-disabled');
      }
    });

    // Texts follow text-leaderboard-* and lang while the box is open.
    const watcher = typeof MutationObserver === 'function' ? new MutationObserver((changes) => {
      if (changes.some((c) => /^(text-leaderboard-|lang$)/.test(c.attributeName))) paint();
    }) : null;
    if (watcher) watcher.observe(game, { attributes: true });

    input.focus();
    input.select();
    return () => {
      dead = true;
      if (control) control.abort();
      if (watcher) watcher.disconnect();
      if (viewport) {
        viewport.removeEventListener('resize', onResize);
        viewport.removeEventListener('scroll', refresh);
      }
      if (phone) phone.removeEventListener('change', refresh);
      box.removeEventListener('focusin', refresh);
      box.removeEventListener('focusout', onFocusOut);
      setTyping(false);
      rescroll = null;
    };
  }

  // For the tests.
  leaderboard.lib = { checkName, nameKey, addScore, readList, parseTop, codeFromResponse, localBackend, urlBackend, hookBackend, store, TEXTS, TYPING_QUERY, TYPING_ROOM, TYPING_HYSTERESIS };

  (globalThis.snakeGameAddons = globalThis.snakeGameAddons || []).push(['leaderboard', leaderboard]);
}());
