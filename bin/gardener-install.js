#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const pluginRoot = path.resolve(__dirname, '..');
const claudeHome = path.resolve(
  process.env.CLAUDE_CONFIG_DIR
    || process.env.CLAUDE_HOME
    || path.join(process.env.USERPROFILE || process.env.HOME || '.', '.claude'),
);

const installRoot = path.join(claudeHome, 'little-gardener');
const binDir = path.join(claudeHome, 'bin');
const launcherPath = process.platform === 'win32'
  ? path.join(binDir, 'garden.cmd')
  : path.join(binDir, 'garden');
const commandDir = path.join(claudeHome, 'commands');
const skillDir = path.join(claudeHome, 'skills');

main();

function main() {
  installPackageCopy();
  writeLaunchers();
  ensureDir(commandDir);
  ensureDir(skillDir);

  copyCommand(path.join(installRoot, 'commands', 'garden.toml'), path.join(commandDir, 'garden.toml'));
  copySkills(path.join(installRoot, 'skills'), skillDir);
  installSettingsHook(path.join(claudeHome, 'settings.json'));

  console.log('[gardener] Claude Code integration installed.');
  console.log(`[gardener] runtime: ${installRoot}`);
  console.log(`[gardener] launcher: ${launcherPath}`);
  console.log(`[gardener] commands: ${path.join(commandDir, 'garden.toml')}`);
  console.log(`[gardener] skills: ${skillDir}`);
  console.log(`[gardener] hook command: ${quote(launcherPath)} hook`);
}

function installPackageCopy() {
  if (isSamePath(pluginRoot, installRoot)) return;

  ensureDir(installRoot);
  const entries = [
    'bin',
    'commands',
    'hooks',
    'skills',
    'src',
    'web/index.html',
    'web/package.json',
    'web/package-lock.json',
    'web/tsconfig.json',
    'web/vite.config.ts',
    'web/src',
    'web/public/sprites',
    '.claude-plugin',
    '.codex-plugin',
    'README.md',
    'LICENSE',
    'package.json',
    'pyproject.toml',
  ];

  for (const entry of entries) {
    const source = path.join(pluginRoot, entry);
    const target = path.join(installRoot, entry);
    if (!fs.existsSync(source)) continue;
    const stat = fs.statSync(source);
    if (stat.isDirectory()) copyDir(source, target);
    if (stat.isFile()) copyFile(source, target);
  }
}

function writeLaunchers() {
  ensureDir(binDir);
  if (process.platform === 'win32') {
    const cmd = [
      '@echo off',
      'setlocal',
      `node "${path.join(installRoot, 'bin', 'gardener-run.js')}" %*`,
      'endlocal',
      '',
    ].join('\r\n');
    fs.writeFileSync(path.join(binDir, 'garden.cmd'), cmd, 'utf8');

    const ps1 = [
      `$script = "${path.join(installRoot, 'bin', 'gardener-run.js').replace(/`/g, '``')}"`,
      'node $script @args',
      '',
    ].join('\n');
    fs.writeFileSync(path.join(binDir, 'garden.ps1'), ps1, 'utf8');
    return;
  }

  const sh = [
    '#!/usr/bin/env sh',
    `exec node "${path.join(installRoot, 'bin', 'gardener-run.js')}" "$@"`,
    '',
  ].join('\n');
  const target = path.join(binDir, 'garden');
  fs.writeFileSync(target, sh, 'utf8');
  fs.chmodSync(target, 0o755);
}

function copyCommand(source, target) {
  const content = fs.readFileSync(source, 'utf8')
    .replace(/^garden \. --open$/m, `${quote(launcherPath)} . --open`);
  ensureDir(path.dirname(target));
  fs.writeFileSync(target, content, 'utf8');
}

function copySkills(sourceRoot, targetRoot) {
  for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    copySkillDir(path.join(sourceRoot, entry.name), path.join(targetRoot, entry.name));
  }
}

function copySkillDir(source, target) {
  ensureDir(target);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const src = path.join(source, entry.name);
    const dst = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copySkillDir(src, dst);
    } else if (entry.isFile()) {
      if (entry.name === 'SKILL.md') {
        const content = fs.readFileSync(src, 'utf8')
          .replace(/\bgarden phase\b/g, `${quote(launcherPath)} phase`)
          .replace(/\bgarden hook\b/g, `${quote(launcherPath)} hook`);
        fs.writeFileSync(dst, content, 'utf8');
      } else {
        copyFile(src, dst);
      }
    }
  }
}

function installSettingsHook(settingsPath) {
  const settings = readJson(settingsPath) || {};
  settings.hooks = settings.hooks || {};

  const events = [
    'SessionStart',
    'SessionEnd',
    'UserPromptSubmit',
    'PermissionRequest',
    'Notification',
    'PreToolUse',
    'PostToolUse',
    'PostToolUseFailure',
    'Stop',
    'SubagentStart',
    'SubagentStop',
    'TeammateIdle',
    'TaskCreated',
    'TaskCompleted',
  ];

  for (const event of events) {
    const entries = Array.isArray(settings.hooks[event]) ? settings.hooks[event] : [];
    let entry = entries.find((item) => (item.matcher || '') === '');
    if (!entry) {
      entry = { matcher: '', hooks: [] };
      entries.push(entry);
    }

    entry.hooks = (Array.isArray(entry.hooks) ? entry.hooks : [])
      .filter((hook) => !isOldGardenerHook(hook));
    entry.hooks.push({
      type: 'command',
      command: `${quote(launcherPath)} hook`,
      timeout: 5,
    });

    settings.hooks[event] = entries;
  }

  writeJson(settingsPath, settings);
}

function isOldGardenerHook(hook) {
  const text = JSON.stringify(hook || {});
  return text.includes('gardener-activate.js')
    || text.includes('garden hook')
    || text.includes('little-gardener')
    || text.includes('garden.cmd');
}

function copyDir(source, target) {
  ensureDir(target);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const src = path.join(source, entry.name);
    const dst = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dst);
    } else if (entry.isFile()) {
      copyFile(src, dst);
    }
  }
}

function copyFile(source, target) {
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function isSamePath(left, right) {
  return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
}

function quote(value) {
  return `"${value}"`;
}
