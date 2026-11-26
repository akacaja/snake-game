// Text checks on the code drawer, the copy message (toast), the color samples and the menus of the landing page.
// They read index.html, site/landing.css and site/*.js as text: they catch a broken structure, not a broken
// interaction. The interaction (focus, Esc, Tab, click outside, the clipboard) is checked in a real browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (file) => readFileSync(join(root, file), 'utf8');
const html = read('index.html');
const css = read('site/landing.css');
const drawerJs = read('site/drawer.js');
const landingJs = read('site/landing.js');
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '');
const cssCode = stripComments(css);

const drawer = (html.match(/<dialog\b[^>]*>[\s\S]*?<\/dialog>/) || [''])[0];
const aside = html.slice(html.indexOf('<aside class="settings"'), html.indexOf('</aside>'));
const playground = html.slice(html.indexOf('id="playground"'), html.indexOf('id="features"'));

// The text of the rule(s) of a selector, first match: "a { ... }".
const rule = (source, selector) => {
  const start = source.indexOf(`${selector} {`);
  assert.ok(start >= 0, `no rule for ${selector}`);
  return source.slice(start, source.indexOf('}', start));
};

test('the drawer is one closed <dialog id="code-drawer"> named and described by its texts', () => {
  assert.equal([...html.matchAll(/<dialog\b/g)].length, 1);
  const tag = drawer.match(/<dialog\b[^>]*>/)[0];
  assert.match(tag, /\bid="code-drawer"/);
  assert.match(tag, /\bhidden\b/);
  assert.ok(!/\bopen\b/.test(tag), 'the drawer starts closed');
  assert.match(tag, /aria-labelledby="drawer-title"/);
  assert.match(tag, /aria-describedby="drawer-help"/);
  assert.match(drawer, /<h2 class="drawer__title" id="drawer-title">Code for this setup<\/h2>/);
  assert.match(drawer, /<p class="drawer__help" id="drawer-help">Close to keep tweaking\. The code follows your changes\.<\/p>/);
  assert.ok(html.indexOf('<dialog') > html.indexOf('</aside>'), 'the drawer comes after the settings');
  assert.ok(html.indexOf('</dialog>') < html.indexOf('</section>', html.indexOf('<dialog')), 'the drawer is inside the playground');
});

test('the old code section is gone; the code and the summary live inside the drawer', () => {
  assert.ok(!/id="export"/.test(html));
  assert.ok(!/id="copy-status"/.test(html));
  assert.ok(drawer.includes('id="code"'));
  assert.ok(drawer.includes('id="summary"'));
  assert.equal([...html.matchAll(/id="code"/g)].length, 1);
  assert.equal([...html.matchAll(/id="summary"/g)].length, 1);
});

test('Get code is the last control of the settings, a button that points to the drawer', () => {
  const tag = aside.match(/<button\b[^>]*id="get-code"[^>]*>/);
  assert.ok(tag, 'no #get-code');
  assert.match(tag[0], /type="button"/);
  assert.match(tag[0], /aria-expanded="false"/);
  assert.match(tag[0], /aria-controls="code-drawer"/);
  assert.match(aside, /<span>Get code<\/span>/);
  const controls = [...aside.matchAll(/<(button|select|input)\b/g)];
  assert.equal(controls[controls.length - 1][1], 'button');
  assert.ok(aside.lastIndexOf('id="get-code"') > aside.lastIndexOf('<select'), 'Get code comes after the menus');
});

test('the drawer content: close, 3 tabs, the code region, then Copy link and Copy code, in this order', () => {
  const marks = [
    'aria-label="Close code"',
    'data-format="html"', 'data-format="css"', 'data-format="prompt"',
    '<pre class="drawer__code" tabindex="0" role="region" aria-label="Code">',
    'id="copy-link">Copy link<', 'id="copy-code">Copy code<',
  ];
  let last = -1;
  for (const mark of marks) {
    const at = drawer.indexOf(mark);
    assert.ok(at > last, `${mark} is missing or out of order`);
    last = at;
  }
});

