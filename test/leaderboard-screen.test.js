import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createDom, memoryStorage, fakeFetch } from './fake-dom.js';
import { PHONE_LANDSCAPE } from '../src/theme.js';

// The leaderboard screen, on a fake page (test/fake-dom.js). It runs addons/leaderboard.js (the generated file).
const code = readFileSync(new URL('../addons/leaderboard.js', import.meta.url), 'utf8');
const plain = (value) => JSON.parse(JSON.stringify(value));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

// Opens the screen like the game does. `attrs` are attributes of the game; `domOptions` go to createDom.
function open({ attrs = {}, domOptions = {}, storage = memoryStorage(), fetch, hook, score = 5 } = {}) {
  const dom = createDom(domOptions);
  for (const [name, value] of Object.entries(attrs)) dom.game.setAttribute(name, value);
  if (hook) dom.game.leaderboard = hook;
  const warnings = [];
  const sandbox = dom.sandbox({
    console: { warn: (m) => warnings.push(m), error() {}, log() {} },
    URL,
    AbortController,
    setTimeout,
    clearTimeout,
    localStorage: storage,
    fetch,
  });
  vm.runInNewContext(code, sandbox);
  const [, fn] = sandbox.snakeGameAddons[0];
  const skipped = { count: 0 };
  const cleanup = fn(dom.game, { box: dom.box, action: dom.action, score, skip: () => { skipped.count += 1; } });
  const $ = (selector) => dom.box.querySelector(selector);
  return {
    dom,
    lib: fn.lib,
    storage,
    warnings,
    skipped,
    cleanup,
    $,
    form: $('form'),
    input: $('input'),
    save: $('.lb-save'),
    skip: $('.lb-skip'),
    message: $('.lb-error'),
    done: $('.lb-done'),
    title: $('.lb-title'),
    rows: () => [...$('.lb-list').children],
    saved: () => dom.game.events.filter((e) => e.type === 'snake-leaderboard-save').map((e) => plain(e.detail)),
    errors: () => dom.game.events.filter((e) => e.type === 'snake-leaderboard-error').map((e) => e.detail.code),
  };
}

// Types a name and presses Save.
async function submit(screen, name) {
  screen.dom.type(screen.input, name);
  screen.save.click();
  await tick();
}

test('the field: texts, the saved name, focus and selection, the error area, and "Play again" hidden', () => {
  const storage = memoryStorage({ 'snake-game-leaderboard-name': 'Ana' });
  const screen = open({ storage, attrs: { 'text-leaderboard-label': 'Seu nome' } });
  assert.equal(screen.$('label').textContent, 'Seu nome');
  assert.equal(screen.save.textContent, 'Save');
  assert.equal(screen.skip.textContent, 'Skip');
  assert.equal(screen.input.value, 'Ana');
  assert.equal(screen.dom.root.activeElement, screen.input);
  assert.equal(screen.input.selected, true);
  assert.equal(screen.input.getAttribute('aria-describedby'), 'lb-error');
  assert.equal(screen.message.getAttribute('role'), 'alert');
  assert.equal(screen.dom.action.hidden, true);
  assert.equal(screen.done.hidden, true);
  assert.equal(screen.form.hidden, false);
});

test('a name that is too short shows the message, marks the field, focuses it and warns the page; typing again clears it', async () => {
  const screen = open();
  await submit(screen, 'ab');
  assert.equal(screen.message.textContent, 'Use 3 to 12 characters.');
  assert.equal(screen.input.getAttribute('aria-invalid'), 'true');
  assert.equal(screen.dom.root.activeElement, screen.input);
  assert.deepEqual(screen.errors(), ['format']);
  screen.dom.type(screen.input, 'abc');
  assert.equal(screen.message.textContent, '');
  assert.equal(screen.input.getAttribute('aria-invalid'), 'false');
  assert.equal(screen.form.hidden, false);
});

test('personal data in the name has its own message and event', async () => {
  const screen = open();
  await submit(screen, 'ana@x');
  assert.equal(screen.message.textContent, "Don't use links, emails or long numbers.");
  assert.deepEqual(screen.errors(), ['personal_data']);
});

