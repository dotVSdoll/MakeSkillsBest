#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const pluginRoot = path.resolve(__dirname, '..');
const args = process.argv.slice(2);

const command = args[0];
if (command === 'install-claude' || command === 'install') {
  runNodeScript(path.join(pluginRoot, 'bin', 'gardener-install.js'), args.slice(1), pluginRoot);
}
if (command === 'hook') {
  runNodeScript(path.join(pluginRoot, 'hooks', 'gardener-activate.js'), args.slice(1), process.cwd());
}
if (command === 'phase') {
  runNodeScript(path.join(pluginRoot, 'bin', 'gardener-phase.js'), args.slice(1), process.cwd());
}
if (command === 'status') {
  runGardenCommandWithProject(args.slice(1), '--status');
}
if (command === 'stop') {
  runGardenCommandWithProject(args.slice(1), '--stop');
}

const projectArg = firstProjectArg(args);
const projectPath = path.resolve(projectArg || process.cwd());
const passThrough = args.filter((arg) => arg !== projectArg);

if (!args.includes('--no-server')) {
  ensureWebDependencies();
}

runGarden([projectPath, ...passThrough]);

function runGarden(gardenArgs) {
const python = resolvePython();
const commandArgs = ['-m', 'src.main', 'garden', ...gardenArgs];
const result = spawnSync(python.command, [...python.prefixArgs, ...commandArgs], {
  cwd: pluginRoot,
  stdio: 'inherit',
  shell: false,
});

process.exit(result.status ?? 1);
}

function runGardenCommandWithProject(values, flag) {
  const commandProjectArg = firstProjectArg(values);
  const commandProjectPath = path.resolve(commandProjectArg || process.cwd());
  const commandPassThrough = values.filter((arg) => arg !== commandProjectArg);
  runGarden([commandProjectPath, flag, ...commandPassThrough]);
}

function runNodeScript(script, scriptArgs, cwd) {
  const result = spawnSync(process.execPath, [script, ...scriptArgs], {
    cwd,
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      CLAUDE_PLUGIN_ROOT: pluginRoot,
    },
  });
  process.exit(result.status ?? 1);
}

function firstProjectArg(values) {
  for (const value of values) {
    if (value.startsWith('-')) continue;
    return value;
  }
  return null;
}

function ensureWebDependencies() {
  const viteBin = path.join(pluginRoot, 'web', 'node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite');
  if (fs.existsSync(viteBin)) return;

  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  console.error('[gardener] Installing web dependencies once...');
  const install = spawnSync(npm, ['install'], {
    cwd: path.join(pluginRoot, 'web'),
    stdio: 'inherit',
    shell: false,
  });
  if (install.status !== 0) {
    process.exit(install.status ?? 1);
  }
}

function resolvePython() {
  const candidates = process.platform === 'win32'
    ? [
        { command: 'python', prefixArgs: [] },
        { command: 'py', prefixArgs: ['-3'] },
      ]
    : [
        { command: 'python3', prefixArgs: [] },
        { command: 'python', prefixArgs: [] },
      ];

  for (const candidate of candidates) {
    const check = spawnSync(candidate.command, [...candidate.prefixArgs, '--version'], {
      encoding: 'utf8',
      shell: false,
    });
    if (check.status === 0) return candidate;
  }

  console.error('[gardener] Python 3.11+ was not found on PATH.');
  process.exit(1);
}
