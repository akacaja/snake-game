// The playground (a real <snake-game> next to the settings) and the code panel of the landing page.
// The preview and the generated code both read the same state through config.js, so they always agree.
// All colors and sizes live in site/landing.css; this file only moves values around.
import {
  ATTRIBUTE_NAMES, COLOR_KEYS, FORMATS, TOKEN_NAMES, attributesFor, fromQuery, normalizeHex,
  summary, toQuery, tokensFor, withSkin,
} from './config.js';
import { initFeatures } from './features.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const preview = $('#preview');
const card = $('#preview-card');
const showButton = $('#show-game');
const settings = $('.settings');
const gapInput = $('#gap');
const gapOutput = $('#gap-output');
const codeEl = $('#code');
const summaryEl = $('#summary');
const statusEl = $('#copy-status');

let state = fromQuery(location.search);
let format = 'html';

// ---- helpers ---------------------------------------------------------------------------

const computed = (name) => getComputedStyle(preview).getPropertyValue(name).trim();

// "180ms" or "0.9s" -> milliseconds.
function parseTime(text) {
  const value = parseFloat(text);
  if (Number.isNaN(value)) return 0;
  return /ms\s*$/.test(text) ? value : value * 1000;
}

// A color written as a function (the browser may give one back) -> hex, for the color inputs.
function rgbToHex(text) {
  const inside = (text.match(/rgba?\(([^)]+)\)/) || [])[1] || '';
  const parts = inside.split(/[\s,/]+/).filter(Boolean).slice(0, 3).map(Number);
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
  return normalizeHex(parts.map((n) => Math.round(n).toString(16).padStart(2, '0')).join(''));
}

// The color the game really uses now (skin palette or edited value), or null when it is see-through.
function effectiveColor(name) {
  const raw = computed(name);
  if (/\/\s*0(\.0+)?\s*\)/.test(raw) || raw === 'transparent' || raw === '') return null;
  return normalizeHex(raw) || rgbToHex(raw);
}

const isRunning = () => {
  const engine = preview.engine;
  return Boolean(engine) && engine.getState().status === 'running';
};

// ---- the preview -----------------------------------------------------------------------

// Puts exactly the attributes and tokens of the state on the preview. The ones that are not wanted are removed.
function applyState() {
  const wanted = new Map(attributesFor(state));
  for (const name of ATTRIBUTE_NAMES) {
    if (!wanted.has(name)) preview.removeAttribute(name);
    else if (preview.getAttribute(name) !== wanted.get(name)) preview.setAttribute(name, wanted.get(name));
  }
  const tokens = new Map(tokensFor(state));
  for (const name of TOKEN_NAMES) {
    if (tokens.has(name)) preview.style.setProperty(name, tokens.get(name));
    else preview.style.removeProperty(name);
  }
  preview.refreshStyles();
}

let introTimer = 0;
let introRun = 0; // counts the openings, so a slow opening cannot pause a newer one
let quiet = false; // true while the preview opens or restarts by itself, so the focus handlers stay out of the way
let pressing = false;

function waitForEngine() {
  return new Promise((resolve) => {
    let tries = 0;
    const look = () => {
      if (preview.engine || ++tries > 120) resolve(preview.engine);
      else requestAnimationFrame(look);
    };
    look();
  });
}

// Opens the game without taking the focus (open() focuses the board), lets the intro play, then pauses it.
async function openQuietly({ keepFocus = false } = {}) {
  clearTimeout(introTimer);
  const run = ++introRun;
  quiet = true;
  const previous = document.activeElement;
  preview.open();
  if (!keepFocus) {
    const inner = preview.shadowRoot.activeElement;
    if (inner) inner.blur();
    if (previous && previous !== document.body && previous.isConnected) previous.focus({ preventScroll: true });
  }
  const engine = await waitForEngine();
  if (run !== introRun) return; // a newer opening took over (it clears quiet by itself)
  if (engine && engine.getState().status === 'running') {
    const intro = state.intro === 'off' ? 0 : parseTime(computed('--_intro-duration'));
    introTimer = setTimeout(() => { if (run === introRun && isRunning()) preview.pause(); }, intro + parseTime(computed('--_duration')) + 60);
  }
  quiet = false;
}

