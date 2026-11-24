// Pure geometry of the grid and of the snake dots. No browser here, so it is easy to test.

// How many columns and rows fit in a board of w x h, with at least `min` of each.
export function gridSize(w, h, spacing, min) {
  return {
    cols: Math.max(min, Math.floor(w / spacing)),
    rows: Math.max(min, Math.floor(h / spacing)),
  };
}

// Diameter of the emoji food before the grid scale: `share` (0.75 = 75%) of the spacing.
export const emojiSize = (spacing, share) => spacing * share;

// Factor k (0 to 1) that shrinks the dots when the grid is squeezed to fit the board, so the gap
// between neighbor dots stays the same on screen: the head gets at most (fitted - gap) pixels.
export function snakeFit({ fitted, scale, headSize, gap }) {
  const wanted = headSize * scale;
  if (wanted <= 0) return 1;
  return Math.min(1, Math.max(0, fitted - gap) / wanted);
}

// Diameter, on screen, of the dot at `index` of a snake with `count` dots.
export function dotDiameter({ index, count, headSize, tailSize, uniform, scale, k }) {
  if (uniform) return headSize * scale * k;
  const along = count > 1 ? index / (count - 1) : 0;
  return (headSize + (tailSize - headSize) * along) * scale * k;
}

// Effective head and tail diameters. `head` and `tail` are numbers set by hand, or null for "auto":
// the head is spacing - gap, the tail is `ratio` of the head (whatever the head ended up being).
export function resolveSnakeSizes({ spacing, gap, head, tail, ratio }) {
  const headSize = head === null ? Math.max(0, spacing - gap) : head;
  const tailSize = tail === null ? headSize * ratio : tail;
  return { headSize, tailSize };
}
