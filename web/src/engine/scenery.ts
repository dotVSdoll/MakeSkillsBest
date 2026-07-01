/**
 * Scenery — sky, fence, bench, decorations (static elements).
 */

import { TILE_SIZE, COLORS, GARDEN, SCREEN_W } from '../constants.ts';
import { getFrame } from '../sprites/images.ts';
import { DECOR, LAYER_ROWS } from '../scene/layout.ts';

/** Draw gradient sky background */
export function renderSky(
  ctx: CanvasRenderingContext2D,
  _height: number,
  width: number,
): void {
  const skyHeight = GARDEN.SKY_HEIGHT * TILE_SIZE;
  for (let y = 0; y < skyHeight; y++) {
    const t = y / skyHeight;
    const r = COLORS.SKY_TOP[0] * (1 - t) + COLORS.SKY_BOTTOM[0] * t;
    const g = COLORS.SKY_TOP[1] * (1 - t) + COLORS.SKY_BOTTOM[1] * t;
    const b = COLORS.SKY_TOP[2] * (1 - t) + COLORS.SKY_BOTTOM[2] * t;
    ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
    ctx.fillRect(0, y, width, 1);
  }
}

export function renderDecor(
  ctx: CanvasRenderingContext2D,
  offsetX: number,
  offsetY: number,
): void {
  renderFences(ctx, offsetX, offsetY);

  const tree = getFrame('tree_large', 3);
  const treeX = offsetX + DECOR.tree.x;
  const treeY = offsetY + DECOR.tree.y;
  if (tree) {
    ctx.drawImage(tree, treeX - tree.width / 2, treeY - tree.height);
  }

  const bench = getFrame('bench', 8);
  const benchX = offsetX + DECOR.bench.x;
  const benchY = offsetY + DECOR.bench.y;
  if (bench) {
    ctx.drawImage(bench, benchX - bench.width / 2, benchY - bench.height);
  }
}

export function renderSceneGuides(
  ctx: CanvasRenderingContext2D,
  offsetX: number,
  offsetY: number,
): void {
  renderLayerLabels(ctx, offsetX, offsetY);
}

function renderFences(
  ctx: CanvasRenderingContext2D,
  offsetX: number,
  offsetY: number,
): void {
  const horizontal = getFrame('fence_horizontal', 4);
  const vertical = getFrame('fence_vertical', 4);
  const fenceY = offsetY + GARDEN.SKY_HEIGHT * TILE_SIZE - 8;

  if (horizontal) {
    for (let x = offsetX; x < SCREEN_W; x += horizontal.width) {
      ctx.drawImage(horizontal, x, fenceY);
    }
  }

  if (vertical) {
    for (let y = fenceY; y < offsetY + 11 * TILE_SIZE; y += vertical.height - 4) {
      ctx.drawImage(vertical, offsetX, y);
    }
  }
}

function renderLayerLabels(
  ctx: CanvasRenderingContext2D,
  offsetX: number,
  offsetY: number,
): void {
  ctx.save();
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'left';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(25,45,25,0.75)';
  ctx.fillStyle = 'rgba(255,255,240,0.96)';

  LAYER_ROWS.forEach((layer, row) => {
    const x = offsetX + TILE_SIZE + 12;
    const y = offsetY + (3 + row) * TILE_SIZE + 38;
    ctx.strokeText(layer, x, y);
    ctx.fillText(layer, x, y);
  });

  ctx.restore();
}
