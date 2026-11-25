/* snake-game | MIT (c) 2026 Carolina Cajazeira (@akacaja) */
// Default drawing functions. They only use values from `scene` (see README): no literal colors or sizes.
// A custom renderer has the same shape: (ctx, scene) => void.
import { EMOJI_FONT } from './theme.js';

const FULL_TURN = Math.PI * 2;

export function drawGrid(ctx, scene) {
  const { tokens, options, cells, cols, rows, spacing, scale } = scene;
  const kind = options.grid;
  if (kind === 'none' || cells.length === 0) return;

  if (kind === 'lines') {
    ctx.strokeStyle = tokens.gridColor;
    ctx.lineWidth = tokens.gridLineWidth;
    const half = spacing / 2;
    const top = cells[0].cy - half;
    const bottom = cells[cells.length - 1].cy + half;
    const left = cells[0].cx - half;
    const right = cells[cells.length - 1].cx + half;
    for (let x = 0; x < cols; x += 1) {
      let sum = 0;
      for (let y = 0; y < rows; y += 1) sum += cells[y * cols + x].appear;
      ctx.globalAlpha = sum / rows;
      ctx.beginPath();
      ctx.moveTo(cells[x].cx, top);
      ctx.lineTo(cells[x].cx, bottom);
      ctx.stroke();
    }
    for (let y = 0; y < rows; y += 1) {
      let sum = 0;
      for (let x = 0; x < cols; x += 1) sum += cells[y * cols + x].appear;
      ctx.globalAlpha = sum / cols;
      ctx.beginPath();
      ctx.moveTo(left, cells[y * cols].cy);
      ctx.lineTo(right, cells[y * cols].cy);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    return;
  }

  ctx.fillStyle = tokens.gridColor;
  const base = tokens.gridDotSize * scale;
  if (kind === 'squares') {
    for (const cell of cells) {
      const side = base * cell.appear;
      if (side > 0) ctx.fillRect(cell.cx - side / 2, cell.cy - side / 2, side, side);
    }
    return;
  }
  ctx.beginPath();
  for (const cell of cells) {
    const radius = (base * cell.appear) / 2;
    if (radius <= 0) continue;
    ctx.moveTo(cell.cx + radius, cell.cy);
    ctx.arc(cell.cx, cell.cy, radius, 0, FULL_TURN);
  }
  ctx.fill();
}

export function drawSnake(ctx, scene) {
  const { tokens, segments } = scene;
  ctx.fillStyle = tokens.color;
  // Tail first, so the head is drawn on top.
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const seg = segments[i];
    if (seg.size <= 0 || seg.opacity <= 0) continue;
    ctx.globalAlpha = seg.opacity;
    ctx.beginPath();
    ctx.arc(seg.cx, seg.cy, seg.size / 2, 0, FULL_TURN);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawFood(ctx, scene) {
  const { tokens, options, foodItem, dpr } = scene;
  if (!foodItem || foodItem.size <= 0) return;
  ctx.save();
  if (foodItem.emoji) {
    // Skin food: centered by the measured box, since fonts differ in where they put the glyph. No glow.
    ctx.font = `${foodItem.size}px ${EMOJI_FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const m = ctx.measureText(foodItem.emoji);
    ctx.fillText(
      foodItem.emoji,
      foodItem.cx - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2,
      foodItem.cy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2,
    );
    ctx.restore();
    return;
  }
  if (options.foodHalo === 'soft') {
    ctx.shadowColor = tokens.foodHaloColor;
    // Canvas shadows ignore the transform, so the blur is scaled by the pixel ratio.
    ctx.shadowBlur = foodItem.haloSize * dpr;
  }
  ctx.fillStyle = tokens.foodColor;
  if (options.food === 'square') {
    const side = foodItem.size;
    ctx.fillRect(foodItem.cx - side / 2, foodItem.cy - side / 2, side, side);
  } else {
    ctx.beginPath();
    ctx.arc(foodItem.cx, foodItem.cy, foodItem.size / 2, 0, FULL_TURN);
    ctx.fill();
  }
  ctx.restore();
}
