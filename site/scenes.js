// The six animated illustrations of the "features" section, as pure functions (no DOM, no timers).
// frame(t) takes the tick number (1 tick = TICK_MS) and returns a plain object: for each element id of the scene,
// a patch like { on, hidden, text, vars, attrs, pop }. features.js applies the patches to the HTML.
// Movement is only numbers (cells, an index): the CSS turns them into translate/scale/opacity.
// still is the single frame shown when motion is reduced, or when the animation is paused for good:
// it never has a pointer or a typing cursor.

export const TICK_MS = 100;

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

// Cells of a closed loop around a rectangle, clockwise: a snake that walks it never has to turn back.
export function ringOf(x0, y0, x1, y1) {
  const cells = [];
  for (let x = x0; x <= x1; x++) cells.push([x, y0]);
  for (let y = y0 + 1; y <= y1; y++) cells.push([x1, y]);
  for (let x = x1 - 1; x >= x0; x--) cells.push([x, y1]);
  for (let y = y1 - 1; y > y0; y--) cells.push([x0, y]);
  return cells;
}

const cell = (c, i) => ({ vars: { '--cx': c[0], '--cy': c[1], '--i': i } });
const snakeOn = (ring, head, length) => {
  const out = {};
  for (let i = 0; i < length; i++) out[`seg-${i}`] = cell(ring[(head - i + ring.length * 4) % ring.length], i);
  return out;
};

// Hides the pointer and the typing cursor in the single stopped frame.
function calm(frame) {
  const out = { ...frame };
  for (const id of Object.keys(out)) {
    if (id === 'ptr' || id === 'caret') out[id] = { ...out[id], on: false };
  }
  return out;
}

// ---- a. Seasonal skins ---------------------------------------------------------------------

export const SKIN_IDS = ['default', 'natal', 'halloween', 'carnaval'];
const SKINS_RING = ringOf(1, 1, 10, 5); // 26 cells on a 12 x 7 board
const SKINS_STEP_MS = 220;
const SKINS_EVERY = 12; // steps per skin
const SKINS_STILL_STEP = 10;

function skinsFrame(t, still, stillSkin = 1) {
  const R = SKINS_RING.length;
  const step = still ? SKINS_STILL_STEP : Math.floor((t * TICK_MS) / SKINS_STEP_MS);
  const skin = still ? stillSkin : Math.floor(step / SKINS_EVERY) % SKIN_IDS.length;
  const phase = step % SKINS_EVERY;
  const head = (step + 4) % R;
  const eaten = step < 5 ? 0 : Math.floor((step - 5) / 11) + 1; // the snake eats every 11 steps
  const food = SKINS_RING[(9 + 11 * eaten) % R];
  const next = (skin + 1) % SKIN_IDS.length;
  const pressing = !still && phase >= 10;
  const out = { root: { attrs: { 'data-skin': SKIN_IDS[skin] } }, ...snakeOn(SKINS_RING, head, 5) };
  SKIN_IDS.forEach((id, i) => {
    out[`chip-${i}`] = { on: i === skin, vars: { '--press': pressing && i === next ? 1 : 0 } };
    out[`layer-${i}`] = { on: i === skin };
    out[`food-${i}`] = { on: i === skin, vars: { '--cx': food[0], '--cy': food[1] }, pop: still ? 0 : eaten * 10 + skin };
  });
  out.ptr = { on: !still && phase >= 5, vars: { '--at': next, '--pressed': pressing ? 1 : 0 } };
  return out;
}

// ---- b. Themed with CSS variables ----------------------------------------------------------

// The digits shown after the "#": black, green and purple. Each phase types the next one.
const INK_CODES = ['111111', '146b3a', '6a1b9a'];
const TOKENS_PHASE = 30; // ticks per phase (3 s)
const TOKENS_TICKS = TOKENS_PHASE * 3;
const TOKENS_ORDER = [1, 2, 0]; // phase 0 types green (after black), then purple, then black again

function tokensFrame(t, still) {
  const tick = still ? 20 : t % TOKENS_TICKS;
  const phase = Math.floor(tick / TOKENS_PHASE);
  const local = tick % TOKENS_PHASE;
  const target = TOKENS_ORDER[phase];
  const before = TOKENS_ORDER[(phase + 2) % 3];
  const typed = local >= 8 ? `#${INK_CODES[target]}`.slice(0, clamp(local - 7, 0, 7)) : `#${INK_CODES[before]}`;
  const out = {
    root: { attrs: { 'data-ink': local >= 17 ? target : before } },
    value: { text: typed },
    hl: { on: local >= 5 && local < 8 },
    caret: { on: local >= 8 && local < 17 },
  };
  for (let i = 0; i < 5; i++) out[`seg-${i}`] = cell([6 - i, 2], i);
  return out;
}

// ---- c. Optional leaderboard ---------------------------------------------------------------

const BOARD_NAME = 'carol';
const BOARD_TICKS = 80;
const BOARD_LIST_AT = 36;

function boardFrame(t, still) {
  const tick = still ? 50 : t % BOARD_TICKS;
  const form = tick < BOARD_LIST_AT;
  const letters = tick >= 10 ? clamp(Math.floor((tick - 10) / 3) + 1, 0, BOARD_NAME.length) : 0;
  const clickField = tick >= 5 && tick < 7;
  const clickSave = tick >= 33 && tick < 35;
  const out = {
    form: { hidden: !form },
    list: { hidden: form },
    name: { text: BOARD_NAME.slice(0, letters) },
    field: { on: tick >= 6 && form },
    caret: { on: tick >= 6 && tick < 30 },
    save: { vars: { '--pressed': tick >= 33 && form ? 1 : 0 } },
    ptr: { on: tick >= 2 && form, vars: { '--at': tick < 24 ? 0 : 1, '--pressed': clickField || clickSave ? 1 : 0 } },
  };
  for (let i = 0; i < 5; i++) out[`row-${i}`] = { on: !form };
  return out;
}

