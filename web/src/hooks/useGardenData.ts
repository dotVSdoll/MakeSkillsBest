/**
 * useGardenData — loads scan results and config from JSON files.
 */

import { useState, useEffect } from 'react';
import type { GardenState, GardenerConfig } from '../types.ts';

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
        // Try to load garden state from JSON
        const stateResp = await fetch('./garden-state.json');
        if (!cancelled && stateResp.ok) {
          const data = await stateResp.json();
          setState(data);
        }
      } catch {
        // Silent — use defaults
      }

      try {
        const configResp = await fetch('./gardener-config.json');
        if (!cancelled && configResp.ok) {
          const data = await configResp.json();
          setConfig(data);
        }
      } catch {
        // Silent
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { state, config, loading, setConfig, setState };
}
