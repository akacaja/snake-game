// <snake-game>: the web component. Shadow DOM + canvas, modal or inline, keyboard and touch.
import { createEngine } from './engine.js';
import { directionFromKey, directionFromSwipe } from './input.js';
import { DEFAULT_TEXTS, formatText, pickPluralText, resolveLocale } from './text.js';
import { dotDiameter, gridSize, snakeFit } from './geometry.js';
import { themeCSS } from './theme.js';
import { createProbe, rawTokenKey, readTokens } from './read-tokens.js';
import { drawFood, drawGrid, drawSnake } from './renderers.js';

export { createEngine } from './engine.js';
export { directionFromKey, directionFromSwipe } from './input.js';
export { drawGrid, drawSnake, drawFood } from './renderers.js';

const TAG_NAME = 'snake-game';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const MIN_CELLS = 5;
const INTRO_SPREAD = 0.6; // share of the intro used for the stagger; the rest is each dot's own growth
const SWIPE_FRACTION = 0.6; // swipe threshold, as a share of the cell spacing
const DRAW_ORDER = ['grid', 'food', 'snake'];

const OPTION_VALUES = {
  mode: ['modal', 'inline'],
  grid: ['dots', 'squares', 'lines', 'none'],
  snake: ['taper', 'uniform'],
  food: ['circle', 'square'],
  'food-halo': ['soft', 'none'],
  intro: ['wave', 'cascade', 'none'],
  transitions: ['on', 'off'],
};
const OPTION_DEFAULTS = {
  mode: 'modal',
  grid: 'dots',
  snake: 'taper',
  food: 'circle',
  'food-halo': 'soft',
  intro: 'wave',
  transitions: 'on',
};
const PLURAL_FORMS = ['zero', 'one', 'two', 'few', 'many', 'other'];
const TEXT_ATTRIBUTES = [
  'text-title', 'text-instructions', 'text-score', 'text-best', 'text-play-again',
  'text-pause', 'text-resume', 'text-paused', 'text-close', 'text-ate',
  ...PLURAL_FORMS.map((form) => `text-game-over-${form}`),
];

// Node (the tests) has no HTMLElement; an empty class lets this file be imported there.
const Base = typeof HTMLElement === 'undefined' ? class {} : HTMLElement;

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const easeOut = (value) => 1 - (1 - clamp01(value)) ** 3;

const TEMPLATE = `
<div class="panel">
  <div class="bar">
    <div class="stats"><span class="score"></span><span class="best"></span></div>
    <div class="actions">
      <button class="btn pause" type="button"></button>
      <button class="btn icon close" type="button"><span aria-hidden="true">×</span></button>
    </div>
  </div>
  <div class="board" tabindex="0" role="application" aria-describedby="instructions">
    <canvas aria-hidden="true"></canvas>
    <div class="overlay" hidden>
      <p class="message"></p>
      <button class="btn action" type="button"></button>
    </div>
  </div>
  <p class="live" id="instructions"></p>
  <div class="live announcer" role="status" aria-live="polite"></div>
</div>`;

export class SnakeGameElement extends Base {
  static get observedAttributes() {
    return ['open', 'mode', ...TEXT_ATTRIBUTES];
  }

  constructor() {
    super();
    this._open = false;
    this._engine = null;
    this._offs = [];
    this._renderers = {};
    this._warned = new Set();
    this._raf = 0;
    this._tokens = null;
    this._rawKey = null;
    this._w = 0;
    this._h = 0;
    this._dpr = 1;
    this._layout = null;
    this._cells = [];
    this._frameEl = null;
    this._frameKind = null;
    this._best = 0;
    this._reduced = false;
    this._anchor = null;
    this._resetTimes();

    const root = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = themeCSS;
    root.appendChild(style);
    this._panelHost = document.createElement('div');
    this._panelHost.innerHTML = TEMPLATE;
    this._panel = this._panelHost.firstElementChild;
    const $ = (selector) => this._panel.querySelector(selector);
    this._ui = {
      score: $('.score'),
      best: $('.best'),
      pause: $('.pause'),
      close: $('.close'),
      board: $('.board'),
      canvas: $('canvas'),
      overlay: $('.overlay'),
      message: $('.message'),
      action: $('.action'),
      instructions: $('#instructions'),
      announcer: $('.announcer'),
    };
    this._ctx = this._ui.canvas.getContext('2d');
    this._probe = createProbe(root);

    this._ui.pause.addEventListener('click', () => {
      if (this._engine) this._engine.togglePause();
      this._ui.board.focus();
    });
    this._ui.close.addEventListener('click', () => this.close());
    this._ui.action.addEventListener('click', () => this._onAction());
    this._ui.board.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    this._ui.board.addEventListener('pointermove', (e) => this._onPointerMove(e));
    this._ui.board.addEventListener('pointerup', () => { this._anchor = null; });
    this._ui.board.addEventListener('pointercancel', () => { this._anchor = null; });
  }

