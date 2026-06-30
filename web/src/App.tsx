/**
 * App — main application shell.
 * Composes Canvas garden + HUD + SettingsPanel overlays.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import GardenCanvas from './components/GardenCanvas.tsx';
import HUD from './components/HUD.tsx';
import SettingsPanel from './components/SettingsPanel.tsx';
import SpriteInspector from './components/SpriteInspector.tsx';
import { useGardenData } from './hooks/useGardenData.ts';
import { buildDefaultTileMap } from './engine/tiles.ts';
import { updateGardener } from './engine/gardener.ts';
import { preloadSprites } from './sprites/images.ts';
import { COLS, ROWS, SCREEN_H, SCREEN_W } from './constants.ts';
import { LAYER_ROWS, LAYER_WORK_ANCHORS, PLANT_SLOTS, SCENE_ANCHORS } from './scene/layout.ts';
import type { RenderState } from './engine/renderer.ts';
import type {
  GardenLayer,
  GardenState,
  GardenerConfig,
  Gardener as GardenerType,
  Plant,
  TileType,
} from './types.ts';
import { LOOP_PHASES } from './types.ts';

export default function App() {
  const debugMode = new URLSearchParams(window.location.search).get('debug');
  const { state, config, loading, setConfig } = useGardenData();
  const [showSettings, setShowSettings] = useState(false);
  const [standby, setStandby] = useState(false);
  const [health, _setHealth] = useState(state.health.current);
  const [issueCount, _setIssueCount] = useState(state.issues.length);

  // Mutable state refs — updated every frame without React re-renders
  const tileMap = useRef<TileType[][]>(buildDefaultTileMap(ROWS, COLS));
  const plants = useRef<Plant[]>(buildPlants(state));
  const gardener = useRef<GardenerType>({
    x: SCENE_ANCHORS.idle.x,
    y: SCENE_ANCHORS.idle.y,
    targetX: SCENE_ANCHORS.observe.x,
    targetY: SCENE_ANCHORS.observe.y,
    phase: LOOP_PHASES[0],
    direction: 'back',
    frame: 0,
  });
  const time = useRef(0);
  const standbyRef = useRef(standby);
  standbyRef.current = standby;
  const stateRef = useRef(state);
  const configRef = useRef(config);
  stateRef.current = state;
  configRef.current = config;

  // Preload sprites on mount
  useEffect(() => {
    preloadSprites();
  }, []);

  useEffect(() => {
    plants.current = buildPlants(state);
  }, [state]);

  if (debugMode === 'sprites') {
    return <SpriteInspector />;
  }

  // Game loop logic (runs inside requestAnimationFrame)
  const onFrame = useCallback((dt: number) => {
    const g = gardener.current;
    const runtime = stateRef.current.loop;
    const activeLayer = getActiveLayer(stateRef.current, configRef.current.loop.exitCondition.healthTarget);
    const shouldIdle = shouldRest(stateRef.current, configRef.current, standbyRef.current, activeLayer);

    if (shouldIdle) {
      g.phase = 'idle';
      g.targetX = SCENE_ANCHORS.idle.x;
      g.targetY = SCENE_ANCHORS.idle.y;
    } else {
      g.phase = runtime?.activePhase ?? LOOP_PHASES[0];
      const target = activeLayer ? LAYER_WORK_ANCHORS[activeLayer] : SCENE_ANCHORS[g.phase];
      g.targetX = target.x;
      g.targetY = target.y;
    }

    updateGardener(g, dt);
    time.current += dt;
  }, []);

  // Build render state (called by GardenCanvas each frame via ref)
  const getRenderState = useCallback((): RenderState => ({
    tileMap: tileMap.current,
    plants: plants.current,
    gardener: gardener.current,
    time: time.current,
    standby: standbyRef.current,
  }), []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 's' || e.key === 'S') {
        setShowSettings((v) => !v);
      } else if (e.key === ' ') {
        e.preventDefault();
        setStandby((v) => !v);
      } else if (e.key === 'Escape') {
        setShowSettings(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (loading) {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#1a1a2e', color: '#E8F5E9',
        fontSize: 18, fontFamily: 'monospace',
      }}>
        🌱 花园加载中...
      </div>
    );
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'auto',
      background: '#101510',
      outline: 'none',
    }}>
      <div style={{
        width: SCREEN_W,
        height: SCREEN_H,
        position: 'relative',
        flex: '0 0 auto',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
      }}>
        <GardenCanvas getRenderState={getRenderState} onFrame={onFrame} />

        <HUD
          health={health}
          issueCount={issueCount}
          onToggleSettings={() => setShowSettings((v) => !v)}
        />

        <SettingsPanel
          visible={showSettings}
          config={config}
          onClose={() => setShowSettings(false)}
          onConfigChange={(c) => setConfig(c)}
        />

        <div style={{
          position: 'absolute', bottom: 12, left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.35)',
          fontSize: 11, zIndex: 5, textAlign: 'center',
          fontFamily: 'monospace',
        }}>
          SPACE 待机 · S 设置 · ESC 关闭面板
        </div>
      </div>
    </div>
  );
}

/** Build plant instances from garden state */
function buildPlants(state: GardenState): Plant[] {
  const files = state.files;
  const problemCols = problemPlantColumns(state);

  if (files.length === 0) {
    return PLANT_SLOTS.map((slot, i) => ({
      id: slot.id,
      x: slot.x,
      y: slot.y,
      health: (['healthy', 'wilting', 'dead'] as const)[i % 3],
      label: `${slot.layer}-${slot.col + 1}`,
      animFrame: 0,
      cropFrame: `crop_${slot.crop}_${slot.col + 1}`,
      muted: problemCols[slot.layer] === slot.col,
    }));
  }

  return PLANT_SLOTS.map((slot, i) => {
    const f = files[i % files.length];
    return {
      id: slot.id,
      x: slot.x,
      y: slot.y,
      health: f.score >= 80 ? 'healthy' as const : f.score >= 50 ? 'wilting' as const : 'dead' as const,
      label: f.path.split('/').pop() || slot.layer,
      animFrame: 0,
      cropFrame: `crop_${slot.crop}_${slot.col + 1}`,
      muted: problemCols[slot.layer] === slot.col,
    };
  });
}