test('a network failure turns Save into "Try again", focuses it, and typing brings Save back', async () => {
  const fetch = fakeFetch(new Error('offline'));
  const screen = open({ attrs: { 'leaderboard-url': 'https://scores.example.org/api' }, fetch });
  await submit(screen, 'Ana');
  assert.equal(fetch.calls.length, 1);
  assert.equal(screen.message.textContent, 'Service unavailable. Try again later.');
  assert.equal(screen.save.textContent, 'Try again');
  assert.equal(screen.dom.root.activeElement, screen.save);
  assert.equal(screen.input.getAttribute('aria-invalid'), 'false');
  assert.equal(screen.input.readOnly, false);
  assert.deepEqual(screen.errors(), ['offline']);
  screen.dom.type(screen.input, 'Ana2');
  assert.equal(screen.save.textContent, 'Save');
});

test('while sending, a second submit is ignored and the field is read-only and busy', async () => {
  let release;
  const calls = [];
  const hook = { submit: (entry) => { calls.push(entry); return new Promise((resolve) => { release = resolve; }); } };
  const screen = open({ hook });
  screen.dom.type(screen.input, 'Ana');
  screen.save.click();
  screen.save.click();
  await tick();
  assert.equal(calls.length, 1);
  assert.equal(screen.input.readOnly, true);
  assert.equal(screen.form.getAttribute('aria-busy'), 'true');
  assert.equal(screen.save.getAttribute('aria-disabled'), 'true');
  release({ top: [{ name: 'Ana', score: 5 }] });
  await tick();
  assert.equal(screen.form.hidden, true);
  assert.equal(screen.input.readOnly, false);
  assert.equal(screen.form.hasAttribute('aria-busy'), false);
});

test('after saving: the list replaces the form, your row is highlighted and in view, focus goes to the title', async () => {
  const storage = memoryStorage({ 'snake-game-leaderboard': JSON.stringify([{ name: 'Zed', score: 50 }]) });
  const screen = open({ storage });
  await submit(screen, 'Ana');
  assert.equal(screen.form.hidden, true);
  assert.equal(screen.done.hidden, false);
  assert.equal(screen.dom.action.hidden, false);
  assert.equal(screen.title.textContent, 'Top 10');
  const rows = screen.rows();
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((r) => r.hasAttribute('aria-current')), [false, true]);
  assert.deepEqual(rows[1].children.map((c) => c.textContent), ['2.', 'Ana', '5']);
  assert.equal(rows[1].children[0].getAttribute('aria-hidden'), 'true');
  assert.equal(screen.dom.root.activeElement, screen.title);
  assert.equal(rows[1].scrolls.length, 1);
  assert.deepEqual(plain(rows[1].scrolls[0]), { block: 'nearest' });
  assert.deepEqual(screen.saved(), [{ name: 'Ana', score: 5 }]);
  assert.equal(storage.data['snake-game-leaderboard-name'], 'Ana');
});

test('Skip calls the skip function of the game, and nothing is saved', () => {
  const screen = open();
  screen.skip.click();
  assert.equal(screen.skipped.count, 1);
  assert.deepEqual(screen.saved(), []);
});

test('Escape in the field only leaves the field (the key is not passed on) and goes to Save', () => {
  const screen = open();
  const escape = screen.dom.event('keydown', { key: 'Escape', bubbles: true });
  screen.input.dispatchEvent(escape);
  assert.equal(escape.defaultPrevented, true);
  assert.equal(screen.dom.root.activeElement, screen.save);
  const other = screen.dom.event('keydown', { key: 'a', bubbles: true });
  screen.input.dispatchEvent(other);
  assert.equal(other.defaultPrevented, false);
});

// ---- typing mode: a phone lying down, keyboard open, little room above it ----

// The form is 136 high in the fake page; the limits come from the constants of the addon.
const FORM = 136;
const limits = (lib, form = FORM) => {
  const on = form * lib.TYPING_ROOM; // turns on below this
  return { on, off: on * lib.TYPING_HYSTERESIS }; // turns off from this
};
const typingOn = (screen) => screen.dom.box.hasAttribute('data-typing');

test('typing mode turns on when the room above the keyboard is small, and the row follows the viewport', () => {
  const screen = open();
  const { dom } = screen;
  assert.equal(typingOn(screen), false);
  dom.vv.offsetTop = 12;
  dom.vv.offsetLeft = 3;
  dom.keyboard(true, 150);
  assert.equal(typingOn(screen), true);
  const style = dom.box.style;
  assert.equal(style.getPropertyValue('--lb-top'), '12px');
  assert.equal(style.getPropertyValue('--lb-left'), '3px');
  assert.equal(style.getPropertyValue('--lb-height'), '150px');
  assert.equal(style.getPropertyValue('--lb-width'), `${dom.vv.width}px`);
  dom.scrollViewport(40);
  assert.equal(style.getPropertyValue('--lb-top'), '40px');
  assert.equal(typingOn(screen), true);
});