  // ---- public API ----------------------------------------------------------------------

  get isOpen() { return this._open; }
  get engine() { return this._engine; }
  get renderers() { return this._renderers; }
  set renderers(value) { this._renderers = value && typeof value === 'object' ? value : {}; }

  open() {
    if (this._open) return;
    if (!this.isConnected) {
      this.setAttribute('open', '');
      return;
    }
    this._open = true;
    if (!this.hasAttribute('open')) this.setAttribute('open', '');
    this._prevFocus = document.activeElement;
    this._reduced = typeof matchMedia === 'function' && matchMedia(REDUCED_MOTION_QUERY).matches;
    this._ensureFrame();
    this._best = this._loadBest();
    this._rawKey = null;
    this._tokens = null;
    this._engine = null;
    this._updateUi();
    if (this._frameKind === 'modal') this._frameEl.showModal();
    this._attachListeners();
    this._measure();
    this._ui.board.focus({ preventScroll: this._frameKind === 'inline' });
    this._prepare();
    this._raf = requestAnimationFrame(this._frame);
    this._emit('snake-open');
  }

  close() {
    if (!this._open) return;
    this._stop();
    if (this.hasAttribute('open')) this.removeAttribute('open');
    this._emit('snake-close');
    const prev = this._prevFocus;
    this._prevFocus = null;
    if (prev && typeof prev.focus === 'function' && prev.isConnected) prev.focus();
  }

  toggle() { if (this._open) this.close(); else this.open(); }
  pause() { if (this._engine) this._engine.pause(); }
  resume() { if (this._engine) this._engine.resume(); }
  togglePause() { if (this._engine) this._engine.togglePause(); }
  restart() { if (this._open && this._engine) this._newGame(false); }
  refreshStyles() { this._rawKey = null; }

  // ---- lifecycle -----------------------------------------------------------------------

  connectedCallback() {
    if (this.hasAttribute('open')) this.open();
  }

