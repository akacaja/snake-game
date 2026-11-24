// Pure input helpers: key -> direction, swipe -> direction, and the text-field check.

const KEY_DIRECTIONS = {
  arrowup: 'up',
  arrowdown: 'down',
  arrowleft: 'left',
  arrowright: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
};

export function directionFromKey(key) {
  if (typeof key !== 'string') return null;
  return KEY_DIRECTIONS[key.toLowerCase()] || null;
}

// True when the key press goes to a text field: the game must leave it alone.
export const isTyping = (target) => Boolean(target) && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

export function directionFromSwipe(dx, dy, threshold = 24) {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < threshold) return null;
  if (ax >= ay) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}
