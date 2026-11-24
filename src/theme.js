// THEME: the single source of truth for every visual value (colors, sizes, fonts, spacing).
// Nothing else in src/ may contain a literal color or a size in pixels (the only other place for colors is skins/*.js).
// Each token below is public: set `--snake-<name>` on the element, on a parent or on :root
// and it overrides the default. When the Figma file arrives, only this file changes.

// Phones: a touch screen (pointer: coarse) that is small. 540px is the largest side that still counts as a phone
// (the short side, so the same value works lying down and standing). Tablets and desktops keep the normal layout.
const PHONE_LANDSCAPE = '(pointer: coarse) and (orientation: landscape) and (max-height: 540px)';
const PHONE_PORTRAIT = '(pointer: coarse) and (orientation: portrait) and (max-width: 540px)';

// Default of the tail tip: this share of the head diameter (used when --snake-tail-size is not set).
export const TAIL_RATIO = 0.8;
// Floor of the board on phones, in case --snake-board-share holds something invalid.
const BOARD_MIN_SHARE = '50%';

// Font of the emoji food, and font size of the canvas test that checks the device can show an emoji.
export const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
export const EMOJI_PROBE_SIZE = 32;

// kind 'auto-length': a length, or the word `auto` (the default), which the code resolves (see geometry.js, resolveSnakeSizes).
export const TOKEN_DEFS = [
  // Grid
  { name: 'grid-color', kind: 'color', value: '#d4d4d4', doc: 'Light gray of the grid dots, squares or lines.' },
  { name: 'grid-dot-size', kind: 'length', value: '6px', doc: 'Diameter of a grid dot (or side of a grid square).' },
  { name: 'grid-line-width', kind: 'length', value: '1px', doc: 'Thickness of the lines when grid="lines".' },
  { name: 'spacing', kind: 'length', value: '32px', doc: 'Distance between the centers of two neighbor cells.' },
  // Snake
  { name: 'color', kind: 'color', value: '#111111', doc: 'Color of the snake.' },
  { name: 'gap', kind: 'signed-length', value: '2px', doc: 'Space on screen between the head and the next dot (2px by default). Dots shrink to keep it when the grid shrinks. With snake="taper" the tail gets thinner and the space grows to about 8px at the tip; with snake="uniform" it is 2px along the whole body. 0 lets the dots touch; a negative value makes them overlap.' },
  { name: 'head-size', kind: 'auto-length', value: 'auto', doc: 'Diameter of the head (and of every dot when snake="uniform"). Default: auto, the spacing minus the gap (30px). A fixed value (like 16px) also works.' },
  { name: 'tail-size', kind: 'auto-length', value: 'auto', doc: 'Diameter of the tip of the tail. Default: auto, 80% of the head (24px), following a head set by hand. A fixed value (like 8px) also works.' },
  // Food
  { name: 'food-color', kind: 'color', value: '#2563eb', doc: 'Color of the food.' },
  { name: 'food-size', kind: 'length', value: '12px', doc: 'Diameter of the food.' },
  { name: 'food-emoji-size', kind: 'percentage', value: '75%', doc: 'Size of the emoji food (skins), as a share of the spacing: 75% of 32px is 24px. Shrinks with the grid. No glow.' },
  { name: 'food-halo-color', kind: 'color', value: 'rgb(37 99 235 / 0.35)', doc: 'Color of the soft glow around the food.' },
  { name: 'food-halo-size', kind: 'length', value: '24px', doc: 'Blur of the glow around the food.' },
  // Board and overlay
  { name: 'background', kind: 'color', value: 'transparent', doc: 'Background of the board.' },
  { name: 'backdrop', kind: 'color', value: 'rgb(255 255 255 / 0.92)', doc: 'Background that covers the page in modal mode (and behind messages).' },
  { name: 'board-width', kind: 'length', value: 'min(92vw, 960px)', doc: 'Maximum width of the board.' },
  { name: 'board-height', kind: 'length', value: 'min(70vh, 480px)', doc: 'Maximum height of the board.' },
  { name: 'board-share', kind: 'percentage', value: '75%', doc: 'Share of the screen the board takes on phones, in modal mode: width when lying down, height when standing.' },
  // Text and controls
  { name: 'text-color', kind: 'color', value: '#1a1a1a', doc: 'Color of the texts. Keep a contrast of at least 4.5:1 with the background.' },
  { name: 'font', kind: 'text', value: 'system-ui, sans-serif', doc: 'Font family of the texts.' },
  { name: 'font-size', kind: 'length', value: '14px', doc: 'Size of the texts.' },
  { name: 'focus-color', kind: 'color', value: '#111111', doc: 'Color of the keyboard focus outline.' },
  { name: 'button-size', kind: 'length', value: '44px', doc: 'Minimum size of buttons (touch target).' },
  // Leaderboard (the optional addon)
  { name: 'highlight-color', kind: 'color', value: 'var(--_focus-color)', doc: 'Color of your own name in the Top 10 (bold too). Default: the focus color. Keep 4.5:1 with the background.' },
  { name: 'field-font-size', kind: 'length', value: '16px', doc: 'Text size of the name field. At least 16px, so iPhones do not zoom in when it gets focus.' },
  // Motion
  { name: 'duration', kind: 'time', value: '180ms', doc: 'Transitions: the tail tip shrinking (also the food appearing).' },
  { name: 'intro-duration', kind: 'time', value: '900ms', doc: 'Duration of the opening wave or cascade.' },
];

