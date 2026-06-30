/** Garden scene — shared types */

export interface GardenFile {
  path: string;
  score: number;
  lines: number;
  ageDays: number;
}

export interface GardenIssue {
  file: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  type: string;
  message: string;
}

export interface GardenHealth {
  current: number;
  previous: number | null;
  issuesRemaining: number;
}

export type GardenLayer = 'CLAUDE.md' | 'skills' | 'hooks' | 'memory';

export interface LayerHealth {
  score: number;
  issues: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface GardenLoopRuntime {
  status: 'running' | 'waiting' | 'standby' | 'stopped' | 'paused';
  activePhase: GardenerPhase;
  activeLayer: GardenLayer | null;
  firstRunComplete: boolean;
  lastTransitionAt: string | null;
  stopReason: string | null;
}

export interface GardenState {
  health: GardenHealth;
  issues: GardenIssue[];
  files: GardenFile[];
  project: string;
  layerHealth?: Record<GardenLayer, LayerHealth>;
  loop?: GardenLoopRuntime;
}

/** .gardener-config.json shape */
export interface GardenerConfig {
  thresholds: {
    staleDays: number;
    maxLines: number;
    maxWords: number;
    orphanCheck: boolean;
  };
  detection: {
    stale: boolean;
    contradiction: boolean;
    bloat: boolean;
    orphan: boolean;
  };
  action: {
    mode: 'ask' | 'auto' | 'report-only';
    autoPruneP3: boolean;
    backupEnabled: boolean;
  };
  loop: {
    enabled: boolean;
    mode: 'managed' | 'custom';
    skipPhases: string[];
    maxIterations: number;
    requireConfirmationFor: string[];
    exitCondition: {
      healthTarget: number;
      maxRoundsNoImprovement: number;
    };
    stop: {
      allowManualStop: boolean;
      stopWhenAllLayersHealthy: boolean;
      stopAfterScheduledWindow: boolean;
    };
    phaseSkills: Record<GardenerPhase, {
      skill: string;
      enabled: boolean;
    }>;
  };
  schedule: {
    enabled: boolean;
    cron: string;
    timezone: string;
    runWindowMinutes: number;
  };
}

/** Tile type for the garden grid */
export type TileType = number;

export const TILE = {
  GRASS: 0,
  PATH: 1,
  SOIL: 2,
} as const;
export interface Plant {
  id: number;
  x: number;
  y: number;
  health: 'healthy' | 'wilting' | 'dead';
  label: string;
  animFrame: number;
  cropFrame?: string;
  muted?: boolean;
}

/** Gardener character */
export interface Gardener {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  phase: GardenerPhase;
  direction: 'front' | 'back' | 'left' | 'right';
  frame: number;
}

export type GardenerPhase =
  | 'observe'
  | 'diagnose'
  | 'plan'
  | 'act'
  | 'verify'
  | 'learn'
  | 'decide'
  | 'idle';

export const LOOP_PHASES: GardenerPhase[] = [
  'observe', 'diagnose', 'plan', 'act', 'verify', 'learn', 'decide',
];

export const PHASE_LABELS: Record<GardenerPhase, string> = {
  observe: '🔍 巡视',
  diagnose: '🩺 诊断',
  plan: '📋 计划',
  act: '🔧 修剪',
  verify: '✅ 验证',
  learn: '📝 学习',
  decide: '🔁 决策',
  idle: '💤 待机',
};
