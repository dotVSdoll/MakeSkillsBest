import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const phasePath = path.join(rootDir, 'bin', 'gardener-phase.js');
const hookPath = path.join(rootDir, 'hooks', 'gardener-activate.js');
const statePath = path.join(rootDir, '.gardener-state.json');
const webStatePath = path.join(rootDir, 'web', 'public', 'garden-state.json');
const summaryDir = path.join(rootDir, 'summary');
const reportPath = path.join(summaryDir, 'explicit-phase-writer-report.md');
const results = [];

async function main() {
  await fs.mkdir(summaryDir, { recursive: true });
  run('python', ['-m', 'src.main', 'garden', rootDir, '--once', '--no-server']);

  run('node', [phasePath, rootDir, 'diagnose', '--layer', 'hooks']);
  await assertState('diagnose', 'hooks', 'explicit diagnose/hooks write');

  sendHook({
    hook_event_name: 'PreToolUse',
    session_id: 'phase-test',
    cwd: rootDir,
    tool_name: 'Bash',
    tool_input: { command: 'npm run build' },
  });
  await assertState('diagnose', 'hooks', 'recent explicit phase should beat hook fallback');

  run('node', [phasePath, rootDir, 'idle']);
  await assertState('idle', null, 'explicit idle clears layer');

  run('python', ['-m', 'src.main', 'garden', rootDir, '--once', '--no-server']);
  await writeReport();
  console.log(`PASS explicit phase writer. Report: ${reportPath}`);
}

async function assertState(phase, layer, label) {
  const state = JSON.parse(await fs.readFile(statePath, 'utf8'));
  const webState = JSON.parse(await fs.readFile(webStatePath, 'utf8'));
  assert(state.loop.activePhase === phase, `${label}: project phase ${state.loop.activePhase} !== ${phase}`);
  assert(webState.loop.activePhase === phase, `${label}: web phase ${webState.loop.activePhase} !== ${phase}`);
  assert(state.loop.activeLayer === layer, `${label}: project layer ${state.loop.activeLayer} !== ${layer}`);
  results.push(`PASS ${label}`);
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

async function writeReport() {
  const report = [
    '# Explicit Phase Writer Report',
    '',
    `Date: ${new Date().toISOString()}`,
    '',
    ...results.map((line) => `- ${line}`),
    '',
  ].join('\n');
  await fs.writeFile(reportPath, report, 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
