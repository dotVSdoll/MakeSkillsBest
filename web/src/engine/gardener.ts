/**
 * Gardener character — rendering and movement.
 */

import type { Gardener as GardenerType } from '../types.ts';
import { getFrame } from '../sprites/images.ts';
import { TILE_SIZE } from '../constants.ts';
import { CHARACTER_SCALE } from '../sprites/manifest.ts';
import { PHASE_LABELS, LOOP_PHASES } from '../types.ts';
import { SCENE_ANCHORS } from '../scene/layout.ts';

/** Draw the gardener character */
export function renderGardener(
  ctx: CanvasRenderingContext2D,
  gardener: GardenerType,
  offsetX: number,
  offsetY: number,
  time: number,
  _spriteScale: number,
): void {
  const s = TILE_SIZE;
  const px = offsetX + gardener.x;
  const py = offsetY + gardener.y;

  const moving = Math.abs(gardener.x - gardener.targetX) > 1 || Math.abs(gardener.y - gardener.targetY) > 1;
  const frame = Math.floor(time * 6) % 4;
  const frameName = selectFrameName(gardener.direction, moving, frame);
  const sprite = getFrame(frameName, CHARACTER_SCALE);

  if (sprite) {
    // Center bottom-anchor
    const drawX = px - sprite.width / 2;
    const drawY = py - sprite.height;
    ctx.drawImage(sprite, drawX, drawY);
  } else {
    // Fallback: draw cute character
    drawGardenerFallback(ctx, px, py, s, gardener.direction);
  }

  // Phase label above head
  const labelText = PHASE_LABELS[gardener.phase];
  ctx.fillStyle = 'rgba(255,255,240,0.9)';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(labelText, px, py - s - 8);
}

function drawGardenerFallback(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  direction: GardenerType['direction'],
): void {
  // Body (overalls)
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(x - 0.2 * s, y - 0.45 * s, 0.4 * s, 0.45 * s);

  // Head
  ctx.fillStyle = '#FFDCB5';
  ctx.beginPath();
  ctx.arc(x, y - 0.55 * s, 0.18 * s, 0, Math.PI * 2);
  ctx.fill();

  // Hat
  ctx.fillStyle = '#C8A96E';
  ctx.fillRect(x - 0.25 * s, y - 0.7 * s, 0.5 * s, 0.1 * s);
  ctx.fillRect(x - 0.15 * s, y - 0.85 * s, 0.3 * s, 0.15 * s);

  // Direction indicator (eyes + tool)
  const eyeX = direction === 'right' || direction === 'back' ? x + 0.06 * s : x - 0.06 * s;
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(eyeX, y - 0.55 * s, 0.03 * s, 0, Math.PI * 2);
  ctx.fill();
}

/** Update gardener movement toward target */
export function updateGardener(gardener: GardenerType, dt: number): void {
  const speed = 88; // pixels per second
  const nextPoint = gardener.waypoints?.[0] ?? { x: gardener.targetX, y: gardener.targetY };
  const dx = nextPoint.x - gardener.x;
  const dy = nextPoint.y - gardener.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 2) {
    gardener.x = nextPoint.x;
    gardener.y = nextPoint.y;
    if (gardener.waypoints && gardener.waypoints.length > 0) {
      gardener.waypoints.shift();
    }
    return;
  }

  const step = speed * dt;
  if (step >= dist) {
    gardener.x = nextPoint.x;
    gardener.y = nextPoint.y;
    if (gardener.waypoints && gardener.waypoints.length > 0) {
      gardener.waypoints.shift();
    }
  } else {
    gardener.x += (dx / dist) * step;
    gardener.y += (dy / dist) * step;
  }

  gardener.direction = directionFromVector(dx, dy);
}

/** Advance loop phase and set gardener target */
export function advancePhase(
  gardener: GardenerType,
  _plantPositions: { x: number; y: number }[],
): void {
  const currentIdx = LOOP_PHASES.findIndex((phase) => phase === gardener.phase);
  const nextIdx = (currentIdx + 1) % LOOP_PHASES.length;
  gardener.phase = LOOP_PHASES[nextIdx];

  const target = SCENE_ANCHORS[gardener.phase];
  gardener.targetX = target.x;
  gardener.targetY = target.y;
}

function selectFrameName(
  direction: GardenerType['direction'],
  moving: boolean,
  frame: number,
): string {
  if (!moving) {
    if (direction === 'back') return `idle_back_${frame}`;
    return `idle_front_${frame}`;
  }

  switch (direction) {
    case 'left':
      return `walk_left_${frame}`;
    case 'right':
      return `walk_right_${frame}`;
    case 'back':
      return `walk_back_${frame}`;
    case 'front':
      return `walk_front_${frame}`;
  }
}

function directionFromVector(
  dx: number,
  dy: number,
): GardenerType['direction'] {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  }
  return dy >= 0 ? 'front' : 'back';
}
