#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const PHASES = new Set(['observe', 'diagnose', 'plan', 'act', 'verify', 'learn', 'decide', 'idle']);
const LAYERS = new Set(['CLAUDE.md', 'skills', 'hooks', 'memory']);
const pluginRoot = path.resolve(__dirname, '..');
const webPublic = path.join(pluginRoot, 'web', 'public');

const args = process.argv.slice(2);
const projectArg = firstPositional(args, 0) || '.';
const phase = firstPositional(args, 1);
const layer = optionValue(args, '--layer');
const note = optionValue(args, '--note');

if (!PHASES.has(phase)) {
  console.error(`[gardener-phase] Invalid phase: ${phase || '(missing)'}`);
  process.exit(2);
}
if (layer && layer !== 'null' && !LAYERS.has(layer)) {
  console.error(`[gardener-phase] Invalid layer: ${layer}`);
  process.exit(2);
}

const project = path.resolve(projectArg);
const statePath = path.join(project, '.gardener-state.json');
const webStatePath = path.join(webPublic, 'garden-state.json');
const state = readJson(statePath) || readJson(webStatePath) || buildMinimalState(project);
const now = new Date().toISOString();
const activeLayer = phase === 'idle' ? null : layer === 'null' ? null : layer || state.loop?.activeLayer || null;

state.meta = state.meta || {};
state.meta.status = 'running';
state.meta.currentPhase = phase;
state.meta.lastExplicitPhaseAt = now;
state.meta.lastPhaseSource = 'skill';
state.meta.lastPhaseNote = note || null;

state.loop = state.loop || {};
state.loop.status = 'running';
state.loop.activePhase = phase;
state.loop.activeLayer = activeLayer;
state.loop.firstRunComplete = state.loop.firstRunComplete ?? true;
state.loop.lastTransitionAt = now;
state.loop.stopReason = null;

state.skillPhase = {
  phase,
  layer: activeLayer,
  source: 'gardener-phase',
  note: note || null,
  updatedAt: now,
};

writeJsonAtomic(statePath, state);
writeJsonAtomic(webStatePath, state);

console.log(JSON.stringify({
  ok: true,
  phase,
  layer: activeLayer,
  statePath,
  webStatePath,
}, null, 2));

function firstPositional(values, index) {
  return values.filter((value) => !value.startsWith('-'))[index];
}

function optionValue(values, name) {
  const index = values.indexOf(name);
  if (index === -1) return null;
  return values[index + 1] || null;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function buildMinimalState(projectPath) {
  const repo = path.basename(projectPath);
  return {
    meta: {
      repo,
      createdAt: new Date().toISOString(),
      currentPhase: 'idle',
      loopCount: 0,
      status: 'running',
      firstRunComplete: true,
    },
    health: { current: 100, previous: null, issuesRemaining: 0 },
    issues: [],
    files: [],
    project: repo,
    layerHealth: {
      'CLAUDE.md': { score: 100, issues: 0, status: 'healthy' },
      skills: { score: 100, issues: 0, status: 'healthy' },
      hooks: { score: 100, issues: 0, status: 'healthy' },
      memory: { score: 100, issues: 0, status: 'healthy' },
    },
    loop: {
      status: 'running',
      activePhase: 'idle',
      activeLayer: null,
      firstRunComplete: true,
      lastTransitionAt: null,
      stopReason: null,
    },
  };
}

function writeJsonAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      fs.renameSync(tmp, file);
      return;
    } catch (error) {
      if (attempt === 7) throw error;
      sleepSync(50 * (attempt + 1));
    }
  }
}

function sleepSync(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {}
}
