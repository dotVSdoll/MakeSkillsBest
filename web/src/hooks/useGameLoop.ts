/**
 * useGameLoop — manages the garden update cycle.
 * Advances the gardener through loop phases on a timer.
 */

import { useEffect, useRef } from 'react';
import type { Gardener as GardenerType, Plant } from '../types.ts';
import { updateGardener, advancePhase } from '../engine/gardener.ts';

interface UseGameLoopOptions {
  gardener: GardenerType;
  plants: Plant[];
  standby: boolean;
  onUpdate: (gardener: GardenerType) => void;
}

export function useGameLoop({
  gardener,
  plants,
  standby,
  onUpdate,
}: UseGameLoopOptions): void {
  const phaseTimerRef = useRef(0);

  useEffect(() => {
    if (standby) return;

    let lastTime = performance.now();
    let rafId: number;

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Update gardener movement
      updateGardener(gardener, dt);

      // Phase timer: advance every 3 seconds
      phaseTimerRef.current += dt;
      if (phaseTimerRef.current >= 3.0) {
        phaseTimerRef.current = 0;
        advancePhase(gardener, plants.map((p) => ({ x: p.x, y: p.y })));
      }

      onUpdate(gardener);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, [standby, gardener, plants, onUpdate]);
}