test('lying down with enough room above the keyboard, the normal form stays', () => {
  const screen = open();
  const { on } = limits(screen.lib);
  screen.dom.keyboard(true, Math.ceil(on)); // exactly at the limit: not below it
  assert.equal(typingOn(screen), false);
  screen.dom.keyboard(true, Math.ceil(on) - 1);
  assert.equal(typingOn(screen), true);
});

test('portrait with the keyboard open never turns it on, and the form is not even measured', () => {
  const screen = open({ domOptions: { orientation: 'portrait', heightEm: 50 } });
  screen.dom.keyboard(true);
  screen.dom.keyboard(true, 100); // even with almost no room
  assert.equal(typingOn(screen), false);
  assert.equal(screen.form.rectReads, 0);
});

test('the orientation and the height are checked first (Android shrinks the page itself; a tablet is tall)', () => {
  const android = open({ domOptions: { orientation: 'portrait', heightEm: 20 } });
  android.dom.viewport(100);
  assert.equal(typingOn(android), false);
  const tablet = open({ domOptions: { heightEm: 40 } });
  tablet.dom.keyboard(true, 100);
  assert.equal(typingOn(tablet), false);
  assert.equal(tablet.form.rectReads, 0);
});

test('hysteresis: it stays on until there is clearly more room, then turns off', () => {
  const screen = open();
  const { off } = limits(screen.lib);
  screen.dom.keyboard(true, 150);
  assert.equal(typingOn(screen), true);
  screen.dom.viewport(Math.ceil(off) - 1);
  assert.equal(typingOn(screen), true);
  screen.dom.viewport(Math.ceil(off));
  assert.equal(typingOn(screen), false);
});

test('the form is measured only while typing mode is off', () => {
  const screen = open();
  screen.dom.keyboard(true, 150);
  const reads = screen.form.rectReads;
  assert.ok(reads > 0);
  screen.dom.state.rects['.lb-form'] = 999; // would break the rule if it were measured now
  screen.dom.viewport(160);
  screen.dom.scrollViewport(5);
  assert.equal(screen.form.rectReads, reads);
  assert.equal(typingOn(screen), true);
});

test('a form with no height (not measured) never turns it on', () => {
  const screen = open({ domOptions: { rects: { '.lb-form': 0 } } });
  screen.dom.keyboard(true, 50);
  assert.equal(typingOn(screen), false);
});

test('a form taller than the screen, even with no keyboard: it turns on while the focus is in the field', () => {
  const screen = open({ domOptions: { rects: { '.lb-form': 300 } } }); // 24em = 384, and 384 < 300 * 1.5
  assert.equal(typingOn(screen), true);
});

test('closing the keyboard turns it off and the normal screen is back', () => {
  const screen = open();
  screen.dom.keyboard(true, 150);
  screen.dom.keyboard(false);
  assert.equal(typingOn(screen), false);
  assert.equal(screen.form.hidden, false);
});

test('turning the phone: portrait turns it off; lying down again with the keyboard open turns it on', () => {
  const screen = open();
  screen.dom.keyboard(true, 150);
  screen.dom.rotate('portrait', 50);
  assert.equal(typingOn(screen), false);
  screen.dom.rotate('landscape', 24);
  assert.equal(typingOn(screen), false); // no keyboard yet
  screen.dom.keyboard(true, 150);
  assert.equal(typingOn(screen), true);
});

test('it never turns on with a mouse, inline, or without visualViewport or matchMedia (and nothing breaks)', () => {
  for (const domOptions of [{ pointer: 'fine' }, { inline: true }, { viewport: false }, { media: false }]) {
    const screen = open({ domOptions });
    screen.dom.keyboard(true, 100);
    assert.equal(typingOn(screen), false, JSON.stringify(domOptions));
    assert.equal(screen.form.hidden, false);
  }
});

test('focus: leaving the box to another element turns it off; a tap on a button (null) waits for the resize', () => {
  const screen = open();
  const other = screen.dom.dialog.appendChild(screen.dom.globals.document.createElement('button'));
  screen.dom.keyboard(true, 150);
  assert.equal(typingOn(screen), true);
  screen.input.blur(); // relatedTarget null
  assert.equal(typingOn(screen), true);
  screen.dom.keyboard(false); // the keyboard closes: now it ends
  assert.equal(typingOn(screen), false);
  screen.input.focus();
  screen.dom.keyboard(true, 150);
  assert.equal(typingOn(screen), true);
  other.focus(); // outside the box
  assert.equal(typingOn(screen), false);
});