// Closes the preview without moving the focus or the scroll. The game's close() gives the focus back to its
// _prevFocus (the Intro button that opened it) without preventScroll, which steals the focus and makes the page jump.
// Fixing that in the game goes into item 7 of the next card; until then the landing undoes it in the same tick.
function closeQuietly() {
  const previous = document.activeElement;
  const { scrollX, scrollY } = window;
  quiet = true;
  preview.close();
  const now = document.activeElement;
  if (now !== previous) {
    if (previous && previous !== document.body && previous.isConnected) previous.focus({ preventScroll: true });
    else if (now && now !== document.body) now.blur();
  }
  window.scrollTo(scrollX, scrollY);
  quiet = false;
}

// A new intro needs a new opening.
function reopen() {
  closeQuietly();
  showButton.hidden = true;
  openQuietly();
}

// PROVISIONAL, until the game stops redrawing while it is paused (next card): when the playground is off screen and
// the game is paused with score 0, close the preview quietly (no "Show the game", no focus change) and reopen it
// (paused, no focus taken) when it comes back. A game with points is never closed.
const playground = $('#playground');
if (playground && 'IntersectionObserver' in window) {
  let closedByScroll = false;
  new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) {
      // Focus inside the game: closing it would leave focus on a closed game and make the page jump back on Tab.
      if (document.activeElement === preview) return;
      const engine = preview.engine;
      if (!preview.isOpen || !engine) return;
      const { status, score } = engine.getState();
      if (status !== 'paused' || score !== 0) return;
      clearTimeout(introTimer);
      introRun++;
      closeQuietly();
      closedByScroll = true;
    } else if (closedByScroll) {
      closedByScroll = false;
      if (showButton.hidden && !preview.isOpen) openQuietly();
    }
  }).observe(playground);
}

// Walls and Speed only count in a new game: restart and show it paused.
function restartPaused() {
  if (!preview.isOpen) return;
  const previous = document.activeElement;
  clearTimeout(introTimer);
  quiet = true;
  preview.restart();
  preview.pause();
  if (previous && previous !== document.activeElement && previous.isConnected) previous.focus({ preventScroll: true });
  quiet = false;
}

// The player closed the game (x or Esc): offer a way back.
preview.addEventListener('snake-close', () => {
  if (quiet) return;
  clearTimeout(introTimer);
  showButton.hidden = false;
  setTimeout(() => showButton.focus(), 0);
});

showButton.addEventListener('click', () => {
  showButton.hidden = true;
  openQuietly({ keepFocus: true });
});

// Leaving the game (Tab, a click on a setting) pauses it, so it does not run where nobody is looking.
// A click on the game itself is not "leaving": some browsers do not focus buttons, so the pointer is tracked.
card.addEventListener('pointerdown', () => { pressing = true; clearTimeout(introTimer); });
const releasePointer = () => setTimeout(() => { pressing = false; }, 0);
document.addEventListener('pointerup', releasePointer);
document.addEventListener('pointercancel', releasePointer);
preview.addEventListener('keydown', () => clearTimeout(introTimer));
preview.addEventListener('focusout', (event) => {
  if (quiet || pressing) return;
  const next = event.relatedTarget;
  if (next && (next === preview || preview.contains(next))) return;
  if (isRunning()) preview.pause();
});

// ---- settings --------------------------------------------------------------------------

function renderChoices() {
  for (const button of $$('button[data-group]', settings)) {
    button.setAttribute('aria-pressed', String(state[button.dataset.group] === button.dataset.value));
  }
  gapInput.value = String(state.gap);
  gapOutput.textContent = `${state.gap} px`;
}

function renderColors() {
  const surface = normalizeHex(getComputedStyle(document.documentElement).getPropertyValue('--surface'));
  for (const key of COLOR_KEYS) {
    const hex = effectiveColor(`--_${key}`);
    const input = $(`[data-color="${key}"]`);
    const label = $(`[data-color-value="${key}"]`);
    if (hex) {
      input.value = hex;
      input.toggleAttribute('data-transparent', false);
      label.textContent = hex;
    } else {
      if (surface) input.value = surface;
      input.toggleAttribute('data-transparent', true);
      label.textContent = 'transparent';
    }
  }
  // The card around the board follows the board background, so a dark skin does not sit on a white frame.
  const background = effectiveColor('--_background');
  if (background) card.style.setProperty('--preview-surface', background);
  else card.style.removeProperty('--preview-surface');
}

