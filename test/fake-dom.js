// A tiny fake page for testing the leaderboard screen, without dependencies (no jsdom).
// It only knows what the addon uses: elements with attributes, children, focus, events that bubble,
// a small HTML reader for the addon template, visualViewport, matchMedia, requestAnimationFrame.
// This file only exports; the tests are in test/leaderboard-screen.test.js.

// ---- events ----

export class FakeEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.bubbles = Boolean(init.bubbles);
    this.cancelable = init.cancelable !== false;
    this.relatedTarget = init.relatedTarget ?? null;
    this.key = init.key;
    this.detail = init.detail;
    this.defaultPrevented = false;
    this.target = null;
  }

  preventDefault() { if (this.cancelable) this.defaultPrevented = true; }
}

class Target {
  constructor() { this.listeners = []; }

  addEventListener(type, fn, options) {
    this.listeners.push({ type, fn, once: Boolean(options && options.once) });
  }

  removeEventListener(type, fn) {
    this.listeners = this.listeners.filter((l) => !(l.type === type && l.fn === fn));
  }

  listenerCount() { return this.listeners.length; }

  fire(event) {
    for (const l of this.listeners.slice()) {
      if (l.type !== event.type) continue;
      if (l.once) this.removeEventListener(l.type, l.fn);
      l.fn(event);
    }
  }
}

// ---- selectors: tag, .class, #id, [attr], [attr="value"], joined without spaces, and lists with commas ----

