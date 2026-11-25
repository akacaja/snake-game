/* snake-game | MIT (c) 2026 Carolina Cajazeira (@akacaja) */
// Reads the resolved theme tokens from a host element.
// The host exposes `--_<name>` (see theme.js). A hidden probe element inside the shadow DOM
// lets the browser resolve them: any CSS color, rem, calc(), min() or var() works.
import { TOKEN_DEFS, TAIL_RATIO } from './theme.js';
import { resolveSnakeSizes } from './geometry.js';

export function toCamel(name) {
  return name.replace(/-([a-z])/g, (m, letter) => letter.toUpperCase());
}

// "75%" -> 0.75. Anything that is not a plain non-negative percentage uses the `fallback` text.
export const parsePercent = (text, fallback) => parseFloat(/^\s*\d*\.?\d+%\s*$/.test(text) ? text : fallback) / 100;

export function parseDuration(text) {
  const first = String(text).split(',')[0].trim();
  const value = parseFloat(first);
  if (Number.isNaN(value)) return 0;
  return first.endsWith('ms') ? value : value * 1000;
}

// Raw strings of all tokens joined together. Cheap to compare every frame.
export function rawTokenKey(host) {
  const style = getComputedStyle(host);
  let key = '';
  for (const t of TOKEN_DEFS) key += `${style.getPropertyValue(`--_${t.name}`)}|`;
  return key;
}

export function createProbe(parent) {
  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  parent.appendChild(probe);
  return probe;
}

// Returns an object keyed by camelCase token name: colors as strings, lengths in CSS pixels, times in ms.
export function readTokens(probe) {
  const tokens = {};
  for (const t of TOKEN_DEFS) {
    const ref = `var(--_${t.name})`;
    let value;
    if (t.kind === 'color') {
      probe.style.color = ref;
      value = getComputedStyle(probe).color;
      probe.style.color = '';
    } else if (t.kind === 'length' || t.kind === 'auto-length') {
      if (t.kind === 'auto-length' && getComputedStyle(probe).getPropertyValue(`--_${t.name}`).trim() === 'auto') {
        value = null; // resolved below, from spacing and gap
      } else {
        probe.style.width = ref;
        value = parseFloat(getComputedStyle(probe).width) || 0;
        probe.style.width = '';
      }
    } else if (t.kind === 'signed-length') {
      // `width` turns negative values into 0; margin-left keeps them.
      probe.style.marginLeft = ref;
      value = parseFloat(getComputedStyle(probe).marginLeft) || 0;
      probe.style.marginLeft = '';
    } else if (t.kind === 'percentage') {
      value = parsePercent(getComputedStyle(probe).getPropertyValue(`--_${t.name}`), t.value);
    } else if (t.kind === 'time') {
      probe.style.transitionDuration = ref;
      value = parseDuration(getComputedStyle(probe).transitionDuration);
      probe.style.transitionDuration = '';
    } else {
      probe.style.fontFamily = ref;
      value = getComputedStyle(probe).fontFamily;
      probe.style.fontFamily = '';
    }
    tokens[toCamel(t.name)] = value;
  }
  const { headSize, tailSize } = resolveSnakeSizes({ spacing: tokens.spacing, gap: tokens.gap, head: tokens.headSize, tail: tokens.tailSize, ratio: TAIL_RATIO });
  tokens.headSize = headSize;
  tokens.tailSize = tailSize;
  return tokens;
}
