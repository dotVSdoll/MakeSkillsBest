import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../web/package.json', import.meta.url));
const { chromium } = require('playwright');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const webDir = path.join(rootDir, 'web');
const summaryDir = path.join(rootDir, 'summary');
const logsDir = path.join(summaryDir, 'test-logs');
const fixturesDir = path.join(summaryDir, 'test-fixtures');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join(summaryDir, 'test-runs', runId);
const publicStatePath = path.join(webDir, 'public', 'garden-state.json');
const publicConfigPath = path.join(webDir, 'public', 'gardener-config.json');

const candidateRepos = [
  'https://github.com/pallets/click.git',
  'https://github.com/psf/requests.git',
  'https://github.com/pallets/flask.git',
];

const logFiles = {
  main: path.join(logsDir, `${runId}-visual-stage.log`),
  vite: path.join(logsDir, `${runId}-vite.log`),
  browser: path.join(logsDir, `${runId}-browser.log`),
};

const results = [];
let viteProcess = null;

await main().catch(async (error) => {
  await log(`FATAL ${error.stack ?? error.message}`);
  await writeReport(false);
  if (viteProcess) viteProcess.kill();
  process.exitCode = 1;
});

async function main() {
  await fs.mkdir(logsDir, { recursive: true });
  await fs.mkdir(fixturesDir, { recursive: true });
  await fs.mkdir(runDir, { recursive: true });
  await log(`Visual stage test run ${runId}`);

  const fixture = await prepareRealProjectFixture();
  const rawReportPath = path.join(runDir, 'raw-gardener-report.json');
  await run('python', [
    '-m',
    'src.main',
    'scan',
    fixture.projectDir,
    '--stale-days',
    '0',
    '--max-lines',
    '24',
    '--max-words',
    '220',
    '--output',
    rawReportPath,
  ], rootDir, logFiles.main);

  const rawReport = JSON.parse(await fs.readFile(rawReportPath, 'utf8'));
  const gardenState = buildGardenState(rawReport, fixture.repoName);
  const gardenerConfig = buildGardenerConfig();
  await fs.writeFile(publicStatePath, JSON.stringify(gardenState, null, 2), 'utf8');
  await fs.writeFile(publicConfigPath, JSON.stringify(gardenerConfig, null, 2), 'utf8');
  await log(`Wrote visual state: ${publicStatePath}`);
  await log(`Wrote visual config: ${publicConfigPath}`);

  const baseUrl = await ensureViteServer();
  await runPlaywrightChecks(baseUrl, gardenState);
  await writeReport(true);
  if (viteProcess) viteProcess.kill();
}

async function prepareRealProjectFixture() {
  const selected = candidateRepos[Math.floor(Math.random() * candidateRepos.length)];
  const repoName = selected.split('/').pop().replace(/\.git$/, '');
  const projectDir = path.join(fixturesDir, repoName);

  if (!existsSync(projectDir)) {
    await run('git', ['clone', '--depth', '1', selected, projectDir], rootDir, logFiles.main);
  } else {
    await run('git', ['-C', projectDir, 'pull', '--ff-only'], rootDir, logFiles.main);
  }

  await injectContextFiles(projectDir);
  await log(`Prepared fixture ${repoName} from ${selected}`);
  return { projectDir, repoName, selected };
}

async function injectContextFiles(projectDir) {
  await fs.mkdir(path.join(projectDir, '.claude', 'memory'), { recursive: true });
  await fs.mkdir(path.join(projectDir, '.claude', 'rules'), { recursive: true });
  await fs.mkdir(path.join(projectDir, '.github'), { recursive: true });

  await fs.writeFile(
    path.join(projectDir, 'CLAUDE.md'),
    [
      '# Test Context',
      '',
      '## Project profile',
      'This repository is used as a real visual integration fixture.',
      'The root rule says use tabs for generated agent notes.',
      '',
      '## Long running guidance',
      ...Array.from({ length: 30 }, (_, index) => `Line ${index + 1}: keep context concise and verify before acting.`),
    ].join('\n'),
    'utf8',
  );

  await fs.writeFile(
    path.join(projectDir, '.claude', 'rules', 'skills.md'),
    [
      '# Skill Rules',
      '',
      'Use spaces for all generated notes.',
      'Prefer 4 spaces in Python examples.',
      'Use snake_case for local variables.',
    ].join('\n'),
    'utf8',
  );

  await fs.writeFile(
    path.join(projectDir, '.github', 'copilot-instructions.md'),
    [
      '# Hook Rules',
      '',
      'Automation must remain report-only until user approval.',
      'This file represents hook-side guidance for the visual test.',
    ].join('\n'),
    'utf8',
  );

  await fs.writeFile(
    path.join(projectDir, '.claude', 'memory', 'decisions.md'),
    [
      '# Memory',
      '',
      'Remember that missing_old_module.py was once part of the system.',
      'This intentionally creates an orphan reference for visual health checks.',
    ].join('\n'),
    'utf8',
  );
}