function renderCode() {
  codeEl.textContent = FORMATS.find((f) => f.id === format).make(state);
  for (const tab of $$('[data-format]')) tab.setAttribute('aria-pressed', String(tab.dataset.format === format));
  summaryEl.replaceChildren(...summary(state).map((text) => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }));
}

function refresh() {
  applyState();
  renderChoices();
  renderColors();
  renderCode();
}

function choose(group, value) {
  if (group === 'skin') {
    state = withSkin(state, value); // even the current skin: it drops the edited colors
  } else if (state[group] === value) {
    return;
  } else {
    state = { ...state, [group]: value };
  }
  refresh();
  if (group === 'walls' || group === 'speed') restartPaused();
  if (group === 'intro') reopen();
}

settings.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-group]');
  if (button) choose(button.dataset.group, button.dataset.value);
});

gapInput.addEventListener('input', () => {
  state = { ...state, gap: Number(gapInput.value) };
  applyState();
  gapOutput.textContent = `${state.gap} px`;
  renderCode();
});

for (const input of $$('[data-color]')) {
  input.addEventListener('input', () => {
    const hex = normalizeHex(input.value);
    if (!hex) return;
    state = { ...state, colors: { ...state.colors, [input.dataset.color]: hex } };
    applyState();
    input.toggleAttribute('data-transparent', false);
    $(`[data-color-value="${input.dataset.color}"]`).textContent = hex;
    if (input.dataset.color === 'background') card.style.setProperty('--preview-surface', hex);
    renderCode();
  });
}

// The "Seasonal skins" scene in the features section has real buttons that set the skin here.
document.addEventListener('landing-pick-skin', (event) => choose('skin', event.detail.skin));

// ---- code panel ------------------------------------------------------------------------

for (const tab of $$('[data-format]')) {
  tab.addEventListener('click', () => {
    format = tab.dataset.format;
    renderCode();
  });
}

function announce(message) {
  statusEl.textContent = '';
  setTimeout(() => { statusEl.textContent = message; }, 50);
}

// Tries, in order: the Clipboard API, a hidden textarea with execCommand, then selecting the text for the person.
async function copyText(text, selectable) {
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch { /* not allowed here (for example a phone opening the page by IP): try the next way */ }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.className = 'visually-hidden';
    document.body.append(area);
    area.select();
    const done = document.execCommand('copy');
    area.remove();
    if (done) return 'copied';
  } catch { /* ignore */ }
  if (selectable) {
    getSelection().selectAllChildren(selectable);
    return 'select';
  }
  return 'failed';
}

// The button says "Copied" for 2 seconds.
function flash(button, label) {
  if (button.dataset.label === undefined) button.dataset.label = button.textContent;
  button.textContent = label;
  clearTimeout(button.flashTimer);
  button.flashTimer = setTimeout(() => { button.textContent = button.dataset.label; }, 2000);
}

$('#copy-code').addEventListener('click', async (event) => {
  const button = event.currentTarget; // currentTarget is gone after an await
  const result = await copyText(codeEl.textContent, codeEl);
  if (result === 'copied') {
    flash(button, 'Copied');
    announce('Code copied');
  } else {
    flash(button, 'Press ⌘C / Ctrl+C');
    announce('Press Command C or Control C to copy the selected code');
    button.focus({ preventScroll: true }); // the selection moved the focus into the code
  }
});

$('#copy-link').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const query = toQuery(state);
  const link = `${location.origin}${location.pathname}${query ? `?${query}` : ''}`;
  const result = await copyText(link);
  if (result === 'copied') {
    flash(button, 'Copied');
    announce('Link copied');
  } else {
    prompt('Copy this link', link);
  }
});

// ---- start -----------------------------------------------------------------------------

await customElements.whenDefined('snake-game');
refresh();
initFeatures();
await openQuietly();