// Colors have one more layer: --snake-x (the owner), then --_skin-x (the skin palette, see skins.js), then the default.
const fallback = (t) => (t.kind === 'color' ? `var(--_skin-${t.name}, ${t.value})` : t.value);
const declarations = TOKEN_DEFS.map((t) => `  /* ${t.doc} */\n  --_${t.name}: var(--snake-${t.name}, ${fallback(t)});`).join('\n');

export const themeCSS = `
:host {
${declarations}
}
:host(:not([mode="inline"])) { display: contents; }
/* Fills the container also in flex/grid rows; any page rule on the tag overrides it. */
:host([mode="inline"]) { display: block; width: 100%; box-sizing: border-box; }
:host([mode="inline"]:not([open])) { display: none; }

*, *::before, *::after { box-sizing: border-box; }

.frame {
  color: var(--_text-color);
  font-family: var(--_font);
  font-size: var(--_font-size);
  line-height: 1.4;
}
dialog.frame {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 1rem;
  border: 0;
  background: var(--_backdrop);
  align-items: center;
  justify-content: center;
}
dialog.frame[open] { display: flex; }
dialog.frame::backdrop { background: none; }
div.frame { max-width: 100%; }

.panel { display: flex; flex-direction: column; gap: 0.5rem; width: 100%; max-width: min(100%, var(--_board-width)); }

.bar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.stats { display: flex; gap: 1rem; font-variant-numeric: tabular-nums; }
.score { font-weight: 600; }
.actions { display: flex; gap: 0.5rem; }

.btn {
  min-width: var(--_button-size);
  min-height: var(--_button-size);
  padding: 0 1rem;
  border: 1px solid var(--_text-color);
  border-radius: 999px;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.btn:hover { background: var(--_grid-color); }
.btn.icon { padding: 0; font-size: 1.5em; line-height: 1; }

.board {
  position: relative;
  width: 100%;
  height: var(--_board-height);
  max-width: 100%;
  background: var(--_background);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

/* Phones, modal only: the board takes --_board-share of the screen and the score and buttons use the rest. */
@media ${PHONE_LANDSCAPE} {
  dialog.frame { height: 100%; height: 100dvh; overflow: hidden; overscroll-behavior: contain; padding: max(0.5rem, env(safe-area-inset-top, 0px)) max(0.5rem, env(safe-area-inset-right, 0px)) max(0.5rem, env(safe-area-inset-bottom, 0px)) max(0.5rem, env(safe-area-inset-left, 0px)); }
  dialog.frame .panel { flex-direction: row-reverse; align-items: stretch; height: 100%; max-width: none; }
  dialog.frame .board { flex: 0 1 var(--_board-share); min-width: ${BOARD_MIN_SHARE}; width: auto; height: 100%; }
  dialog.frame .bar { flex: 1 1 0; min-width: 0; flex-direction: column; align-items: center; justify-content: center; }
  dialog.frame .stats { flex-direction: column; align-items: center; gap: 0.25rem; }
  dialog.frame .actions { flex-direction: column; }
}
@media ${PHONE_PORTRAIT} {
  dialog.frame { height: 100%; height: 100dvh; overflow: hidden; overscroll-behavior: contain; padding: max(0.5rem, env(safe-area-inset-top, 0px)) max(0.5rem, env(safe-area-inset-right, 0px)) max(0.5rem, env(safe-area-inset-bottom, 0px)) max(0.5rem, env(safe-area-inset-left, 0px)); }
  dialog.frame .panel { flex-direction: column; height: 100%; max-width: none; }
  dialog.frame .board { flex: 0 1 var(--_board-share); min-height: ${BOARD_MIN_SHARE}; height: auto; }
  dialog.frame .bar { flex: 0 0 auto; }
}

canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }

:focus-visible { outline: 2px solid var(--_focus-color); outline-offset: 2px; }

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  text-align: center;
  background: var(--_backdrop);
}
.overlay[hidden] { display: none; }
.message { margin: 0; font-size: 1.25em; font-weight: 600; }

.live {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
`;