// ---- d. Any trigger ------------------------------------------------------------------------

export const SECRET_KEYS = ['↑', '↑', '↓', '↓', '←', '→', '←', '→', 'B', 'A'];
const TRIGGER_TICKS = 70;
const TRIGGER_OPEN_AT = 37;
const TRIGGER_RING = ringOf(2, 2, 11, 6); // cells of 16 on a 14 x 9 board
const TRIGGER_STEP_TICKS = 2; // 200 ms

function triggerFrame(t, still) {
  const tick = still ? 60 : t % TRIGGER_TICKS;
  const lit = tick >= 5 ? clamp(Math.floor((tick - 5) / 3) + 1, 0, SECRET_KEYS.length) : 0;
  const open = tick >= TRIGGER_OPEN_AT;
  const step = still || !open ? 0 : Math.floor((tick - TRIGGER_OPEN_AT) / TRIGGER_STEP_TICKS);
  const out = {
    caption: { text: tick < 5 ? 'A visitor lands on a 404 page' : open ? 'the game opens' : 'and types the secret code…' },
    veil: { on: open },
    modal: { on: open },
    ...snakeOn(TRIGGER_RING, step + 3, 4),
  };
  SECRET_KEYS.forEach((_, i) => { out[`key-${i}`] = { on: i < lit }; });
  return out;
}

// ---- e. Accessible by default --------------------------------------------------------------

const ACCESS_RING = ringOf(1, 1, 7, 3); // 16 cells on a 9 x 5 board
const ACCESS_TICKS = 80;
const ACCESS_STEP_TICKS = 3; // 300 ms
const ACCESS_GIFT_AT = 18;
const ACCESS_STAR_AT = 45;
const ACCESS_PAUSED_AT = 68;
const ARROWS = ['↑', '←', '↓', '→'];

function accessFrame(t, still) {
  const tick = still ? 75 : t % ACCESS_TICKS;
  const R = ACCESS_RING.length;
  const step = Math.floor(Math.min(tick, ACCESS_PAUSED_AT) / ACCESS_STEP_TICKS); // the snake stops at "Paused"
  const now = ACCESS_RING[step % R];
  const before = ACCESS_RING[(step - 1 + R) % R];
  const dx = now[0] - before[0];
  const dy = now[1] - before[1];
  const arrow = dx > 0 ? '→' : dx < 0 ? '←' : dy > 0 ? '↓' : '↑';
  const gift = ACCESS_RING[6];
  const star = ACCESS_RING[15];
  const out = {
    ...snakeOn(ACCESS_RING, step % R, 4),
    'food-gift': { hidden: tick >= ACCESS_GIFT_AT, vars: { '--cx': gift[0], '--cy': gift[1] } },
    'food-star': { hidden: tick >= ACCESS_STAR_AT, vars: { '--cx': star[0], '--cy': star[1] } },
    'bubble-gift': { on: tick >= ACCESS_GIFT_AT, hidden: tick >= ACCESS_PAUSED_AT }, // only the last 2 stay
    'bubble-star': { on: tick >= ACCESS_STAR_AT },
    'bubble-paused': { on: tick >= ACCESS_PAUSED_AT },
  };
  ARROWS.forEach((key, i) => { out[`key-${i}`] = { on: key === arrow }; });
  return out;
}

// ---- f. Works in any stack -----------------------------------------------------------------

export const STACK = [
  { tab: 'HTML', file: '<!-- index.html -->' },
  { tab: 'Astro', file: '<!-- src/pages/404.astro -->' },
  { tab: 'React', file: '{/* NotFound.jsx */}' },
  { tab: 'Vue', file: '<!-- NotFound.vue -->' },
  { tab: 'WordPress', file: '<!-- footer.php -->' },
];
export const STACK_TAG = '<snake-game skin="natal"></snake-game>';
const STACK_TAB_TICKS = 20; // 2 s per tab

function stackFrame(t, still) {
  const tick = still ? 8 : t % (STACK_TAB_TICKS * STACK.length);
  const index = Math.floor(tick / STACK_TAB_TICKS);
  const local = tick % STACK_TAB_TICKS;
  const next = (index + 1) % STACK.length;
  const out = {
    file: { text: STACK[index].file },
    typed: { text: STACK_TAG.slice(0, clamp(local * 5, 0, STACK_TAG.length)) },
    caret: { on: local < 9 },
    ptr: { on: local >= 12, vars: { '--at': next, '--pressed': local >= 18 ? 1 : 0 } },
  };
  STACK.forEach((_, i) => { out[`tab-${i}`] = { on: i === index }; });
  return out;
}

// ---- the list ------------------------------------------------------------------------------

function scene(id, ticks, build) {
  return { id, ticks, frame: (t) => build(t, false), still: calm(build(0, true)) };
}

export const SCENES = [
  { ...scene('skins', 1000, skinsFrame), stillFor: (skin) => calm(skinsFrame(0, true, skin)) },
  scene('tokens', TOKENS_TICKS, tokensFrame),
  scene('leaderboard', BOARD_TICKS, boardFrame),
  scene('trigger', TRIGGER_TICKS, triggerFrame),
  scene('a11y', ACCESS_TICKS, accessFrame),
  scene('stack', STACK_TAB_TICKS * STACK.length, stackFrame),
];

export const SCENE_IDS = SCENES.map((s) => s.id);
