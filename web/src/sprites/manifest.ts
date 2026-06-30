export interface SpriteFrameDef {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  anchorX?: number;
  anchorY?: number;
}

export interface SpriteSheetConfig {
  id: string;
  label: string;
  url: string;
  gridW: number;
  gridH: number;
  transparentBlack?: boolean;
  frames: SpriteFrameDef[];
}

const publicSpriteUrl = (path: string): string => (
  new URL(path, import.meta.url).href
);

const frame = (
  name: string,
  col: number,
  row: number,
  w = 16,
  h = 16,
  anchorX?: number,
  anchorY?: number,
): SpriteFrameDef => ({
  name,
  x: col * 16,
  y: row * 16,
  w,
  h,
  anchorX,
  anchorY,
});

const characterFrames = (
  prefix: string,
  count: number,
): SpriteFrameDef[] => (
  Array.from({ length: count }, (_, index) => ({
    name: `${prefix}_${index}`,
    x: index * 32,
    y: 0,
    w: 32,
    h: 64,
    anchorX: 0.5,
    anchorY: 1,
  }))
);

export const SPRITE_SHEETS: Record<string, SpriteSheetConfig> = {
  tiles: {
    id: 'tiles',
    label: 'Tileset Spring',
    url: publicSpriteUrl('/sprites/tiles/Tileset Spring.png'),
    gridW: 16,
    gridH: 16,
    transparentBlack: true,
    frames: [
      frame('grass', 8, 0),
      frame('grass_flower', 9, 0),
      frame('path', 9, 8),
      frame('soil', 9, 10),
      frame('soil_light', 9, 11),
      frame('water', 9, 16),
    ],
  },
  plants: {
    id: 'plants',
    label: 'Spring Crops',
    url: publicSpriteUrl('/sprites/plants/Spring Crops.png'),
    gridW: 16,
    gridH: 16,
    transparentBlack: true,
    frames: [
      frame('crop_seed', 1, 1, 16, 16, 0.5, 1),
      frame('crop_sprout', 2, 1, 16, 16, 0.5, 1),
      frame('crop_healthy', 5, 1, 16, 16, 0.5, 1),
      frame('crop_wilting', 4, 3, 16, 16, 0.5, 1),
      frame('crop_dead', 1, 3, 16, 16, 0.5, 1),
      frame('crop_berry_1', 2, 1, 16, 16, 0.5, 1),
      frame('crop_berry_2', 3, 1, 16, 16, 0.5, 1),
      frame('crop_berry_3', 4, 1, 16, 16, 0.5, 1),
      frame('crop_berry_4', 5, 1, 16, 16, 0.5, 1),
      frame('crop_leaf_1', 2, 3, 16, 16, 0.5, 1),
      frame('crop_leaf_2', 3, 3, 16, 16, 0.5, 1),
      frame('crop_leaf_3', 4, 3, 16, 16, 0.5, 1),
      frame('crop_leaf_4', 5, 3, 16, 16, 0.5, 1),
      frame('crop_root_1', 2, 5, 16, 16, 0.5, 1),
      frame('crop_root_2', 3, 5, 16, 16, 0.5, 1),
      frame('crop_root_3', 4, 5, 16, 16, 0.5, 1),
      frame('crop_root_4', 5, 5, 16, 16, 0.5, 1),
      frame('crop_sprout_1', 2, 7, 16, 16, 0.5, 1),
      frame('crop_sprout_2', 3, 7, 16, 16, 0.5, 1),
      frame('crop_sprout_3', 4, 7, 16, 16, 0.5, 1),
      frame('crop_sprout_4', 5, 7, 16, 16, 0.5, 1),
    ],
  },
  char_front_idle: {
    id: 'char_front_idle',
    label: 'Farmer Front Idle',
    url: publicSpriteUrl('/sprites/character/farmer front idle.png'),
    gridW: 32,
    gridH: 64,
    frames: characterFrames('idle_front', 4),
  },
  char_front_walk: {
    id: 'char_front_walk',
    label: 'Farmer Front Walk',
    url: publicSpriteUrl('/sprites/character/farmer front walk.png'),
    gridW: 32,
    gridH: 64,
    frames: characterFrames('walk_front', 4),
  },
  char_back_idle: {
    id: 'char_back_idle',
    label: 'Farmer Back Idle',
    url: publicSpriteUrl('/sprites/character/farmer back idle.png'),
    gridW: 32,
    gridH: 64,
    frames: characterFrames('idle_back', 4),
  },
  char_back_walk: {
    id: 'char_back_walk',
    label: 'Farmer Back Walk',
    url: publicSpriteUrl('/sprites/character/farmer back walk.png'),
    gridW: 32,
    gridH: 64,
    frames: characterFrames('walk_back', 4),
  },
  char_left_walk: {
    id: 'char_left_walk',
    label: 'Farmer Left Walk',
    url: publicSpriteUrl('/sprites/character/farmer left walk.png'),
    gridW: 32,
    gridH: 64,
    frames: characterFrames('walk_left', 4),
  },
  char_right_walk: {
    id: 'char_right_walk',
    label: 'Farmer Right Walk',
    url: publicSpriteUrl('/sprites/character/farmer right walk.png'),
    gridW: 32,
    gridH: 64,
    frames: characterFrames('walk_right', 4),
  },
  tree: {
    id: 'tree',
    label: 'Maple Tree',
    url: publicSpriteUrl('/sprites/decor/Maple Tree.png'),
    gridW: 16,
    gridH: 16,
    transparentBlack: true,
    frames: [
      { name: 'tree_small', x: 0, y: 32, w: 32, h: 16, anchorX: 0.5, anchorY: 1 },
      { name: 'tree_large', x: 96, y: 0, w: 40, h: 48, anchorX: 0.5, anchorY: 1 },
    ],
  },
  bench: {
    id: 'bench',
    label: 'Bench',
    url: publicSpriteUrl('/sprites/decor/bench.png'),
    gridW: 16,
    gridH: 16,
    frames: [{ name: 'bench', x: 0, y: 0, w: 16, h: 16, anchorX: 0.5, anchorY: 1 }],
  },
  fence: {
    id: 'fence',
    label: 'Fence',
    url: publicSpriteUrl('/sprites/tiles/fence.png'),
    gridW: 16,
    gridH: 16,
    transparentBlack: true,
    frames: [
      { name: 'fence_horizontal', x: 0, y: 0, w: 48, h: 16 },
      { name: 'fence_vertical', x: 0, y: 0, w: 16, h: 80 },
      frame('fence_top', 0, 0),
      frame('fence_mid', 0, 1),
      frame('fence_post', 1, 3),
    ],
  },
  road: {
    id: 'road',
    label: 'Road',
    url: publicSpriteUrl('/sprites/tiles/road.png'),
    gridW: 16,
    gridH: 16,
    transparentBlack: true,
    frames: [
      frame('road_flat', 0, 0),
      frame('road_curve', 2, 0),
    ],
  },
};

export const SPRITE_SCALE = 4;
export const CHARACTER_SCALE = 2;