function matchesCompound(el, compound) {
  const parts = compound.match(/^[\w-]+|[.#][\w-]+|\[[^\]]+\]/g) || [];
  if (parts.join('') !== compound) throw new Error(`fake-dom: selector not supported: ${compound}`);
  return parts.every((part) => {
    if (part[0] === '.') return el.className.split(/\s+/).includes(part.slice(1));
    if (part[0] === '#') return el.id === part.slice(1);
    if (part[0] === '[') {
      const [, name, value] = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(part);
      return el.hasAttribute(name) && (value === undefined || el.getAttribute(name) === value);
    }
    return el.tagName === part.toUpperCase();
  });
}

const matchesSelector = (el, selector) => selector.split(',').some((s) => matchesCompound(el, s.trim()));

// ---- elements ----

const VOID = new Set(['input', 'br', 'img', 'hr', 'meta', 'link']);

export class FakeElement extends Target {
  constructor(tag, dom) {
    super();
    this.tagName = tag.toUpperCase();
    this.dom = dom;
    this.attrs = new Map();
    this.children = [];
    this.parentNode = null;
    this.ownText = '';
    this.style = {
      props: new Map(),
      setProperty(name, value) { this.props.set(name, String(value)); },
      getPropertyValue(name) { return this.props.get(name) ?? ''; },
      removeProperty(name) { this.props.delete(name); },
    };
    this.value = '';
    this.readOnly = false;
    this.scrolls = []; // each scrollIntoView call, with its options
    this.selected = false;
    this.rectReads = 0;
  }

  // attributes
  getAttribute(name) { return this.attrs.has(name) ? this.attrs.get(name) : null; }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  removeAttribute(name) { this.attrs.delete(name); }
  hasAttribute(name) { return this.attrs.has(name); }
  get id() { return this.getAttribute('id') || ''; }
  set id(value) { this.setAttribute('id', value); }
  get className() { return this.getAttribute('class') || ''; }
  set className(value) { this.setAttribute('class', value); }
  get hidden() { return this.hasAttribute('hidden'); }
  set hidden(value) { if (value) this.setAttribute('hidden', ''); else this.removeAttribute('hidden'); }

  // text
  get textContent() { return this.ownText + this.children.map((c) => c.textContent).join(''); }
  set textContent(value) {
    this.children.forEach((c) => { c.parentNode = null; });
    this.children = [];
    this.ownText = String(value);
  }

  // tree
  appendChild(node) { return this.insertBefore(node, null); }
  insertBefore(node, reference) {
    if (node.parentNode) node.remove();
    const at = reference ? this.children.indexOf(reference) : -1;
    if (at < 0) this.children.push(node); else this.children.splice(at, 0, node);
    node.parentNode = this;
    return node;
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((c) => c !== this);
    this.parentNode = null;
  }

  contains(node) {
    for (let n = node; n; n = n.parentNode) if (n === this) return true;
    return false;
  }

  getRootNode() {
    let n = this;
    while (n.parentNode) n = n.parentNode;
    return n;
  }

  matches(selector) { return matchesSelector(this, selector); }
  closest(selector) {
    for (let n = this; n && n.matches; n = n.parentNode) if (n.matches(selector)) return n;
    return null;
  }

  querySelectorAll(selector) {
    const found = [];
    const walk = (el) => el.children.forEach((c) => { if (c.matches(selector)) found.push(c); walk(c); });
    walk(this);
    return found;
  }

  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }

  // geometry and scrolling
  getBoundingClientRect() {
    this.rectReads += 1;
    const rects = this.dom.state.rects;
    const key = Object.keys(rects).find((selector) => this.matches(selector));
    const height = key ? rects[key] : 0;
    return { top: 0, left: 0, width: 0, height, bottom: height, right: 0 };
  }

  scrollIntoView(options) { this.scrolls.push(options); }
  select() { this.selected = true; }

  // events
  dispatchEvent(event) {
    event.target = this;
    for (let n = this; n; n = event.bubbles ? n.parentNode : null) {
      if (n.fire) n.fire(event);
    }
    return !event.defaultPrevented;
  }

  focus() {
    const root = this.getRootNode();
    const old = root.activeElement;
    if (old === this) return;
    if (old) {
      root.activeElement = null;
      old.dispatchEvent(new FakeEvent('blur', { relatedTarget: this }));
      old.dispatchEvent(new FakeEvent('focusout', { bubbles: true, relatedTarget: this }));
    }
    root.activeElement = this;
    this.dispatchEvent(new FakeEvent('focus', { relatedTarget: old }));
    this.dispatchEvent(new FakeEvent('focusin', { bubbles: true, relatedTarget: old }));
  }

  // The focus goes nowhere (relatedTarget null), like a tap on a button in iOS.
  blur() {
    const root = this.getRootNode();
    if (root.activeElement !== this) return;
    root.activeElement = null;
    this.dispatchEvent(new FakeEvent('blur'));
    this.dispatchEvent(new FakeEvent('focusout', { bubbles: true }));
  }

  // A click on a submit button inside a form sends the form, like a browser.
  click() {
    this.dispatchEvent(new FakeEvent('click', { bubbles: true }));
    const form = this.closest('form');
    if (this.tagName === 'BUTTON' && this.getAttribute('type') === 'submit' && form) {
      form.dispatchEvent(new FakeEvent('submit', { bubbles: true }));
    }
  }

  // HTML reader: tags, attributes (with or without a value), text, void tags, and <style> read as raw text.
  set innerHTML(html) {
    this.textContent = '';
    const stack = [this];
    const re = /<style>([\s\S]*?)<\/style>|<\/(\w+)>|<(\w+)((?:\s+[\w-]+(?:="[^"]*")?)*)\s*\/?>|([^<]+)/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      const top = stack[stack.length - 1];
      if (m[1] !== undefined) {
        const style = new FakeElement('style', this.dom);
        style.ownText = m[1];
        top.appendChild(style);
      } else if (m[2]) {
        stack.pop();
      } else if (m[3]) {
        const el = new FakeElement(m[3], this.dom);
        for (const a of m[4].matchAll(/([\w-]+)(?:="([^"]*)")?/g)) el.setAttribute(a[1], a[2] ?? '');
        top.appendChild(el);
        if (!VOID.has(m[3].toLowerCase())) stack.push(el);
      } else if (m[5] && m[5].trim()) {
        top.ownText += m[5];
      }
    }
  }
}

// The top of the tree: it has the focused element, like a shadow root.
class FakeRoot extends FakeElement {
  constructor(dom) {
    super('root', dom);
    this.activeElement = null;
  }
}

// ---- the page ----

// state: { pointer, orientation, heightEm, rects, inline, viewport, media }
export function createDom(options = {}) {
  const state = {
    pointer: 'coarse',
    orientation: 'landscape',
    heightEm: 24,
    rects: { '.lb-form': 136 },
    inline: false,
    viewport: true, // false: no visualViewport at all
    media: true, // false: no matchMedia at all
    ...options,
  };
  const dom = { state };
  const make = (tag, className, parent) => {
    const el = new FakeElement(tag, dom);
    if (className) el.className = className;
    if (parent) parent.appendChild(el);
    return el;
  };

  // root > dialog.frame > .panel > .board > .overlay > [.message, .addon (box), button.action]
  const root = new FakeRoot(dom);
  const dialog = make(state.inline ? 'div' : 'dialog', 'frame', root);
  const panel = make('div', 'panel', dialog);
  const board = make('div', 'board', panel);
  const overlay = make('div', 'overlay', board);
  make('p', 'message', overlay);
  const box = make('div', 'addon', overlay);
  const action = make('button', 'action', overlay);
  Object.assign(dom, { root, dialog, panel, board, overlay, box, action });

  // The game element: attributes, the events it receives, and the observers of its attributes.
  const attrs = new Map();
  const observers = new Set();
  const game = Object.assign(new Target(), {
    events: [],
    leaderboard: undefined,
    getAttribute: (name) => (attrs.has(name) ? attrs.get(name) : null),
    setAttribute(name, value) {
      attrs.set(name, String(value));
      for (const o of observers) o.callback([{ attributeName: name }]);
    },
    dispatchEvent(event) { game.events.push(event); return true; },
  });
  dom.game = game;

  const frames = [];
  dom.frame = () => { // runs what was asked with requestAnimationFrame
    const run = frames.splice(0);
    run.forEach((fn) => fn(0));
  };

  // visualViewport and the keyboard
  const vv = Object.assign(new Target(), { width: 0, height: 0, offsetTop: 0, offsetLeft: 0, scale: 1 });
  const setHeightEm = (em) => {
    state.heightEm = em;
    state.innerHeight = em * 16;
  };
  setHeightEm(state.heightEm);
  vv.height = state.innerHeight;
  vv.width = state.innerHeight * 2;
  dom.vv = vv;
  dom.viewport = (height) => { vv.height = height; vv.fire(new FakeEvent('resize')); };
  dom.keyboard = (open, height) => dom.viewport(open ? (height ?? Math.round(state.innerHeight * 0.4)) : state.innerHeight);
  dom.scrollViewport = (top) => { vv.offsetTop = top; vv.fire(new FakeEvent('scroll')); };

  // matchMedia: (pointer: ...), (orientation: ...) and (max-height: Nem), joined with "and"
  const queries = [];
  const evaluate = (query) => query.split(/\s+and\s+/).every((part) => {
    const [, name, value] = /^\(\s*([\w-]+)\s*:\s*([^)]+?)\s*\)$/.exec(part.trim()) || [];
    if (name === 'pointer') return state.pointer === value;
    if (name === 'orientation') return state.orientation === value;
    if (name === 'max-height') return state.heightEm <= parseFloat(value);
    throw new Error(`fake-dom: media query not supported: ${part}`);
  });
  const matchMedia = (query) => {
    const list = Object.assign(new Target(), { media: query, last: evaluate(query) });
    Object.defineProperty(list, 'matches', { get: () => evaluate(query) });
    queries.push(list);
    return list;
  };
  // Turns the phone: a new orientation and height (in em), and a "change" for the queries whose answer changed.
  dom.rotate = (orientation, heightEm) => {
    state.orientation = orientation;
    setHeightEm(heightEm);
    dom.viewport(state.innerHeight);
    for (const list of queries) {
      const now = evaluate(list.media);
      if (now !== list.last) { list.last = now; list.fire(new FakeEvent('change')); }
    }
  };

  // What is still listening outside the box (the addon must remove all of it).
  dom.outsideListeners = () => vv.listenerCount() + queries.reduce((n, q) => n + q.listenerCount(), 0) + observers.size;

  const globals = {
    document: { baseURI: 'https://game.example.org/page/', createElement: (tag) => new FakeElement(tag, dom) },
    CustomEvent: FakeEvent,
    requestAnimationFrame: (fn) => { frames.push(fn); return frames.length; },
    MutationObserver: class {
      constructor(callback) { this.callback = callback; }
      observe() { observers.add(this); }
      disconnect() { observers.delete(this); }
    },
    innerHeight: state.innerHeight,
  };
  Object.defineProperty(globals, 'innerHeight', { enumerable: true, get: () => state.innerHeight });
  if (state.viewport) globals.visualViewport = vv;
  if (state.media) globals.matchMedia = matchMedia;
  dom.globals = globals;
  // The sandbox for vm: the globals above (innerHeight stays live) plus what the test adds.
  dom.sandbox = (extra = {}) => Object.defineProperties(extra, Object.getOwnPropertyDescriptors(globals));

  dom.event = (type, init) => new FakeEvent(type, init);
  // Types in the field, like a person: sets the value and fires "input".
  dom.type = (input, value) => { input.value = value; input.dispatchEvent(new FakeEvent('input', { bubbles: true })); };
  return dom;
}

// ---- helpers for the tests ----

export function memoryStorage(seed = {}) {
  const data = { ...seed };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}

// A fetch that answers from a list of { status, body } (the last one repeats); `calls` has what was asked.
export function fakeFetch(answers) {
  const calls = [];
  const list = Array.isArray(answers) ? answers : [answers];
  const fn = async (url, init) => {
    calls.push({ url, init });
    const answer = list[Math.min(calls.length - 1, list.length - 1)];
    if (answer instanceof Error) throw answer;
    return { status: answer.status, json: async () => answer.body };
  };
  fn.calls = calls;
  return fn;
}
