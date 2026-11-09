// THEME: the single source of truth for every visual value (colors, sizes, fonts, spacing).
// Nothing else in src/ may contain a literal color or a size in pixels.
// Each token below is public: set `--snake-<name>` on the element, on a parent or on :root
// and it overrides the default. When the Figma file arrives, only this file changes.

export const TOKEN_DEFS = [
  // Grid
  { name: 'grid-color', kind: 'color', value: '#d4d4d4', doc: 'Light gray of the grid dots, squares or lines.' },
  { name: 'grid-dot-size', kind: 'length', value: '6px', doc: 'Diameter of a grid dot (or side of a grid square).' },
  { name: 'grid-line-width', kind: 'length', value: '1px', doc: 'Thickness of the lines when grid="lines".' },
  { name: 'spacing', kind: 'length', value: '32px', doc: 'Distance between the centers of two neighbor cells.' },
  // Snake
  { name: 'color', kind: 'color', value: '#111111', doc: 'Color of the snake.' },
  { name: 'head-size', kind: 'length', value: '16px', doc: 'Diameter of the head (and of every dot when snake="uniform").' },
  { name: 'tail-size', kind: 'length', value: '8px', doc: 'Diameter of the tip of the tail.' },
  // Food
  { name: 'food-color', kind: 'color', value: '#2563eb', doc: 'Color of the food.' },
  { name: 'food-size', kind: 'length', value: '12px', doc: 'Diameter of the food.' },
  { name: 'food-halo-color', kind: 'color', value: 'rgb(37 99 235 / 0.35)', doc: 'Color of the soft glow around the food.' },
  { name: 'food-halo-size', kind: 'length', value: '24px', doc: 'Blur of the glow around the food.' },
  // Board and overlay
  { name: 'background', kind: 'color', value: 'transparent', doc: 'Background of the board.' },
  { name: 'backdrop', kind: 'color', value: 'rgb(255 255 255 / 0.92)', doc: 'Background that covers the page in modal mode (and behind messages).' },
  { name: 'board-width', kind: 'length', value: 'min(92vw, 960px)', doc: 'Maximum width of the board.' },
  { name: 'board-height', kind: 'length', value: 'min(70vh, 480px)', doc: 'Maximum height of the board.' },
  // Text and controls
  { name: 'text-color', kind: 'color', value: '#1a1a1a', doc: 'Color of the texts. Keep a contrast of at least 4.5:1 with the background.' },
  { name: 'font', kind: 'text', value: 'system-ui, sans-serif', doc: 'Font family of the texts.' },
  { name: 'font-size', kind: 'length', value: '14px', doc: 'Size of the texts.' },
  { name: 'focus-color', kind: 'color', value: '#111111', doc: 'Color of the keyboard focus outline.' },
  { name: 'button-size', kind: 'length', value: '44px', doc: 'Minimum size of buttons (touch target).' },
  // Motion
  { name: 'duration', kind: 'time', value: '180ms', doc: 'Transitions: the head growing and the tail shrinking.' },
  { name: 'intro-duration', kind: 'time', value: '900ms', doc: 'Duration of the opening wave or cascade.' },
];

const declarations = TOKEN_DEFS.map((t) => `  /* ${t.doc} */\n  --_${t.name}: var(--snake-${t.name}, ${t.value});`).join('\n');

export const themeCSS = `
:host {
${declarations}
}
:host(:not([mode="inline"])) { display: contents; }
:host([mode="inline"]) { display: block; }
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