test('the toast: one role="status" in the drawer footer, hidden, with 2 decorative icons and the text', () => {
  assert.equal([...html.matchAll(/role="status"/g)].length, 1);
  const foot = drawer.slice(drawer.indexOf('class="drawer__foot"'));
  assert.ok(foot.indexOf('role="status"') > 0 && foot.indexOf('role="status"') < foot.indexOf('id="copy-link"'));
  const toast = drawer.match(/<div class="toast" id="toast"[^>]*>[\s\S]*?<\/div>/)[0];
  assert.match(toast, /\bhidden\b/);
  assert.match(toast, /toast__icon--ok"[^>]*aria-hidden="true"/);
  assert.match(toast, /toast__icon--error"[^>]*aria-hidden="true"/);
  assert.ok(toast.includes('id="toast-text"'));
});

test('the link field: hidden, read-only, with a label that points to it', () => {
  const box = drawer.match(/<div class="drawer__fallback" id="link-fallback"[^>]*>[\s\S]*?<\/div>/)[0];
  assert.match(box, /\bhidden\b/);
  assert.match(box, /<input\b[^>]*id="link-field"[^>]*\breadonly\b/);
  assert.match(box, /<label\b[^>]*for="link-field"/);
});

test('Lucide icons: the license comment comes first, the drawings are there and every svg is decorative', () => {
  const firstSvg = playground.indexOf('<svg');
  const comment = playground.match(/<!--[^>]*Lucide[^>]*ISC[^>]*-->/);
  assert.ok(comment, 'no Lucide / ISC comment in the playground');
  assert.ok(playground.indexOf(comment[0]) < firstSvg, 'the comment comes after the first icon');
  assert.ok(aside.includes('m16 18 6-6-6-6'), 'code icon');
  assert.equal([...aside.matchAll(/d="m6 9 6 6 6-6"/g)].length, 6, 'one chevron per menu');
  assert.ok(drawer.includes('M18 6 6 18'), 'close icon');
  assert.ok(drawer.includes('M20 6 9 17l-5-5'), 'check icon');
  assert.ok(/<circle cx="12" cy="12" r="10"\/>/.test(drawer), 'alert icon');
  for (const tag of playground.matchAll(/<svg\b[^>]*>/g)) assert.match(tag[0], /aria-hidden="true"/, tag[0]);
});

test('the 4 color samples are labels with the real input, the visible name and a hidden value', () => {
  assert.equal([...aside.matchAll(/<label class="color-pick">/g)].length, 4);
  for (const key of ['color', 'food-color', 'grid-color', 'background']) {
    assert.match(aside, new RegExp(`<input type="color" class="color-pick__input" data-color="${key}">`));
    assert.match(aside, new RegExp(`<span class="visually-hidden" data-color-value="${key}"></span>`));
  }
  assert.equal([...aside.matchAll(/class="color-pick__name">/g)].length, 4);
  assert.ok(!/<output[^>]*data-color-value/.test(html), 'the color value is no longer an <output>');
});

test(':root has the variables of the drawer, the toast and the menus', () => {
  const rootBlock = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
  for (const name of ['--toast-ok', '--toast-error', '--target-cta', '--select-chevron-size', '--features-stacked-max']) {
    assert.ok(rootBlock.includes(`${name}:`), name);
  }
  assert.match(rootBlock, /--drawer-width:\s*560px/);
  assert.match(rootBlock, /--select-chevron-gap:\s*14px/);
});

test('the green and red of the toast icons are used once each, only for the icon stroke', () => {
  for (const [name, selector] of [['--toast-ok', 'toast__icon--ok'], ['--toast-error', 'toast__icon--error']]) {
    const uses = [...cssCode.matchAll(new RegExp(`var\\(${name}\\)`, 'g'))];
    assert.equal(uses.length, 1, `${name} is used ${uses.length} times`);
    assert.match(cssCode, new RegExp(`\\.${selector}\\s*\\{\\s*stroke:\\s*var\\(${name}\\)`));
  }
});

test('the drawer CSS: width, full screen up to 900px, a scroll area of its own', () => {
  assert.match(rule(cssCode, '.drawer'), /width:\s*min\(var\(--drawer-width\),\s*100%\)/);
  const small = cssCode.slice(cssCode.indexOf('@media (max-width: 900px) {'));
  const smallRule = rule(small, '.drawer');
  assert.match(smallRule, /position:\s*fixed/);
  assert.match(smallRule, /inset:\s*0;/);
  assert.match(small.slice(0, small.indexOf('\n}\n')), /html:has\(\.drawer\[open\]\)\s*\{\s*overflow:\s*hidden/);
  assert.match(rule(cssCode, '.drawer__code'), /overflow:\s*auto/);
  assert.match(cssCode, /\.drawer\[open\]\s*\{\s*display:\s*flex/);
});

test('the menus CSS: the arrow is 14px from the edge, the text never reaches it, two columns everywhere', () => {
  assert.match(rule(cssCode, '.select__icon'), /right:\s*var\(--select-chevron-gap\)/);
  const padding = rule(cssCode, '.select__control').match(/padding:\s*([^;]+);/)[1];
  assert.ok(padding.includes('var(--select-chevron-gap)') && padding.includes('var(--select-chevron-size)'), padding);
  assert.match(rule(cssCode, '.selects'), /grid-template-columns:\s*repeat\(2,/);
  for (const m of cssCode.matchAll(/@media[^{]*\{[\s\S]*?\n\}/g)) assert.ok(!/\.selects\b/.test(m[0]), 'a media query changes the menu columns');
  assert.match(cssCode, /@media \(pointer: coarse\)\s*\{\s*:root\s*\{\s*--text-select:\s*16px/);
  assert.match(rule(cssCode, '.select__control'), /font-size:\s*var\(--text-select\)/);
  assert.match(rule(cssCode, '.drawer__field'), /font-size:\s*var\(--text-select\)/);
});

test('every control of the drawer and the panel is at least --target tall (the close button also wide)', () => {
  for (const selector of ['.get-code', '.drawer__close', '.code-button', '.tab', '.select__control', '.drawer__field']) {
    assert.match(rule(cssCode, selector), /min-height:\s*var\(--target(-cta)?\)/, selector);
  }
  assert.match(rule(cssCode, '.drawer__close'), /width:\s*var\(--target\)/);
  assert.match(rule(cssCode, '.drawer__close'), /(?<![-\w])height:\s*var\(--target\)/);
});

test('motion: the drawer slides in 250 ms and the toast rises in 200 ms, only without reduced motion', () => {
  const start = cssCode.indexOf('@media (prefers-reduced-motion: no-preference)');
  const motion = cssCode.slice(start);
  assert.ok(/@keyframes drawer-in/.test(motion) && /@keyframes toast-in/.test(motion));
  assert.match(motion, /\.drawer\[open\]\s*\{\s*animation:\s*drawer-in 250ms ease-out/);
  assert.match(motion, /\.toast:not\(\[hidden\]\)\s*\{\s*animation:\s*toast-in 200ms ease-out/);
  assert.ok(!/drawer-in|toast-in/.test(cssCode.slice(0, start)), 'the drawer or toast animation is outside the no-preference block');
});

test('the old code card, segmented control and color rows are gone from the CSS', () => {
  for (const name of ['.export', '.code-card', '.segmented', '.color-row']) {
    assert.ok(!cssCode.includes(name), `${name} is still in landing.css`);
  }
});

test('drawer.js opens with show(), handles Escape and Tab, writes aria-expanded, listens outside and uses inert', () => {
  assert.match(drawerJs, /\.show\(\)/);
  assert.ok(!/showModal/.test(drawerJs), 'the drawer is not modal');
  assert.match(drawerJs, /'Escape'/);
  assert.match(drawerJs, /'Tab'/);
  assert.match(drawerJs, /aria-expanded/);
  assert.match(drawerJs, /addEventListener\('pointerdown',[\s\S]*?,\s*true\)/);
  assert.match(drawerJs, /\.inert\s*=\s*true/);
  assert.match(drawerJs, /\.inert\s*=\s*false/);
  assert.match(drawerJs, /opener\.focus\(/);
});

test('landing.js: no prompt(), no copy-status, the 3 messages, the two times, and the link field is selected', () => {
  assert.ok(!/\bprompt\(/.test(landingJs));
  assert.ok(!/copy-status/.test(landingJs));
  for (const text of ['Code copied and ready to use!', 'Link copied. It opens this exact setup.', "Couldn't copy. Select the text and copy it manually."]) {
    assert.ok(landingJs.includes(text), text);
  }
  assert.match(landingJs, /TOAST_MS = 2600/);
  assert.match(landingJs, /TOAST_ERROR_MS = 6000/);
  assert.match(landingJs, /\.select\(\)/);
  assert.match(landingJs, /setSelectionRange/);
});
