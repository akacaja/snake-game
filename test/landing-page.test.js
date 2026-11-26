import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { LITERALS } from './literals.js';
import { COLOR_KEYS, GAP_RANGE, OPTIONS, defaultState } from '../site/config.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (file) => readFileSync(join(root, file), 'utf8');
const html = read('index.html');
const DEFAULT_STATE = defaultState();
const css = read('site/landing.css');
const SITE_JS = readdirSync(join(root, 'site')).filter((f) => f.endsWith('.js')).map((f) => `site/${f}`);
const features = html.slice(html.indexOf('id="features"'), html.indexOf('id="faq"'));

test('index.html has no <style>, style attribute, inline script or literal colors and sizes', () => {
  assert.ok(!/<style/i.test(html), 'index.html has a <style> tag');
  assert.ok(!/\sstyle\s*=/i.test(html), 'index.html has a style attribute');
  for (const tag of html.matchAll(/<script\b([^>]*)>/gi)) assert.match(tag[1], /\bsrc=/, 'inline script in index.html');
  const text = html.replace(/<!--[\s\S]*?-->/g, '');
  for (const [re, what] of LITERALS) assert.ok(!re.test(text), `index.html has a ${what}`);
});

test('site/*.js has no hex color, color function or px (the CSS file is the only place)', () => {
  assert.ok(SITE_JS.length >= 4);
  for (const file of SITE_JS) {
    read(file).split('\n').forEach((line, i) => {
      for (const [re, what] of LITERALS.slice(0, 3)) assert.ok(!re.test(line), `${file}:${i + 1} has a ${what}: ${line.trim()}`);
    });
  }
});

test('the landing never sets the game font; the page font link is only in index.html', () => {
  assert.ok(!/--snake-font\b/.test(css), 'landing.css defines --snake-font');
  for (const file of SITE_JS) assert.ok(!/--snake-font\b/.test(read(file)), `${file} sets --snake-font`);
  assert.ok(html.includes('fonts.googleapis.com'));
  assert.ok(!css.includes('fonts.googleapis.com'));
  for (const file of SITE_JS) assert.ok(!read(file).includes('fonts.googleapis.com'), file);
});

test('the version and the sizes shown on the page match the project', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.ok(html.includes(`v${pkg.version}`), 'version on the page differs from package.json');
  const real = gzipSync(readFileSync(join(root, 'dist/snake-game.js'))).length / 1000;
  const files = ['index.html', ...SITE_JS];
  let found = 0;
  for (const file of files) {
    for (const m of read(file).matchAll(/(\d+\.\d) KB/g)) {
      found++;
      assert.ok(Math.abs(Number(m[1]) - real) <= 0.2, `${file}: ${m[0]} but the real size is ${real.toFixed(1)} KB`);
    }
    assert.ok(!/~\s?15 KB|About 15 KB/i.test(read(file)), `${file} still has a rounded size`);
  }
  assert.ok(found >= 3, 'the page should show the size');
});

