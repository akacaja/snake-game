/* snake-game | MIT (c) 2026 Carolina Cajazeira (@akacaja) */
// Pure text helpers: placeholder replacement and plural forms.

export const DEFAULT_TEXTS = {
  title: 'Snake game',
  instructions: 'Use arrow keys or WASD to move, or swipe on touch screens. Space pauses. Escape closes.',
  score: '{score}',
  best: 'Best {best}',
  playAgain: 'Play again',
  pause: 'Pause',
  resume: 'Resume',
  paused: 'Paused. Press space to continue.',
  close: 'Close game',
  ate: 'Score {score}',
  ateFood: 'Ate {food}. Score {score}',
  gameOver: {
    one: 'Game over, {score} point',
    other: 'Game over, {score} points',
  },
};

export function formatText(template, values = {}) {
  return String(template).replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}

// Returns the locale if the runtime knows it, otherwise 'en'.
export function resolveLocale(locale) {
  if (typeof locale !== 'string' || locale === '') return 'en';
  try {
    return Intl.PluralRules.supportedLocalesOf(locale).length > 0 ? locale : 'en';
  } catch {
    return 'en';
  }
}

export function pluralCategory(count, locale) {
  return new Intl.PluralRules(resolveLocale(locale)).select(count);
}

// getAttr(name) -> string | null. Looks for `prefix-<form>`, then `prefix-other`, then defaults.
export function pickPluralText(getAttr, prefix, count, locale, defaults = {}) {
  const form = pluralCategory(count, locale);
  const own = getAttr(`${prefix}-${form}`);
  if (own !== null && own !== undefined) return own;
  const fallback = getAttr(`${prefix}-other`);
  if (fallback !== null && fallback !== undefined) return fallback;
  return defaults[form] !== undefined ? defaults[form] : defaults.other;
}