function buildGardenState(rawReport, repoName) {
  const issues = rawReport.diagnose?.issues ?? [];
  const health = rawReport.diagnose?.summary?.gardenHealthScore ?? 100;
  const layerHealth = computeLayerHealth(issues);
  const activeLayer = Object.entries(layerHealth)
    .sort((a, b) => a[1].score - b[1].score)[0]?.[0] ?? null;

  return {
    health: {
      current: health,
      previous: null,
      issuesRemaining: issues.length,
    },
    issues,
    files: rawReport.files ?? [],
    project: repoName,
    layerHealth,
    loop: {
      status: activeLayer ? 'running' : 'standby',
      activePhase: activeLayer ? 'diagnose' : 'idle',
      activeLayer,
      firstRunComplete: true,
      lastTransitionAt: new Date().toISOString(),
      stopReason: activeLayer ? null : 'all-layers-healthy',
    },
  };
}

function computeLayerHealth(issues) {
  const layers = {
    'CLAUDE.md': { score: 100, issues: 0, status: 'healthy' },
    skills: { score: 100, issues: 0, status: 'healthy' },
    hooks: { score: 100, issues: 0, status: 'healthy' },
    memory: { score: 100, issues: 0, status: 'healthy' },
  };
  const penalties = { P0: 25, P1: 10, P2: 5, P3: 2 };

  for (const issue of issues) {
    const layer = classifyLayer(issue.file ?? '');
    layers[layer].issues += 1;
    layers[layer].score = Math.max(0, layers[layer].score - (penalties[issue.severity] ?? 5));
  }

  for (const layer of Object.values(layers)) {
    layer.status = layer.score >= 90 && layer.issues === 0
      ? 'healthy'
      : layer.score >= 60
        ? 'warning'
        : 'critical';
  }
  return layers;
}

function classifyLayer(file) {
  const text = String(file);
  if (text.includes('memory')) return 'memory';
  if (text.includes('.github')) return 'hooks';
  if (text.includes('.claude/rules')) return 'skills';
  return 'CLAUDE.md';
}

function buildGardenerConfig() {
  const phaseSkills = {};
  for (const phase of ['observe', 'diagnose', 'plan', 'act', 'verify', 'learn', 'decide', 'idle']) {
    phaseSkills[phase] = {
      skill: phase === 'idle' ? 'context-gardener' : `context-gardener/${phase}`,
      enabled: phase !== 'idle',
    };
  }

  return {
    thresholds: { staleDays: 30, maxLines: 200, maxWords: 1000, orphanCheck: true },
    detection: { stale: true, contradiction: true, bloat: true, orphan: true },
    action: { mode: 'ask', autoPruneP3: true, backupEnabled: true },
    loop: {
      enabled: true,
      mode: 'custom',
      skipPhases: [],
      maxIterations: 5,
      requireConfirmationFor: ['act', 'replan'],
      exitCondition: { healthTarget: 90, maxRoundsNoImprovement: 3 },
      stop: {
        allowManualStop: true,
        stopWhenAllLayersHealthy: true,
        stopAfterScheduledWindow: true,
      },
      phaseSkills,
    },
    schedule: {
      enabled: true,
      cron: '*/15 * * * *',
      timezone: 'local',
      runWindowMinutes: 20,
    },
  };
}

async function ensureViteServer() {
  const url = 'http://127.0.0.1:5173';
  if (await isReachable(url)) {
    await log(`Using existing Vite server at ${url}`);
    return url;
  }

  viteProcess = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'], {
    cwd: webDir,
    shell: true,
  });
  pipeProcessLog(viteProcess, logFiles.vite);

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await isReachable(url)) {
      await log(`Started Vite server at ${url}`);
      return url;
    }
    await sleep(500);
  }
  throw new Error('Vite server did not become reachable on port 5173');
}

