// Landing page settings: pure functions, no DOM (same idea as demo/contrast.js).
// One state object describes what the visitor picked. The preview and the generated code both read it
// through attributesFor() and tokensFor(), so they cannot drift apart.

export const PAGES_URL = 'https://akacaja.github.io/snake-game/';
export const REPO_URL = 'https://github.com/akacaja/snake-game';

// The id is what the game and the link use: skin ids are the real skin names.
export const OPTIONS = {
  skin: [
    { id: 'default', label: 'Default', icon: '🐍' },
    { id: 'natal', label: 'Christmas', icon: '🎄' },
    { id: 'halloween', label: 'Halloween', icon: '🎃' },
    { id: 'carnaval', label: 'Carnival', icon: '🎉' },
  ],
  grid: [
    { id: 'dots', label: 'Dots' },
    { id: 'squares', label: 'Squares' },
    { id: 'lines', label: 'Lines' },
    { id: 'none', label: 'None' },
  ],
  snake: [
    { id: 'taper', label: 'Taper' },
    { id: 'uniform', label: 'Uniform' },
  ],
  walls: [
    { id: 'solid', label: 'Solid' },
    { id: 'wrap', label: 'Wrap' },
  ],
  intro: [
    { id: 'wave', label: 'Wave' },
    { id: 'cascade', label: 'Cascade' },
    { id: 'off', label: 'Off' },
  ],
  speed: [
    { id: 'slow', label: 'Slow' },
    { id: 'classic', label: 'Classic' },
    { id: 'fast', label: 'Fast' },
  ],
  leaderboard: [
    { id: 'off', label: 'Off' },
    { id: 'local', label: 'Local' },
  ],
};

// Colors the visitor can edit: the key is the game token name (--snake-<key>) and the link key.
export const COLOR_KEYS = ['color', 'food-color', 'grid-color', 'background'];
export const GAP_RANGE = { min: 0, max: 10, step: 1, initial: 2 };

// Every attribute and token the landing may put on the preview (the others are removed).
export const ATTRIBUTE_NAMES = ['skin', 'grid', 'snake', 'wrap', 'intro', 'speed', 'leaderboard'];
export const TOKEN_NAMES = [...COLOR_KEYS.map((key) => `--snake-${key}`), '--snake-gap'];

// speed is a number in the game: Classic is the game default, so it has no attribute.
const SPEED_VALUES = { slow: '3', fast: '8' };

export function defaultState() {
  return {
    skin: 'default',
    grid: 'dots',
    snake: 'taper',
    gap: GAP_RANGE.initial,
    colors: {},
    walls: 'solid',
    intro: 'wave',
    speed: 'classic',
    leaderboard: 'local',
  };
}

// Picking a skin (even the current one) drops the edited colors, so the palette of the skin shows.
export function withSkin(state, skin) {
  return { ...state, skin, colors: {} };
}

export function normalizeHex(value) {
  const text = String(value ?? '').trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{6}$/.test(text)) return `#${text}`;
  if (/^[0-9a-f]{3}$/.test(text)) return `#${[...text].map((c) => c + c).join('')}`;
  return null;
}

// What the preview and the HTML put on the <snake-game> tag, in this order. Only what differs from the default.
export function attributesFor(state) {
  const out = [];
  if (state.skin !== 'default') out.push(['skin', state.skin]);
  if (state.grid !== 'dots') out.push(['grid', state.grid]);
  if (state.snake !== 'taper') out.push(['snake', state.snake]);
  if (state.walls === 'wrap') out.push(['wrap', '']);
  if (state.intro === 'off') out.push(['intro', 'none']);
  else if (state.intro !== 'wave') out.push(['intro', state.intro]);
  if (SPEED_VALUES[state.speed]) out.push(['speed', SPEED_VALUES[state.speed]]);
  if (state.leaderboard === 'off') out.push(['leaderboard', 'off']);
  return out;
}

// CSS tokens that changed, in this order: color, food-color, grid-color, background, gap.
export function tokensFor(state) {
  const out = [];
  for (const key of COLOR_KEYS) {
    const hex = normalizeHex(state.colors[key]);
    if (hex) out.push([`--snake-${key}`, hex]);
  }
  if (state.gap !== GAP_RANGE.initial) out.push(['--snake-gap', `${state.gap}px`]);
  return out;
}

const attributeText = ([name, value]) => (value === '' ? name : `${name}="${value}"`);

export function scriptsFor(state) {
  const files = ['dist/snake-game.js'];
  if (state.skin !== 'default') files.push(`skins/${state.skin}.js`);
  if (state.leaderboard === 'local') files.push('addons/leaderboard.js');
  return files.map((file) => `<script src="${PAGES_URL}${file}"></script>`);
}

export const TAG_COMMENT = [
  '<!-- Shown on the page. To hide it as an easter egg, remove mode="inline" and open,',
  "     then call document.querySelector('snake-game').open() from your trigger. -->",
].join('\n');

const TAG_WIDTH = 80;

export function tagFor(state) {
  const head = '<snake-game mode="inline" open';
  const attrs = attributesFor(state).map(attributeText);
  const flat = `${head}${attrs.length ? ' ' + attrs.join(' ') : ''}></snake-game>`;
  if (flat.length <= TAG_WIDTH) return flat;
  return `${head}\n  ${attrs.join(' ')}></snake-game>`;
}

export const NO_TOKENS_CSS = [
  '/* Nothing to add: the game uses its default tokens.',
  '   Change a color or the gap above, or set any --snake-* variable here. */',
].join('\n');

