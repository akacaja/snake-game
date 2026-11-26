// Freezes the parts of the landing that card 9 must not change: Features, Questions and footer (desktop version),
// the pure modules and the :root values. Each hash is the SHA-256 (line breaks normalized to \n) of the text as it was
// in commit 8cb27e5 (the end of card 8). To recompute one, from the project root:
//   git show 8cb27e5:index.html            (then cut from '<section id="features"' to '</footer>')
//   git show 8cb27e5:site/config.js        (the whole file; the same for site/scenes.js)
//   git show 8cb27e5:site/landing.css      (cut from '/* ---- Features ---- */' to '/* ---- Small screens ---- */')
// and hash the text. Changing one of these constants is a decision (the card that edits the Features on purpose
// updates the hash and says why in its report); it is never a way to make a failing test pass.
//
// NOT frozen, on purpose (card 9, section 12 of the plan): site/features.js and every @media block of the
// "Small screens" part of the CSS, because on a phone the animation moves under the description of the open item.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (file) => readFileSync(join(root, file), 'utf8');
const sha = (text) => createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');

const FROZEN = {
  featuresFaqFooter: '7c8aaea0cb7ac433df1dea9131c41df634602794d24e3cf7ad758d3fc88af749',
  'site/config.js': '797a8c90a42475c06baba2ff7b62f0f9167ee84a44049f92e769682964952f86',
  'site/scenes.js': '5c4f070dae04dda62dc12dc76c518464afff9e86c57953dc6736816a4cdb6fb9',
  cssFeaturesToFooterAndScenes: '201dd3df193288c97f7b721cdbe90fa2378928e70b233426735faf2c0fd7875a',
  motionDesktopRules: '67966942617155d2859fc080b1a0093d85448983b187efc97b01e705142694cd',
  rootValues: '2f5395757cc82cf1439615220ece9b8975604c5641ecbd26eb36c11c7ecccd6d',
};

// The :root variables that already existed in 8cb27e5 (new ones are allowed; these keep their values).
const ROOT_NAMES = [
  '--page', '--surface', '--surface-2', '--ink', '--ink-2', '--ink-muted', '--link', '--link-hover', '--line',
  '--line-strong', '--accent', '--code-bg', '--code-text', '--code-muted', '--code-line', '--code-button-line',
  '--button-light', '--focus-on-dark', '--shadow-soft', '--shadow-modal', '--veil', '--field-glow',
  '--scene-ink-1', '--scene-ink-2', '--scene-ink-3', '--scene-food-halo', '--scene-natal-bg',
  '--scene-natal-grid', '--scene-natal-snake', '--scene-natal-food', '--scene-halloween-bg',
  '--scene-halloween-grid', '--scene-halloween-snake', '--scene-halloween-food', '--scene-carnaval-bg',
  '--scene-carnaval-grid', '--scene-carnaval-snake', '--scene-carnaval-food', '--font-sans', '--font-mono',
  '--radius-round', '--radius-card', '--radius-panel', '--radius-board', '--radius-segmented',
  '--radius-segmented-item', '--radius-button', '--radius-pill', '--radius-modal', '--radius-swatch',
  '--radius-key', '--radius-tag', '--radius-bubble-tail', '--max-width', '--gutter', '--target',
  '--section-gap', '--scene-width', '--cell', '--seg-d', '--text-display', '--text-h1', '--text-h2',
  '--text-h2-small', '--text-body', '--text-label', '--text-chip', '--text-code', '--text-code-small',
  '--text-version', '--text-ui', '--text-lead', '--text-summary', '--text-emoji', '--text-emoji-small',
];

test('Features, Questions and footer in index.html are the same as in 8cb27e5', () => {
  const html = read('index.html');
  const start = html.indexOf('<section id="features"');
  const end = html.indexOf('</footer>') + '</footer>'.length;
  assert.ok(start > 0 && end > start);
  assert.equal(sha(html.slice(start, end)), FROZEN.featuresFaqFooter);
});

test('site/config.js and site/scenes.js are the same as in 8cb27e5', () => {
  for (const file of ['site/config.js', 'site/scenes.js']) assert.equal(sha(read(file)), FROZEN[file], file);
});

test('the CSS from "Features" to "Small screens" (features, questions, footer and scenes) is the same as in 8cb27e5', () => {
  const css = read('site/landing.css');
  const start = css.indexOf('/* ---- Features ---- */');
  const end = css.indexOf('/* ---- Small screens ---- */');
  assert.ok(start > 0 && end > start);
  assert.equal(sha(css.slice(start, end)), FROZEN.cssFeaturesToFooterAndScenes);
});

test('every :root value that existed in 8cb27e5 is unchanged (new variables are allowed)', () => {
  const css = read('site/landing.css');
  const open = css.indexOf(':root {');
  const block = css.slice(open, css.indexOf('}', open)).replace(/\/\*[\s\S]*?\*\//g, '');
  const found = [...block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => ({ name: m[1], line: `${m[1]}: ${m[2].trim()}` }));
  const kept = found.filter((v) => ROOT_NAMES.includes(v.name));
  assert.equal(kept.length, ROOT_NAMES.length, 'a :root variable of 8cb27e5 was removed or renamed');
  assert.equal(sha(kept.map((v) => v.line).join('\n')), FROZEN.rootValues);
});

// The desktop rules of the Motion block that belong to the playground, features and FAQ (.faq__chevron, .lb__row,
// .sr__bubble, .features[data-paused], .seg, .layer and the others) and @keyframes rise, as in 8cb27e5.
// Left out on purpose (changed or added in card 9): the shared transition list that starts with ".brand," (it gained the
// drawer and menu controls), ".drawer[open]", ".toast:not([hidden])", and the rule of ".scene", which changed on purpose
// in card 9 (.scene__frame -> .scene). Comment lines are ignored.
test('the desktop Motion rules of features and FAQ are the same as in 8cb27e5 (except .scene, changed on purpose)', () => {
  const css = read('site/landing.css');
  const motion = css.indexOf('/* ---- Motion (the only place) ---- */');
  const start = css.indexOf('@keyframes rise', motion);
  const end = css.indexOf('\n', css.indexOf('.features[data-paused]', motion));
  assert.ok(motion > 0 && start > motion && end > start);
  const lines = css.slice(start, end).split('\n').filter((line) => (
    !/^\s*\/\*/.test(line) && !/\.scene:not\(\[hidden\]\)|\.drawer\[open\]|\.toast:not/.test(line) && !/^\s*\.brand,/.test(line)
  ));
  assert.equal(sha(lines.join('\n')), FROZEN.motionDesktopRules);
});