async function runPlaywrightChecks(baseUrl, gardenState) {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('console', async (message) => {
      await append(logFiles.browser, `[${message.type()}] ${message.text()}\n`);
    });
    page.on('pageerror', async (error) => {
      await append(logFiles.browser, `[pageerror] ${error.stack ?? error.message}\n`);
    });

    await page.goto(`${baseUrl}?run=${encodeURIComponent(runId)}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('canvas');
    await page.waitForFunction(() => window.__GARDENER_DEBUG__?.gardener != null);
    await page.waitForFunction(
      (score) => document.body.innerText.includes(String(score)),
      gardenState.health.current,
    );
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(runDir, '00-diagnostic-loaded-page.png'), fullPage: true });

    const importCheck = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return {
        bodyText: document.body.innerText,
        canvasWidth: canvas?.getAttribute('width'),
        canvasHeight: canvas?.getAttribute('height'),
        debug: window.__GARDENER_DEBUG__,
      };
    });
    assert(importCheck.canvasWidth === '1280', 'canvas width should remain 1280');
    assert(importCheck.canvasHeight === '720', 'canvas height should remain 720');
    assert(importCheck.bodyText.includes(String(gardenState.health.current)), 'HUD should show imported health score');
    results.push({ name: 'real health data imported into visualization', ok: true });
    await page.screenshot({ path: path.join(runDir, '01-imported-health.png'), fullPage: true });

    await page.waitForFunction(() => {
      const debug = window.__GARDENER_DEBUG__;
      if (!debug) return false;
      const g = debug.gardener;
      return Math.hypot(g.targetX - g.x, g.targetY - g.y) < 8;
    }, { timeout: 15_000 });

    const fsmCheck = await page.evaluate(() => window.__GARDENER_DEBUG__);
    assert(fsmCheck.activeLayer === gardenState.loop.activeLayer, 'active layer should follow imported loop state');
    assert(fsmCheck.gardener.phase === gardenState.loop.activePhase, 'gardener phase should follow imported loop phase');
    assert(fsmCheck.shouldIdle === false, 'gardener should work when active layer has issues');
    assert(
      Math.hypot(fsmCheck.gardener.targetX - fsmCheck.gardener.x, fsmCheck.gardener.targetY - fsmCheck.gardener.y) < 8,
      'gardener should reach active layer row',
    );
    results.push({ name: 'real character FSM follows loop state', ok: true });
    await page.screenshot({ path: path.join(runDir, '02-character-fsm.png'), fullPage: true });

    await page.getByTestId('settings-toggle').click();
    await page.waitForSelector('[data-testid="settings-panel"]');
    const scheduleEnabled = page.getByTestId('schedule-enabled');
    if (!(await scheduleEnabled.isChecked())) {
      await scheduleEnabled.check();
    }
    await page.getByTestId('schedule-cron').fill('*/10 * * * *');
    await page.getByTestId('schedule-window').fill('12');
    const scheduleState = await page.evaluate(() => ({
      cron: document.querySelector('[data-testid="schedule-cron"]')?.value,
      window: document.querySelector('[data-testid="schedule-window"]')?.value,
    }));
    assert(scheduleState.cron === '*/10 * * * *', 'schedule cron form should accept real value');
    assert(scheduleState.window === '12', 'schedule run window should accept real value');
    results.push({ name: 'schedule rules form works', ok: true });
    await page.screenshot({ path: path.join(runDir, '03-settings-schedule.png'), fullPage: true });

    await page.getByTestId('skill-phase').selectOption('verify');
    await page.getByTestId('skill-name').fill('skills/custom-verify');
    await page.getByTestId('add-skill').click();
    const mappingText = await page.getByTestId('skill-mapping-list').innerText();
    assert(mappingText.includes('verify') && mappingText.includes('skills/custom-verify'), 'skill mapping form should update phase skill');
    results.push({ name: 'phase skill reassembly form works', ok: true });
    await page.screenshot({ path: path.join(runDir, '04-settings-skill-mapping.png'), fullPage: true });

    const canvasPixelCheck = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(128, 256, 1, 1).data;
      return Array.from(data);
    });
    assert(canvasPixelCheck[3] > 0, 'canvas should render nontransparent scene pixels');
    results.push({ name: 'canvas rendered nonblank scene pixels', ok: true });
  } finally {
    await browser.close().catch(() => undefined);
  }
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: 'chrome', headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function run(command, args, cwd, logPath) {
  await log(`RUN ${command} ${args.join(' ')}`);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: true });
    pipeProcessLog(child, logPath);
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code}`));
    });
  });
}

function pipeProcessLog(child, logPath) {
  child.stdout.on('data', (chunk) => void append(logPath, chunk.toString()));
  child.stderr.on('data', (chunk) => void append(logPath, chunk.toString()));
}

async function isReachable(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

function assert(condition, message) {
  if (!condition) {
    results.push({ name: message, ok: false });
    throw new Error(message);
  }
}

async function writeReport(ok) {
  const report = [
    '# Visual Stage Test Report',
    '',
    `- Run: ${runId}`,
    `- Status: ${ok ? 'PASS' : 'FAIL'}`,
    `- Output: ${runDir}`,
    `- Logs: ${logsDir}`,
    '',
    '## Checks',
    '',
    ...results.map((item) => `- ${item.ok ? 'PASS' : 'FAIL'} ${item.name}`),
    '',
    '## Artifacts',
    '',
    '- `01-imported-health.png`',
    '- `02-character-fsm.png`',
    '- `03-settings-schedule.png`',
    '- `04-settings-skill-mapping.png`',
    '- `raw-gardener-report.json`',
    '',
  ].join('\n');

  await fs.writeFile(path.join(runDir, 'REPORT.md'), report, 'utf8');
  await fs.writeFile(path.join(summaryDir, 'visual-stage-test-report.md'), report, 'utf8');
}

async function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  await append(logFiles.main, line);
  process.stdout.write(line);
}

async function append(filePath, text) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, text, 'utf8');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
