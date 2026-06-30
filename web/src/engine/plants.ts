/**
 * Plant rendering — draws plants on soil beds based on health.
 */

import type { Plant } from '../types.ts';
import { TILE_SIZE, WAVE_AMPLITUDE, WAVE_SPEED } from '../constants.ts';
import { getFrame } from '../sprites/images.ts';

/** Draw all plants in the garden */
export function renderPlants(
  ctx: CanvasRenderingContext2D,
  plants: Plant[],
  offsetX: number,
  offsetY: number,
  time: number,
  spriteScale: number,
): void {
  for (const plant of plants) {
    const px = offsetX + plant.x;
    const py = offsetY + plant.y;

    // Gentle sway animation
    const sway = Math.sin(time * WAVE_SPEED + plant.id) * WAVE_AMPLITUDE;
    ctx.save();
    ctx.translate(px + TILE_SIZE / 2, py + TILE_SIZE);
    ctx.rotate(sway * 0.02);

    if (plant.muted) {
      ctx.filter = 'grayscale(1) brightness(0.72)';
      ctx.globalAlpha = 0.78;
    }

    drawPlant(ctx, plant.health, spriteScale, plant.cropFrame);

    ctx.restore();

    if (plants.length <= 8) {
      const labelSize = 10;
      ctx.fillStyle = 'rgba(255,255,240,0.9)';
      ctx.font = `${labelSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(plant.label, px + TILE_SIZE / 2, py + TILE_SIZE + labelSize + 4);
    }
  }
}

function drawPlant(
  ctx: CanvasRenderingContext2D,
  health: Plant['health'],
  spriteScale: number,
  cropFrame?: string,
): void {
  const frameName = cropFrame ?? {
    healthy: 'crop_healthy',
    wilting: 'crop_wilting',
    dead: 'crop_dead',
  }[health];
  const sprite = getFrame(frameName, spriteScale);
  if (sprite) {
    ctx.drawImage(sprite, -sprite.width / 2, -sprite.height);
    return;
  }

  const s = TILE_SIZE;

  switch (health) {
    case 'healthy':
      drawHealthyPlant(ctx, s);
      break;
    case 'wilting':
      drawWiltingPlant(ctx, s);
      break;
    case 'dead':
      drawDeadPlant(ctx, s);
      break;
  }
}

function drawHealthyPlant(ctx: CanvasRenderingContext2D, s: number): void {
  // Stem
  ctx.fillStyle = '#388E3C';
  ctx.fillRect(-2 * s / 64, -s * 0.6, 4 * s / 64, s * 0.6);

  // Leaves
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(-s * 0.3, -s * 0.45, s * 0.25, 4 * s / 64);
  ctx.fillRect(s * 0.05, -s * 0.35, s * 0.25, 4 * s / 64);

  // Flower (sunflower)
  ctx.fillStyle = '#FFC107';
  ctx.beginPath();
  ctx.arc(0, -s * 0.65, s * 0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#5D4037';
  ctx.beginPath();
  ctx.arc(0, -s * 0.65, s * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function drawWiltingPlant(ctx: CanvasRenderingContext2D, s: number): void {
  // Drooping stem
  ctx.fillStyle = '#8BC34A';
  ctx.fillRect(-2 * s / 64, -s * 0.4, 4 * s / 64, s * 0.5);

  // Drooping flower
  ctx.fillStyle = '#FFB300';
  ctx.beginPath();
  ctx.arc(4 * s / 64, -s * 0.45, s * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#5D4037';
  ctx.beginPath();
  ctx.arc(4 * s / 64, -s * 0.45, s * 0.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawDeadPlant(ctx: CanvasRenderingContext2D, s: number): void {
  // Dead stick
  ctx.strokeStyle = '#5D4037';
  ctx.lineWidth = 3 * s / 64;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-4 * s / 64, -s * 0.7);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(4 * s / 64, -s * 0.6);
  ctx.stroke();
}