test('a resize ends the mode without the focus rule; a scroll of the viewport does not', () => {
  const screen = open();
  screen.dom.keyboard(true, 150);
  screen.input.blur(); // relatedTarget null: the focus is gone, but the mode waits
  screen.dom.scrollViewport(5); // not a resize: it stays on
  assert.equal(typingOn(screen), true);
  screen.dom.viewport(150); // a resize, with the room still small and no focus: it ends
  assert.equal(typingOn(screen), false);
});

test('the field is not scrolled into view in typing mode, nor after saving and a resize', async () => {
  const screen = open();
  screen.dom.keyboard(true, 150);
  assert.equal(typingOn(screen), true);
  const before = screen.input.scrolls.length;
  screen.dom.frame();
  assert.equal(screen.input.scrolls.length, before);
  await submit(screen, 'Ana');
  const after = screen.input.scrolls.length;
  screen.dom.keyboard(false);
  screen.dom.frame();
  assert.equal(screen.input.scrolls.length, after);
});

test('an error in typing mode: the mode stays and the message is shown', async () => {
  const screen = open();
  screen.dom.keyboard(true, 150);
  await submit(screen, 'ab');
  assert.equal(typingOn(screen), true);
  assert.equal(screen.message.textContent, 'Use 3 to 12 characters.');
  assert.equal(screen.dom.root.activeElement, screen.input);
});

test('saving in typing mode: the keyboard closes, the mode ends before the list, and your row is shown again after the resize', async () => {
  const screen = open();
  let blurs = 0;
  screen.input.addEventListener('blur', () => { blurs += 1; });
  screen.dom.keyboard(true, 150);
  assert.equal(typingOn(screen), true);
  await submit(screen, 'Ana');
  assert.equal(blurs, 1);
  assert.equal(typingOn(screen), false);
  assert.equal(screen.form.hidden, true);
  const mine = screen.rows()[0];
  assert.equal(mine.scrolls.length, 1);
  assert.equal(screen.dom.root.activeElement, screen.title);
  screen.dom.keyboard(false);
  screen.dom.frame();
  assert.equal(mine.scrolls.length, 2);
  screen.dom.keyboard(false);
  screen.dom.frame();
  assert.equal(mine.scrolls.length, 2); // only once
});

test('saving without typing mode: no second scroll', async () => {
  const screen = open();
  await submit(screen, 'Ana');
  const mine = screen.rows()[0];
  screen.dom.viewport(screen.dom.state.innerHeight);
  screen.dom.frame();
  assert.equal(mine.scrolls.length, 1);
});

test('cleanup: no listener is left, typing mode is off, and a late answer is ignored; after a Skip in typing mode, the cleanup leaves it clean', async () => {
  let release;
  const hook = { submit: () => new Promise((resolve) => { release = resolve; }) };
  const screen = open({ hook });
  screen.dom.keyboard(true, 150);
  screen.dom.type(screen.input, 'Ana');
  screen.save.click();
  await tick();
  screen.cleanup();
  assert.equal(typingOn(screen), false);
  assert.equal(screen.dom.outsideListeners(), 0);
  assert.equal(screen.dom.box.listenerCount(), 0);
  release({ top: [{ name: 'Ana', score: 5 }] });
  await tick();
  assert.deepEqual(screen.saved(), []);
  assert.equal(screen.done.hidden, true);

  const second = open();
  second.dom.keyboard(true, 150);
  second.skip.click();
  assert.equal(second.skipped.count, 1);
  second.cleanup();
  assert.equal(typingOn(second), false);
  assert.equal(second.dom.outsideListeners(), 0);
});

test('the media query is the same as PHONE_LANDSCAPE of the theme (px turned into em), and there is no KEYBOARD_SHARE', () => {
  const screen = open();
  const inEm = PHONE_LANDSCAPE.replace(/(\d+(?:\.\d+)?)px/g, (m, n) => `${Number(n) / 16}em`);
  assert.equal(screen.lib.TYPING_QUERY, inEm);
  assert.equal(screen.lib.KEYBOARD_SHARE, undefined);
});

test('the CSS of the addon has no @media, animation or transition, and the :has() rule is alone (no comma)', () => {
  const css = open().$('style').ownText;
  for (const word of ['@media', 'animation', 'transition']) assert.ok(!css.includes(word), word);
  const rule = css.split('\n').find((line) => line.includes(':has('));
  assert.ok(rule, 'there is a :has() rule');
  assert.ok(!rule.split('{')[0].includes(','), 'the :has() selector has a comma');
});