export function cssFor(state) {
  const tokens = tokensFor(state);
  if (!tokens.length) return NO_TOKENS_CSS;
  return ['snake-game {', ...tokens.map(([name, value]) => `  ${name}: ${value};`), '}'].join('\n');
}

export function htmlFor(state) {
  const parts = [scriptsFor(state).join('\n')];
  if (tokensFor(state).length) {
    const block = cssFor(state).split('\n').map((line) => `  ${line}`).join('\n');
    parts.push(`<style>\n${block}\n</style>`);
  }
  parts.push(`${TAG_COMMENT}\n${tagFor(state)}`);
  return parts.join('\n\n');
}

const find = (group, id) => OPTIONS[group].find((o) => o.id === id);

// The chips under "Your game, ready to paste". The prompt uses the same words.
export function summary(state) {
  const skin = find('skin', state.skin);
  const grid = state.grid === 'none' ? 'No grid' : `${find('grid', state.grid).label} grid`;
  const chips = [
    `${skin.icon} ${skin.label} skin`,
    grid,
    `${state.snake === 'taper' ? 'Tapered' : 'Uniform'} snake`,
    `${state.gap}px gap`,
    `${find('walls', state.walls).label} walls`,
    state.intro === 'off' ? 'Intro off' : `${find('intro', state.intro).label} intro`,
    `${find('speed', state.speed).label} speed`,
    `Leaderboard ${state.leaderboard}`,
  ];
  const custom = Object.keys(state.colors).filter((key) => normalizeHex(state.colors[key])).length;
  if (custom) chips.push(`${custom} custom ${custom === 1 ? 'color' : 'colors'}`);
  return chips;
}

export function promptFor(state) {
  const hasTokens = tokensFor(state).length > 0;
  const lines = [
    `Add the snake-game web component to my website (${REPO_URL}). It is a snake game in one HTML tag, with no dependencies.`,
    '',
    `Use exactly this setup: ${summary(state).join(', ')}.`,
    '',
    '1. Load these files once, before the closing </body> tag:',
    scriptsFor(state).join('\n'),
    '',
    '2. Put this tag where the game should appear:',
    `${TAG_COMMENT}\n${tagFor(state)}`,
    '',
  ];
  if (hasTokens) lines.push('3. Add these CSS variables to my stylesheet:', cssFor(state), '');
  lines.push(
    'The tag above shows the game on the page. To hide it as an easter egg instead, remove mode="inline" and open, and call document.querySelector(\'snake-game\').open() from a trigger, for example a secret key sequence, a click on a hidden element or a 404 page. Ask me which trigger I want before writing that part.',
    'Do not add dependencies and do not edit the snake-game files.',
  );
  return lines.join('\n');
}

export const FORMATS = [
  { id: 'html', label: 'HTML', make: htmlFor },
  { id: 'css', label: 'CSS tokens', make: cssFor },
  { id: 'prompt', label: 'Prompt for AI', make: promptFor },
];

// ---- link ------------------------------------------------------------------------------

// Only what differs from the default, in a fixed order. Returns '' for the default state (no "?").
export function toQuery(state) {
  const pairs = [];
  if (state.skin !== 'default') pairs.push(['skin', state.skin]);
  if (state.grid !== 'dots') pairs.push(['grid', state.grid]);
  if (state.snake !== 'taper') pairs.push(['snake', state.snake]);
  if (state.gap !== GAP_RANGE.initial) pairs.push(['gap', String(state.gap)]);
  if (state.walls === 'wrap') pairs.push(['walls', 'wrap']);
  if (state.intro !== 'wave') pairs.push(['intro', state.intro]);
  if (state.speed !== 'classic') pairs.push(['speed', state.speed]);
  if (state.leaderboard === 'off') pairs.push(['leaderboard', 'off']);
  for (const key of COLOR_KEYS) {
    const hex = normalizeHex(state.colors[key]);
    if (hex) pairs.push([key, hex.slice(1)]);
  }
  return pairs.map(([key, value]) => `${key}=${value}`).join('&');
}

// Tolerant: never throws. Wrong values fall back to the default; unknown keys are ignored; the first repeated key wins.
export function fromQuery(text) {
  const state = defaultState();
  const params = new Map();
  let entries = [];
  try {
    entries = [...new URLSearchParams(String(text ?? '').replace(/^\?/, ''))];
  } catch {
    entries = [];
  }
  for (const [key, value] of entries) {
    const name = key.trim().toLowerCase();
    if (!params.has(name)) params.set(name, value.trim());
  }
  const choose = (group, key, aliases = {}) => {
    const raw = (params.get(key) ?? '').toLowerCase();
    const id = aliases[raw] ?? raw;
    return find(group, id) ? id : null;
  };
  const skin = choose('skin', 'skin');
  if (skin) Object.assign(state, withSkin(state, skin)); // the skin comes before the colors
  state.grid = choose('grid', 'grid') ?? state.grid;
  state.snake = choose('snake', 'snake') ?? state.snake;
  state.walls = choose('walls', 'walls') ?? state.walls;
  state.intro = choose('intro', 'intro', { none: 'off' }) ?? state.intro;
  state.speed = choose('speed', 'speed') ?? state.speed;
  state.leaderboard = choose('leaderboard', 'leaderboard') ?? state.leaderboard;
  const gap = params.get('gap');
  if (gap !== undefined && /^\d+$/.test(gap) && Number(gap) >= GAP_RANGE.min && Number(gap) <= GAP_RANGE.max) {
    state.gap = Number(gap);
  }
  for (const key of COLOR_KEYS) {
    const hex = normalizeHex(params.get(key));
    if (hex) state.colors[key] = hex;
  }
  return state;
}
