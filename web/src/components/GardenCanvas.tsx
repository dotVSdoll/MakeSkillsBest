/**
 * GardenCanvas — manages the HTML Canvas element and game loop.
 * Calls onFrame(dt) for updates, then getRenderState() for rendering.
 */

import { useEffect, useRef } from 'react';
import { startGameLoop } from '../engine/gameLoop.ts';
import { renderFrame } from '../engine/renderer.ts';
import type { RenderState } from '../engine/renderer.ts';
import { SCENE_DISPLAY_SCALE, SCREEN_W, SCREEN_H } from '../constants.ts';

interface GardenCanvasProps {
  getRenderState: () => RenderState;
  onFrame: (dt: number) => void;
}

export default function GardenCanvas({ getRenderState, onFrame }: GardenCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(onFrame);
  frameRef.current = onFrame;
  const stateRef = useRef(getRenderState);
  stateRef.current = getRenderState;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas pixel dimensions
    canvas.width = SCREEN_W;
    canvas.height = SCREEN_H;

    const stop = startGameLoop(canvas, {
      update: (dt) => {
        frameRef.current(dt);
      },
      render: (ctx) => {
        renderFrame(ctx, stateRef.current());
      },
    });

    return stop;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: SCREEN_W * SCENE_DISPLAY_SCALE,
        height: SCREEN_H * SCENE_DISPLAY_SCALE,
        display: 'block',
        imageRendering: 'pixelated',
      }}
    />
  );
}
