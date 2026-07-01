import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../web/package.json', import.meta.url));
const { chromium } = require('playwright');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const webDir = path.join(rootDir, 'web');
const summaryDir = path.join(rootDir, 'summary');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join(summaryDir, 'test-runs', `visual-hook-${runId}`);
const reportPath = path.join(summaryDir, 'visual-hook-e2e-report.md');
const hookPath = path.join(rootDir, 'hooks', 'gardener-activate.js');
const results = [];

let viteProcess = null;

const targets = {
  verify: { x: 8 * 64 - 8, y: 7 * 64 + 62 },
  hooks: { x: 6 * 64 + 32, y: 5 * 64 + 56 },
  idle: { x: 18 * 64, y: 9 * 64 + 56 },
};

async function main() {
  await fs.mkdir(runDir, { recursive: true });
  const port = await findFreePort(5177, 5190);
  const baseUrl = `http://127.0.0.1:${port}`;

  run('python', ['-m', 'src.main', 'garden', rootDir, '--once', '--no-server', '--port', String(port)]);
  await startVite(port);

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${baseUrl}?visual-hook=${encodeURIComponent(runId)}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('canvas');
    await page.waitForFunction(() => window.__GARDENER_DEBUG__?.gardener != null);
    await page.waitForFunction(() => window.__GARDENER_DEBUG__?.gardener.phase === 'idle');
    await page.screenshot({ path: path.join(runDir, '00-initial-idle.png'), fullPage: true });
    results.push('PASS initial runtime renders idle');

    sendHook({
      hook_event_name: 'PreToolUse',
      session_id: 'visual-hook-test',
      cwd: rootDir,
      tool_name: 'Bash',
      tool_input: { command: 'npm run build' },
    });
    await waitForVisual(page, { phase: 'verify', layer: null, shouldIdle: false });
    await waitForTarget(page, targets.verify, 30_000);
    await page.screenshot({ path: path.join(runDir, '01-hook-verify-build.png'), fullPage: true });
    results.push('PASS Bash build hook maps to verify movement');

    sendHook({
      hook_event_name: 'PreToolUse',
      session_id: 'visual-hook-test',
      cwd: rootDir,
      tool_name: 'Edit',
      tool_input: { file_path: path.join(rootDir, 'hooks', 'gardener-activate.js') },
    });
    await waitForVisual(page, { phase: 'act', layer: 'hooks', shouldIdle: false });
    await waitForTarget(page, targets.hooks, 30_000);
    await page.screenshot({ path: path.join(runDir, '02-hook-act-hooks-row.png'), fullPage: true });
    results.push('PASS Edit hook maps to act on hooks row');

    const beforeStop = await page.evaluate(() => window.__GARDENER_DEBUG__.gardener);
    sendHook({
      hook_event_name: 'Stop',
      session_id: 'visual-hook-test',
      cwd: rootDir,
    });
    await waitForVisual(page, { phase: 'idle', layer: null, shouldIdle: true });
    await waitForTarget(page, { x: beforeStop.x, y: beforeStop.y }, 4_000);
    await page.screenshot({ path: path.join(runDir, '03-hook-stop-idle.png'), fullPage: true });
    results.push('PASS Stop hook maps to visible idle/rest in place');

    const canvasPixel = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const ctx = canvas.getContext('2d');
      return Array.from(ctx.getImageData(640, 360, 1, 1).data);
    });
    assert(canvasPixel[3] > 0, 'canvas should render nontransparent pixels');
    results.push('PASS canvas remained nonblank during hook transitions');
  } finally {
    await browser.close().catch(() => undefined);
  }

  run('python', ['-m', 'src.main', 'garden', rootDir, '--once', '--no-server']);
  await writeReport(true, port);
  console.log(`PASS visual hook e2e. Report: ${reportPath}`);
}

async function waitForVisual(page, expected) {
  await page.waitForFunction(
    ({ phase, layer, shouldIdle }) => {
      const debug = window.__GARDENER_DEBUG__;
      if (!debug) return false;
      return debug.gardener.phase === phase
        && debug.visualPhase === phase
        && debug.shouldIdle === shouldIdle
        && (layer === null ? debug.activeLayer === null : debug.activeLayer === layer);
    },
    expected,
    { timeout: 12_000 },
  );
}

async function waitForTarget(page, target, timeout) {
  await page.waitForFunction(
    ({ x, y }) => {
      const g = window.__GARDENER_DEBUG__?.gardener;
      if (!g) return false;
      return Math.hypot(g.x - x, g.y - y) < 12;
    },
    target,
    { timeout },
  );
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

async function findFreePort(start, end) {
  for (let port = start; port <= end; port += 1) {
    if (!(await isReachable(`http://127.0.0.1:${port}`))) return port;
  }
  throw new Error(`No free port found in ${start}-${end}`);
}

async function startVite(port) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  viteProcess = spawn(`${npm} run dev -- --host 127.0.0.1 --port ${port}`, {
    cwd: webDir,
    env: { ...process.env, GARDENER_PROJECT_PATH: rootDir },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  const logPath = path.join(runDir, 'vite.log');
  viteProcess.stdout.on('data', (chunk) => void append(logPath, chunk.toString()));
  viteProcess.stderr.on('data', (chunk) => void append(logPath, chunk.toString()));

  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await isReachable(url)) return;
    await sleep(300);
  }
  throw new Error(`Vite did not become reachable at ${url}`);
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: 'chrome', headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function isReachable(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function writeReport(ok, port) {
  const report = [
    '# Visual Hook E2E Report',
    '',
    `Date: ${new Date().toISOString()}`,
    `Status: ${ok ? 'PASS' : 'FAIL'}`,
    `Port: ${port}`,
    `Artifacts: ${runDir}`,
    '',
    '## Checks',
    '',
    ...results.map((line) => `- ${line}`),
    '',
    '## Screenshots',
    '',
    '- `00-initial-idle.png`',
    '- `01-hook-verify-build.png`',
    '- `02-hook-act-hooks-row.png`',
    '- `03-hook-stop-idle.png`',
    '',
  ].join('\n');

  await fs.writeFile(path.join(runDir, 'REPORT.md'), report, 'utf8');
  await fs.writeFile(reportPath, report, 'utf8');
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

async function append(filePath, text) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, text, 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stopVite() {
  if (!viteProcess || viteProcess.killed) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(viteProcess.pid), '/t', '/f'], { stdio: 'ignore' });
  } else {
    viteProcess.kill('SIGTERM');
  }
}

main().catch(async (error) => {
  results.push(`FAIL ${error.message}`);
  await writeReport(false, 'unknown').catch(() => undefined);
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  stopVite();
});
