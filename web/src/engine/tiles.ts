/**
 * Tile rendering — grass, path, soil zones.
 * Uses tile sprites when loaded, falls back to solid colors.
 */

import { getFrame } from '../sprites/images.ts';
import { COLORS, GARDEN, TILE_SIZE } from '../constants.ts';
import type { TileType } from '../types.ts';
import { TILE } from '../types.ts';
import { PLANT_SLOTS } from '../scene/layout.ts';

/**
 * Render tile grid onto a canvas context.
 * @param ctx target canvas context
 * @param tileMap 2D array of tile types [row][col]
 * @param offsetX pixel offset
 * @param offsetY pixel offset
 * @param spriteScale pixel scale for 16px sprite art
 */
export function renderTileGrid(
  ctx: CanvasRenderingContext2D,
  tileMap: TileType[][],
  offsetX: number,
  offsetY: number,
  spriteScale: number,
): void {
  const s = TILE_SIZE;

  for (let r = 0; r < tileMap.length; r++) {
    for (let c = 0; c < tileMap[r].length; c++) {
      const tile = tileMap[r][c];
      const x = offsetX + c * s;
      const y = offsetY + r * s;

      if (r < GARDEN.SKY_HEIGHT) {
        continue;
      }

      switch (tile) {
        case TILE.GRASS: {
          ctx.fillStyle = (r + c) % 2 === 0 ? COLORS.GRASS_1 : COLORS.GRASS_2;
          ctx.fillRect(x, y, s, s);

          const sprite = getFrame((r + c) % 7 === 0 ? 'grass_flower' : 'grass', spriteScale);
          if (sprite) {
            ctx.drawImage(sprite, x, y);
          }
          break;
        }
        case TILE.PATH: {
          ctx.fillStyle = COLORS.PATH;
          ctx.fillRect(x, y, s, s);

          const sprite = getFrame('path', spriteScale);
          if (sprite) {
            ctx.drawImage(sprite, x, y);
          }
          break;
        }
        case TILE.SOIL: {
          ctx.fillStyle = COLORS.SOIL;
          ctx.fillRect(x, y, s, s);

          const sprite = getFrame((r + c) % 2 === 0 ? 'soil' : 'soil_light', spriteScale);
          if (sprite) {
            ctx.drawImage(sprite, x, y);
          }
          break;
        }
      }
    }
  }
}

/**
 * Build default garden tile map.
 * Returns a 2D array [ROWS][COLS] with grass, path, and soil zones.
 */
export function buildDefaultTileMap(
  rows: number,
  cols: number,
): TileType[][] {
  const map: TileType[][] = [];

  for (let r = 0; r < rows; r++) {
    const row: TileType[] = [];
    for (let c = 0; c < cols; c++) {
      const isPlantSlot = PLANT_SLOTS.some((slot) => (
        Math.floor(slot.x / TILE_SIZE) === c &&
        Math.floor(slot.y / TILE_SIZE) === r
      ));

      if (isPlantSlot) {
        row.push(TILE.SOIL);
      }
      // Main path from planting area to tree/bench side.
      else if (r === 6 && c >= 6 && c <= 16) {
        row.push(TILE.PATH);
      }
      else if (c === 7 && r >= 3 && r <= 8) {
        row.push(TILE.PATH);
      }
      else {
        row.push(TILE.GRASS);
      }
    }
    map.push(row);
  }

  return map;
}
