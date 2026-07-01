#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const PHASES = new Set(['observe', 'diagnose', 'plan', 'act', 'verify', 'learn', 'decide', 'idle']);
const LAYERS = ['CLAUDE.md', 'skills', 'hooks', 'memory'];
const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');
const WEB_PUBLIC = path.join(PLUGIN_ROOT, 'web', 'public');

main().catch(() => process.exit(0));

async function main() {
  const data = await readHookInput();
  const cwd = resolveCwd(data);
  const target = resolveTargetProject(cwd);
  if (!target) return;

  appendEvent(target.project, data, cwd);
  writePluginRoot(target.project);

  const phase = inferPhase(data);
  if (!phase) return;

  const activeLayer = inferLayer(data);
  updateVisualState(target, phase, activeLayer, data);
}

async function readHookInput() {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  if (!input.trim()) return {};
  try {
    return JSON.parse(input);
  } catch {
    return {};
  }
}

function resolveCwd(data) {
  return path.resolve(
    data.cwd ||
    data.project_dir ||
    data.workspace_dir ||
    process.env.CLAUDE_PROJECT_DIR ||
    process.env.PWD ||
    process.cwd(),
  );
}

function resolveTargetProject(cwd) {
  const runtime = readJson(path.join(WEB_PUBLIC, 'gardener-runtime.json'));
  if (runtime?.project && isSameOrChild(cwd, runtime.project)) {
    return {
      project: path.resolve(runtime.project),
      statePath: runtime.statePath || path.join(runtime.project, '.gardener-state.json'),
      webStatePath: path.join(WEB_PUBLIC, 'garden-state.json'),
    };
  }

  const project = findProjectRoot(cwd);
  if (!project) return null;
  return {
    project,
    statePath: path.join(project, '.gardener-state.json'),
    webStatePath: path.join(WEB_PUBLIC, 'garden-state.json'),
  };
}

function findProjectRoot(start) {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, '.gardener-state.json'))) return current;
    if (fs.existsSync(path.join(current, '.git'))) return current;
    const parent = path.dirname(current);
    if (parent === current) return start;
    current = parent;
  }
}

function appendEvent(project, data, cwd) {
  const file = path.join(project, '.gardener-hooks.jsonl');
  const event = {
    at: new Date().toISOString(),
    event: eventName(data),
    phase: inferPhase(data),
    tool: toolName(data),
    layer: inferLayer(data),
    cwd,
    sessionId: data.session_id || null,
  };
  appendFileSafe(file, `${JSON.stringify(event)}\n`);
}

function writePluginRoot(project) {
  writeFileSafe(path.join(project, '.gardener-plugin-root'), PLUGIN_ROOT);
}

function updateVisualState(target, phase, activeLayer, data) {
  const state = readJson(target.statePath) || readJson(target.webStatePath);
  if (!state || !state.loop) return;
  if (shouldRespectExplicitPhase(state, data)) return;

  const now = new Date().toISOString();
  const status = phase === 'idle' && eventName(data) === 'SessionEnd' ? 'paused' : 'running';
  const layer = activeLayer || state.loop.activeLayer || null;

  state.meta = state.meta || {};
  state.meta.status = status;
  state.meta.currentPhase = phase;
  state.meta.lastClaudeHookAt = now;
  state.meta.lastClaudeHookEvent = eventName(data);
  state.meta.lastClaudeTool = toolName(data);

  state.loop.status = status;
  state.loop.activePhase = phase;
  state.loop.activeLayer = phase === 'idle' ? null : layer;
  state.loop.lastTransitionAt = now;
  state.loop.stopReason = status === 'paused' ? 'claude-session-ended' : null;

  state.claude = {
    hookEvent: eventName(data),
    tool: toolName(data),
    phase,
    layer: state.loop.activeLayer,
    updatedAt: now,
  };

  writeJsonAtomicSafe(target.statePath, state);
  writeJsonAtomicSafe(target.webStatePath, state);
}

function shouldRespectExplicitPhase(state, data) {
  const explicitAt = state.meta?.lastExplicitPhaseAt;
  if (!explicitAt || eventName(data) === 'SessionEnd') return false;
  const ageMs = Date.now() - Date.parse(explicitAt);
  if (!Number.isFinite(ageMs) || ageMs > 15_000) return false;
  return eventName(data) === 'PreToolUse'
    || eventName(data) === 'PostToolUse'
    || eventName(data) === 'PostToolUseFailure'
    || eventName(data) === 'Stop';
}

function inferPhase(data) {
  const event = eventName(data);
  const tool = toolName(data).toLowerCase();
  const text = JSON.stringify(data).toLowerCase();

  if (event === 'SessionEnd' || event === 'Stop' || event === 'SubagentStop' || event === 'TeammateIdle') return 'idle';
  if (event === 'UserPromptSubmit' || event === 'SessionStart') return 'observe';
  if (event === 'TaskCreated' || event === 'SubagentStart') return 'plan';
  if (event === 'TaskCompleted') return 'verify';
  if (event === 'PostToolUseFailure') return 'diagnose';
  if (event === 'Notification' || event === 'PermissionRequest') return 'decide';

  if (event === 'PreToolUse' || event === 'PostToolUse') {
    if (['read', 'glob', 'grep', 'ls', 'notebookread', 'webfetch', 'todowrite'].includes(tool)) {
      return tool === 'todowrite' ? 'plan' : 'observe';
    }
    if (['edit', 'multiedit', 'write', 'notebookedit'].includes(tool)) return 'act';
    if (tool === 'bash' || tool === 'shell_command') {
      if (/\b(test|pytest|vitest|jest|playwright|tsc|build|lint|typecheck)\b/.test(text)) return 'verify';
      if (/\b(git diff|git status|rg|grep|find|ls|dir|cat|type)\b/.test(text)) return 'observe';
      return 'act';
    }
  }

  return null;
}

function inferLayer(data) {
  const text = JSON.stringify(data).replace(/\\\\/g, '/').toLowerCase();
  if (text.includes('claude.md')) return 'CLAUDE.md';
  if (text.includes('/skills/') || text.includes('skills/') || text.includes('.claude/skills')) return 'skills';
  if (text.includes('/hooks/') || text.includes('hooks/') || text.includes('.claude/hooks') || text.includes('.claude/commands')) return 'hooks';
  if (text.includes('memory') || text.includes('.gardener-memory')) return 'memory';
  return null;
}

function eventName(data) {
  return data.hook_event_name || process.env.CLAUDE_HOOK_EVENT_NAME || 'unknown';
}

function toolName(data) {
  return data.tool_name || data.tool?.name || data.tool || data.name || '';
}

function isSameOrChild(child, parent) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function appendFileSafe(file, text) {
  try {
    fs.appendFileSync(file, text, 'utf8');
  } catch {
    // Hooks must never block Claude Code work.
  }
}

function writeFileSafe(file, text) {
  try {
    fs.writeFileSync(file, text, 'utf8');
  } catch {
    // Hooks must never block Claude Code work.
  }
}

function writeJsonAtomicSafe(file, data) {
  try {
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
  } catch {
    // Hooks must never block Claude Code work.
  }
}

function sleepSync(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {}
}
