/**
 * Main render orchestrator — composes all layers into a single frame.
 */

import type { Plant, Gardener as GardenerType, TileType } from '../types.ts';
import { SCREEN_W, SCREEN_H } from '../constants.ts';
import { SPRITE_SCALE } from '../sprites/manifest.ts';
import { renderTileGrid } from './tiles.ts';
import { renderPlants } from './plants.ts';
import { renderGardener } from './gardener.ts';
import { renderDecor, renderSceneGuides, renderSky } from './scenery.ts';

export interface RenderState {
  tileMap: TileType[][];
  plants: Plant[];
  gardener: GardenerType;
  time: number;
  /** Whether to show the garden in full or standby dim */
  standby: boolean;
}

/**
 * Render one complete frame of the garden scene.
 */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: RenderState,
): void {
  const spriteScale = SPRITE_SCALE;
  const { tileMap, plants, gardener, time, standby } = state;

  const offsetX = 0;
  const offsetY = 0;

  // 1. Sky (programmatic, always)
  renderSky(ctx, SCREEN_H, SCREEN_W);

  // 2. Ground tiles (grass, path, soil)
  renderTileGrid(ctx, tileMap, offsetX, offsetY, spriteScale);

  // 3. Plants on soil beds
  renderPlants(ctx, plants, offsetX, offsetY, time, spriteScale);

  // 4. Static decor that anchors project-reading and idle states
  renderDecor(ctx, offsetX, offsetY);

  // 5. Route nodes and phase labels
  renderSceneGuides(ctx, offsetX, offsetY);

  // 6. Gardener character
  renderGardener(ctx, gardener, offsetX, offsetY, time, spriteScale);

  // 7. Standby dim overlay
  if (standby) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    ctx.fillStyle = '#FFD54F';
    ctx.font = '24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⏸ 待机中 — 按 SPACE 唤醒', SCREEN_W / 2, SCREEN_H - 40);
  }
}