test('every button has type="button"; aria-pressed only on buttons; the settings match config.js', () => {
  for (const tag of html.matchAll(/<button\b[^>]*>/g)) assert.match(tag[0], /\btype="button"/, tag[0]);
  for (const tag of html.matchAll(/<(\w+)\b[^>]*\baria-pressed=/g)) assert.equal(tag[1], 'button');
  const skins = [...html.matchAll(/<button\b[^>]*data-group="skin" data-value="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(skins, OPTIONS.skin.map((o) => o.id), 'settings of skin');
  assert.ok(!/data-group="(?!skin")/.test(html), 'only the skin uses button groups; the other settings are menus');
  for (const group of Object.keys(OPTIONS).filter((g) => g !== 'skin')) {
    const block = html.match(new RegExp(`<select\\b[^>]*id="set-${group}"[^>]*data-setting="${group}"[^>]*>([\\s\\S]*?)</select>`));
    assert.ok(block, `no <select id="set-${group}" data-setting="${group}">`);
    assert.match(html, new RegExp(`<label\\b[^>]*for="set-${group}"`), `no label for set-${group}`);
    const options = [...block[1].matchAll(/<option value="([^"]+)"([^>]*)>([^<]*)<\/option>/g)];
    assert.deepEqual(options.map((m) => m[1]), OPTIONS[group].map((o) => o.id), `options of ${group}`);
    assert.deepEqual(options.map((m) => m[3]), OPTIONS[group].map((o) => o.label), `labels of ${group}`);
    const selected = options.filter((m) => /\bselected\b/.test(m[2]));
    assert.equal(selected.length, 1, `${group} needs exactly one default`);
    assert.equal(selected[0][1], DEFAULT_STATE[group], `default of ${group}`);
  }
  for (const key of COLOR_KEYS) assert.ok(html.includes(`data-color="${key}"`), key);
  assert.ok(html.includes(`min="${GAP_RANGE.min}" max="${GAP_RANGE.max}" step="${GAP_RANGE.step}" value="${GAP_RANGE.initial}"`));
});

test('the features have exactly 6 role="img" with a label and no aria-live', () => {
  const imgs = [...features.matchAll(/<[^>]*\brole="img"[^>]*>/g)];
  assert.equal(imgs.length, 6);
  for (const tag of imgs) assert.match(tag[0], /\baria-label="[^"]{20,}"/);
  assert.ok(!/aria-live/.test(features));
  assert.equal([...features.matchAll(/<li class="feature"/g)].length, 6);
});

// ---- motion: only inside prefers-reduced-motion: no-preference, only cheap properties ----

function splitMotion(text) {
  const start = text.indexOf('@media (prefers-reduced-motion: no-preference)');
  assert.ok(start >= 0, 'no no-preference block');
  let depth = 0;
  let end = -1;
  for (let i = text.indexOf('{', start); i < text.length; i++) {
    if (text[i] === '{') depth++;
    if (text[i] === '}' && --depth === 0) { end = i; break; }
  }
  return { inside: text.slice(text.indexOf('{', start) + 1, end), outside: text.slice(0, start) + text.slice(end + 1) };
}
const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '');

test('transition, animation and @keyframes only exist inside the no-preference block', () => {
  const { outside } = splitMotion(noComments);
  assert.ok(!/\btransition\b|\banimation\b|@keyframes/.test(outside), 'motion outside the no-preference block');
});

test('keyframes move only transform and opacity; transitions only cheap properties', () => {
  const { inside } = splitMotion(noComments);
  for (const frames of inside.matchAll(/@keyframes\s+[\w-]+\s*\{([\s\S]*?\}\s*)\}/g)) {
    for (const decl of frames[1].matchAll(/([\w-]+)\s*:/g)) {
      assert.ok(['transform', 'opacity'].includes(decl[1]), `keyframes move ${decl[1]}`);
    }
  }
  for (const m of inside.matchAll(/\btransition-property:\s*([^;]+);/g)) {
    for (const part of m[1].split(',')) assert.ok(['transform', 'opacity', 'background-color', 'color', 'border-color', 'box-shadow'].includes(part.trim()), `transition-property ${part.trim()}`);
  }
  const names = new Set([...inside.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]));
  for (const m of inside.matchAll(/\banimation(?:-name)?:\s*([^;]+);/g)) {
    for (const part of m[1].split(',')) {
      const used = part.trim().split(/\s+/).filter((word) => names.has(word));
      assert.ok(used.length === 1, `animation without a known @keyframes: ${part.trim()}`);
    }
  }
  const allowed = new Set(['transform', 'opacity', 'background-color', 'color', 'border-color', 'box-shadow']);
  let count = 0;
  for (const m of inside.matchAll(/\btransition:\s*([^;]+);/g)) {
    for (const part of m[1].split(/,(?![^(]*\))/)) {
      count++;
      assert.ok(allowed.has(part.trim().split(/\s+/)[0]), `transition on ${part.trim()}`);
    }
  }
  assert.ok(count > 5);
});

