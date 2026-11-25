/* snake-game | MIT (c) 2026 Carolina Cajazeira (@akacaja) */
// Skins without the DOM (testable in Node): picking, emoji check, validation, palette CSS.
import { EMOJI_FONT, EMOJI_PROBE_SIZE } from './theme.js';

const SPLIT_RATIO = 1.3; // wider than this x its first codepoint: the emoji came apart
const OWN_COLOR = 40; // a channel above this: the glyph has its own color (a missing glyph gets the plain fill color)
const SKIN_TONES = /[\u{1F3FB}-\u{1F3FF}]/gu;
const UNSAFE = /[;{}<>\\]|\/\*|\*\/|url\(/i; // would break out of the value, or load something
// In a browser, the value must also be a color the browser understands.
const isColor = (v) => typeof CSS === 'undefined' || !CSS.supports || CSS.supports('color', v);

// Next food index: uniform, never `previous` (-1: none yet).
export function pickFood(count, previous, random = Math.random) {
  const skip = count > 1 && previous >= 0 && previous < count;
  const index = Math.floor(random() * (count - skip));
  return skip && index >= previous ? index + 1 : index;
}

// probe: { width(text), pixels(text) } (RGBA of the text drawn with the plain fill color).
const shows = (text, probe) => probe.width(text) <= SPLIT_RATIO * probe.width(String.fromCodePoint(text.codePointAt(0)))
  && probe.pixels(text).some((v, i) => i % 4 < 3 && v > OWN_COLOR);

// The emoji, or its version without skin tone, or null.
export function usableEmoji(emoji, probe) {
  return [emoji, emoji.replace(SKIN_TONES, '')].find((e) => shows(e, probe)) || null;
}

export function usableFoods(foods, probe, cache = new Map()) {
  const list = [];
  for (const food of foods) {
    if (!cache.has(food.emoji)) cache.set(food.emoji, usableEmoji(food.emoji, probe));
    const emoji = cache.get(food.emoji);
    if (emoji) list.push({ ...food, emoji });
  }
  return list;
}

// { foods, palette } with only what is valid (warns, never throws), or null.
export function normalizeSkin(skin, colorNames, warn) {
  if (!skin || typeof skin !== 'object') return (warn('a skin must be an object. Skipped.'), null);
  const text = (v) => typeof v === 'string' && v.trim();
  const keep = (ok, what) => Boolean(ok) || (warn(`${what}. Skipped.`), false);
  if (skin.foods != null) keep(Array.isArray(skin.foods), 'foods must be a list');
  const foods = (Array.isArray(skin.foods) ? skin.foods : []).filter((f) => keep(f && text(f.emoji) && f.names && typeof f.names === 'object' && Object.values(f.names).some(text), 'a food needs an emoji and a name'));
  const palette = {};
  const given = skin.palette;
  const plain = given && typeof given === 'object' && !Array.isArray(given);
  if (given != null) keep(plain, 'the palette must be an object');
  for (const [key, value] of Object.entries(plain ? given : {})) {
    if (keep(colorNames.includes(key) && text(value) && !UNSAFE.test(value) && isColor(value), `"${key}" needs a color token and a safe color value`)) palette[key] = value;
  }
  return { foods, palette };
}

// Spoken name: the language (pt-BR -> pt), then en, then any.
export const foodName = (food, locale) => food.names[locale.split('-')[0]] || food.names.en || Object.values(food.names).find(Boolean);

export function paletteCSS(palette) {
  const rules = Object.entries(palette || {}).map(([key, value]) => `--_skin-${key}:${value}`);
  return rules.length ? `:host{${rules.join(';')}}` : '';
}

// Skin files push [name, skin] to globalThis.snakeGameSkins, before or after the game loads.
// Addon files do the same with [name, function] on globalThis.snakeGameAddons (`key` and `what` say which).
export function adoptQueue(target, register, warn = () => {}, key = 'snakeGameSkins', what = 'skin') {
  const queue = target[key] || [];
  if (!Array.isArray(queue)) return;
  // Each item on its own: a bad one warns and the next ones still register.
  const add = (...items) => items.forEach((item) => {
    if (!Array.isArray(item)) return warn(`${/^[aeiou]/.test(what) ? 'an' : 'a'} ${what} in the queue must be [name, ${what}]. Skipped.`);
    try { register(item[0], item[1]); } catch (error) { warn(`${error}. Skipped.`); }
  });
  target[key] = { push: add };
  add(...queue);
}

// Browser only: a canvas that measures and draws a text, to see if the device can show an emoji.
export function createCanvasProbe() {
  const side = EMOJI_PROBE_SIZE * 2;
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  ctx.font = `${EMOJI_PROBE_SIZE}px ${EMOJI_FONT}`;
  ctx.textBaseline = 'top';
  return {
    width: (text) => ctx.measureText(text).width,
    pixels: (text) => {
      ctx.clearRect(0, 0, side, side);
      ctx.fillText(text, 0, 0);
      return ctx.getImageData(0, 0, side, side).data;
    },
  };
}