  disconnectedCallback() {
    if (!this._open) return;
    this._stop();
    this._emit('snake-close');
    const prev = this._prevFocus;
    this._prevFocus = null;
    if (prev && typeof prev.focus === 'function' && prev.isConnected) prev.focus();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'open') {
      if (!this.isConnected) return;
      if (newValue !== null) this.open();
      else this.close();
    } else if (name === 'mode' && this._open && this._frameKind !== this._option('mode')) {
      // Mode changed while playing: close and reopen in the new frame.
      this.close();
      this.open();
    } else if (this._open || oldValue !== newValue) {
      this._updateUi();
    }
  }

  // ---- options and texts ---------------------------------------------------------------

  _warnOnce(key, message) {
    if (this._warned.has(key)) return;
    this._warned.add(key);
    console.warn(`<${TAG_NAME}> ${message}`);
  }

  _option(name) {
    const value = this.getAttribute(name);
    if (value === null || value === '') return OPTION_DEFAULTS[name];
    if (OPTION_VALUES[name].includes(value)) return value;
    this._warnOnce(name, `invalid ${name}="${value}". Using "${OPTION_DEFAULTS[name]}".`);
    return OPTION_DEFAULTS[name];
  }

  _number(name, fallback, { min = -Infinity, integer = false } = {}) {
    const raw = this.getAttribute(name);
    if (raw === null || raw === '') return fallback;
    const value = Number(raw);
    if (Number.isFinite(value) && value >= min && (!integer || Number.isInteger(value))) return value;
    this._warnOnce(name, `invalid ${name}="${raw}". Using ${fallback}.`);
    return fallback;
  }

  _options() {
    return {
      grid: this._option('grid'),
      snake: this._option('snake'),
      food: this._option('food'),
      foodHalo: this._option('food-halo'),
      intro: this._reduced ? 'none' : this._option('intro'),
      transitions: this._reduced ? 'off' : this._option('transitions'),
    };
  }

  _locale() {
    const wanted = (this.closest('[lang]') && this.closest('[lang]').lang)
      || (typeof document !== 'undefined' && document.documentElement.lang)
      || 'en';
    const locale = resolveLocale(wanted);
    if (locale !== wanted) this._warnOnce('lang', `unknown language "${wanted}". Using "en" for plural forms.`);
    return locale;
  }

  _text(key, attr) {
    const value = this.getAttribute(`text-${attr}`);
    return value === null ? DEFAULT_TEXTS[key] : value;
  }

  _gameOverText(score) {
    const template = pickPluralText(
      (name) => this.getAttribute(name),
      'text-game-over',
      score,
      this._locale(),
      DEFAULT_TEXTS.gameOver,
    );
    return formatText(template, { score, best: this._best });
  }

  // ---- DOM and UI ----------------------------------------------------------------------

  _ensureFrame() {
    const kind = this._option('mode');
    if (this._frameEl && this._frameKind === kind) return;
    if (this._frameEl) this._frameEl.remove();
    const frame = document.createElement(kind === 'modal' ? 'dialog' : 'div');
    frame.className = 'frame';
    frame.appendChild(this._panel);
    if (kind === 'modal') {
      frame.addEventListener('cancel', (e) => {
        e.preventDefault();
        this.close();
      });
      frame.addEventListener('close', () => {
        // Ignore late events from a frame that was already replaced (mode change).
        if (frame === this._frameEl && this._open && !frame.open) this.close();
      });
    }
    this.shadowRoot.appendChild(frame);
    this._frameEl = frame;
    this._frameKind = kind;
  }

  _updateUi() {
    const ui = this._ui;
    const title = this._text('title', 'title');
    const state = this._engine ? this._engine.getState() : null;
    const score = state ? state.score : 0;
    ui.score.textContent = formatText(this._text('score', 'score'), { score });
    ui.best.textContent = formatText(this._text('best', 'best'), { best: this._best });
    ui.board.setAttribute('aria-label', title);
    if (this._frameEl && this._frameKind === 'modal') this._frameEl.setAttribute('aria-label', title);
    ui.instructions.textContent = this._text('instructions', 'instructions');
    ui.close.setAttribute('aria-label', this._text('close', 'close'));
    const status = state ? state.status : 'running';
    ui.pause.textContent = status === 'paused' ? this._text('resume', 'resume') : this._text('pause', 'pause');
    ui.pause.disabled = status === 'over' || status === 'won';
    if (status === 'paused') {
      ui.overlay.hidden = false;
      ui.message.textContent = this._text('paused', 'paused');
      ui.action.textContent = this._text('resume', 'resume');
    } else if (status === 'over' || status === 'won') {
      ui.overlay.hidden = false;
      ui.message.textContent = this._gameOverText(score);
      ui.action.textContent = this._text('playAgain', 'play-again');
    } else {
      ui.overlay.hidden = true;
    }
  }

  _announce(message) {
    this._ui.announcer.textContent = message;
  }

  _emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
  }

  _onAction() {
    if (!this._engine) return;
    const status = this._engine.getState().status;
    if (status === 'paused') {
      this._engine.resume();
      this._ui.board.focus();
    } else {
      this._newGame(false);
      this._ui.board.focus();
    }
  }

  // ---- listeners (only while open) -----------------------------------------------------

  _attachListeners() {
    this._keyTarget = this._frameKind === 'modal' ? document : this;
    this._keyTarget.addEventListener('keydown', this._onKey);
    document.addEventListener('visibilitychange', this._onVisibility);
    this._observer = new ResizeObserver(() => this._measure());
    this._observer.observe(this._ui.board);
    if (typeof matchMedia === 'function') {
      this._mql = matchMedia(REDUCED_MOTION_QUERY);
      this._mql.addEventListener('change', this._onMotionChange);
    }
  }

  _detachListeners() {
    if (this._keyTarget) this._keyTarget.removeEventListener('keydown', this._onKey);
    this._keyTarget = null;
    document.removeEventListener('visibilitychange', this._onVisibility);
    if (this._observer) this._observer.disconnect();
    this._observer = null;
    if (this._mql) this._mql.removeEventListener('change', this._onMotionChange);
    this._mql = null;
  }

  _onMotionChange = (e) => {
    this._reduced = e.matches;
    this._rawKey = null;
  };

  _onVisibility = () => {
    if (document.hidden && this._engine) this._engine.pause();
  };

  _onKey = (e) => {
    if (!this._open || e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.composedPath()[0];
    const onButton = target && target.tagName === 'BUTTON';
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      return;
    }
    if (e.key === ' ' || e.key === 'Spacebar') {
      if (onButton) return;
      e.preventDefault();
      if (this._engine) this._engine.togglePause();
      return;
    }
    const direction = directionFromKey(e.key);
    if (direction) {
      e.preventDefault();
      if (this._engine) this._engine.turn(direction);
    }
  };

  _onPointerDown(e) {
    this._ui.board.focus({ preventScroll: true });
    const target = e.composedPath()[0];
    if (e.pointerType === 'mouse' || (target && target.tagName === 'BUTTON')) return;
    this._anchor = { x: e.clientX, y: e.clientY };
    if (this._ui.board.setPointerCapture) this._ui.board.setPointerCapture(e.pointerId);
  }

  _onPointerMove(e) {
    if (!this._anchor || !this._engine || !this._layout) return;
    const dx = e.clientX - this._anchor.x;
    const dy = e.clientY - this._anchor.y;
    const direction = directionFromSwipe(dx, dy, this._layout.spacing * SWIPE_FRACTION);
    if (direction) {
      this._engine.turn(direction);
      this._anchor = { x: e.clientX, y: e.clientY };
    }
  }

  // ---- sizing and game setup -----------------------------------------------------------

  _measure() {
    const board = this._ui.board;
    this._w = board.clientWidth;
    this._h = board.clientHeight;
    this._dpr = (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1;
    const canvas = this._ui.canvas;
    canvas.width = Math.max(1, Math.round(this._w * this._dpr));
    canvas.height = Math.max(1, Math.round(this._h * this._dpr));
    if (this._tokens && this._engine) {
      const state = this._engine.getState();
      this._relayout(state.cols, state.rows);
    }
  }

  // Fits cols x rows into the board and keeps it centered. Shrinks the spacing if needed.
  _relayout(cols, rows) {
    const spacing = this._tokens.spacing || 1;
    const fitted = Math.min(spacing, this._w / cols, this._h / rows);
    const layout = {
      cols,
      rows,
      spacing: fitted,
      scale: fitted / spacing,
      ox: (this._w - cols * fitted) / 2,
      oy: (this._h - rows * fitted) / 2,
    };
    this._layout = layout;
    if (this._cells.length !== cols * rows) {
      this._cells = [];
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) this._cells.push({ x, y, cx: 0, cy: 0, appear: 1 });
      }
    }
    for (const cell of this._cells) {
      cell.cx = layout.ox + (cell.x + 0.5) * fitted;
      cell.cy = layout.oy + (cell.y + 0.5) * fitted;
    }
  }

  _loadTokens() {
    this._tokens = readTokens(this._probe);
    if (this._reduced) {
      this._tokens.duration = 0;
      this._tokens.introDuration = 0;
    }
  }

  // Makes the state ready right after open(), so pause() and restart() work at once.
  // If the board has no size yet (hidden parent), the first frame does it instead.
  _prepare() {
    if (this._w <= 0 || this._h <= 0) return;
    this._rawKey = rawTokenKey(this);
    this._loadTokens();
    this._newGame(true);
  }

  _resetTimes() {
    this._introStart = -Infinity;
    this._introEnd = 0;
    this._ghost = null;
    this._foodKey = '';
    this._foodBorn = -Infinity;
    this._nextStep = 0;
  }

  _newGame(first) {
    for (const off of this._offs) off();
    this._offs = [];
    const tokens = this._tokens;
    const spacing = tokens.spacing || 1;
    const fit = gridSize(this._w, this._h, spacing, MIN_CELLS);
    const cols = this._number('cols', fit.cols, { min: 2, integer: true });
    const rows = this._number('rows', fit.rows, { min: 2, integer: true });
    const engine = createEngine({
      cols,
      rows,
      wrap: this.hasAttribute('wrap'),
      startLength: this._number('start-length', 3, { min: 1, integer: true }),
      speed: this._number('speed', 5, { min: 0.1 }),
      speedStep: this._number('speed-step', 0.3, { min: 0 }),
      maxSpeed: this._number('max-speed', 14, { min: 0.1 }),
      // With reduced motion, the first game of each opening starts paused, so nothing moves before the player asks.
      startPaused: first && this._reduced,
    });
    this._engine = engine;
    this._hookEngine(engine);
    this._relayout(cols, rows);
    this._resetTimes();
    const now = performance.now();
    const options = this._options();
    if (first && options.intro !== 'none') {
      this._introStart = now;
      this._introEnd = now + tokens.introDuration;
    } else {
      this._introEnd = now;
    }
    this._nextStep = this._introEnd + tokens.duration + engine.getState().interval;
    this._updateUi();
    if (!first) this._emit('snake-restart');
    if (engine.getState().status === 'paused') this._ui.action.focus();
  }

  _hookEngine(engine) {
    const on = (type, fn) => this._offs.push(engine.on(type, fn));
    on('step', ({ removedTail }) => {
      const now = performance.now();
      // Keep the tail cell that just left, so the drawing can shrink it out smoothly.
      this._ghost = removedTail ? { ...removedTail, time: now } : null;
    });
    on('eat', ({ score, length }) => {
      this._announce(formatText(this._text('ate', 'ate'), { score }));
      this._emit('snake-eat', { score, length });
    });
    on('score', ({ score }) => {
      if (score > this._best) {
        this._best = score;
        this._saveBest();
      }
      this._updateUi();
      this._emit('snake-score', { score, best: this._best });
    });
    on('gameover', ({ score, reason }) => {
      this._updateUi();
      this._announce(this._ui.message.textContent);
      this._ui.action.focus();
      this._emit('snake-gameover', { score, best: this._best, reason });
    });
    on('pause', () => {
      this._updateUi();
      this._announce(this._text('paused', 'paused'));
      this._emit('snake-pause');
    });
    on('resume', () => {
      // Restart the clock on resume, so the paused time does not count as a late step.
      this._nextStep = performance.now() + engine.getState().interval;
      this._updateUi();
      this._emit('snake-resume');
    });
  }

  _bestKey() {
    const key = this.getAttribute('best-key');
    return key === null ? 'snake-game-best' : key;
  }

  _loadBest() {
    const key = this._bestKey();
    if (!key) return 0;
    try {
      const value = parseInt(localStorage.getItem(key), 10);
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  _saveBest() {
    const key = this._bestKey();
    if (!key) return;
    try {
      localStorage.setItem(key, String(this._best));
    } catch {
      // Storage can be blocked. The best score then lasts only until the page closes.
    }
  }

  _stop() {
    this._open = false;
    cancelAnimationFrame(this._raf);
    this._raf = 0;
    this._detachListeners();
    for (const off of this._offs) off();
    this._offs = [];
    this._engine = null;
    this._anchor = null;
    if (this._frameKind === 'modal' && this._frameEl && this._frameEl.open) this._frameEl.close();
  }

  // ---- frame loop ----------------------------------------------------------------------

  _frame = (now) => {
    if (!this._open) return;
    this._raf = requestAnimationFrame(this._frame);

    const key = rawTokenKey(this);
    if (key !== this._rawKey || !this._tokens) {
      this._rawKey = key;
      this._loadTokens();
      if (this._engine) {
        const state = this._engine.getState();
        this._relayout(state.cols, state.rows);
      }
    }
    if (!this._engine) {
      if (this._w <= 0 || this._h <= 0) {
        this._measure();
        return;
      }
      this._newGame(true);
    }

    const engine = this._engine;
    let state = engine.getState();
    if (state.status === 'running' && now >= this._nextStep) {
      engine.step();
      state = engine.getState();
      this._nextStep += state.interval;
      // If the frame is more than one step late (background tab, slow device), reschedule instead of catching up with a run of fast steps.
      if (now - this._nextStep > state.interval) this._nextStep = now + state.interval;
    }
    this._draw(now, state);
  };

  _buildScene(now, state) {
    const layout = this._layout;
    const tokens = this._tokens;
    const options = this._options();
    const { scale, spacing } = layout;
    const duration = options.transitions === 'on' ? tokens.duration : 0;
    const introDuration = options.intro === 'none' ? 0 : tokens.introDuration;
    const center = (x, y) => ({ x: layout.ox + (x + 0.5) * spacing, y: layout.oy + (y + 0.5) * spacing });

    // Grid entrance: each cell appears after a delay that depends on the chosen style.
    const midX = (layout.cols - 1) / 2;
    const midY = (layout.rows - 1) / 2;
    const maxDistance = Math.hypot(midX, midY) || 1;
    for (const cell of this._cells) {
      if (introDuration === 0) {
        cell.appear = 1;
      } else {
        const share = options.intro === 'wave'
          ? Math.hypot(cell.x - midX, cell.y - midY) / maxDistance
          : cell.y / Math.max(1, layout.rows - 1);
        const delay = share * introDuration * INTRO_SPREAD;
        const own = introDuration * (1 - INTRO_SPREAD);
        cell.appear = easeOut((now - this._introStart - delay) / own);
      }
    }

    // Snake and food only show once the grid entrance has finished.
    const visible = now >= this._introEnd;
    const grow = duration === 0 ? 1 : easeOut((now - this._introEnd) / duration);
    const segments = [];
    let foodItem = null;
    if (visible) {
      const count = state.snake.length;
      const uniform = options.snake === 'uniform';
      // When the grid is squeezed, k shrinks every dot so the gap between them stays the same on screen.
      const k = snakeFit({ fitted: spacing, scale, headSize: tokens.headSize, gap: tokens.gap });
      const dot = (index, total = count) => dotDiameter({ index, count: total, headSize: tokens.headSize, tailSize: tokens.tailSize, uniform, scale, k });
      state.snake.forEach((cell, index) => {
        const c = center(cell.x, cell.y);
        segments.push({
          x: cell.x, y: cell.y, cx: c.x, cy: c.y, index,
          size: dot(index) * grow,
          opacity: 1,
        });
      });
      const ghost = this._ghost;
      if (ghost && duration > 0 && now - ghost.time < duration) {
        const left = 1 - easeOut((now - ghost.time) / duration);
        const c = center(ghost.x, ghost.y);
        segments.push({
          x: ghost.x, y: ghost.y, cx: c.x, cy: c.y, index: count,
          size: dot(1, 2) * left, opacity: left,
        });
      }
      if (state.food) {
        const foodKey = `${state.food.x},${state.food.y}`;
        if (foodKey !== this._foodKey) {
          this._foodKey = foodKey;
          this._foodBorn = Math.max(now, this._introEnd);
        }
        const born = duration === 0 ? 1 : easeOut((now - this._foodBorn) / duration);
        const c = center(state.food.x, state.food.y);
        foodItem = {
          x: state.food.x, y: state.food.y, cx: c.x, cy: c.y,
          size: tokens.foodSize * scale * born,
          haloSize: tokens.foodHaloSize * scale * born,
        };
      }
    }

    return {
      cols: layout.cols,
      rows: layout.rows,
      spacing,
      scale,
      width: this._w,
      height: this._h,
      dpr: this._dpr,
      center,
      tokens,
      options,
      state,
      time: now,
      cells: this._cells,
      segments,
      foodItem,
    };
  }

  _draw(now, state) {
    const ctx = this._ctx;
    const scene = this._buildScene(now, state);
    ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    ctx.clearRect(0, 0, this._w, this._h);
    const defaults = { grid: drawGrid, food: drawFood, snake: drawSnake };
    for (const kind of DRAW_ORDER) {
      const custom = this._renderers[kind];
      if (typeof custom === 'function') {
        ctx.save();
        try {
          custom(ctx, scene);
          ctx.restore();
          continue;
        } catch (error) {
          ctx.restore();
          if (!this._warned.has(`renderer-${kind}`)) {
            this._warned.add(`renderer-${kind}`);
            console.error(`<${TAG_NAME}> custom ${kind} renderer failed. Using the default.`, error);
          }
        }
      }
      ctx.save();
      defaults[kind](ctx, scene);
      ctx.restore();
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, SnakeGameElement);
}