// ---- the landing rule: colors, type sizes and radii are variables in :root ----

const withoutRoot = noComments.replace(/:root\s*\{[^}]*\}/g, '');

test('no hex color or color function outside the :root blocks of landing.css', () => {
  assert.ok(/:root\s*\{/.test(noComments));
  for (const [re, what] of LITERALS.slice(0, 2)) assert.ok(!re.test(withoutRoot), `landing.css has a ${what} outside :root`);
});

test('every font-size and border-radius in landing.css uses var()', () => {
  let count = 0;
  for (const m of withoutRoot.matchAll(/(?<![\w-])(font-size|border-radius):\s*([^;}]+)/g)) {
    count++;
    assert.ok(/var\(/.test(m[2]), `${m[1]}: ${m[2].trim()} without var()`);
  }
  assert.ok(count > 30);
});

test('the scene palettes in the CSS are the palettes of src/skins/*.js', () => {
  const pairs = { bg: 'background', grid: 'grid-color', snake: 'color', food: 'food-color' };
  for (const skin of ['natal', 'halloween', 'carnaval']) {
    const file = read(`src/skins/${skin}.js`);
    for (const [short, key] of Object.entries(pairs)) {
      const fromSkin = file.match(new RegExp(`(?:'${key}'|\\b${key}):\\s*'(#[0-9a-fA-F]{6})'`));
      const fromCss = css.match(new RegExp(`--scene-${skin}-${short}:\\s*(#[0-9a-fA-F]{6})`));
      assert.ok(fromSkin && fromCss, `${skin} ${key}`);
      assert.equal(fromCss[1].toLowerCase(), fromSkin[1].toLowerCase(), `${skin} ${key}`);
    }
  }
});

test('no forbidden name in the landing files', () => {
  for (const [file, text] of [['index.html', html], ...SITE_JS.map((f) => [f, read(f)])]) {
    assert.ok(!/\bkonami\b/i.test(text), `${file} has a forbidden name`);
  }
});

test('index.html loads the game, the 3 skins, the addon and the landing script, and links to the demo', () => {
  assert.match(html, /<link rel="stylesheet" href="site\/landing\.css">/);
  assert.match(html, /<a [^>]*href="demo\/"/);
  assert.match(html, /<script src="dist\/snake-game\.js"><\/script>/);
  for (const skin of ['natal', 'halloween', 'carnaval']) assert.match(html, new RegExp(`<script src="skins/${skin}\\.js"></script>`));
  assert.match(html, /<script src="addons\/leaderboard\.js"><\/script>/);
  assert.match(html, /<script type="module" src="site\/landing\.js"><\/script>/);
  assert.match(html, /<snake-game id="preview" mode="inline" text-paused="Paused\. Press Resume or Space to play\."><\/snake-game>/);
});

// ---- features on a phone: the panel moves under the description of the open item (card 9) ----

test('features.js moves the panel in both directions, follows matchMedia and keeps the focus', () => {
  const js = read('site/features.js');
  assert.match(js, /matchMedia\(/);
  assert.match(js, /--features-stacked-max/);
  assert.match(js, /items\[index\]\.append\(panel\)/, 'stacked: the panel goes into the open item');
  assert.match(js, /list\.after\(panel\)/, 'side by side: the panel goes back after the list');
  assert.match(js, /stackedQuery\.addEventListener\('change', placePanel\)/);
  assert.match(js, /held\.focus\(\{ preventScroll: true \}\)/);
  assert.ok(!/aria-live/.test(js));
  assert.match(css, /--features-stacked-max:\s*943\.98px/);
  // The entrance animation of a scene is on .scene, not on the scaled .scene__frame (it would drop the scale for 300 ms).
  assert.match(css, /\.scene:not\(\[hidden\]\)\s*\{\s*animation:\s*rise/);
  assert.ok(!/\.scene__frame\s*\{\s*animation/.test(css));
});
