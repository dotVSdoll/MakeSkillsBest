import { TILE_SIZE } from '../constants.ts';
import type { GardenLayer, GardenerPhase } from '../types.ts';

export interface ScenePoint {
  x: number;
  y: number;
}

export interface PlantSlot extends ScenePoint {
  id: number;
  row: number;
  col: number;
  layer: GardenLayer;
  crop: 'berry' | 'leaf' | 'root' | 'sprout';
}

export const LAYER_ROWS: GardenLayer[] = [
  'CLAUDE.md',
  'skills',
  'hooks',
  'memory',
];

const cropByRow: PlantSlot['crop'][] = ['berry', 'leaf', 'root', 'sprout'];

export const PLANT_SLOTS: PlantSlot[] = LAYER_ROWS.flatMap((layer, row) => (
  Array.from({ length: 4 }, (_, col) => ({
    id: row * 4 + col,
    row,
    col,
    layer,
    crop: cropByRow[row],
    x: (2 + col) * TILE_SIZE,
    y: (3 + row) * TILE_SIZE,
  }))
));

export const SCENE_ANCHORS: Record<GardenerPhase, ScenePoint> = {
  observe: { x: 14 * TILE_SIZE, y: 5 * TILE_SIZE + 38 },
  diagnose: { x: 8 * TILE_SIZE - 8, y: 3 * TILE_SIZE + 56 },
  plan: { x: 8 * TILE_SIZE - 8, y: 5 * TILE_SIZE + 56 },
  act: { x: 6 * TILE_SIZE + 32, y: 6 * TILE_SIZE + 60 },
  verify: { x: 8 * TILE_SIZE - 8, y: 7 * TILE_SIZE + 62 },
  learn: { x: 12 * TILE_SIZE + 12, y: 8 * TILE_SIZE + 8 },
  decide: { x: 10 * TILE_SIZE + 28, y: 6 * TILE_SIZE + 36 },
  idle: { x: 18 * TILE_SIZE, y: 9 * TILE_SIZE + 56 },
};

export const DECOR = {
  tree: { x: 14 * TILE_SIZE + 18, y: 5 * TILE_SIZE + 20 },
  bench: { x: 16 * TILE_SIZE + 16, y: 9 * TILE_SIZE + 8 },
} as const;

export const LAYER_WORK_ANCHORS: Record<GardenLayer, ScenePoint> = {
  'CLAUDE.md': { x: 6 * TILE_SIZE + 32, y: 3 * TILE_SIZE + 56 },
  skills: { x: 6 * TILE_SIZE + 32, y: 4 * TILE_SIZE + 56 },
  hooks: { x: 6 * TILE_SIZE + 32, y: 5 * TILE_SIZE + 56 },
  memory: { x: 6 * TILE_SIZE + 32, y: 6 * TILE_SIZE + 56 },
};

export const ROUTE_EDGES: Array<[GardenerPhase, GardenerPhase]> = [
  ['diagnose', 'observe'],
  ['diagnose', 'plan'],
  ['plan', 'act'],
  ['act', 'verify'],
  ['verify', 'learn'],
  ['decide', 'learn'],
  ['decide', 'idle'],
];
