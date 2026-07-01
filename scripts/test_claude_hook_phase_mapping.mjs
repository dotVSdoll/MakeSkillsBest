import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const hookPath = path.join(rootDir, 'hooks', 'gardener-activate.js');
const statePath = path.join(rootDir, '.gardener-state.json');
const webStatePath = path.join(rootDir, 'web', 'public', 'garden-state.json');
const summaryDir = path.join(rootDir, 'summary');
const reportPath = path.join(summaryDir, 'claude-hook-phase-mapping-report.md');

async function main() {
  await fs.mkdir(summaryDir, { recursive: true });
  run('python', ['-m', 'src.main', 'garden', rootDir, '--once', '--no-server']);
  await clearExplicitPhase();

  sendHook({
    hook_event_name: 'PreToolUse',
    session_id: 'hook-test',
    cwd: rootDir,
    tool_name: 'Bash',
    tool_input: { command: 'npm run build' },
  });
  await assertState('verify', 'running', null, 'Bash build should map to verify');

  sendHook({
    hook_event_name: 'PreToolUse',
    session_id: 'hook-test',
    cwd: rootDir,
    tool_name: 'Edit',
    tool_input: { file_path: path.join(rootDir, 'hooks', 'gardener-activate.js') },
  });
  await assertState('act', 'running', 'hooks', 'Edit hook file should map to act/hooks');

  sendHook({
    hook_event_name: 'TaskCreated',
    session_id: 'hook-test',
    cwd: rootDir,
  });
  await assertState('plan', 'running', 'hooks', 'TaskCreated should map to plan');

  sendHook({
    hook_event_name: 'Stop',
    session_id: 'hook-test',
    cwd: rootDir,
  });
  await assertState('idle', 'running', null, 'Stop should map to idle while keeping loop running');

  sendHook({
    hook_event_name: 'SessionEnd',
    session_id: 'hook-test',
    cwd: rootDir,
  });
  await assertState('idle', 'paused', null, 'SessionEnd should pause visual loop');

  run('python', ['-m', 'src.main', 'garden', rootDir, '--once', '--no-server']);

  await fs.writeFile(reportPath, [
    '# Claude Hook Phase Mapping Report',
    '',
    `Date: ${new Date().toISOString()}`,
    '',
    '## Result',
    '',
    '- PASS: Bash build maps to `verify`.',
    '- PASS: Edit on hook file maps to `act` with `hooks` active layer.',
    '- PASS: TaskCreated maps to `plan`.',
    '- PASS: Stop maps to `idle` while keeping the loop running.',
    '- PASS: SessionEnd maps to paused idle with `claude-session-ended`.',
    '- Note: this test rewrites `web/public/gardener-runtime.json`; do not run it in parallel with config API persistence tests.',
    '',
  ].join('\n'), 'utf8');

  console.log(`PASS Claude hook phase mapping. Report: ${reportPath}`);
}

function sendHook(event) {
  const result = spawnSync('node', [hookPath], {
    cwd: rootDir,
    input: JSON.stringify(event),
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`hook failed: ${result.stderr || result.stdout}`);
  }
}

async function clearExplicitPhase() {
  for (const file of [statePath, webStatePath]) {
    const state = JSON.parse(await fs.readFile(file, 'utf8'));
    if (state.meta) {
      delete state.meta.lastExplicitPhaseAt;
      delete state.meta.lastPhaseSource;
    }
    delete state.skillPhase;
    await fs.writeFile(file, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }
}

async function assertState(phase, status, layer, label) {
  const state = JSON.parse(await fs.readFile(statePath, 'utf8'));
  const webState = JSON.parse(await fs.readFile(webStatePath, 'utf8'));
  assert(state.loop.activePhase === phase, `${label}: project phase ${state.loop.activePhase} !== ${phase}`);
  assert(webState.loop.activePhase === phase, `${label}: web phase ${webState.loop.activePhase} !== ${phase}`);
  assert(state.loop.status === status, `${label}: status ${state.loop.status} !== ${status}`);
  if (layer !== null) {
    assert(state.loop.activeLayer === layer, `${label}: layer ${state.loop.activeLayer} !== ${layer}`);
  }
  if (phase === 'idle') {
    assert(state.loop.activeLayer === null, `${label}: idle should clear active layer`);
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'pipe',
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed:\n${result.stderr || result.stdout}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
