/**
 * useGardenData — loads scan results and config from JSON files.
 */

import { useCallback, useState, useEffect } from 'react';
import { LOOP_PHASES } from '../types.ts';
import type { GardenState, GardenerConfig, LoopSkillStep } from '../types.ts';

const DEFAULT_CONFIG: GardenerConfig = {
  thresholds: { staleDays: 30, maxLines: 200, maxWords: 1000, orphanCheck: true },
  detection: { stale: true, contradiction: true, bloat: true, orphan: true },
  action: { mode: 'ask', autoPruneP3: true, backupEnabled: true },
  loop: {
    enabled: true,
    mode: 'managed',
    skipPhases: [],
    maxIterations: 5,
    requireConfirmationFor: ['act'],
    stepLimit: 6,
    steps: [
      { id: 'step-1', phase: 'observe', skill: 'context-gardener/observe', enabled: true },
      { id: 'step-2', phase: 'diagnose', skill: 'context-gardener/diagnose', enabled: true },
      { id: 'step-3', phase: 'plan', skill: 'context-gardener/plan', enabled: true },
      { id: 'step-4', phase: 'act', skill: 'context-gardener/act', enabled: true },
      { id: 'step-5', phase: 'verify', skill: 'context-gardener/verify', enabled: true },
      { id: 'step-6', phase: 'learn', skill: 'context-gardener/learn', enabled: true },
    ],
    exitCondition: { healthTarget: 90, maxRoundsNoImprovement: 3 },
    stop: {
      allowManualStop: true,
      stopWhenAllLayersHealthy: true,
      stopAfterScheduledWindow: true,
    },
    phaseSkills: {
      observe: { skill: 'context-gardener', enabled: true },
      diagnose: { skill: 'context-gardener', enabled: true },
      plan: { skill: 'context-gardener', enabled: true },
      act: { skill: 'context-gardener', enabled: true },
      verify: { skill: 'context-gardener', enabled: true },
      learn: { skill: 'context-gardener', enabled: true },
      decide: { skill: 'context-gardener', enabled: true },
      idle: { skill: 'context-gardener', enabled: false },
    },
  },
  schedule: { enabled: false, cron: '0 9 * * 1', timezone: 'local', runWindowMinutes: 30 },
};
const CONFIG_STORAGE_KEY = 'little-gardener-config';

const DEFAULT_STATE: GardenState = {
  health: { current: 78, previous: null, issuesRemaining: 3 },
  issues: [],
  files: [],
  project: 'demo',
  layerHealth: {
    'CLAUDE.md': { score: 92, issues: 0, status: 'healthy' },
    skills: { score: 86, issues: 0, status: 'warning' },
    hooks: { score: 78, issues: 1, status: 'warning' },
    memory: { score: 94, issues: 0, status: 'healthy' },
  },
  loop: {
    status: 'standby',
    activePhase: 'idle',
    activeLayer: null,
    firstRunComplete: true,
    lastTransitionAt: null,
    stopReason: 'demo-healthy-enough',
  },
};

export function useGardenData() {
  const [state, setState] = useState<GardenState>(DEFAULT_STATE);
  const [config, setConfig] = useState<GardenerConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const stateResp = await fetch(`./garden-state.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!cancelled && stateResp.ok) {
          const data = await stateResp.json();
          setState(data);
        }
      } catch {
        // Silent — use defaults
      }

      try {
        const configResp = await fetch(`./gardener-config.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!cancelled && configResp.ok) {
          const data = await configResp.json();
          const fileConfig = mergeConfig(DEFAULT_CONFIG, data);
          setConfig(mergeConfig(fileConfig, loadStoredConfig()));
        }
      } catch {
        // Silent
      }

      if (!cancelled) setLoading(false);
    }

    void load();
    const intervalId = window.setInterval(() => {
      void load();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const setConfigAndPersist = useCallback((nextConfig: GardenerConfig) => {
    setConfig(nextConfig);
    try {
      window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(nextConfig));
    } catch {
      // Browser storage is best-effort; file-backed config remains the fallback.
    }
  }, []);

  return { state, config, loading, setConfig: setConfigAndPersist, setState };
}

function loadStoredConfig(): Partial<GardenerConfig> {
  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<GardenerConfig>;
  } catch {
    return {};
  }
}

function mergeConfig(base: GardenerConfig, override: Partial<GardenerConfig> = {}): GardenerConfig {
  const phaseSkills = {
    ...base.loop.phaseSkills,
    ...override.loop?.phaseSkills,
  };
  const stepLimit = override.loop?.stepLimit ?? base.loop.stepLimit;
  const steps = normalizeSteps(override.loop?.steps, phaseSkills, stepLimit);

  return {
    ...base,
    ...override,
    thresholds: { ...base.thresholds, ...override.thresholds },
    detection: { ...base.detection, ...override.detection },
    action: { ...base.action, ...override.action },
    loop: {
      ...base.loop,
      ...override.loop,
      exitCondition: {
        ...base.loop.exitCondition,
        ...override.loop?.exitCondition,
      },
      stop: {
        ...base.loop.stop,
        ...override.loop?.stop,
      },
      phaseSkills,
      stepLimit,
      steps,
    },
    schedule: { ...base.schedule, ...override.schedule },
  };
}

function normalizeSteps(
  overrideSteps: LoopSkillStep[] | undefined,
  phaseSkills: GardenerConfig['loop']['phaseSkills'],
  stepLimit: number,
): LoopSkillStep[] {
  if (Array.isArray(overrideSteps) && overrideSteps.length > 0) {
    return overrideSteps.slice(0, stepLimit).map((step, index) => ({
      id: step.id || `step-${index + 1}`,
      phase: step.phase,
      skill: step.skill,
      enabled: step.enabled,
    }));
  }

  return LOOP_PHASES.slice(0, stepLimit).map((phase, index) => ({
    id: `step-${index + 1}`,
    phase,
    skill: phaseSkills[phase]?.skill ?? 'context-gardener',
    enabled: phaseSkills[phase]?.enabled ?? true,
  }));
}