function getActiveLayer(
  state: GardenState,
  healthTarget: number,
): GardenLayer | null {
  if (state.loop?.activeLayer) return state.loop.activeLayer;

  const layerHealth = state.layerHealth;
  if (!layerHealth) return null;

  return LAYER_ROWS.find((layer) => (
    layerHealth[layer].score < healthTarget || layerHealth[layer].issues > 0
  )) ?? null;
}

function shouldRest(
  state: GardenState,
  config: GardenerConfig,
  manualStandby: boolean,
  activeLayer: GardenLayer | null,
): boolean {
  if (manualStandby || !config.loop.enabled) return true;

  const runtime = state.loop;
  if (runtime?.status === 'standby' || runtime?.status === 'stopped' || runtime?.status === 'paused') {
    return true;
  }

  if (!runtime?.firstRunComplete) return false;

  return config.loop.stop.stopWhenAllLayersHealthy && activeLayer === null;
}

function problemPlantColumns(state: GardenState): Partial<Record<GardenLayer, number>> {
  const result: Partial<Record<GardenLayer, number>> = {};
  const layerHealth = state.layerHealth;
  if (!layerHealth) return result;

  for (const layer of LAYER_ROWS) {
    const health = layerHealth[layer];
    if (health.score >= 90 && health.issues === 0) continue;
    result[layer] = stableProblemColumn(layer, health.score + health.issues);
  }

  return result;
}

function stableProblemColumn(layer: GardenLayer, salt: number): number {
  const hash = Array.from(layer).reduce((sum, char) => sum + char.charCodeAt(0), salt);
  return hash % 4;
}
