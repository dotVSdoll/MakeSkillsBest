/**
 * Sprite sheet loader - pixel-agent style.
 *
 * Keeps full PNGs as-is. Frames are defined in a manifest and sliced into
 * offscreen canvases on demand, with a small runtime validator.
 */

import { SPRITE_SHEETS } from './manifest.ts';
import type { SpriteFrameDef, SpriteSheetConfig } from './manifest.ts';

const frameCache = new Map<string, HTMLCanvasElement>();
const sheetImages = new Map<string, HTMLImageElement>();

export function getFrame(name: string, zoom: number): HTMLCanvasElement | null {
  const cacheKey = `${name}@${zoom}`;
  const cached = frameCache.get(cacheKey);
  if (cached) return cached;

  for (const [sheetId, config] of Object.entries(SPRITE_SHEETS)) {
    const def = config.frames.find((item) => item.name === name);
    if (!def) continue;

    const img = sheetImages.get(sheetId);
    if (!img || !img.complete || img.naturalWidth === 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = def.w * zoom;
    canvas.height = def.h * zoom;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      img,
      def.x,
      def.y,
      def.w,
      def.h,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    if (config.transparentBlack) {
      clearEdgeConnectedBlack(ctx, canvas.width, canvas.height);
    }

    frameCache.set(cacheKey, canvas);
    return canvas;
  }

  return null;
}

function clearEdgeConnectedBlack(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const seen = new Uint8Array(width * height);
  const queue: number[] = [];
  const pushIfBlack = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = y * width + x;
    if (seen[index]) return;
    const offset = index * 4;
    const black =
      data[offset] <= 8 &&
      data[offset + 1] <= 8 &&
      data[offset + 2] <= 8 &&
      data[offset + 3] > 0;
    if (!black) return;
    seen[index] = 1;
    queue.push(index);
  };

  for (let x = 0; x < width; x++) {
    pushIfBlack(x, 0);
    pushIfBlack(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    pushIfBlack(0, y);
    pushIfBlack(width - 1, y);
  }

  while (queue.length > 0) {
    const index = queue.pop();
    if (index === undefined) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    data[index * 4 + 3] = 0;
    pushIfBlack(x + 1, y);
    pushIfBlack(x - 1, y);
    pushIfBlack(x, y + 1);
    pushIfBlack(x, y - 1);
  }

  ctx.putImageData(image, 0, 0);
}

export async function preloadSprites(): Promise<void> {
  const entries = Object.entries(SPRITE_SHEETS);
  if (entries.length === 0) return;

  await Promise.all(
    entries.map(([id, config]) => (
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          sheetImages.set(id, img);
          validateSheet(config, img);
          resolve();
        };
        img.onerror = () => {
          console.warn(`Sprite sheet failed to load: ${config.url}`);
          resolve();
        };
        img.src = config.url;
      })
    )),
  );
}

export function getSpriteSheets(): Record<string, SpriteSheetConfig> {
  return SPRITE_SHEETS;
}

export function getLoadedSheet(id: string): HTMLImageElement | null {
  return sheetImages.get(id) ?? null;
}

export function getFrameDef(name: string): SpriteFrameDef | null {
  for (const config of Object.values(SPRITE_SHEETS)) {
    const def = config.frames.find((item) => item.name === name);
    if (def) return def;
  }
  return null;
}

function validateSheet(config: SpriteSheetConfig, img: HTMLImageElement): void {
  for (const frame of config.frames) {
    const outOfBounds =
      frame.x < 0 ||
      frame.y < 0 ||
      frame.x + frame.w > img.naturalWidth ||
      frame.y + frame.h > img.naturalHeight;

    if (outOfBounds) {
      console.warn(
        `Sprite frame out of bounds: ${frame.name} in ${config.id}`,
        frame,
        `${img.naturalWidth}x${img.naturalHeight}`,
      );
    }
  }
}
