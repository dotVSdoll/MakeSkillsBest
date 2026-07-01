import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const servicePath = path.join(rootDir, '.gardener-service.json');
const summaryDir = path.join(rootDir, 'summary');
const reportPath = path.join(summaryDir, 'service-mode-report.md');
const results = [];

async function main() {
  await fs.mkdir(summaryDir, { recursive: true });
  runGarden(['--stop']);

  const startedAt = Date.now();
  const first = runGarden(['--port', '5182', '--loop-interval', '60', '--max-runtime', '30']);
  const elapsed = Date.now() - startedAt;
  assert(elapsed < 10_000, `garden should return quickly, got ${elapsed}ms`);
  assert(first.service?.status === 'running', 'first garden run should start service');
  assert(first.service?.pid, 'service response should include pid');
  results.push('PASS /garden starts detached service and returns');

  const service = JSON.parse(await fs.readFile(servicePath, 'utf8'));
  assert(service.status === 'running', 'service file should be running');
  assert(service.pid === first.service.pid, 'service file pid should match response');
  assert(service.nextScanAt, 'service file should include nextScanAt');
  results.push('PASS .gardener-service.json records pid and next scan');

  const second = runGarden(['--port', '5182', '--loop-interval', '60', '--max-runtime', '30']);
  assert(second.service?.reused === true, 'second garden run should reuse service');
  assert(second.service?.pid === first.service.pid, 'reused service pid should match');
  results.push('PASS repeated /garden reuses existing service');

  const stopped = runGarden(['--stop']);
  assert(stopped.status === 'stopped', 'garden --stop should stop service');
  results.push('PASS /garden --stop stops service');

  runGarden(['--once', '--no-server']);
  stopPort(5182);
  await writeReport();
  console.log(`PASS service mode. Report: ${reportPath}`);
}

function runGarden(extraArgs) {
  const result = spawnSync('python', ['-m', 'src.main', 'garden', rootDir, ...extraArgs], {
    cwd: rootDir,
    stdio: 'pipe',
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`garden ${extraArgs.join(' ')} failed:\n${result.stderr || result.stdout}`);
  }
  return JSON.parse(result.stdout);
}

async function writeReport() {
  const report = [
    '# Service Mode Report',
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

function stopPort(port) {
  if (process.platform !== 'win32') return;
  spawnSync('powershell', [
    '-NoProfile',
    '-Command',
    `$c=Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -First 1; if ($c) { Stop-Process -Id $c.OwningProcess -Force }`,
  ], { stdio: 'ignore' });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
