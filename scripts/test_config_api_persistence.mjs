import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const webDir = path.join(rootDir, 'web');
const summaryDir = path.join(rootDir, 'summary');
const publicDir = path.join(webDir, 'public');
const fixtureDir = path.join(os.tmpdir(), `gardener-config-api-${Date.now()}`);
const port = 5176;
const baseUrl = `http://127.0.0.1:${port}`;
const logPath = path.join(summaryDir, 'config-api-persistence.log');
const reportPath = path.join(summaryDir, 'config-api-persistence-report.md');

let viteProcess = null;

async function main() {
  await fs.mkdir(summaryDir, { recursive: true });
  await fs.mkdir(fixtureDir, { recursive: true });
  await fs.writeFile(logPath, '', 'utf8');

  const sourceConfig = JSON.parse(await fs.readFile(path.join(rootDir, '.gardener-config.json'), 'utf8'));
  const fixtureConfigPath = path.join(fixtureDir, '.gardener-config.json');
  const publicConfigPath = path.join(publicDir, 'gardener-config.json');
  const runtimePath = path.join(publicDir, 'gardener-runtime.json');
  const originalRuntime = await readOptional(runtimePath);
  const fallbackRuntime = {
    project: rootDir,
    projectName: path.basename(rootDir),
    configPath: path.join(rootDir, '.gardener-config.json'),
    statePath: path.join(rootDir, '.gardener-state.json'),
    memoryPath: path.join(rootDir, '.gardener-memory.json'),
    url: 'http://127.0.0.1:5173',
    updatedAt: new Date().toISOString(),
  };

  await writeJson(fixtureConfigPath, sourceConfig);
  await writeJson(publicConfigPath, sourceConfig);
  if (originalRuntime && !originalRuntime.includes('gardener-config-api-')) {
    await fs.writeFile(runtimePath, originalRuntime, 'utf8');
  } else {
    await writeJson(runtimePath, fallbackRuntime);
  }
  await writeJson(runtimePath, {
    project: fixtureDir,
    projectName: path.basename(fixtureDir),
    configPath: fixtureConfigPath,
    statePath: path.join(fixtureDir, '.gardener-state.json'),
    memoryPath: path.join(fixtureDir, '.gardener-memory.json'),
    url: baseUrl,
    updatedAt: new Date().toISOString(),
  });

  await startVite();

  const changedConfig = structuredClone(sourceConfig);
  changedConfig.loop.scanIntervalHours = 11;
  changedConfig.loop.maxRuntimeHours = 13;
  changedConfig.schedule.runWindowMinutes = 780;

  const response = await postJson(`${baseUrl}/api/gardener-config`, changedConfig);
  assert(response.ok === true, 'config API should return ok');

  const projectConfig = JSON.parse(await fs.readFile(fixtureConfigPath, 'utf8'));
  const publicConfig = JSON.parse(await fs.readFile(publicConfigPath, 'utf8'));
  assert(projectConfig.loop.scanIntervalHours === 11, 'target project config should update scan interval');
  assert(projectConfig.loop.maxRuntimeHours === 13, 'target project config should update runtime window');
  assert(projectConfig.schedule.runWindowMinutes === 780, 'target project config should update schedule window');
  assert(publicConfig.loop.scanIntervalHours === 11, 'web mirror config should update scan interval');

  await writeJson(publicConfigPath, sourceConfig);

  await fs.writeFile(reportPath, [
    '# Config API Persistence Report',
    '',
    `Date: ${new Date().toISOString()}`,
    '',
    '## Result',
    '',
    '- PASS: `/api/gardener-config` wrote the target project `.gardener-config.json`.',
    '- PASS: `/api/gardener-config` updated `web/public/gardener-config.json`.',
    '- Note: this test owns `web/public/gardener-runtime.json` while it runs; do not run it in parallel with other Gardener runtime tests.',
    `- Fixture: \`${fixtureDir}\``,
    `- Log: \`${logPath}\``,
    '',
  ].join('\n'), 'utf8');

  console.log(`PASS config API persistence. Report: ${reportPath}`);
}

async function startVite() {
  if (await isReachable(baseUrl)) {
    await appendLog(`Using existing server at ${baseUrl}\n`);
    return;
  }

  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  viteProcess = spawn(`${npm} run dev -- --host 127.0.0.1 --port ${port}`, {
    cwd: webDir,
    env: { ...process.env, GARDENER_PROJECT_PATH: fixtureDir },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });
  viteProcess.stdout.on('data', (chunk) => void appendLog(chunk.toString()));
  viteProcess.stderr.on('data', (chunk) => void appendLog(chunk.toString()));

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await isReachable(baseUrl)) return;
    await sleep(300);
  }
  throw new Error(`Vite did not become reachable at ${baseUrl}`);
}

async function isReachable(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function postJson(url, data) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function readOptional(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function appendLog(text) {
  await fs.appendFile(logPath, text, 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch(async (error) => {
  await appendLog(`ERROR ${error.stack ?? error.message}\n`);
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  stopVite();
});

function stopVite() {
  if (!viteProcess || viteProcess.killed) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(viteProcess.pid), '/t', '/f'], { stdio: 'ignore' });
  } else {
    viteProcess.kill('SIGTERM');
  }
}
