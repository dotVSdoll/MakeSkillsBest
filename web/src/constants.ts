/** Little Gardener — scene constants */

export const SCREEN_W = 1280;
export const SCREEN_H = 720;
export const TILE_SIZE = 64;

/** How many tiles fit on screen */
export const COLS = Math.ceil(SCREEN_W / TILE_SIZE);  // 20
export const ROWS = Math.ceil(SCREEN_H / TILE_SIZE);  // 12

/** Garden grid layout (in tiles) */
export const GARDEN = {
  SKY_HEIGHT: 2,          // rows of sky
  PATH_ROW: 6,            // row index for main dirt path
  PLANT_COLS: 4,          // columns of plant beds
  PLANT_START_ROW: 3,     // first plant bed row
  PLANT_SPACING_X: 3.5,   // tile gap between beds
  PLANT_SPACING_Y: 2,     // tile gap between bed rows
  PLANT_OFFSET_X: 2,      // starting column offset
} as const;

/** Colors (fallback when sprites aren't loaded) */
export const COLORS = {
  SKY_TOP: [135, 206, 235] as const,
  SKY_BOTTOM: [176, 226, 255] as const,
  GRASS_1: '#4CAF50',
  GRASS_2: '#388E3C',
  PATH: '#BCAA8C',
  SOIL: '#5D4037',
  HEALTH_GREEN: '#2E7D32',
  HEALTH_YELLOW: '#FFB300',
  HEALTH_RED: '#E53935',
  PANEL_BG: 'rgba(30, 40, 30, 0.85)',
  TEXT_LIGHT: '#F0F5E6',
  TEXT_DARK: '#323228',
} as const;

/** Wave animation constants */
export const WAVE_AMPLITUDE = 3;
export const WAVE_SPEED = 2;
